import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function dropIndex() {
    try {
        const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
        if (!uri) {
            console.error("❌ Database connection URL (MONGO_URL or MONGODB_URI) not found in .env");
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log("Connected to MongoDB...");

        const db = mongoose.connection.db;
        const collection = db.collection("exams");

        console.log("Dropping unique index 'job_1'...");
        await collection.dropIndex("job_1");

        console.log("✅ Success! Unique index 'job_1' dropped. You can now create multiple exams for the same job.");
        process.exit(0);
    } catch (error) {
        if (error.codeName === "IndexNotFound") {
            console.log("Index 'job_1' already dropped or not found.");
            process.exit(0);
        }
        console.error("❌ Error dropping index:", error);
        process.exit(1);
    }
}

dropIndex();
