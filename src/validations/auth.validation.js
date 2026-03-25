import Joi from "joi";

export const signupSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
            "string.empty": "Name is required",
            "string.min": "Name must be at least 2 characters long",
        }),

    email: Joi.string()
        .trim()
        .email()
        .messages({
            "string.email": "Please provide a valid email address",
        }),

    phone: Joi.string()
        .trim()
        .pattern(/^[0-9+\-\s]+$/)
        .messages({
            "string.pattern.base": "Please provide a valid phone number",
        }),

    password: Joi.string()
        .trim()
        .min(6)
        .required()
        .messages({
            "string.empty": "Password is required",
            "string.min": "Password must be at least 6 characters long",
        }),

    role: Joi.string()
        .valid("user", "hr", "admin")
        .required()
        .messages({
            "any.only": "Role must be one of: user, hr, admin",
            "any.required": "Role is required",
        }),

    company: Joi.alternatives().try(
        Joi.string().trim(),
        Joi.object({
            name: Joi.string().trim().required()
        })
    ).when("role", {
        is: "hr",
        then: Joi.required(),
        otherwise: Joi.optional(),
    }).messages({
        "any.required": "Company information is required for HR",
    }),

    adminKey: Joi.string()
        .trim()
        .when("role", {
            is: "admin",
            then: Joi.required(),
            otherwise: Joi.optional(),
        })
        .messages({
            "any.required": "Admin key is required for Admin signup",
        }),
}).or("email", "phone");

export const loginSchema = Joi.object({
    identifier: Joi.string()
        .trim()
        .required()
        .pattern(/^(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[0-9+\-\s]{10,15})$/)
        .messages({
            "string.empty": "Email or Phone is required",
            "string.pattern.base": "Identifier must be a valid email or phone number",
        }),

    password: Joi.string()
        .trim()
        .required()
        .messages({
            "string.empty": "Password is required",
        }),
});

export const forgotPasswordSchema = Joi.object({
    identifier: Joi.string()
        .trim()
        .required()
        .pattern(/^(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[0-9+\-\s]{10,15})$/)
        .messages({
            "string.empty": "Email or Phone is required",
            "string.pattern.base": "Identifier must be a valid email or phone number",
        }),
});

export const resetPasswordSchema = Joi.object({
    identifier: Joi.string()
        .trim()
        .required()
        .pattern(/^(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[0-9+\-\s]{10,15})$/)
        .messages({
            "any.required": "Email or Phone is required",
            "string.empty": "Email or Phone cannot be empty",
            "string.pattern.base": "Identifier must be a valid email or phone number",
        }),
    otp: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
        "any.required": "OTP is required",
    }),
    newPassword: Joi.string().trim().min(6).required().messages({
        "string.min": "New password must be at least 6 characters long",
        "any.required": "New password is required",
    }),
});

export const sendSignupOtpSchema = Joi.object({
    identifier: Joi.string()
        .trim()
        .required()
        .pattern(/^(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[0-9+\-\s]{10,15})$/)
        .messages({
            "string.empty": "Email or Phone is required",
            "string.pattern.base": "Identifier must be a valid email or phone number",
        }),
});

export const verifySignupOtpSchema = Joi.object({
    identifier: Joi.string()
        .trim()
        .required()
        .pattern(/^(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[0-9+\-\s]{10,15})$/)
        .messages({
            "string.empty": "Email or Phone is required",
            "string.pattern.base": "Identifier must be a valid email or phone number",
        }),
    otp: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
        "any.required": "OTP is required",
    }),
});
