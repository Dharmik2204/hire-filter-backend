import Joi from "joi";

export const updateRankStatusSchema = Joi.object({
    status: Joi.string()
        .valid("shortlisted", "rejected", "hired")
        .required()
        .messages({
            "any.only": "Status must be one of: shortlisted, rejected, hired",
            "any.required": "Status is required",
        }),
});

export const assignRankSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
    rankings: Joi.array().items(
        Joi.object({
            applicationId: Joi.string().trim().required(),
            rank: Joi.number().integer().min(1).required()
        })
    ).min(1).required()
});

export const getRankedCandidatesSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
});
