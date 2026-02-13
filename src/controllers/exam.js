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
/* ======================
   SUBMIT EXAM (USER) - Auto-Evaluate & Rank
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

    if (attempt.status === "submitted" || attempt.status === "evaluated") {
      return res.status(400).json(new ApiError(400, "Exam already submitted"));
    }

    // 1. Calculate Score
    let score = 0;
    for (const answer of answers) {
      const question = attempt.questions.find(
        (q) => q.questionId.toString() === answer.questionId.toString()
      );

      if (question && question.correctAnswer === answer.selectedOption) {
        score += question.marks;
      }
    }

    const exam = await findExamById(attempt.examId);
    const passingMarks = exam ? exam.passingMarks : 0;
    const resultStatus = score >= passingMarks ? "pass" : "fail";

    // 2. Save Answers & Update Request Status
    // We update the attempt with the calculated result immediately
    const updatedAttempt = await updateExamScore(
      attemptId,
      score,
      resultStatus
    );

    // Also save the specific answers provided by user
    await saveExamAnswers(attemptId, answers);


    // 3. Sync Score to Application & Auto-Rank
    // We import the new utility to recalculate ranks
    const { recalculateRanks } = await import("../utils/rank.utils.js");

    // Update Application Score - NOTE: for now we just set exam score. 
    // If you want composite score (Skills + Exam), we should calculate that here or in repo.
    // For simplicity in this step, we push the EXAM SCORE to the application.
    await updateApplicationScore(attempt.application, score);

    // Trigger Re-ranking for the job
    // We do this asynchronously to not block the response response time significantly, 
    // or await it if strict consistency is needed. Awaiting is safer for "instant" rank feedback.
    await recalculateRanks(exam.job);

    res.status(200).json(
      new ApiResponse(200, {
        score,
        status: resultStatus,
        message: "Exam submitted and evaluated successfully"
      }, "Exam submitted successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to submit exam"));
  }
};

/* ======================
   EVALUATE EXAM (SYSTEM) - Deprecated / Admin Backup
====================== */
export const evaluateExamController = async (req, res) => {
  // Kept for manual re-evaluation if needed by Admin
  return res.status(200).json(new ApiResponse(200, null, "Auto-evaluation is now enabled on submission."));
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
   GET MY EXAM RESULT (USER)
====================== */
export const getMyExamResult = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.user._id;

    // Find exam attempt for this user and exam
    const attempts = await getAttemptsByExamId(examId);
    const attempt = attempts.find(a => a.user._id.toString() === userId.toString());

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found"));
    }

    if (attempt.status !== "evaluated") {
      return res.status(200).json(
        new ApiResponse(200, {
          status: attempt.status,
          message: "Result pending evaluation"
        }, "Result pending")
      );
    }

    // Prepare detailed response
    // Re-fetch questions to get correct answers for comparison if needed
    // For now, serving stored answers and score
    res.status(200).json(
      new ApiResponse(200, {
        score: attempt.score,
        status: attempt.status,
        result: attempt.result,
        totalMarks: attempt.questions.reduce((sum, q) => sum + q.marks, 0),
        answers: attempt.answers,
        detailedQuestions: attempt.questions // Includes correct answers if stored in snapshot
      }, "Exam result fetched successfully")
    );

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to fetch exam result"));
  }
};

/* ======================
   UPDATE EXAM RESULT (HR/ADMIN)
====================== */
export const updateExamResultController = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { score, status, result } = req.body;

    if (!attemptId) {
      return res.status(400).json(new ApiError(400, "Attempt ID is required"));
    }

    // Update Exam Attempt
    // Assuming a new repository function `updateExamAttemptResult` exists or reusing updateExamScore
    // We added updateExamAttemptResult in repository
    const { updateExamAttemptResult } = await import("../repositories/exam.repository.js");

    const updatedAttempt = await updateExamAttemptResult(attemptId, score, status, result);

    if (!updatedAttempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found"));
    }

    // Sync with Application
    await updateApplicationScore(updatedAttempt.application, score);

    res.status(200).json(
      new ApiResponse(200, updatedAttempt, "Exam result updated successfully")
    );

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to update exam result"));
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
