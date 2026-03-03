import express from "express";
import { authMiddleware } from "../middlewares/authorize.middlewares.js";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification
} from "../controllers/notification.js";
import { validateObjectIdParams } from "../middlewares/validateObjectId.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.route("/").get(getNotifications);
router.route("/mark-all-read").patch(markAllAsRead);
router.route("/:notificationId/read").patch(validateObjectIdParams, markAsRead);
router.route("/:notificationId").delete(validateObjectIdParams, removeNotification);

export default router;
