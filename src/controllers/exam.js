import {
  createExam,
  findExamByJobId,
  findExamById,
  getRandomQuestions,
  createExamAttempt,
  findAttemptByApplicationId,
  findAttemptById,
  saveExamAnswers,
  updateExamScore,
} from "../repositories/exam.repository.js";

import { getJobById } from "../repositories/job.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { isString, isNumber } from "../utils/Validation.js";

/* ======================
   CREATE EXAM (HR)
====================== */
export const createExamController = async (req, res) => {
  try {
    const {
      jobId,
      examType,
      title,
      questionCount,
      durationMinutes,
      passingMarks,

    } = req.body;

    if (!jobId || !isString(jobId)) {
      return res.status(400).json(new ApiError(400, "Job ID is required as a string"));
    }

    if (!examType || !isString(examType)) {
      return res.status(400).json(new ApiError(400, "Exam type is required as a string"));
    }

    if (!title || !isString(title)) {
      return res.status(400).json(new ApiError(400, "Title is required as a string"));
    }

    if (questionCount !== undefined && !isNumber(questionCount)) {
      return res.status(400).json(new ApiError(400, "Question count must be a number"));
    }

    if (durationMinutes !== undefined && !isNumber(durationMinutes)) {
      return res.status(400).json(new ApiError(400, "Duration minutes must be a number"));
    }

    if (passingMarks !== undefined && !isNumber(passingMarks)) {
      return res.status(400).json(new ApiError(400, "Passing marks must be a number"));
    }

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found"));
    }

    const existingExam = await findExamByJobId(jobId);
    if (existingExam) {
      return res.status(400).json(new ApiError(400, "Exam already exists for this job"));
    }

    const exam = await createExam({
      job: jobId,
      examType,
      title,
      questionCount,
      durationMinutes,
      passingMarks,
    });

    res.status(201).json(
      new ApiResponse(201, exam, "Exam created successfully")
    );
  } catch (error) {
    console.error("Create Exam Error:", error);
    res.status(500).json(new ApiError(500, "Failed to create exam", [], error.stack));
  }
};

/* ======================
   START EXAM (USER)
====================== */
export const startExamController = async (req, res) => {
  try {
    const { applicationId, examId } = req.body;
    const userId = req.user._id;

    if (!applicationId || !examId) {
      return res.status(400).json(new ApiError(400, "Application ID and Exam ID are required"));
    }

    if (!isString(applicationId) || !isString(examId)) {
      return res.status(400).json(new ApiError(400, "Application ID and Exam ID must be strings"));
    }

    const existingAttempt =
      await findAttemptByApplicationId(applicationId);

    if (existingAttempt) {
      return res.status(400).json(new ApiError(400, "Exam already started for this application"));
    }

    const exam = await findExamById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json(new ApiError(404, "Exam not available"));
    }

    // 🎯 Fetch random questions from QuestionBank
    const rawQuestions = await getRandomQuestions(
      exam.examType === "mixed"
        ? {
          categories: ["aptitude", "reasoning", "verbal"],
          limit: exam.questionCount,
        }
        : {
          category: exam.examType,
          limit: exam.questionCount,
        }
    );


    // 🔒 Snapshot questions (remove correctAnswer before sending)
    const snapshotQuestions = rawQuestions.map((q) => ({
      questionId: q._id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      marks: q.marks,
    }));

    const attempt = await createExamAttempt({
      applicationId,
      examId,
      userId,
      questions: snapshotQuestions,
      durationMinutes: exam.duration,
    });

    res.status(201).json(
      new ApiResponse(201, {
        attemptId: attempt._id,
        questions: snapshotQuestions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          options: q.options,
          marks: q.marks,
        })),
        duration: exam.duration,
      }, "Exam started successfully")
    );
  } catch (error) {
    console.error("Start Exam Error:", error);
    res.status(500).json(new ApiError(500, "Failed to start exam", [], error.stack));
  }
};

/* ======================
   SUBMIT EXAM (USER)
====================== */
export const submitExamController = async (req, res) => {
  try {
    const { attemptId } = req.params;
    if (!attemptId || !isString(attemptId)) {
      return res.status(400).json(new ApiError(400, "Attempt ID is required as a string"));
    }

    if (!answers || !isArray(answers)) {
      return res.status(400).json(new ApiError(400, "Answers are required as an array"));
    }

    const attempt = await findAttemptById(attemptId);

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found"));
    }

    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized submission"));
    }

    await saveExamAnswers(attemptId, answers);

    res.status(200).json(
      new ApiResponse(200, null, "Exam submitted successfully")
    );
  } catch (error) {
    console.error("Submit Exam Error:", error);
    res.status(500).json(new ApiError(500, "Failed to submit exam", [], error.stack));
  }
};

/* ======================
   EVALUATE EXAM (SYSTEM)
====================== */
export const evaluateExamController = async (req, res) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return res.status(400).json(new ApiError(400, "Attempt ID is required"));
    }

    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Attempt not found"));
    }

    let score = 0;

    for (const answer of attempt.answers) {
      const question = attempt.questions.find(
        (q) =>
          q.questionId.toString() ===
          answer.questionId.toString()
      );

      if (
        question &&
        question.correctAnswer === answer.selectedOption
      ) {
        score += question.marks;
      }
    }

    const updatedAttempt = await updateExamScore(
      attemptId,
      score
    );

    res.status(200).json(
      new ApiResponse(200, {
        score: updatedAttempt.score,
        status: updatedAttempt.status,
      }, "Exam evaluated successfully")
    );
  } catch (error) {
    console.error("Evaluate Exam Error:", error);
    res.status(500).json(new ApiError(500, "Failed to evaluate exam", [], error.stack));
  }
};
