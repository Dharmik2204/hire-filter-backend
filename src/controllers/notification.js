import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { getNotificationsQuerySchema } from "../validations/notification.validation.js";
import {
    getNotificationsByUserId,
    countNotificationsByUserId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount
} from "../repositories/notification.repository.js";
import { Notification } from "../models/notification.models.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
        const { error, value } = getNotificationsQuerySchema.validate(
            {
                status: req.query.status,
                markAsRead: req.query.markAsRead,
            },
            { abortEarly: false }
        );

        if (error) {
            const errorMessages = error.details.map((detail) => detail.message);
            return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
        }

        const { status, markAsRead } = value;

        const [notifications, totalNotifications] = await Promise.all([
            getNotificationsByUserId(userId, page, limit, status),
            countNotificationsByUserId(userId, status),
        ]);
        const totalPages = totalNotifications > 0 ? Math.ceil(totalNotifications / limit) : 0;
        const hasNextPage = page < totalPages;

        // If markAsRead is true, mark these notifications as read in the background
        if (markAsRead && notifications.length > 0) {
            const notificationIds = notifications
                .filter(n => !n.isRead)
                .map(n => n._id);

            if (notificationIds.length > 0) {
                await Notification.updateMany(
                    { _id: { $in: notificationIds } },
                    { isRead: true }
                );
            }
        }

        const unreadCount = await getUnreadCount(userId);

        res.status(200).json(new ApiResponse(200, {
            page,
            limit,
            totalPages,
            hasNextPage,
            notifications,
            unreadCount,
            status,
            markAsRead
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
