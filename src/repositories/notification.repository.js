import mongoose from "mongoose";
import { Notification } from "../models/notification.models.js";

export const createNotification = async (data) => {
    return await Notification.create(data);
};

export const createNotificationsBulk = async (notificationData = []) => {
    if (!Array.isArray(notificationData) || notificationData.length === 0) {
        return [];
    }

    return Notification.insertMany(notificationData, { ordered: false });
};

export const getNotificationsByUserId = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const markNotificationAsRead = async (notificationId, userId) => {
    return await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
    );
};

export const markAllNotificationsAsRead = async (userId) => {
    return await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
    );
};

export const deleteNotification = async (notificationId, userId) => {
    return await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
};

export const getUnreadCount = async (userId) => {
    return await Notification.countDocuments({ recipient: userId, isRead: false });
};

export const getUnreadCountsByRecipients = async (recipientIds = []) => {
    const uniqueRecipientIds = Array.from(
        new Set((recipientIds || []).map((id) => id?.toString?.()).filter(Boolean))
    );

    if (uniqueRecipientIds.length === 0) {
        return {};
    }

    const recipientObjectIds = uniqueRecipientIds.map(
        (recipientId) => new mongoose.Types.ObjectId(recipientId)
    );

    const unreadCounts = await Notification.aggregate([
        {
            $match: {
                recipient: { $in: recipientObjectIds },
                isRead: false,
            },
        },
        {
            $group: {
                _id: "$recipient",
                totalUnreadCount: { $sum: 1 },
            },
        },
    ]);

    return unreadCounts.reduce((acc, entry) => {
        acc[entry._id.toString()] = entry.totalUnreadCount;
        return acc;
    }, {});
};
