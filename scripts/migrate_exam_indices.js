import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const migrate = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGODB_URI not found in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB for migration...");

        const db = mongoose.connection.db;
        const examsCollection = db.collection("exams");

        try {
            await examsCollection.dropIndex("job_1");
            console.log("Successfully dropped 'job_1' index from exams collection.");
        } catch (error) {
            if (error.codeName === "IndexNotFound") {
                console.log("'job_1' index does not exist or already dropped.");
            } else {
                throw error;
            }
        }

        console.log("Migration completed.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
