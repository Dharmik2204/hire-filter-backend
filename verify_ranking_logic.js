import mongoose from "mongoose";
import dotenv from "dotenv";
import { Application } from "./src/models/application.models.js";
import { recalculateRanks } from "./src/utils/rank.utils.js";

dotenv.config();

async function verifyRanking() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected Successfully.");

        const testJobId = new mongoose.Types.ObjectId();
        console.log(`Using Test Job ID: ${testJobId}`);

        // 1. Create Test Applications
        console.log("Creating Test Applications with different scores...");
        const apps = await Application.insertMany([
            { job: testJobId, user: new mongoose.Types.ObjectId(), score: 85, status: "applied" },
            { job: testJobId, user: new mongoose.Types.ObjectId(), score: 95, status: "applied" },
            { job: testJobId, user: new mongoose.Types.ObjectId(), score: 70, status: "applied" },
        ]);

        console.log("Applications created. Now recalculating ranks...");
        await recalculateRanks(testJobId);

        // 2. Verify Ranks
        const rankedApps = await Application.find({ job: testJobId }).sort({ rank: 1 });
        
        console.log("\n--- RANK RESULTS ---");
        rankedApps.forEach(app => {
            console.log(`Score: ${app.score} | Rank: ${app.rank}`);
        });

        // Validation
        if (rankedApps[0].score === 95 && rankedApps[0].rank === 1) {
            console.log("\n✅ VERIFICATION PASSED: Highest score got Rank 1.");
        } else {
            console.log("\n❌ VERIFICATION FAILED: Ranking logic incorrect.");
        }

        // 3. Cleanup
        console.log("\nCleaning up test data...");
        await Application.deleteMany({ job: testJobId });
        console.log("Cleanup complete.");

    } catch (error) {
        console.error("Verification failed with error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyRanking();
