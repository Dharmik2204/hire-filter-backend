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
        .required()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email is required",
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
});

export const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .email()
        .required()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email is required",
        }),

    password: Joi.string()
        .trim()
        .required()
        .messages({
            "string.empty": "Password is required",
        }),
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .trim()
        .email()
        .required()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email is required",
        }),
});

export const resetPasswordSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    otp: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
        "any.required": "OTP is required",
    }),
    newPassword: Joi.string().trim().min(6).required().messages({
        "string.min": "New password must be at least 6 characters long",
        "any.required": "New password is required",
    }),
});
