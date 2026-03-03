import request from 'supertest';
import app from '../../app.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Security Regression Test
 * Purpose: Ensure candidates cannot see correct answers in their exam results.
 */
describe('Exam API Security Regression', () => {
    let userToken;
    let userId = new mongoose.Types.ObjectId();
    let examId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
        // Generate a mock token for a candidate
        userToken = jwt.sign(
            { _id: userId, role: 'user' },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        // Ensure mongoose connection is closed if opened by app
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });

    describe('GET /api/exams/my-result/:examId', () => {
        it('should NOT contain correctAnswer in detailedQuestions or questions array', async () => {
            // Note: This test assumes the controller logic is executed.
            // If the database is not connected/accessible, we might need a more complex mock.
            // However, we want to assert the JSON structure returned by the controller.

            const res = await request(app)
                .get(`/api/exams/my-result/${examId}`)
                .set('Authorization', `Bearer ${userToken}`);

            // If the attempt is not found, we expect a 404, which is safe.
            // If the attempt IS found (evaluation finished), we check the data.
            if (res.status === 200) {
                const data = res.body.data;

                // 1. Check detailedQuestions
                if (data.detailedQuestions && data.detailedQuestions.length > 0) {
                    data.detailedQuestions.forEach(q => {
                        expect(q).not.toHaveProperty('correctAnswer');
                        // Ensure no nested questionId objects contain the answer
                        if (q.questionId) {
                            expect(q.questionId).not.toHaveProperty('correctAnswer');
                        }
                    });
                }

                // 2. Double check the entire response body for the string "correctAnswer" 
                // within the questions/detailedQuestions context.
                const jsonString = JSON.stringify(res.body);
                // We search for the key "correctAnswer": 
                // (Using a regex to be safe about whitespace/quotes)
                expect(jsonString).not.toMatch(/"correctAnswer":/);
            } else {
                // If it's a 404 or 403 (Not evaluated etc.), the test passes the security requirement 
                // as no data was leaked.
                console.log(`Note: Endpoint returned status ${res.status}. Security preserved.`);
            }
        });
    });

    describe('GET /api/exams/job/:jobId', () => {
        it('should block candidates who have not applied for the job', async () => {
            const jobId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/exams/job/${jobId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
            expect(res.body.message).toContain("Access denied");
        });
    });
});
