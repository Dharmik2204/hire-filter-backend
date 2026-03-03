import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_URL = "http://localhost:8000/api"; // Adjust port if needed

// Note: This script assumes a running server and valid credentials
// For a real automated test, we would use a test database and mock auth

const testNotifications = async () => {
    console.log("Starting Notification System Verification...");

    // 1. You would need a valid JWT token to run this against a live server
    // For now, I'll provide the logic that should be tested manually or in a controlled environment

    /*
    Steps to verify:
    1. Login as a candidate and an HR.
    2. HR sends a message to candidate.
    3. Check /api/notifications for candidate -> should have a "message" type notification.
    4. HR updates candidate application status to "hired".
    5. Check /api/notifications for candidate -> should have an "application_status" type notification.
    6. Candidate marks a notification as read via PATCH /api/notifications/:id/read.
    7. Check /api/notifications -> isRead should be true.
    */

    console.log("\nManual Verification Steps:");
    console.log("1. Send a message: POST /api/messages");
    console.log("2. Check notifications: GET /api/notifications");
    console.log("3. Update status: PATCH /api/application/status/:id (set to 'hired')");
    console.log("4. Check notifications again: GET /api/notifications");
};

testNotifications();
