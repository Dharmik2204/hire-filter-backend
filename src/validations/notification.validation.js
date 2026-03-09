import Joi from "joi";

export const getNotificationsQuerySchema = Joi.object({
    status: Joi.string().valid("unread", "read", "all").default("unread"),
    markAsRead: Joi.boolean().truthy("true").falsy("false").default(false),
}).unknown(true);
