import {
  createExam,
  findExamsByJobId,
  findExamById,
  getRandomQuestions,
  createExamAttempt,
  findAttemptByApplicationId,
  findAttemptByExamAndApplication,
  findAttemptById,
  saveExamAnswers,
  updateExamScore,
  getAttemptsByExamId,
  deleteExamById,
} from "../repositories/exam.repository.js";

import { getJobById, getJobByIdInternal } from "../repositories/job.repository.js";
import { updateApplicationScore } from "../repositories/application.repository.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { formatError } from "../utils/errorHandler.js";
import { createExamSchema, startExamSchema, submitExamSchema } from "../validations/verify_exam_validations.js";

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
      difficulty,
      title,
      questionCount,
      durationMinutes,
      passingMarks,
      generateAI,
      topic
    } = value;

    const job = await getJobByIdInternal(jobId);
    if (!job) {
      return res.status(404).json(new ApiError(404, "Job not found", ["Job not found"]));
    }

    if (!job.isActive) {
      return res.status(400).json(new ApiError(400, "Cannot create exam for an inactive job", ["Cannot create exam for an inactive job"]));
    }

    const exam = await createExam({
      job: jobId,
      difficulty,
      title,
      questionCount,
      durationMinutes,
      passingMarks,
      generateAI: generateAI || false,
      topic: topic || ""
    });

    if (generateAI) {
      try {
        const aiQuestions = await generateQuestionsAI({
          jobTitle: job.jobTitle,
          jobDescription: job.description,
          difficulty,
          topic,
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
      await findAttemptByExamAndApplication(examId, applicationId);

    if (existingAttempt) {
      return res.status(400).json(new ApiError(400, "You have already started this specific exam", ["You have already started this specific exam"]));
    }

    const exam = await findExamById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json(new ApiError(404, "Exam not available", ["Exam not available"]));
    }

    // 🎯 Optimized Strategy: Fetch questions from QuestionBank (Database only)
    let finalQuestions = [];

    console.log(`Fetching questions from database for exam ${examId}...`);
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

    // 🔄 Global Fallback: If no questions found for this specific exam, pull from global pool based on exam topic
    if (finalQuestions.length === 0) {
      console.log(`No specific questions found for exam ${examId}. Attempting global category fallback...`);
      const globalQuestions = await getRandomQuestions({
        // No examId filter here
        category: exam.topic || undefined,
        limit: exam.questionCount,
      });

      if (globalQuestions && globalQuestions.length > 0) {
        finalQuestions = globalQuestions.map((q) => ({
          questionId: q._id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks,
        }));
      }
    }

    // Ensure we have questions
    if (finalQuestions.length === 0) {
      return res.status(404).json(new ApiError(404, "No questions available for this exam.", ["No questions available for this exam."]));
    }

    const attempt = await createExamAttempt({
      applicationId,
      examId,
      userId,
      questions: finalQuestions,
      durationMinutes: exam.durationMinutes,
    });

    // 🔒 Response Preparation
    // We must return the subdocument _id as "questionId" for the frontend to submit answers back.
    // For DB questions, it might have both _id and questionId. For AI, only _id.
    // The attempt.questions array now has _ids generated by Mongoose.

    const responseQuestions = attempt.questions.map((q) => ({
      questionId: q._id, // Use the unique subdocument ID for submission
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
      return res.status(400).json(new ApiError(400, "Attempt ID is required", ["Attempt ID is required"]));
    }

    const { answers } = value;

    const attempt = await findAttemptById(attemptId);

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json(new ApiError(403, "Unauthorized submission", ["Unauthorized submission"]));
    }

    if (attempt.status === "submitted" || attempt.status === "evaluated") {
      return res.status(400).json(new ApiError(400, "Exam already submitted", ["Exam already submitted"]));
    }

    // 1. Calculate Score (Raw Marks)
    let obtainedMarks = 0;
    let totalPossibleMarks = 0;

    if (attempt.questions && Array.isArray(attempt.questions)) {
      attempt.questions.forEach(q => {
        totalPossibleMarks += (q.marks || 1);
      });

      for (const answer of answers) {
        const question = attempt.questions.find(
          (q) => q._id && answer.questionId && q._id.toString() === answer.questionId.toString()
        );

        if (question && question.correctAnswer === answer.selectedOption) {
          obtainedMarks += (question.marks || 1);
        }
      }
    }

    const exam = await findExamById(attempt.exam);
    if (!exam) {
      console.error(`Exam definition not found for attempt ${attemptId}`);
    }

    const passingMarks = exam ? exam.passingMarks : 0;
    const resultStatus = obtainedMarks >= passingMarks ? "pass" : "fail";

    // 2. Save Answers & Update Exam Attempt Status
    const updatedAttempt = await updateExamScore(
      attemptId,
      obtainedMarks,
      resultStatus
    );

    await saveExamAnswers(attemptId, answers);

    // 3. Sync Score to Application & Auto-Rank
    if (attempt.application) {
      const application = await findApplicationWithDetails(attempt.application);
      if (application) {
        // Normalized Exam Score (50%)
        const examScoreWeighted = totalPossibleMarks > 0 ? (obtainedMarks / totalPossibleMarks) * 50 : 0;

        // Skills Score is already stored in the application (calculated during applyJob)
        const skillsScore = application.skillsScore || 0;

        // Total Composite Score
        const finalScore = Math.round(skillsScore + examScoreWeighted);

        // Use the new repository function to update all scoring analytics at once
        const { updateApplicationScoring } = await import("../repositories/application.repository.js");
        await updateApplicationScoring(attempt.application, {
          score: finalScore,
          examScore: Math.round(examScoreWeighted),
          examRawMarks: obtainedMarks,
          examTotalMarks: totalPossibleMarks,
          examResultStatus: resultStatus
        });

        // Trigger Re-ranking for the job
        const { recalculateRanks } = await import("../utils/rank.utils.js");
        if (exam && exam.job) {
          await recalculateRanks(exam.job);
        }
      }
    }

    res.status(200).json(
      new ApiResponse(200, {
        score: obtainedMarks,
        totalMarks: totalPossibleMarks,
        status: resultStatus,
      }, "Exam submitted and evaluated successfully")
    );
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to submit exam"));
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

    const exams = await findExamsByJobId(jobId);

    if (!exams || exams.length === 0) {
      return res.status(404).json(new ApiError(404, "No exams found for this job", ["No exams found for this job"]));
    }

    res.status(200).json(new ApiResponse(200, exams, "Exams fetched successfully"));
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
    const summaryAttempts = attempts.map(att => ({
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

    // Optimized: Find specific attempt directly
    const { ExamAttempt } = await import("../models/exam.models.js");
    const attempt = await ExamAttempt.findOne({ exam: examId, user: userId })
      .populate("questions.questionId"); // Populate if needed for details

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    // Always return full result (Auto-evaluation is now standard)
    res.status(200).json(
      new ApiResponse(200, {
        score: attempt.score,
        status: attempt.status,
        result: attempt.result,
        feedback: attempt.feedback,
        totalMarks: attempt.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        answers: attempt.answers,
        detailedQuestions: attempt.questions
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

    const attempt = await findAttemptById(attemptId); // Utility from repo

    if (!attempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
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
        user: attempt.user // Include user info for HR
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

    const { feedback } = req.body; // Restricted: Only feedback is allowed

    if (!attemptId) {
      return res.status(400).json(new ApiError(400, "Attempt ID is required", ["Attempt ID is required"]));
    }

    if (!feedback) {
      return res.status(400).json(new ApiError(400, "Feedback content is required", ["Feedback content is required"]));
    }

    const { addExamFeedback } = await import("../repositories/exam.repository.js");

    const updatedAttempt = await addExamFeedback(attemptId, feedback);

    if (!updatedAttempt) {
      return res.status(404).json(new ApiError(404, "Exam attempt not found", ["Exam attempt not found"]));
    }

    res.status(200).json(
      new ApiResponse(200, updatedAttempt, "Exam feedback added successfully")
    );

  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to add exam feedback"));
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
      return res.status(404).json(new ApiError(404, "Exam not found", ["Exam not found"]));
    }

    res.status(200).json(new ApiResponse(200, null, "Exam deleted successfully"));
  } catch (error) {
    res.status(500).json(formatError(error, 500, "Failed to delete exam"));
  }
};
