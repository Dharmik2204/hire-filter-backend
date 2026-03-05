import {
    createNotification,
    createNotificationsBulk,
    getUnreadCount,
    getUnreadCountsByRecipients,
} from "../repositories/notification.repository.js";
import { getIO } from "../socket/socket.js";

const toIdString = (value) => {
    if (value === undefined || value === null) return "";
    return value.toString();
};

const normalizeMetadata = (metadata = {}) => {
    const normalized = {};

    for (const [key, value] of Object.entries(metadata)) {
        if (value === undefined || value === null) continue;
        normalized[key] = String(value);
    }

    return normalized;
};

const getSocket = () => {
    try {
        return getIO();
    } catch (error) {
        return null;
    }
};

const emitNotification = (recipientId, payload) => {
    const io = getSocket();
    if (!io) return;
    io.to(toIdString(recipientId)).emit("notification", payload);
};

const attachUnreadNotificationCount = (payload, totalUnreadCount) => ({
    ...payload,
    totalUnreadCount,
});

export const createAndDispatchNotification = async ({
    recipient,
    sender,
    title,
    message,
    type,
    link,
    metadata = {},
    extraSocketPayload = {},
}) => {
    const notification = await createNotification({
        recipient,
        sender,
        title,
        message,
        type,
        link,
        metadata: normalizeMetadata(metadata),
    });
    const totalUnreadCount = await getUnreadCount(recipient);

    emitNotification(recipient, {
        ...attachUnreadNotificationCount(notification.toObject(), totalUnreadCount),
        ...extraSocketPayload,
    });

    return notification;
};

export const createAndDispatchBulkNotifications = async ({
    recipientIds = [],
    sender,
    title,
    message,
    type,
    link,
    metadata = {},
}) => {
    const uniqueRecipientIds = Array.from(
        new Set(recipientIds.map(toIdString).filter(Boolean))
    );

    if (uniqueRecipientIds.length === 0) {
        return [];
    }

    const payloads = uniqueRecipientIds.map((recipientId) => ({
        recipient: recipientId,
        sender,
        title,
        message,
        type,
        link,
        metadata: normalizeMetadata(metadata),
    }));

    const notifications = await createNotificationsBulk(payloads);
    const unreadCountsByRecipient = await getUnreadCountsByRecipients(uniqueRecipientIds);
    const io = getSocket();

    if (io) {
        notifications.forEach((notification) => {
            const recipientId = toIdString(notification.recipient);
            io.to(recipientId).emit(
                "notification",
                attachUnreadNotificationCount(
                    notification.toObject(),
                    unreadCountsByRecipient[recipientId] || 0
                )
            );
        });
    }

    return notifications;
};
