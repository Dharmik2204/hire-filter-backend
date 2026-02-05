import express from "express";
import cors from "cors";

import authRoutes from "./src/routes/auth.routes.js";
import jobRoutes from "./src/routes/job.routes.js";
import application from "./src/routes/application.routes.js";
import userRoute from "./src/routes/users.routes.js";
// import examRoutes from "./src/routes/exam.routes.js";
// import rankRoutes from "./src/routes/rank.routes.js";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoute);
app.use("/api/jobs", jobRoutes);
app.use("/api/application", application);
// app.use("/api/exams", examRoutes);
// app.use("/api/ranks", rankRoutes);

export default app;
