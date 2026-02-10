import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates MCQs using Gemini AI.
 * @param {Object} params
 * @param {string} params.jobTitle
 * @param {string} params.jobDescription
 * @param {string} params.examType - technical, aptitude, etc.
 * @param {number} params.count - Number of questions to generate.
 * @returns {Promise<Array>} Array of question objects.
 */
export const generateQuestionsAI = async ({ jobTitle, jobDescription, examType, count }) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are an expert recruiter and examiner. 
      Generate exactly ${count} Multiple Choice Questions (MCQs) for a ${examType} exam for the role of "${jobTitle}".
      Context - Job Description: ${jobDescription}

      Output MUST be a valid JSON array of objects with the following structure:
      [
        {
          "question": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The exact text of the correct option",
          "category": "${examType}",
          "difficulty": "medium"
        }
      ]

      Return ONLY the JSON array. No preamble or markdown code blocks.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean text in case Gemini wraps it in markdown code blocks
    const cleanedText = text.replace(/```json|```/g, "").trim();

    try {
      const questions = JSON.parse(cleanedText);
      return questions;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text);
      throw new Error("AI response format was invalid.");
    }
  } catch (error) {
    console.error("Gemini AI Generation Error:", error);
    throw error;
  }
};
