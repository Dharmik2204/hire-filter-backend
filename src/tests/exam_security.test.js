import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockGetJobByIdInternal = jest.fn();
const mockFindByJobAndCandidate = jest.fn();
const mockExamAttemptFindOne = jest.fn();

jest.unstable_mockModule("../repositories/job.repository.js", () => ({
  getJobByIdInternal: mockGetJobByIdInternal,
}));

jest.unstable_mockModule("../repositories/application.repository.js", () => ({
  findApplicationWithDetails: jest.fn(),
  findByJobAndCandidate: mockFindByJobAndCandidate,
}));

jest.unstable_mockModule("../repositories/exam.repository.js", () => ({
  createExam: jest.fn(),
  findExamsByJobId: jest.fn(),
  findExamById: jest.fn(),
  getRandomQuestions: jest.fn(),
  createExamAttempt: jest.fn(),
  findAttemptByExamAndApplication: jest.fn(),
  findAttemptByExamAndUser: jest.fn(),
  findAttemptById: jest.fn(),
  getAttemptsByExamId: jest.fn(),
  deleteExamById: jest.fn(),
  getQuestionsByExamId: jest.fn(),
  deleteQuestionById: jest.fn(),
  bulkInsertQuestions: jest.fn(),
  findExamByTitle: jest.fn(),
}));

jest.unstable_mockModule("../models/exam.models.js", () => ({
  ExamAttempt: {
    findOne: mockExamAttemptFindOne,
  },
}));

jest.unstable_mockModule("../utils/gemini.utils.js", () => ({
  generateQuestionsAI: jest.fn(),
}));

jest.unstable_mockModule("../services/exam-evaluation.service.js", () => ({
  enqueueExamEvaluation: jest.fn(),
}));

const { getMyExamResult, getExamByJobController } = await import("../controllers/exam.js");

const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.payload = null;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.payload = body;
    return res;
  });
  return res;
};

describe("Exam API Security Regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMyExamResult", () => {
    it("should never expose correctAnswer in detailedQuestions", async () => {
      const examId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId();

      mockExamAttemptFindOne.mockResolvedValue({
        status: "evaluated",
        score: 7,
        result: "pass",
        feedback: "Well done",
        answers: [{ questionId: "q1", selectedAnswer: "A" }],
        questions: [
          {
            toObject: () => ({
              questionId: "q1",
              question: "2 + 2 = ?",
              options: ["2", "3", "4", "5"],
              correctAnswer: "4",
              marks: 1,
            }),
          },
        ],
      });

      const req = {
        params: { examId },
        user: { _id: userId, role: "user" },
      };
      const res = createMockRes();

      await getMyExamResult(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.payload?.data?.detailedQuestions?.[0]).not.toHaveProperty("correctAnswer");
      expect(JSON.stringify(res.payload)).not.toMatch(/"correctAnswer":/);
    });
  });

  describe("getExamByJobController", () => {
    it("should block candidates who have not applied for the job", async () => {
      const jobId = new mongoose.Types.ObjectId().toString();

      mockGetJobByIdInternal.mockResolvedValue({
        _id: jobId,
        createdBy: new mongoose.Types.ObjectId(),
      });
      mockFindByJobAndCandidate.mockResolvedValue(null);

      const req = {
        params: { jobId },
        user: { _id: new mongoose.Types.ObjectId(), role: "user" },
      };
      const res = createMockRes();

      await getExamByJobController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.payload?.message).toContain("Access denied");
    });
  });
});
