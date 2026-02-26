import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { getIO } from "../socket/socket.js";
import {
    createMessage,
    findMessageById,
    updateMessageContent,
    softDeleteMessage,
    getOrCreateConversation,
    updateConversationLastMessage,
    getPreviousConversationUsers,
    getPaginatedMessages,
    markConversationAsRead,
    countUnreadForConversation,

} from "../repositories/message.repository.js";
import { searchUsersForMessaging } from "../repositories/user.repository.js";

/* ======================
   SEND MESSAGE
====================== */
export const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user._id;

        if (!receiverId || !content) {
            return res.status(400).json(new ApiError(400, "Receiver and content are required"));
        }

        const conversation = await getOrCreateConversation(senderId, receiverId);

        const message = await createMessage({
            conversationId: conversation._id,
            sender: senderId,
            receiver: receiverId,
            content
        });

        await updateConversationLastMessage(conversation._id, message._id);

        // ----------------------------------------------------
        // NEW: Format the message for Sockets before sending
        // ----------------------------------------------------
        const messageForReceiver = {
            ...message.toObject(),
            isOutbound: false // To the receiver, it's ALWAYS inbound
        };

        const messageForSender = {
            ...message.toObject(),
            isOutbound: true // To the sender, it's ALWAYS outbound
        };

        // Emit socket event to receiver
        const io = getIO();

        // 2. Fetch updated unread count for receiver
        const unreadCount = await countUnreadForConversation(conversation._id, receiverId);

        // 3. Tell the receiver there is a new message (using inbound format)
        io.to(receiverId.toString()).emit("new_message", messageForReceiver);

        // Also emit to sender (using outbound format)
        io.to(senderId.toString()).emit("new_message", messageForSender);

        // 4. Send Notification to receiver
        io.to(receiverId.toString()).emit("notification", {
            type: "message",
            senderName: req.user.name,
            senderImage: req.user.profile?.image?.url || null,
            content: content,
            conversationId: conversation._id,
            unreadCount: unreadCount,
            createdAt: message.createdAt
        });

        // 5. Tell both users to refresh their Inbox list
        io.to(receiverId.toString()).emit("update_inbox", {
            conversationId: conversation._id,
            lastMessage: messageForReceiver,
            unreadCount: unreadCount
        });
        io.to(senderId.toString()).emit("update_inbox", {
            conversationId: conversation._id,
            lastMessage: messageForSender,
            unreadCount: 0 // Sender has no unread messages in this chat
        });

        // Finally, map it for the standard HTTP response
        const responseMessage = {
            ...message.toObject(),
            isOutbound: true
        };

        res.status(201).json(new ApiResponse(201, responseMessage, "Message sent"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to send message"));
    }
};

/* ======================
   GET CONVERSATION
====================== */
export const getConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Find the conversation ID
        const conversation = await getOrCreateConversation(myId, userId);

        // Fetch paginated messages
        const messages = await getPaginatedMessages(conversation._id, page, limit);

        // NEW LOGIC: Add the `isOutbound` flag to every message
        const formattedMessages = messages.map((msg) => {
            // Convert from Mongoose Document to standard Javascript Object
            const messageObj = msg.toObject();

            // If the sender matches my ID, it's outbound (I sent it)
            messageObj.isOutbound = messageObj.sender.toString() === myId.toString();

            return messageObj;
        });

        res.status(200).json(new ApiResponse(200, {
            conversationId: conversation._id,
            page,
            messages: formattedMessages
        }, "Conversation fetched"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch conversation"));
    }
};


export const getPreviousConversations = async (req, res) => {
    try {
        const myId = req.user._id;
        const limit = parseInt(req.query.limit, 10) || 25;
        const { cursor, search } = req.query;

        const result = await getPreviousConversationUsers(myId, { limit, cursor, search });

        res.status(200).json(new ApiResponse(200, result, "Previous conversations fetched"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch previous conversations"));
    }
};



/* ======================
   EDIT MESSAGE
====================== */
export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        const message = await findMessageById(messageId);

        if (!message) {
            return res.status(404).json(new ApiError(404, "Message not found"));
        }

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json(new ApiError(403, "Unauthorized to edit this message"));
        }

        if (message.isDeleted) {
            return res.status(400).json(new ApiError(400, "Cannot edit deleted message"));
        }

        const updatedMessage = await updateMessageContent(messageId, content);

        // Emit update event
        const io = getIO();
        io.to(message.receiver.toString()).emit("message_updated", updatedMessage);
        io.to(userId.toString()).emit("message_updated", updatedMessage);

        res.status(200).json(new ApiResponse(200, updatedMessage, "Message updated"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to edit message"));
    }
};

/* ======================
   DELETE MESSAGE
====================== */
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await findMessageById(messageId);

        if (!message) {
            return res.status(404).json(new ApiError(404, "Message not found"));
        }

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json(new ApiError(403, "Unauthorized to delete this message"));
        }

        const deletedMessage = await softDeleteMessage(messageId);

        // Emit delete event
        const io = getIO();
        io.to(message.receiver.toString()).emit("message_deleted", deletedMessage);
        io.to(userId.toString()).emit("message_deleted", deletedMessage);

        res.status(200).json(new ApiResponse(200, deletedMessage, "Message deleted"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to delete message"));
    }
};

/* ======================
   SEARCH USERS
====================== */
export const searchMessageUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.user._id;

        if (!query) {
            return res.status(200).json(new ApiResponse(200, [], "Empty search query"));
        }

        const users = await searchUsersForMessaging(query, currentUserId);

        res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to search users"));
    }
};

/* ======================   MARK AS READ  ====================== */
export const markAsReadController = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await markConversationAsRead(conversationId, userId);

        res.status(200).json(new ApiResponse(200, null, "Messages marked as read"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to mark as read"));
    }
};
