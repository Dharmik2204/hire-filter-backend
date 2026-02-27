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

export const getRankedCandidatesSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
});
