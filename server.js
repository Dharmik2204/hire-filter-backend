import http from "http";
import app from "./app.js";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";
import { initializeSocket } from "./src/socket/socket.js";

dotenv.config();

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server is running on Port ${PORT}`);
        })
    }).catch((err) => {
        console.error("Error", err);
        process.exit(1);
    });
