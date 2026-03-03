import {
  createExam,
  findExamsByJobId,
  findExamById,
  getRandomQuestions,
  createExamAttempt,
  findAttemptByExamAndApplication,
  findAttemptByExamAndUser,
  findAttemptById,
  getAttemptsByExamId,
  deleteExamById,
  getQuestionsByExamId,
  deleteQuestionById,
  bulkInsertQuestions,
  findExamByTitle,
} from "../repositories/exam.repository.js";

import { getJobByIdInternal } from "../repositories/job.repository.js";
import mongoose from "mongoose";
import { ExamAttempt } from "../models/exam.models.js";
import { findApplicationWithDetails, findByJobAndCandidate } from "../repositories/application.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import {
  createExamSchema,
  startExamSchema,
  submitExamSchema,
  addExamQuestionSchema
} from "../validations/verify_exam_validations.js";

import { generateQuestionsAI } from "../utils/gemini.utils.js";
import { enqueueExamEvaluation } from "../services/exam-evaluation.service.js";

/* ======================
   CREATE EXAM (HR)
====================== */
export const createExamController = async (req, res) => {
  try {
    const { error, value } = createExamSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const {
      jobId,
      difficulty,
      title,
      questionCount,
      durationMinutes,
      passingMarks,
      generateAI,
      topic,
      totalMarks
    } = value;

    const job = await getJobByIdInternal(jobId);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found", ["Job not found"]));
    }

    // Role-based ownership check
    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own this job", ["Unauthorized"]));
    }

    if (!job.isActive) {
      return res.status(400).json(new ApiError(400, "Cannot create exam for an inactive job", ["Cannot create exam for an inactive job"]));
    }

    // Check if exam with the same title already exists (pre-check)
    const existingExam = await findExamByTitle(title);
    if (existingExam) {
      return res.status(409).json(new ApiError(409, "Exam with this title already exists", ["Exam title must be unique"]));
    }

    let exam;
    try {
      exam = await createExam({
        job: jobId,
        difficulty,
        title,
        questionCount,
        durationMinutes,
        passingMarks,
        totalMarks,
        generateAI: generateAI || false,
        topic: topic || "",
        status: "draft"
      });
    } catch (createError) {
      if (createError.code === 11000) {
        return res.status(409).json(new ApiError(409, "Exam with this title already exists", ["Duplicate title"]));
      }
      throw createError;
    }

    if (generateAI) {
      try {
        const aiQuestions = await generateQuestionsAI({
          jobTitle: job.jobTitle,
          jobDescription: job.jobDescription,
          difficulty,
          topic,
          count: questionCount
        });

        // Set marks for AI questions equally and distribute remainder
        const marksPerQuestion = Math.floor(totalMarks / questionCount);
        const remainder = totalMarks % questionCount;

        const questionsToInsert = aiQuestions.map((q, index) => ({
          ...q,
          exam: exam._id,
          marks: index < remainder ? marksPerQuestion + 1 : marksPerQuestion
        }));

        await bulkInsertQuestions(questionsToInsert);
      } catch (aiError) {
        console.error("AI Generation failed:", aiError);
        return res.status(201).json(
          new ApiResponse(201, { exam, aiError: "AI question generation failed, please add questions manually." }, "Exam created but AI failed")
        );
      }
    }

    res.status(201).json(
      new ApiResponse(201, exam, "Exam created successfully " + (generateAI ? "with AI questions" : ""))
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to create exam"));
  }
};

/* ======================
   START EXAM (USER)
====================== */
export const startExamController = async (req, res) => {
  try {
    const { error, value } = startExamSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { applicationId, examId } = value;
    const userId = req.user._id;

    const application = await findApplicationWithDetails(applicationId);
    if (!application) {
      return res.status(404).json(new ApiError(404, "Application not found", ["Application not found"]));
    }

    if (application.user?._id?.toString() !== userId.toString()) {
      return res.status(403).json(new ApiError(403, "You cannot start exam for another user's application", ["You cannot start exam for another user's application"]));
    }

    const exam = await findExamById(examId);
    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    if (exam.status !== "published") {
      return res.status(400).json(new ApiError(400, "Exam not published", ["Exam is currently in draft mode and cannot be started."]));
    }

    if (!exam.isActive) {
      return res.status(404).json(new ApiError(404, "Exam is inactive", ["Exam is inactive"]));
    }

    if (application.job?._id?.toString() !== exam.job.toString()) {
      return res.status(400).json(new ApiError(400, "Exam does not belong to this application's job", ["Exam does not belong to this application's job"]));
    }

    const existingAttemptByApplication = await findAttemptByExamAndApplication(examId, applicationId);
    const existingAttemptByUser = await findAttemptByExamAndUser(examId, userId);

    if (existingAttemptByApplication || existingAttemptByUser) {
      return res.status(400).json(new ApiError(400, "You have already started this exam", ["You have already started this exam"]));
    }

    let finalQuestions = [];

    const dbQuestions = await getRandomQuestions({
      examId,
      limit: exam.questionCount,
    });

    if (dbQuestions && dbQuestions.length > 0) {
      finalQuestions = dbQuestions.map((q) => ({
        questionId: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
      }));
    }

    finalQuestions = finalQuestions.slice(0, exam.questionCount);

    if (finalQuestions.length !== exam.questionCount) {
      return res.status(404).json(
        new ApiError(
          404,
          "Published exam is incomplete",
          [`Published exam requires exactly ${exam.questionCount} configured questions, but found ${finalQuestions.length}. Please contact HR.`]
        )
      );
    }

    // Scoring Consistency Check
    const totalActualMarks = finalQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    if (totalActualMarks !== exam.totalMarks) {
      return res.status(400).json(
        new ApiError(
          400,
          "Exam scoring inconsistency",
          [`The total marks of questions (${totalActualMarks}) does not match the exam's configured total marks (${exam.totalMarks}). Please contact HR.`]
        )
      );
    }

    const attempt = await createExamAttempt({
      applicationId,
      examId,
      userId,
      questions: finalQuestions,
      durationMinutes: exam.durationMinutes,
    });

    const responseQuestions = attempt.questions.map((q) => ({
      questionId: q.questionId,
      question: q.question,
      options: q.options,
      marks: q.marks,
    }));

    res.status(201).json(
      new ApiResponse(201, {
        attemptId: attempt._id,
        questions: responseQuestions,
        durationMinutes: exam.durationMinutes,
      }, "Exam started successfully")
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json(new ApiError(409, "You have already started this exam", ["Duplicate attempt"]));
    }
    res.status(500).json(formatError(error, 500, "Failed to start exam"));
  }
};

/* ======================
   SUBMIT EXAM (USER)
====================== */
export const submitExamController = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const { error, value } = submitExamSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    if (!attemptId) {
      return res.status(400).json(new ApiError(400, "Attempt ID is required", ["Attempt ID is required"]));
    }

    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    const attemptUserId = attempt.user?._id?.toString?.() || attempt.user?.toString?.();
    if (attemptUserId !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized submission", ["Unauthorized submission"]));
    }

    if (attempt.expiresAt && new Date() > new Date(attempt.expiresAt)) {
      return res.status(410).json(new ApiError(410, "Exam time is over", ["This exam attempt has expired"]));
    }

    if (attempt.status === "evaluated") {
      return res.status(200).json(
        new ApiResponse(200, {
          attemptId: attempt._id,
          status: attempt.status,
          score: attempt.score,
          result: attempt.result,
          evaluatedAt: attempt.evaluatedAt || null,
        }, "Exam already evaluated")
      );
    }

    if (attempt.status === "queued" || attempt.status === "evaluating") {
      return res.status(202).json(
        new ApiResponse(202, {
          attemptId: attempt._id,
          status: attempt.status,
          evaluationError: attempt.evaluationError || "",
        }, "Exam submission is already being processed")
      );
    }

    const { answers } = value;
    const uniqueAnswersMap = new Map();
    for (const answer of answers) {
      if (answer?.questionId) {
        uniqueAnswersMap.set(answer.questionId.toString(), answer);
      }
    }
    const normalizedAnswers = Array.from(uniqueAnswersMap.values());

    const queuedAttempt = await ExamAttempt.findOneAndUpdate(
      { _id: attemptId, user: req.user._id, status: { $in: ["started", "failed"] } },
      {
        $set: {
          answers: normalizedAnswers,
          status: "queued",
          evaluationError: "",
        },
      },
      { new: true }
    );

    if (!queuedAttempt) {
      const latestAttempt = await ExamAttempt.findById(attemptId).select("status score result evaluatedAt evaluationError");
      if (latestAttempt && ["queued", "evaluating", "evaluated"].includes(latestAttempt.status)) {
        return res.status(202).json(
          new ApiResponse(202, {
            attemptId: latestAttempt._id,
            status: latestAttempt.status,
            score: latestAttempt.score,
            result: latestAttempt.result,
            evaluatedAt: latestAttempt.evaluatedAt || null,
            evaluationError: latestAttempt.evaluationError || "",
          }, "Exam submission is already being processed")
        );
      }
      return res.status(409).json(new ApiError(409, "Exam submission conflict", ["Unable to queue this submission"]));
    }

    enqueueExamEvaluation(queuedAttempt._id);

    res.status(202).json(
      new ApiResponse(202, {
        attemptId: queuedAttempt._id,
        status: queuedAttempt.status,
      }, "Exam submitted successfully and queued for evaluation")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to submit exam"));
  }
};

/* ======================
   GET ATTEMPT EVALUATION STATUS (USER/HR/ADMIN)
====================== */
export const getAttemptEvaluationStatusController = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await findAttemptById(attemptId);

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    const requesterRole = req.user.role;
    const attemptUserId = attempt.user?._id?.toString?.() || attempt.user?.toString?.();
    if (requesterRole === "user" && attemptUserId !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized", ["Unauthorized"]));
    }

    if (requesterRole === "hr") {
      const exam = await findExamById(attempt.exam);
      if (!exam) {
        return res.status(404).json(new ApiError(404, "Exam associated with attempt not found", ["Exam not found"]));
      }
      const job = await getJobByIdInternal(exam.job);
      if (!job) {
        return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
      }
      if (job.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiError(403, "Unauthorized", ["Unauthorized"]));
      }
    }

    return res.status(200).json(
      new ApiResponse(200, {
        attemptId: attempt._id,
        status: attempt.status,
        score: attempt.score,
        result: attempt.result,
        evaluatedAt: attempt.evaluatedAt || null,
        evaluationError: attempt.evaluationError || "",
      }, "Attempt evaluation status fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch attempt status"));
  }
};

/* ======================
   EVALUATE EXAM (SYSTEM) - Deprecated / Admin Backup
====================== */
export const evaluateExamController = async (req, res) => {
  return res.status(410).json(new ApiError(410, "Manual evaluation is deprecated", ["Manual evaluation is deprecated. Exams are auto-evaluated on submission."]));
};

/* ======================
   GET EXAM BY JOB (HR/USER)
====================== */
export const getExamByJobController = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { getJobByIdInternal } = await import("../repositories/job.repository.js");
    const { findExamsByJobId } = await import("../repositories/exam.repository.js");

    const job = await getJobByIdInternal(jobId);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found", ["Job not found"]));
    }

    let exams;
    if (req.user.role === "admin") {
      exams = await findExamsByJobId(jobId);
    } else if (req.user.role === "hr") {
      // HR Ownership check
      if (job.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiError(403, "Unauthorized: You do not own this job", ["Unauthorized"]));
      }
      exams = await findExamsByJobId(jobId);
    } else {
      // Candidates only see published exams for the job and limited fields
      // BUT only if they have applied for the job
      const application = await findByJobAndCandidate(jobId, req.user._id);
      if (!application) {
        return res.status(403).json(new ApiError(403, "Access denied: You must apply for the job to see exam details", ["Access denied"]));
      }

      const { Exam } = await import("../models/exam.models.js");
      exams = await Exam.find(
        { job: jobId, status: "published" },
        { title: 1, durationMinutes: 1, questionCount: 1, difficulty: 1, topic: 1 }
      );
    }

    if (!exams || exams.length === 0) {
      return res.status(200).json(new ApiResponse(200, [], "No exams found for this job"));
    }

    res.status(200).json(new ApiResponse(200, exams, "Exams fetched successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam"));
  }
};

/* ======================
   PUBLISH EXAM (HR/ADMIN)
 ====================== */
export const publishExamController = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await findExamById(examId);

    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    // Ownership check
    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }
    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own this job", ["Unauthorized"]));
    }

    const { getQuestionsByExamId } = await import("../repositories/exam.repository.js");
    const questions = await getQuestionsByExamId(examId);

    // Validate Question Count
    if (questions.length !== exam.questionCount) {
      return res.status(400).json(new ApiError(400, "Invalid question count", [`Exam requires ${exam.questionCount} questions, but has ${questions.length}.`]));
    }

    // Validate Total Marks
    const actualMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    if (actualMarks !== exam.totalMarks) {
      return res.status(400).json(new ApiError(400, "Marks mismatch", [`Exam total marks should be ${exam.totalMarks}, but current questions total ${actualMarks}.`]));
    }

    const { Exam } = await import("../models/exam.models.js");
    await Exam.findByIdAndUpdate(examId, { status: "published", isActive: true });

    res.status(200).json(new ApiResponse(200, null, "Exam published successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to publish exam"));
  }
};

/* ======================
   GET EXAM ATTEMPTS (HR)
====================== */
export const getExamAttemptsController = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await findExamById(examId);
    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    // Role-based ownership check
    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    const attempts = await getAttemptsByExamId(examId);
    const summaryAttempts = attempts.map((att) => ({
      _id: att._id,
      user: att.user,
      score: att.score,
      status: att.status,
      result: att.result,
      startedAt: att.startedAt
    }));

    res.status(200).json(new ApiResponse(200, summaryAttempts, "Exam attempts fetched successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam attempts"));
  }
};

/* ======================
   GET MY EXAM RESULT (USER)
====================== */
export const getMyExamResult = async (req, res) => {
  try {
    const { examId } = req.params;

    const userId = req.user._id;

    const { ExamAttempt } = await import("../models/exam.models.js");
    const attempt = await ExamAttempt.findOne({ exam: examId, user: userId });

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    // Security Gate: Only allow when evaluation is finished
    if (["started", "queued", "evaluating"].includes(attempt.status)) {
      return res.status(403).json(new ApiError(403, "Result not available yet", ["You must submit your exam to see the result"]));
    }

    if (attempt.status === "failed") {
      return res.status(409).json(new ApiError(409, "Evaluation failed", [attempt.evaluationError || "Evaluation failed. Please retry submission."]));
    }

    // Remove correctAnswer from detailedQuestions carefully
    const safeDetailedQuestions = attempt.questions.map(q => {
      // Ensure we only take what is needed and NEVER the correct answer
      const qObj = q.toObject ? q.toObject() : { ...q };
      const { correctAnswer, ...safeQ } = qObj;
      return safeQ;
    });

    res.status(200).json(
      new ApiResponse(200, {
        score: attempt.score,
        status: attempt.status,
        result: attempt.result,
        feedback: attempt.feedback,
        totalMarks: attempt.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        answers: attempt.answers,
        detailedQuestions: safeDetailedQuestions
      }, "Exam result fetched successfully")
    );

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam result"));
  }
};

/* ======================
   GET ATTEMPT DETAILS (HR/ADMIN)
====================== */
export const getAttemptDetailsController = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await findAttemptById(attemptId);

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    // Role-based ownership check
    const exam = await findExamById(attempt.exam);
    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam associated with attempt not found", ["Exam not found"]));
    }

    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    res.status(200).json(
      new ApiResponse(200, {
        score: attempt.score,
        status: attempt.status,
        result: attempt.result,
        feedback: attempt.feedback,
        totalMarks: attempt.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        answers: attempt.answers,
        detailedQuestions: attempt.questions,
        user: attempt.user
      }, "Attempt details fetched successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch attempt details"));
  }
};

/* ======================
   ADD EXAM FEEDBACK (HR/ADMIN)
====================== */
export const addExamFeedbackController = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const { feedback } = req.body;

    if (!attemptId) {
      return res.status(400).json(new ApiError(400, "Attempt ID is required", ["Attempt ID is required"]));
    }

    if (!feedback) {
      return res.status(400).json(new ApiError(400, "Feedback content is required", ["Feedback content is required"]));
    }

    const { addExamFeedback } = await import("../repositories/exam.repository.js");

    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    // Role-based ownership check
    const exam = await findExamById(attempt.exam);
    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam associated with attempt not found", ["Exam not found"]));
    }

    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    const updatedAttempt = await addExamFeedback(attemptId, feedback);

    res.status(200).json(
      new ApiResponse(200, updatedAttempt, "Exam feedback added successfully")
    );

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to add exam feedback"));
  }
};

/* ======================
   ADD EXAM QUESTION (HR/ADMIN)
====================== */
export const addExamQuestionController = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { examId } = req.params;
    const { error, value } = addExamQuestionSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(new ApiError(400, "Validation failed", errorMessages));
    }

    const { Exam, QuestionBank } = await import("../models/exam.models.js");
    const exam = await Exam.findById(examId).session(session);
    if (!exam) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    if (exam.status === "published") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(new ApiError(400, "Cannot modify published exam", ["Unpublish or clone this exam before editing questions."]));
    }

    // Role-based ownership check
    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    const existingQuestions = await QuestionBank.find({ exam: examId }).session(session);

    // Validate question count limit
    if (existingQuestions.length + 1 > exam.questionCount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(new ApiError(400, "Question limit reached", [`The maximum number of questions for this exam is ${exam.questionCount}. You have already added ${existingQuestions.length} questions.`]));
    }

    // Calculate current total marks
    const currentTotalMarks = existingQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const newTotalMarks = currentTotalMarks + (value.marks || 1);

    // Validate total marks limit
    if (newTotalMarks > exam.totalMarks) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(new ApiError(400, "Marks limit reached", [`The maximum total marks for this exam is ${exam.totalMarks}. Current total marks: ${currentTotalMarks}, but adding this question would make it ${newTotalMarks}.`]));
    }

    const newQuestion = new QuestionBank({
      exam: examId,
      category: exam.topic || "General",
      difficulty: exam.difficulty,
      ...value
    });

    await newQuestion.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(new ApiResponse(201, newQuestion, "Question added successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json(formatError(error, 500, "Failed to add question"));
  }
};

/* ======================
   GET EXAM QUESTIONS (HR/ADMIN)
====================== */
export const getExamQuestionsController = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await findExamById(examId);
    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    // Role-based ownership check
    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    const questions = await getQuestionsByExamId(examId);
    res.status(200).json(new ApiResponse(200, questions, "Exam questions fetched successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam questions"));
  }
};

/* ======================
   DELETE EXAM QUESTION (HR/ADMIN)
====================== */
export const deleteExamQuestionController = async (req, res) => {
  try {
    const { questionId } = req.params;

    const { QuestionBank } = await import("../models/exam.models.js");
    const question = await QuestionBank.findById(questionId);
    if (!question) {
      return res.status(404).json(new ApiError(404, "Question not found", ["Question not found"]));
    }

    const exam = await findExamById(question.exam);
    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam associated with question not found", ["Exam not found"]));
    }

    if (exam.status === "published") {
      return res.status(400).json(new ApiError(400, "Cannot modify published exam", ["Unpublish or clone this exam before editing questions."]));
    }

    const job = await getJobByIdInternal(exam.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    const deletedQuestion = await deleteQuestionById(questionId);
    if (!deletedQuestion) {
      return res.status(404).json(new ApiError(404, "Question not found", ["Question not found"]));
    }

    res.status(200).json(new ApiResponse(200, null, "Question deleted successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete question"));
  }
};

/* ======================
   DELETE EXAM (HR)
====================== */
export const deleteExamController = async (req, res) => {
  try {
    const { examId } = req.params;

    const examToVerify = await findExamById(examId);
    if (!examToVerify) {
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    const job = await getJobByIdInternal(examToVerify.job);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job associated with exam not found", ["Job not found"]));
    }

    if (req.user.role !== "admin" && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized: You do not own the job associated with this exam", ["Unauthorized"]));
    }

    const exam = await deleteExamById(examId);

    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    res.status(200).json(new ApiResponse(200, null, "Exam deleted successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete exam"));
  }
};
