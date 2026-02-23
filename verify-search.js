import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:5000/api";

// Use credentials from your DB or .env
const USER_1 = { email: "hr@example.com", password: "Password123" };
const USER_2 = { email: "candidate@example.com", password: "Password123" };

let token1, token2, userId1, userId2;

const login = async (user) => {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, user);
        return res.data.data.token;
    } catch (e) {
        console.error("Login failed for", user.email);
        return null;
    }
};

const getProfile = async (token) => {
    const res = await axios.get(`${BASE_URL}/users/getProfile`, { headers: { Authorization: `Bearer ${token}` } });
    return res.data.data;
};

const searchUsers = async (token, query) => {
    try {
        const res = await axios.get(`${BASE_URL}/messages/search?query=${query}`, { headers: { Authorization: `Bearer ${token}` } });
        return res.data.data;
    } catch (e) {
        console.error("Search failed");
        return [];
    }
};

const runSearchVerification = async () => {
    console.log("🚀 Starting Search Verification...");

    // 1. Login
    console.log("1. Logging in users...");
    token1 = await login(USER_1);
    if (!token1) {
        console.log("❌ Skip: Could not login as HR. Ensure hr@example.com exists.");
        process.exit(1);
    }
    const profile1 = await getProfile(token1);
    userId1 = profile1._id;

    token2 = await login(USER_2);
    if (!token2) {
        console.log("❌ Skip: Could not login as Candidate. Ensure candidate@example.com exists.");
        process.exit(1);
    }
    const profile2 = await getProfile(token2);
    userId2 = profile2._id;

    console.log(`   HR: ${profile1.name} (${userId1})`);
    console.log(`   User: ${profile2.name} (${userId2})`);

    // 2. Search by Name
    console.log(`2. Searching for '${profile2.name}'...`);
    const resultsByName = await searchUsers(token1, profile2.name);
    if (resultsByName.some(u => u._id === userId2)) {
        console.log("   ✅ Found user by name.");
    } else {
        console.log("   ❌ User not found by name.");
    }

    // 3. Search by ID
    console.log(`3. Searching for ID '${userId2}'...`);
    const resultsById = await searchUsers(token1, userId2);
    if (resultsById.some(u => u._id === userId2)) {
        console.log("   ✅ Found user by ID.");
    } else {
        console.log("   ❌ User not found by ID.");
    }

    // 4. Verify self exclusion
    console.log("4. Verifying search excludes self...");
    const resultsSelf = await searchUsers(token1, profile1.name);
    if (resultsSelf.some(u => u._id === userId1)) {
        console.log("   ❌ HR found themselves in results.");
    } else {
        console.log("   ✅ HR is excluded from their own search results.");
    }

    console.log("\n✅ Search Verification Complete!");
    process.exit(0);
};

runSearchVerification().catch(err => console.error(err));
