import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            }
        ],
        participantKey: {
            type: String,
            unique: true,
            sparse: true,
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        }
    },
    { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ participantKey: 1 }, { unique: true, sparse: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);
