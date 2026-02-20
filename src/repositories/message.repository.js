import mongoose from "mongoose";
import { Message } from "../models/message.models.js";

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

        console.log(`Repository DEBUG - Comparing:`);
        console.log(`  Current User (id1): ${id1} (Type: ${typeof userId1})`);
        console.log(`  Target User (id2): ${id2} (Type: ${typeof userId2})`);

        // Diagnostic query: Count messages for each user separately
        const countFromMeToHim = await Message.countDocuments({ sender: id1, receiver: id2 });
        const countFromHimToMe = await Message.countDocuments({ sender: id2, receiver: id1 });
        console.log(`  Matches from Me to Him: ${countFromMeToHim}`);
        console.log(`  Matches from Him to Me: ${countFromHimToMe}`);

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
