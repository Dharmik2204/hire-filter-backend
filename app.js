import express from "express";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import { generalLimiter } from "./src/middlewares/rateLimiter.middlewares.js";

import authRoutes from "./src/routes/auth.routes.js";
import jobRoutes from "./src/routes/job.routes.js";
import application from "./src/routes/application.routes.js";
import userRoute from "./src/routes/users.routes.js";
import examRoutes from "./src/routes/exam.routes.js";
import rankRoutes from "./src/routes/rank.routes.js";
import messageRoutes from "./src/routes/message.routes.js";
import healthRoutes from "./src/routes/health.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(express.json());

// JSON Syntax Error Handler
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            statusCode: 400,
            success: false,
            message: "Invalid JSON syntax in request body",
            errors: [err.message],
            data: null
        });
    }
    next();
});

app.use(cors());
app.use(mongoSanitize());
app.use(generalLimiter);

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoute);
app.use("/api/jobs", jobRoutes);
app.use("/api/application", application);
app.use("/api/exams", examRoutes);
app.use("/api/ranks", rankRoutes);
app.use("/api/messages", messageRoutes);

import { globalErrorHandler } from "./src/middlewares/error.middlewares.js";
app.use(globalErrorHandler);

export default app;
