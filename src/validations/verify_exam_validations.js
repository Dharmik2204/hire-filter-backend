import Joi from "joi";

// Utility regex for MongoDB ObjectIDs
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createExamSchema = Joi.object({
    jobId: Joi.string().pattern(objectIdPattern).required().messages({
        "string.pattern.base": "Invalid Job ID format",
        "any.required": "Job ID is required",
    }),
    difficulty: Joi.string()
        .valid("easy", "medium", "hard")
        .required()
        .messages({
            "any.required": "Difficulty level is required",
            "any.only": "Difficulty must be one of: easy, medium, hard"
        }),
    title: Joi.string().trim().min(3).max(100).required().messages({
        "string.empty": "Title is required",
        "string.min": "Title must be at least 3 characters long",
        "string.max": "Title must be at most 100 characters long",
    }),
    questionCount: Joi.number().integer().min(1).max(50).default(10).messages({
        "number.base": "Question count must be a number",
        "number.integer": "Question count must be an integer",
        "number.min": "Question count must be at least 1",
        "number.max": "Question count cannot exceed 50",
    }),
    durationMinutes: Joi.number().integer().min(1).max(180).required().messages({
        "number.base": "Duration must be a number",
        "number.integer": "Duration must be an integer",
        "number.min": "Duration must be at least 1 minute",
        "number.max": "Duration cannot exceed 180 minutes",
        "any.required": "Duration is required",
    }),
    passingMarks: Joi.number().min(0).required().messages({
        "number.base": "Passing marks must be a number",
        "number.min": "Passing marks cannot be negative",
        "any.required": "Passing marks is required",
    }),
    generateAI: Joi.boolean().default(false),
    topic: Joi.string().trim().max(100).required().messages({
        "string.empty": "Topic is required",
        "string.max": "Topic must be at most 100 characters long",
        "any.required": "Topic is required for generating or filtering questions",
    }),
});

export const startExamSchema = Joi.object({
    applicationId: Joi.string().pattern(objectIdPattern).required().messages({
        "string.pattern.base": "Invalid Application ID format",
        "any.required": "Application ID is required",
    }),
    examId: Joi.string().pattern(objectIdPattern).required().messages({
        "string.pattern.base": "Invalid Exam ID format",
        "any.required": "Exam ID is required",
    }),
});

export const submitExamSchema = Joi.object({
    answers: Joi.array()
        .items(
            Joi.object({
                questionId: Joi.string().pattern(objectIdPattern).required().messages({
                    "string.pattern.base": "Invalid Question ID format",
                    "any.required": "Question ID is required",
                }),
                selectedOption: Joi.string().trim().required().messages({
                    "string.empty": "Please select an option",
                    "any.required": "Selected option is required",
                }),
            })
        )
        .min(1)
        .required()
        .messages({
            "array.min": "At least one answer is required",
            "any.required": "Answers are required",
        }),
});
