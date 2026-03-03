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
    }), // Note: Title uniqueness is enforced in the controller/database
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
    totalMarks: Joi.number().integer().min(1).max(1000).required().messages({
        "number.base": "Total marks must be a number",
        "number.integer": "Total marks must be an integer",
        "number.min": "Total marks must be at least 1",
        "number.max": "Total marks cannot exceed 1000",
        "any.required": "Total marks is required",
    }),
}).custom((value, helpers) => {
    if (value.passingMarks > value.totalMarks) {
        return helpers.message("Passing marks cannot be greater than total marks");
    }
    return value;
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

export const addExamQuestionSchema = Joi.object({
    question: Joi.string().trim().min(5).max(1000).required().messages({
        "string.empty": "Question text is required",
        "string.min": "Question must be at least 5 characters",
        "string.max": "Question must be at most 1000 characters",
        "any.required": "Question text is required",
    }),
    options: Joi.array()
        .items(Joi.string().trim().min(1).required())
        .min(2)
        .max(6)
        .required()
        .messages({
            "array.base": "Options must be an array",
            "array.min": "At least 2 options are required",
            "array.max": "Options cannot exceed 6 items",
            "any.required": "Options are required",
        }),
    correctAnswer: Joi.string().trim().required().messages({
        "string.empty": "Correct answer is required",
        "any.required": "Correct answer is required",
    }),
    marks: Joi.number().integer().min(1).max(100).default(1).messages({
        "number.base": "Marks must be a number",
        "number.integer": "Marks must be an integer",
        "number.min": "Marks must be at least 1",
        "number.max": "Marks cannot exceed 100",
    }),
}).custom((value, helpers) => {
    const normalizedOptions = (value.options || []).map((o) => o.trim());
    if (!normalizedOptions.includes((value.correctAnswer || "").trim())) {
        return helpers.error("any.invalid");
    }
    return value;
}, "Correct answer validation").messages({
    "any.invalid": "Correct answer must match one of the provided options",
});
