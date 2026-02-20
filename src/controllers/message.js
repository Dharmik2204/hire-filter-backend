import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { getIO } from "../socket/socket.js";
import {
    createMessage,
    getConversationHistory,
    findMessageById,
    updateMessageContent,
    softDeleteMessage
} from "../repositories/message.repository.js";

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

        const message = await createMessage({
            sender: senderId,
            receiver: receiverId,
            content
        });

        // Emit socket event to receiver
        const io = getIO();
        io.to(receiverId).emit("new_message", message);

        // Also emit to sender (if they have multiple tabs open)
        io.to(senderId).emit("new_message", message);

        res.status(201).json(new ApiResponse(201, message, "Message sent"));
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

        const messages = await getConversationHistory(myId, userId);

        res.status(200).json(new ApiResponse(200, messages, "Conversation fetched"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch conversation"));
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
