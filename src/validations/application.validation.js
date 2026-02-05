import Joi from "joi";

export const createApplicationSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
    // candidateId is usually from req.user, but if passed in body:
    candidateId: Joi.string().trim().optional(),

    skills: Joi.array().items(Joi.string().trim()).optional(),
    resume: Joi.string().trim().optional(),
});

export const updateApplicationSchema = Joi.object({
    status: Joi.string()
        .valid("applied", "screening", "interviewing", "offer", "rejected", "archived")
        .messages({
            "any.only": "Invalid status value",
        }),
}).min(1);
