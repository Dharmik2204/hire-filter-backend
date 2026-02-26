import mongoose from "mongoose";
import { Message } from "../models/message.models.js";
import { Conversation } from "../models/conversation.models.js";

const buildParticipantKey = (userId1, userId2) => {
    return [userId1.toString(), userId2.toString()].sort().join(":");
};

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
    const participantKey = buildParticipantKey(senderId, receiverId);
    const sortedParticipants = [senderId, receiverId].sort((a, b) =>
        a.toString().localeCompare(b.toString())
    );

    const existingByKey = await Conversation.findOne({ participantKey });
    if (existingByKey) {
        return existingByKey;
    }

    const legacyConversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
    });

    if (legacyConversation) {
        if (!legacyConversation.participantKey) {
            legacyConversation.participantKey = participantKey;
            try {
                await legacyConversation.save();
            } catch (error) {
                if (error?.code === 11000) {
                    const collisionConversation = await Conversation.findOne({ participantKey });
                    if (collisionConversation) {
                        return collisionConversation;
                    }
                }
                throw error;
            }
        }
        return legacyConversation;
    }

    try {
        return await Conversation.findOneAndUpdate(
            { participantKey },
            {
                $setOnInsert: {
                    participants: sortedParticipants,
                    participantKey,
                },
            },
            {
                new: true,
                upsert: true,
            }
        );
    } catch (error) {
        if (error?.code === 11000) {
            return Conversation.findOne({ participantKey });
        }
        throw error;
    }
};
// 2. Update a conversation's last message
export const updateConversationLastMessage = async (conversationId, messageId) => {
    return Conversation.findByIdAndUpdate(
        conversationId,
        { lastMessage: messageId },
        { new: true }
    );
};
// 3. Get Paginated Messages (WhatsApp Timeline Style)
export const getPaginatedMessages = async (conversationId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    // Sort by -1 to get newest first, then reverse on frontend or here
    return Message.find({ conversationId })
        .sort({ createdAt: 1 })
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



export const getPreviousConversationUsers = async (userId, { limit = 25, cursor, search } = {}) => {
    const normalizedLimit = Math.min(Math.max(Number(limit) || 25, 1), 50);
    const query = { participants: userId };

    if (cursor) {
        const cursorDate = new Date(cursor);
        if (!Number.isNaN(cursorDate.getTime())) {
            query.updatedAt = { $lt: cursorDate };
        }
    }

    const conversations = await Conversation.find(query)
        .populate("participants", "name email role profile")
        .populate("lastMessage", "content sender createdAt isDeleted isEdited type")
        .sort({ updatedAt: -1, _id: -1 })
        .limit(normalizedLimit + 1)
        .lean();

    let hasNextPage = conversations.length > normalizedLimit;
    const pageConversations = hasNextPage ? conversations.slice(0, normalizedLimit) : conversations;

    const searchText = (search || "").trim().toLowerCase();
    const items = [];

    for (const conv of pageConversations) {
        const otherUser = (conv.participants || []).find(
            (participant) => participant?._id?.toString() !== userId.toString()
        );

        if (!otherUser) {
            continue;
        }

        if (searchText) {
            const name = (otherUser.name || "").toLowerCase();
            const email = (otherUser.email || "").toLowerCase();
            if (!name.includes(searchText) && !email.includes(searchText)) {
                continue;
            }
        }

        const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            receiver: userId,
            isRead: false,
        });

        items.push({
            conversationId: conv._id,
            otherUser: {
                _id: otherUser._id,
                name: otherUser.name,
                email: otherUser.email,
                role: otherUser.role,
                profileImage: otherUser.profile?.image?.url || null,
            },
            lastMessage: conv.lastMessage
                ? {
                    _id: conv.lastMessage._id,
                    content: conv.lastMessage.content,
                    sender: conv.lastMessage.sender,
                    createdAt: conv.lastMessage.createdAt,
                    isDeleted: conv.lastMessage.isDeleted,
                    isEdited: conv.lastMessage.isEdited,
                    type: conv.lastMessage.type,
                }
                : null,
            unreadCount,
            lastActivityAt: conv.updatedAt,
        });
    }

    if (searchText) {
        hasNextPage = false;
    }

    const nextCursor =
        hasNextPage && items.length
            ? items[items.length - 1].lastActivityAt.toISOString()
            : null;

    return {
        items,
        pagination: {
            limit: normalizedLimit,
            hasNextPage,
            nextCursor,
        },
    };
};

// 6. Count unread for a specific conversation and receiver
export const countUnreadForConversation = async (conversationId, userId) => {
    return Message.countDocuments({
        conversationId,
        receiver: userId,
        isRead: false
    });
};
