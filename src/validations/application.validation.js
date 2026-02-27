import Joi from "joi";

export const createApplicationSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
    // candidateId is usually from req.user, but if passed in body:
    candidateId: Joi.string().trim().optional(),

    skills: Joi.array().items(Joi.string().trim()).optional(),
    resume: Joi.string().trim().optional(),
    experience: Joi.number().min(0).required().messages({
        "number.base": "Experience must be a number",
        "number.min": "Experience cannot be negative",
        "any.required": "Experience is required",
    }),
    phone: Joi.string()
        .trim()
        .required()
        .messages({
            "string.empty": "Phone number is required",
            "any.required": "Phone number is required",
        }),

    linkedinProfile: Joi.string().uri().allow("").optional(),
    portfolioWebsite: Joi.string().uri().allow("").optional(),

    workExperience: Joi.array()
        .items(
            Joi.object({
                companyName: Joi.string().trim().required(),
                role: Joi.string().trim().required(),
                duration: Joi.string().trim().required(),
                accomplishments: Joi.string().trim().optional(),
            })
        )
        .optional(),

    education: Joi.array()
        .items(
            Joi.object({
                institution: Joi.string().trim().required(),
                degree: Joi.string().trim().required(),
                year: Joi.string().trim().required(),
            })
        )
        .min(1)
        .required()
        .messages({
            "array.min": "At least one education entry is required",
            "any.required": "Education details are required",
        }),

    projects: Joi.array()
        .items(
            Joi.object({
                projectName: Joi.string().trim().required(),
                projectLink: Joi.string().uri().allow("").optional(),
                description: Joi.string().trim().optional(),
            })
        )
        .optional(),

    coverLetter: Joi.string().trim().allow("").optional(),
    desiredSalary: Joi.string().trim().allow("").optional(),
});

export const updateApplicationSchema = Joi.object({
    status: Joi.string()
        .valid("applied", "screening", "interviewing", "shortlisted", "offer", "rejected", "hired", "archived")
        .messages({
            "any.only": "Invalid status value",
        }),
}).min(1);
