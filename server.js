import "dotenv/config";
import http from "http";
import app from "./app.js";
import connectDB from "./src/config/db.js";
import { initializeSocket } from "./src/socket/socket.js";
import { recoverQueuedEvaluations } from "./src/services/exam-evaluation.service.js";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

connectDB()
    .then(() => {
        recoverQueuedEvaluations()
            .then((count) => {
                if (count > 0) {
                    console.log(`Recovered ${count} queued exam evaluation(s)`);
                }
            })
            .catch((error) => {
                console.error("Failed to recover queued evaluations", error);
            });

        server.listen(PORT, () => {
            console.log(`Server is running on Port ${PORT}`);
        })
    }).catch((err) => {
        console.error("Error", err);
        process.exit(1);
    });
