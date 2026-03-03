import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import {
    getNotificationsByUserId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount
} from "../repositories/notification.repository.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        const notifications = await getNotificationsByUserId(userId, page, limit);
        const unreadCount = await getUnreadCount(userId);

        res.status(200).json(new ApiResponse(200, {
            notifications,
            unreadCount,
            page,
            limit
        }, "Notifications fetched successfully"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to fetch notifications"));
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const notification = await markNotificationAsRead(notificationId, userId);
        if (!notification) {
            return res.status(404).json(new ApiError(404, "Notification not found"));
        }

        res.status(200).json(new ApiResponse(200, notification, "Notification marked as read"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to mark notification as read"));
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        await markAllNotificationsAsRead(userId);

        res.status(200).json(new ApiResponse(200, null, "All notifications marked as read"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to mark all notifications as read"));
    }
};

export const removeNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const notification = await deleteNotification(notificationId, userId);
        if (!notification) {
            return res.status(404).json(new ApiError(404, "Notification not found"));
        }

        res.status(200).json(new ApiResponse(200, null, "Notification deleted successfully"));
    } catch (error) {
        res.status(500).json(formatError(error, 500, "Failed to delete notification"));
    }
};
