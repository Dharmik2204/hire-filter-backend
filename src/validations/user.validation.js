import Joi from "joi";

const addressSchema = Joi.object({
    addressLine1: Joi.string().trim().allow(""),
    addressLine2: Joi.string().trim().allow(""),
    city: Joi.string().trim().allow(""),
    state: Joi.string().trim().allow(""),
    country: Joi.string().trim().default("India"),
    pincode: Joi.string().trim().allow(""),
});

export const updateProfileSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .messages({
            "string.base": "Name must be a string",
            "string.empty": "Name cannot be empty",
            "string.min": "Name must be at least 2 characters long",
            "string.max": "Name must be at most 50 characters long",
        }),

    email: Joi.string()
        .trim()
        .email()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email cannot be empty",
        }),

    phone: Joi.string()
        .trim()
        .pattern(/^[0-9]{10}$/)
        .messages({
            "string.pattern.base": "Phone number must be a valid 10-digit number",
        }),

    currentAddress: addressSchema,
    permanentAddress: addressSchema,

    profile: Joi.object({
        skills: Joi.array().items(Joi.string().trim()),
        experience: Joi.number().min(0).messages({
            "number.min": "Experience cannot be negative",
        }),
        education: Joi.string().trim().allow(""),
        portfolio: Joi.string().trim().uri().allow(""),
        bio: Joi.string().trim().max(500).allow(""),
    }),

    company: Joi.object({
        name: Joi.string().trim().allow(""),
        website: Joi.string().trim().uri().allow(""),
        location: Joi.string().trim().allow(""),
        industry: Joi.string().trim().allow(""),
        description: Joi.string().trim().allow(""),
    }),
}).min(1).messages({
    "object.min": "At least one field must be provided for update",
});
