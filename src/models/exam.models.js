import mongoose from "mongoose";

/* =======================
   EXAM (HR CONFIG)
======================= */
const examSchema = new mongoose.Schema(
    {
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: true,
        },

        examType: {
            type: String,
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        questionCount: {
            type: Number,
            required: true,
            min: 1
        },

        durationMinutes: {
            type: Number,
            required: true,
            min: 1
        },

        passingMarks: {
            type: Number,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        generateAI: {
            type: Boolean,
            default: false,
        },
        topic: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

export const Exam = mongoose.model("Exam", examSchema);

/* =======================
   QUESTION BANK
======================= */
const questionBankSchema = new mongoose.Schema(
    {
        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
        },

        category: {
            type: String,
            required: true,
        },

        question: {
            type: String,
            required: true,
        },

        options: {
            type: [String],
            required: true,
        },

        correctAnswer: {
            type: String,
            required: true,
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },

        marks: {
            type: Number,
            default: 1,
        },
    },
    { timestamps: true }
);

export const QuestionBank = mongoose.model(
    "QuestionBank",
    questionBankSchema
);

/* =======================
   EXAM ATTEMPT
======================= */
const examAttemptSchema = new mongoose.Schema(
    {
        application: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Application",
            required: true,
        },

        exam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        startedAt: {
            type: Date,
            default: Date.now,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        result: {
            type: String,
            enum: ["pass", "fail"],
        },
        questions: [
            {
                // _id: true by default, allowing unique IDs for transient AI questions
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "QuestionBank",
                },
                question: String,
                options: [String],
                correctAnswer: String,
                marks: Number,
            },
        ],

        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "QuestionBank",
                },
                selectedOption: String,
            },
        ],

        score: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ["started", "submitted", "evaluated"],
            default: "started",
        },

        feedback: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

examAttemptSchema.index(
    { exam: 1, user: 1 },
    { unique: true }
);

export const ExamAttempt = mongoose.model(
    "ExamAttempt",
    examAttemptSchema
);
