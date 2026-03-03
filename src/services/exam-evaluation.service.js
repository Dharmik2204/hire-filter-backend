import { ExamAttempt } from "../models/exam.models.js";
import { findExamById } from "../repositories/exam.repository.js";
import { findApplicationWithDetails } from "../repositories/application.repository.js";

const processingAttemptIds = new Set();

const normalizeAnswersByQuestion = (answers = []) => {
    const uniqueAnswersMap = new Map();
    for (const answer of answers) {
        if (answer?.questionId) {
            uniqueAnswersMap.set(answer.questionId.toString(), answer);
        }
    }
    return Array.from(uniqueAnswersMap.values());
};

const evaluateAttemptScore = (attempt) => {
    let obtainedMarks = 0;
    let totalPossibleMarks = 0;
    const normalizedAnswers = normalizeAnswersByQuestion(attempt.answers || []);

    if (!Array.isArray(attempt.questions)) {
        return { obtainedMarks, totalPossibleMarks };
    }

    attempt.questions.forEach((q) => {
        totalPossibleMarks += (q.marks || 1);
    });

    for (const answer of normalizedAnswers) {
        const question = attempt.questions.find(
            (q) => q.questionId && answer.questionId && q.questionId.toString() === answer.questionId.toString()
        );

        if (
            question &&
            Array.isArray(question.options) &&
            question.options.includes(answer.selectedOption) &&
            question.correctAnswer === answer.selectedOption
        ) {
            obtainedMarks += (question.marks || 1);
        }
    }

    return { obtainedMarks, totalPossibleMarks };
};

export const evaluateQueuedAttempt = async (attemptId) => {
    const evaluatingAttempt = await ExamAttempt.findOneAndUpdate(
        { _id: attemptId, status: "queued" },
        { $set: { status: "evaluating", evaluationError: "" } },
        { new: true }
    );

    if (!evaluatingAttempt) {
        return null;
    }

    try {
        const { obtainedMarks, totalPossibleMarks } = evaluateAttemptScore(evaluatingAttempt);
        const exam = await findExamById(evaluatingAttempt.exam);
        const passingMarks = exam ? exam.passingMarks : 0;
        const resultStatus = obtainedMarks >= passingMarks ? "pass" : "fail";

        const finalizedAttempt = await ExamAttempt.findOneAndUpdate(
            { _id: attemptId, status: "evaluating" },
            {
                $set: {
                    score: obtainedMarks,
                    result: resultStatus,
                    status: "evaluated",
                    evaluatedAt: new Date(),
                    evaluationError: "",
                },
            },
            { new: true }
        );

        if (!finalizedAttempt) {
            return null;
        }

        if (finalizedAttempt.application) {
            const application = await findApplicationWithDetails(finalizedAttempt.application);
            if (application) {
                const examScoreWeighted = totalPossibleMarks > 0 ? (obtainedMarks / totalPossibleMarks) * 50 : 0;
                const skillsScore = application.skillsScore || 0;
                const finalScore = Math.round(skillsScore + examScoreWeighted);

                const { updateApplicationScoring } = await import("../repositories/application.repository.js");
                await updateApplicationScoring(finalizedAttempt.application, {
                    score: finalScore,
                    examScore: Math.round(examScoreWeighted),
                    examRawMarks: obtainedMarks,
                    examTotalMarks: totalPossibleMarks,
                    examResultStatus: resultStatus,
                });

                const { recalculateRanks } = await import("../utils/rank.utils.js");
                if (exam && exam.job) {
                    await recalculateRanks(exam.job);
                }
            }
        }

        return finalizedAttempt;
    } catch (error) {
        await ExamAttempt.findByIdAndUpdate(attemptId, {
            $set: {
                status: "failed",
                evaluationError: error?.message || "Evaluation failed",
            },
            $inc: { retryCount: 1 },
        });
        throw error;
    }
};

export const enqueueExamEvaluation = (attemptId) => {
    const key = attemptId.toString();
    if (processingAttemptIds.has(key)) {
        return;
    }

    processingAttemptIds.add(key);
    setImmediate(async () => {
        try {
            await evaluateQueuedAttempt(key);
        } catch (error) {
            console.error(`[ExamEvaluation] Failed for attempt ${key}:`, error);
        } finally {
            processingAttemptIds.delete(key);
        }
    });
};

export const recoverQueuedEvaluations = async () => {
    await ExamAttempt.updateMany(
        { status: "evaluating" },
        { $set: { status: "queued", evaluationError: "Recovered after restart" } }
    );

    const pendingAttempts = await ExamAttempt.find({ status: "queued" })
        .select("_id")
        .sort({ updatedAt: 1 })
        .lean();

    pendingAttempts.forEach((attempt) => enqueueExamEvaluation(attempt._id));
    return pendingAttempts.length;
};
