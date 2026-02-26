import express from "express";
import {
    sendMessage,
    getConversation,
    editMessage,
    deleteMessage,
    searchMessageUsers,
    getPreviousConversations,
    markAsReadController
} from "../controllers/message.js";
import { authMiddleware } from "../middlewares/authorize.middlewares.js";
import { validateObjectIdParams } from "../middlewares/validateObjectId.middleware.js";


const router = express.Router();


// Validate these IDs everywhere in this file
router.param("userId", validateObjectIdParams);
router.param("conversationId", validateObjectIdParams);
router.param("messageId", validateObjectIdParams);
// Add the Mark as Read route
router.patch("/read/:conversationId", authMiddleware, markAsReadController);
router.post("/send", authMiddleware, sendMessage);
router.get("/search", authMiddleware, searchMessageUsers);
router.get("/conversation/:userId", authMiddleware, getConversation);
router.get("/previous-conversations", authMiddleware, getPreviousConversations);
router.put("/:messageId", authMiddleware, editMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);



export default router;
