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
  getAttemptsByExamId,
  deleteExamById,
} from "../repositories/exam.repository.js";

import { getJobById } from "../repositories/job.repository.js";
import { updateApplicationScore } from "../repositories/application.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { createExamSchema, startExamSchema, submitExamSchema } from "../validations/exam.validation.js";

import { generateQuestionsAI } from "../utils/gemini.utils.js";
import { bulkInsertQuestions } from "../repositories/exam.repository.js";

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
      examType,
      title,
      questionCount,
      durationMinutes,
      passingMarks,
      generateAI,
      topic
    } = value;

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
      generateAI: generateAI || false
    });

    if (generateAI) {
      try {
        const aiQuestions = await generateQuestionsAI({
          jobTitle: job.jobTitle,
          jobDescription: job.description + (topic ? ` Topic: ${topic}` : ""),
          examType,
          count: questionCount
        });

        const questionsToInsert = aiQuestions.map(q => ({
          ...q,
          exam: exam._id
        }));

        await bulkInsertQuestions(questionsToInsert);
      } catch (aiError) {
        console.error("AI Generation failed:", aiError);
        // We could delete the exam here if we want atomic behavior, but maybe let HR edit it?
        // For now, let's keep it and return a message.
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

    const existingAttempt =
      await findAttemptByApplicationId(applicationId);

    if (existingAttempt) {
      return res.status(400).json(new ApiError(400, "Exam already started for this application"));
    }

    const exam = await findExamById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json(new ApiError(404, "Exam not available"));
    }

    // 🎯 Fetch random questions from QuestionBank (prioritize ones for this exam)
    const rawQuestions = await getRandomQuestions({
      examId,
      category: exam.examType === "mixed" ? undefined : exam.examType,
      categories: exam.examType === "mixed" ? ["aptitude", "reasoning", "verbal"] : undefined,
      limit: exam.questionCount,
    });


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
      durationMinutes: exam.durationMinutes,
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
        durationMinutes: exam.durationMinutes,
      }, "Exam started successfully")
    );
  } catch (error) {
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
      return res.status(400).json(new ApiError(400, "Attempt ID is required"));
    }

    const { answers } = value;

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
    res.status(500).json(formatError(error, 500, "Failed to submit exam"));
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

    const exam = await findExamById(attempt.examId);
    const passingMarks = exam ? exam.passingMarks : 0;
    const resultStatus = score >= passingMarks ? "pass" : "fail";

    const updatedAttempt = await updateExamScore(
      attemptId,
      score,
      resultStatus
    );

    // Sync score to application for ranking
    await updateApplicationScore(attempt.application, score);

    res.status(200).json(
      new ApiResponse(200, {
        score: updatedAttempt.score,
        status: updatedAttempt.status,
      }, "Exam evaluated successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to evaluate exam"));
  }
};

/* ======================
   GET EXAM BY JOB (HR/USER)
====================== */
export const getExamByJobController = async (req, res) => {
  try {
    const { jobId } = req.params;
    const exam = await findExamByJobId(jobId);

    if (!exam) {
      return res.status(404).json(new ApiError(404, "No exam found for this job"));
    }

    res.status(200).json(new ApiResponse(200, exam, "Exam fetched successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam"));
  }
};

/* ======================
   GET EXAM ATTEMPTS (HR)
====================== */
export const getExamAttemptsController = async (req, res) => {
  try {
    const { examId } = req.params;
    const attempts = await getAttemptsByExamId(examId);

    res.status(200).json(new ApiResponse(200, attempts, "Exam attempts fetched successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam attempts"));
  }
};

/* ======================
   DELETE EXAM (HR)
====================== */
export const deleteExamController = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await deleteExamById(examId);

    if (!exam) {
      return res.status(404).json(new ApiError(404, "Exam not found"));
    }

    res.status(200).json(new ApiResponse(200, null, "Exam deleted successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete exam"));
  }
};
