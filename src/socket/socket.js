import { Server } from "socket.io";

let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Allow all origins for now, secure in production
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join user to their own room for private messaging
        socket.on("join_room", (userId) => {
            if (userId) {
                socket.join(userId);
                console.log(`User ${userId} joined room ${userId}`);
            }
        });

        // Typing Indicator Event
        socket.on("typing", ({ senderId, receiverId, isTyping }) => {
            if (receiverId) {
                socket.to(receiverId).emit("display_typing", {
                    senderId,
                    isTyping
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
