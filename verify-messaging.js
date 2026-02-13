import axios from "axios";
import { io } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

// Test Users Credentials (ensure these exist in your DB or create them)
const USER_1 = { email: "hr@example.com", password: "Password123" }; // Create if needed
const USER_2 = { email: "candidate@example.com", password: "Password123" };

let token1, token2, userId1, userId2;
let socket1, socket2;

const login = async (user) => {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, user);
        return { token: res.data.data.token, userId: null }; // userId is inside token usually, but let's fetch profile
    } catch (e) {
        console.error("Login failed for", user.email);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", JSON.stringify(e.response.data, null, 2));
        } else {
            console.error("Error:", e.message);
        }
        process.exit(1);
    }
};

const getProfile = async (token) => {
    const res = await axios.get(`${BASE_URL}/users/getProfile`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data.data._id;
};

const connectSocket = (token, userId) => {
    return new Promise((resolve) => {
        const socket = io(SOCKET_URL, {
            // auth: { token } // If you implement middleware for socket auth
        });

        socket.on("connect", () => {
            console.log(`🔌 Socket connected for ${userId}: ${socket.id}`);
            socket.emit("join_room", userId);
            resolve(socket);
        });
    });
};

const runVerification = async () => {
    console.log("🚀 Starting Messaging Verification...");

    // 1. Login
    console.log("1. Logging in users...");
    const auth1 = await login(USER_1);
    token1 = auth1.token;
    userId1 = await getProfile(token1);

    const auth2 = await login(USER_2);
    token2 = auth2.token;
    userId2 = await getProfile(token2);

    console.log(`   User 1 (Sender): ${userId1}`);
    console.log(`   User 2 (Receiver): ${userId2}`);

    // 2. Connect Sockets
    console.log("2. Connecting sockets...");
    socket1 = await connectSocket(token1, userId1);
    socket2 = await connectSocket(token2, userId2);

    // Listen for messages on Socket 2
    socket2.on("new_message", (msg) => {
        console.log(`   📩 [Real-time] User 2 received: "${msg.content}"`);
    });

    socket2.on("message_updated", (msg) => {
        console.log(`   ✏️ [Real-time] User 2 saw update: "${msg.content}" (isEdited: ${msg.isEdited})`);
    });

    socket2.on("message_deleted", (msg) => {
        console.log(`   🗑️ [Real-time] User 2 saw delete: "${msg.content}" (isDeleted: ${msg.isDeleted})`);
    });

    // 3. Send Message (REST API)
    console.log("3. Sending message from User 1 to User 2...");
    const msgRes = await axios.post(
        `${BASE_URL}/messages/send`,
        { receiverId: userId2, content: "Hello from verification script!" },
        { headers: { Authorization: `Bearer ${token1}` } }
    );
    const messageId = msgRes.data.data._id;
    console.log("   ✅ Message Sent via API");

    await new Promise(r => setTimeout(r, 1000)); // Wait for socket event

    // 4. Edit Message
    console.log("4. Editing message...");
    await axios.put(
        `${BASE_URL}/messages/${messageId}`,
        { content: "Hello (Edited)" },
        { headers: { Authorization: `Bearer ${token1}` } }
    );
    console.log("   ✅ Message Edited via API");

    await new Promise(r => setTimeout(r, 1000));

    // 5. Delete Message
    console.log("5. Deleting message...");
    await axios.delete(
        `${BASE_URL}/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${token1}` } }
    );
    console.log("   ✅ Message Deleted via API");

    await new Promise(r => setTimeout(r, 1000));

    // 6. Fetch History
    console.log("6. Fetching conversation history...");
    const histRes = await axios.get(
        `${BASE_URL}/messages/conversation/${userId2}`,
        { headers: { Authorization: `Bearer ${token1}` } }
    );
    const history = histRes.data.data;
    const lastMsg = history[history.length - 1];

    if (lastMsg._id === messageId && lastMsg.isDeleted) {
        console.log("   ✅ History check passed: Last message is marked deleted.");
    } else {
        console.log("   ❌ History check failed", lastMsg);
    }

    console.log("\n✅ Verification Complete!");
    process.exit(0);
};

runVerification().catch(err => console.error(err));
