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
      duration,
      passingMarks,
    } = req.body;

    const job = await getJobById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const existingExam = await findExamByJobId(jobId);
    if (existingExam) {
      return res.status(400).json({
        message: "Exam already exists for this job",
      });
    }

    const exam = await createExam({
      job: jobId,
      examType,
      title,
      questionCount,
      duration,
      passingMarks,
    });

    res.status(201).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error("Create Exam Error:", error);
    res.status(500).json({ message: "Failed to create exam" });
  }
};

/* ======================
   START EXAM (USER)
====================== */
export const startExamController = async (req, res) => {
  try {
    const { applicationId, examId } = req.body;
    const userId = req.user._id;

    const existingAttempt =
      await findAttemptByApplicationId(applicationId);

    if (existingAttempt) {
      return res.status(400).json({
        message: "Exam already started for this application",
      });
    }

    const exam = await findExamById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        message: "Exam not available",
      });
    }

    // 🎯 Fetch random questions from QuestionBank
    const rawQuestions = await getRandomQuestions({
      category:
        exam.examType === "mixed"
          ? { $in: ["aptitude", "reasoning", "verbal"] }
          : exam.examType,
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
    });

    res.status(201).json({
      success: true,
      attemptId: attempt._id,
      questions: snapshotQuestions.map((q) => ({
        questionId: q.questionId,
        question: q.question,
        options: q.options,
        marks: q.marks,
      })),
      duration: exam.duration,
    });
  } catch (error) {
    console.error("Start Exam Error:", error);
    res.status(500).json({ message: "Failed to start exam" });
  }
};

/* ======================
   SUBMIT EXAM (USER)
====================== */
export const submitExamController = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        message: "Exam attempt not found",
      });
    }

    await saveExamAnswers(attemptId, answers);

    res.status(200).json({
      success: true,
      message: "Exam submitted successfully",
    });
  } catch (error) {
    console.error("Submit Exam Error:", error);
    res.status(500).json({ message: "Failed to submit exam" });
  }
};

/* ======================
   EVALUATE EXAM (SYSTEM)
====================== */
export const evaluateExamController = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        message: "Attempt not found",
      });
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

    res.status(200).json({
      success: true,
      score: updatedAttempt.score,
      status: updatedAttempt.status,
    });
  } catch (error) {
    console.error("Evaluate Exam Error:", error);
    res.status(500).json({ message: "Failed to evaluate exam" });
  }
};
