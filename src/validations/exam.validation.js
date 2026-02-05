import Joi from "joi";

export const createExamSchema = Joi.object({
    jobId: Joi.string().trim().required().messages({
        "any.required": "Job ID is required",
    }),
    examType: Joi.string()
        .valid("aptitude", "reasoning", "mixed")
        .required()
        .messages({
            "any.only": "Exam type must be one of: aptitude, reasoning, mixed",
            "any.required": "Exam type is required",
        }),
    title: Joi.string().trim().min(3).required().messages({
        "string.empty": "Title is required",
        "string.min": "Title must be at least 3 characters long",
    }),
    questionCount: Joi.number().integer().min(1).default(10).messages({
        "number.min": "Question count must be at least 1",
    }),
    durationMinutes: Joi.number().integer().min(1).required().messages({
        "number.min": "Duration must be at least 1 minute",
        "any.required": "Duration is required",
    }),
    passingMarks: Joi.number().min(0).required().messages({
        "number.min": "Passing marks cannot be negative",
        "any.required": "Passing marks is required",
    }),
});

export const startExamSchema = Joi.object({
    applicationId: Joi.string().trim().required().messages({
        "any.required": "Application ID is required",
    }),
    examId: Joi.string().trim().required().messages({
        "any.required": "Exam ID is required",
    }),
});

export const submitExamSchema = Joi.object({
    answers: Joi.array()
        .items(
            Joi.object({
                questionId: Joi.string().trim().required(),
                selectedOption: Joi.number().required(),
            })
        )
        .min(1)
        .required()
        .messages({
            "array.min": "At least one answer is required",
            "any.required": "Answers are required",
        }),
});
