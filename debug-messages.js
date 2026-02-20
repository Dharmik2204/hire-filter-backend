import mongoose from "mongoose";
import dotenv from "dotenv";
import { Message } from "./src/models/message.models.js";

dotenv.config();

const verifyMessages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const allMessages = await Message.find().limit(10);
        console.log(`Total messages found (limit 10): ${allMessages.length}`);

        if (allMessages.length > 0) {
            allMessages.forEach(msg => {
                console.log(`Msg: ${msg._id} | Sender: ${msg.sender} (type: ${typeof msg.sender}) | Receiver: ${msg.receiver} (type: ${typeof msg.receiver}) | Content: ${msg.content}`);
            });
        } else {
            console.log("No messages found in the collection.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error verifying messages:", error);
        process.exit(1);
    }
};

verifyMessages();
