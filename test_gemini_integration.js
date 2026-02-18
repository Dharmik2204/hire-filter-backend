
import { generateQuestionsAI } from "./src/utils/gemini.utils.js";
import dotenv from "dotenv";

dotenv.config();

const testGemini = async () => {
    console.log("Testing Gemini AI Integration...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("ERROR: GEMINI_API_KEY is not set in .env file.");
        process.exit(1);
    }
    console.log("GEMINI_API_KEY is present.");

    try {
        console.log("Sending request to Gemini...");
        const questions = await generateQuestionsAI({
            jobTitle: "Software Engineer",
            jobDescription: "MERN Stack Developer with 2 years of experience.",
            examType: "technical",
            count: 3
        });

        console.log("Response received!");
        console.log(`Generated ${questions.length} questions.`);
        console.log(JSON.stringify(questions, null, 2));

        if (questions.length > 0 && questions[0].question && questions[0].options) {
            console.log("SUCCESS: Gemini API is working correctly.");
        } else {
            console.error("FAILURE: Response format seems incorrect or empty.");
        }

    } catch (error) {
        console.error("FAILURE: Gemini API request failed.");
        console.error(error);
    }
};

testGemini();
