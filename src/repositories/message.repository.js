import { Message } from "../models/message.models.js";

export const createMessage = (data) => {
    return Message.create(data);
};

export const findMessageById = (id) => {
    return Message.findById(id);
};

export const getConversationHistory = (userId1, userId2) => {
    return Message.find({
        $or: [
            { sender: userId1, receiver: userId2 },
            { sender: userId2, receiver: userId1 }
        ]
    }).sort({ createdAt: 1 }); // Oldest first
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
