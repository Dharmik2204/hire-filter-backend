import mongoose from "mongoose";
import { Exam, QuestionBank, ExamAttempt } from "../models/exam.models.js";

/* ===========================
   EXAM (HR)
=========================== */

export const createExam = (data) => {
    return Exam.create(data);
};

export const findExamByJobId = (jobId) => {
    return Exam.findOne({ job: jobId });
};

export const findExamById = (examId) => {
    return Exam.findById(examId);
};

export const deactivateExam = (examId) => {
    return Exam.findByIdAndUpdate(
        examId,
        { isActive: false },
        { new: true }
    );
};

export const deleteExamById = async (examId) => {
    // 1. Delete all questions associated with this exam
    await QuestionBank.deleteMany({ exam: examId });

    // 2. Delete all attempts associated with this exam
    await ExamAttempt.deleteMany({ exam: examId });

    // 3. Delete the exam itself
    return Exam.findByIdAndDelete(examId);
};

/* ===========================
   QUESTION BANK (GLOBAL)
=========================== */

// for seeding only
export const bulkInsertQuestions = (questions) => {
    return QuestionBank.insertMany(questions);
};


export const getRandomQuestions = ({ examId, category, categories, limit }) => {
    let match = {};

    if (examId) {
        match.exam = new mongoose.Types.ObjectId(examId);
    }

    if (category !== undefined) {
        match.category = category;
    } else if (Array.isArray(categories)) {
        match.category = { $in: categories };
    }

    return QuestionBank.aggregate([
        { $match: match },
        { $sample: { size: limit } }
    ]);
};


export const getQuestionsWithAnswers = (questionIds) => {
    return QuestionBank.find({ _id: { $in: questionIds } });
};

/* ===========================
   EXAM ATTEMPT
=========================== */

export const createExamAttempt = ({
    applicationId,
    examId,
    userId,
    questions,
    durationMinutes, // optional, in minutes
}) => {
    const expiresAt = new Date(Date.now() + ((durationMinutes || 60) * 60 * 1000));
    return ExamAttempt.create({
        application: applicationId,
        exam: examId,
        user: userId,
        questions,
        expiresAt,
    });
};

export const findAttemptByApplicationId = (applicationId) => {
    return ExamAttempt.findOne({ application: applicationId });
};

export const findAttemptById = (attemptId) => {
    return ExamAttempt.findById(attemptId);
};

export const saveExamAnswers = (attemptId, answers) => {
    return ExamAttempt.findByIdAndUpdate(
        attemptId,
        {
            answers,
            status: "submitted",
        },
        { new: true }
    );
};

// keep older name for compatibility
export const submitExamAnswers = saveExamAnswers;

export const updateExamScore = (attemptId, score, result) => {
    return ExamAttempt.findByIdAndUpdate(
        attemptId,
        {
            score,
            result,
            status: "evaluated",
        },
        { new: true }
    );
};

export const updateExamAttemptResult = (attemptId, score, status, result) => {
    return ExamAttempt.findByIdAndUpdate(
        attemptId,
        {
            score,
            status,
            result,
        },
        { new: true }
    );
};

export const addExamFeedback = (attemptId, feedback) => {
    return ExamAttempt.findByIdAndUpdate(
        attemptId,
        { feedback },
        { new: true }
    );
};

/* ===========================
   RANKING
=========================== */

export const getAttemptsByExamId = (examId) => {
    return ExamAttempt.find({ exam: examId })
        .populate("user", "name email")
        .sort({ score: -1 });
};
