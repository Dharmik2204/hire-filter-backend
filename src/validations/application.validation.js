import Joi from "joi";

export const createApplicationSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
    // candidateId is usually from req.user, but if passed in body:
    candidateId: Joi.string().trim().optional(),

    skills: Joi.array().items(Joi.string().trim()).optional(),
    resume: Joi.string().trim().optional(),
    experience: Joi.number().min(0).optional(),
    phone: Joi.string().trim().optional(),

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
        .optional(),

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
        .valid("applied", "screening", "interviewing", "offer", "rejected", "archived")
        .messages({
            "any.only": "Invalid status value",
        }),
}).min(1);
