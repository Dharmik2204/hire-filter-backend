import Joi from "joi";

export const updateRankStatusSchema = Joi.object({
    status: Joi.string()
        .valid("applied", "screening", "interviewing", "shortlisted", "offer", "rejected", "hired", "archived")
        .required()
        .messages({
            "any.only": "Status must be one of: applied, screening, interviewing, shortlisted, offer, rejected, hired, archived",
            "any.required": "Status is required",
        }),
});

export const getRankedCandidatesSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
});
