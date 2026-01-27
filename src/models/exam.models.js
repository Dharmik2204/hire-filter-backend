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
            unique: true,
        },

        examType: {
            type: String,
            enum: ["aptitude", "reasoning", "mixed"],
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        questionCount: {
            type: Number,
            required: true,
        },

        duration: {
            type: Number,
            required: true,
        },

        passingMarks: {
            type: Number,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
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
        category: {
            type: String,
            enum: ["aptitude", "reasoning", "verbal"],
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
            type: Number,
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
            unique: true,
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

        questions: [
            {
                _id: false,
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "QuestionBank",
                },
                question: String,
                options: [String],
                correctAnswer: Number,
                marks: Number,
            },
        ],

        answers: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "QuestionBank",
                },
                selectedOption: Number,
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
