import mongoose from "mongoose";
import { Message } from "../models/message.models.js";

export const createMessage = (data) => {
    return Message.create(data);
};

export const findMessageById = (id) => {
    return Message.findById(id);
};

export const getConversationHistory = (userId1, userId2) => {
    const id1 = new mongoose.Types.ObjectId(userId1);
    const id2 = new mongoose.Types.ObjectId(userId2);

    return Message.find({
        $or: [
            { sender: id1, receiver: id2 },
            { sender: id2, receiver: id1 }
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
