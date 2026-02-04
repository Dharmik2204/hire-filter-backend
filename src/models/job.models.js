import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
    {
        /* ================= BASIC INFO ================= */

        jobTitle: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 100,
            index: true,
        },

        companyName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        jobDescription: {
            type: String,
            required: true,
            minlength: 5,
        },

        location: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        jobType: {
            type: String,
            enum: ["Full-Time", "Part-Time", "Internship", "Contract", "Remote"],
            required: true,
            index: true,
        },

        /* ================= EXPERIENCE ================= */

        experience: {
            min: {
                type: Number,
                required: true,
                min: 0,
            },
            max: {
                type: Number,
                required: true,
                min: 0,
            },
        },

        /* ================= SALARY ================= */

        salary: {
            min: {
                type: Number,
                default: 0,
            },
            max: {
                type: Number,
                default: 0,
            },
            currency: {
                type: String,
                default: "INR",
            },
            isNegotiable: {
                type: Boolean,
                default: false,
            },
        },

        /* ================= SKILLS ================= */

        requiredSkills: {
            type: [String],
            required: true,
            index: true,
        },

        /* ================= EDUCATION ================= */

        education: {
            type: String,
            enum: [
                "Any",
                "10th",
                "12th",
                "Diploma",
                "Graduate",
                "Post-Graduate",
            ],
            default: "Any",
        },

        /* ================= JOB DETAILS ================= */

        openings: {
            type: Number,
            default: 1,
            min: 1,
        },

        noticePeriod: {
            type: Number, // days
            default: 0,
        },

        benefits: {
            type: [String], // ["WFH", "Health Insurance"]
            default: [],
        },

        /* ================= APPLICATION ================= */

        lastDate: {
            type: Date,
            required: true,
        },

        jobStatus: {
            type: String,
            enum: ["Open", "Closed", "Paused"],
            default: "Open",
            index: true,
        },

        applicationsCount: {
            type: Number,
            default: 0,
        },

        viewsCount: {
            type: Number,
            default: 0,
        },

        /* ================= META ================= */

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

/* ================= INDEXES ================= */

// search optimization
jobSchema.index({
    jobTitle: 1,
    location: 1,
    jobType: 1,
    "experience.min": 1,
    "salary.min": 1,
});



export const Job = mongoose.model("Job", jobSchema);
