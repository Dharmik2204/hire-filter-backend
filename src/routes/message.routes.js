import express from "express";
import { sendMessage, getConversation, editMessage, deleteMessage, searchMessageUsers } from "../controllers/message.js";
import { authMiddleware } from "../middlewares/authorize.middlewares.js";

const router = express.Router();

router.post("/send", authMiddleware, sendMessage);
router.get("/search", authMiddleware, searchMessageUsers);
router.get("/conversation/:userId", authMiddleware, getConversation);
router.put("/:messageId", authMiddleware, editMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);

export default router;
