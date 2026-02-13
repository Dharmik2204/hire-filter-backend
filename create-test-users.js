import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { User } from "./src/models/users.models.js";
import connectDB from "./src/config/db.js";

dotenv.config();

const createTestUsers = async () => {
    try {
        await connectDB();

        const hashedPassword = await bcrypt.hash("Password123", 10);

        const users = [
            {
                name: "HR Test User",
                email: "hr@example.com",
                password: hashedPassword,
                role: "hr",
                company: "Test Corp"
            },
            {
                name: "Candidate Test User",
                email: "candidate@example.com",
                password: hashedPassword,
                role: "user"
            }
        ];

        for (const userData of users) {
            let user = await User.findOne({ email: userData.email });
            if (!user) {
                user = await User.create(userData);
                console.log(`✅ Created user: ${user.email}`);
            } else {
                // Update password to ensure login works
                user.password = hashedPassword;
                await user.save();
                console.log(`🔄 Updated user: ${user.email}`);
            }
        }

        console.log("Test users ready!");
        process.exit(0);
    } catch (error) {
        console.error("Error creating test users:", error);
        process.exit(1);
    }
};

createTestUsers();
