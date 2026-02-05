// import { Exam, QuestionBank, ExamAttempt } from "../models/exam.models.js";

// /* ===========================
//    EXAM (HR)
// =========================== */

// export const createExam = (data) => {
//     return Exam.create(data);
// };

// export const findExamByJobId = (jobId) => {
//     return Exam.findOne({ job: jobId, isActive: true });
// };

// export const findExamById = (examId) => {
//     return Exam.findById(examId);
// };

// export const deactivateExam = (examId) => {
//     return Exam.findByIdAndUpdate(
//         examId,
//         { isActive: false },
//         { new: true }
//     );
// };

// /* ===========================
//    QUESTION BANK (GLOBAL)
// =========================== */

// // for seeding only
// export const bulkInsertQuestions = (questions) => {
//     return QuestionBank.insertMany(questions);
// };


// export const getRandomQuestions = ({ category, categories, limit }) => {
//     let match;

//     if (category !== undefined) {
//         match = { category };
//     } else if (Array.isArray(categories)) {
//         match = { category: { $in: categories } };
//     } else {
//         match = {};
//     }

//     return QuestionBank.aggregate([
//         { $match: match },
//         { $sample: { size: limit } }
//     ]);
// };


// export const getQuestionsWithAnswers = (questionIds) => {
//     return QuestionBank.find({ _id: { $in: questionIds } });
// };

// /* ===========================
//    EXAM ATTEMPT
// =========================== */

// export const createExamAttempt = ({
//     applicationId,
//     examId,
//     userId,
//     questions,
//     durationMinutes, // optional, in minutes
// }) => {
//     const expiresAt = new Date(Date.now() + ((durationMinutes || 60) * 60 * 1000));
//     return ExamAttempt.create({
//         application: applicationId,
//         exam: examId,
//         user: userId,
//         questions,
//         expiresAt,
//     });
// };

// export const findAttemptByApplicationId = (applicationId) => {
//     return ExamAttempt.findOne({ application: applicationId });
// };

// export const findAttemptById = (attemptId) => {
//     return ExamAttempt.findById(attemptId);
// };

// export const saveExamAnswers = (attemptId, answers) => {
//     return ExamAttempt.findByIdAndUpdate(
//         attemptId,
//         {
//             answers,
//             status: "submitted",
//         },
//         { new: true }
//     );
// };

// // keep older name for compatibility
// export const submitExamAnswers = saveExamAnswers;

// export const updateExamScore = (attemptId, score) => {
//     return ExamAttempt.findByIdAndUpdate(
//         attemptId,
//         {
//             score,
//             status: "evaluated",
//         },
//         { new: true }
//     );
// };

// /* ===========================
//    RANKING
// =========================== */

// export const getAttemptsByExamId = (examId) => {
//     return ExamAttempt.find({ exam: examId })
//         .populate("user", "name email")
//         .sort({ score: -1 });
// };
