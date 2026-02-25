import mongoose from "mongoose";
import { Message } from "../models/message.models.js";
import { Conversation } from "../models/conversation.models.js";


export const createMessage = (data) => {
    return Message.create(data);
};

export const findMessageById = (id) => {
    return Message.findById(id);
};

export const getConversationHistory = async (userId1, userId2) => {
    try {
        const id1 = new mongoose.Types.ObjectId(userId1);
        const id2 = new mongoose.Types.ObjectId(userId2);

        const messages = await Message.find({
            $or: [
                { sender: id1, receiver: id2 },
                { sender: id2, receiver: id1 }
            ]
        }).sort({ createdAt: 1 });

        return messages;
    } catch (error) {
        console.error("Repository - Error in getConversationHistory:", error);
        throw error;
    }
};

export const updateMessageContent = (id, content) => {
    return Message.findByIdAndUpdate(
        id,
        { content, isEdited: true },
        { new: true }
    );
};

export const softDeleteMessage = (id) => {
    return Message.findByIdAndUpdate(
        id,
        { isDeleted: true, content: "This message was deleted" },
        { new: true }
    );
};


// 1. Find or create a conversation between two users
export const getOrCreateConversation = async (senderId, receiverId) => {
    let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
    });
    if (!conversation) {
        conversation = await Conversation.create({
            participants: [senderId, receiverId]
        });
    }
    return conversation;
};
// 2. Update a conversation's last message
export const updateConversationLastMessage = async (conversationId, messageId) => {
    return Conversation.findByIdAndUpdate(conversationId, { lastMessage: messageId });
};
// 3. Get Paginated Messages (WhatsApp Timeline Style)
export const getPaginatedMessages = async (conversationId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    // Sort by -1 to get newest first, then reverse on frontend or here
    return Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// 5. Mark conversation as read
export const markConversationAsRead = async (conversationId, userId) => {
    return Message.updateMany(
        { conversationId, receiver: userId, isRead: false },
        { isRead: true }
    );
};


// 4. Get User's Inbox (List of all chats)
export const getUserInbox = async (userId) => {
    const conversations = await Conversation.find({ participants: userId })
        .populate("participants", "name email profileImage")
        .populate("lastMessage")
        .sort({ updatedAt: -1 })
        .lean(); // Lean for performance and to add custom fields

    // Loop through each conversation to add unreadCount
    const inboxWithCounts = await Promise.all(conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            receiver: userId,
            isRead: false
        });
        return { ...conv, unreadCount };
    }));

    return inboxWithCounts;
};
