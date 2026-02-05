import Joi from "joi";

export const createJobSchema = Joi.object({
    jobTitle: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.empty": "Job title is required",
            "string.min": "Job title must be at least 3 characters long",
            "string.max": "Job title must be at most 100 characters long",
        }),

    companyName: Joi.string()
        .trim()
        .required()
        .messages({
            "string.empty": "Company name is required",
        }),

    jobDescription: Joi.string()
        .trim()
        .min(5)
        .required()
        .messages({
            "string.empty": "Job description is required",
            "string.min": "Job description must be at least 5 characters long",
        }),

    location: Joi.string()
        .trim()
        .required()
        .messages({
            "string.empty": "Location is required",
        }),

    jobType: Joi.string()
        .valid("Full-Time", "Part-Time", "Internship", "Contract", "Remote")
        .required()
        .messages({
            "any.only": "Job type must be one of: Full-Time, Part-Time, Internship, Contract, Remote",
            "any.required": "Job type is required",
        }),

    experience: Joi.object({
        min: Joi.number().min(0).required().messages({
            "number.base": "Experience min must be a number",
            "number.min": "Experience min cannot be negative",
        }),
        max: Joi.number().min(Joi.ref("min")).required().messages({
            "number.base": "Experience max must be a number",
            "number.min": "Experience max cannot be less than min experience",
        }),
    }).required(),

    salary: Joi.object({
        min: Joi.number().min(0).default(0),
        max: Joi.number().min(Joi.ref("min")).default(0),
        currency: Joi.string().trim().default("INR"),
        isNegotiable: Joi.boolean().default(false),
    }),

    requiredSkills: Joi.array()
        .items(Joi.string().trim())
        .min(1)
        .required()
        .messages({
            "array.min": "At least one required skill is needed",
        }),

    education: Joi.string()
        .valid("Any", "10th", "12th", "Diploma", "Graduate", "Post-Graduate")
        .default("Any"),

    openings: Joi.number().integer().min(1).default(1),
    noticePeriod: Joi.number().integer().min(0).default(0),
    benefits: Joi.array().items(Joi.string().trim()).default([]),
    lastDate: Joi.date().iso().required().messages({
        "date.base": "Last date must be a valid date",
        "any.required": "Last date is required",
    }),

    jobStatus: Joi.string().valid("Open", "Closed", "Paused").default("Open"),
});

export const getJobsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    jobTitle: Joi.string().trim().allow(""),
    location: Joi.string().trim().allow(""),
    jobType: Joi.string().trim().allow(""),
    "experience.min": Joi.number().min(0),
    "salary.min": Joi.number().min(0),
}).unknown(true);

export const updateJobSchema = createJobSchema.fork(
    ["jobTitle", "companyName", "jobDescription", "location", "jobType", "experience", "requiredSkills", "lastDate"],
    (schema) => schema.optional()
).min(1);
