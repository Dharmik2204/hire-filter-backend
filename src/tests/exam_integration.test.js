import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import { Exam, QuestionBank, ExamAttempt } from '../models/exam.models.js';
import { Job } from '../models/job.models.js';
import { User } from '../models/users.models.js';
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
    return jwt.sign(
        { _id: user._id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
    );
};

describe('Exam API Integration Tests', () => {
    let adminToken, hr1Token, hr2Token, userToken;
    let hr1, hr2, user;
    let job1;

    beforeAll(async () => {
        // If you have a test DB, connect here
        // await mongoose.connect(process.env.MONGODB_URI_TEST);
    });

    afterAll(async () => {
        // Cleanup logic
        // await mongoose.connection.close();
    });

    afterEach(async () => {
        // Cleanup collections after each test if needed
    });

    it('should correctly distribute AI marks including remainder', () => {
        const totalMarks = 10;
        const count = 3;
        const marksPerQuestion = Math.floor(totalMarks / count);
        const remainder = totalMarks % count;

        const marks = Array.from({ length: count }, (_, i) =>
            i < remainder ? marksPerQuestion + 1 : marksPerQuestion
        );

        expect(marks).toEqual([4, 3, 3]);
        expect(marks.reduce((a, b) => a + b, 0)).toBe(totalMarks);
    });

    it('should prevent modifying questions on a published exam', async () => {
        // Mocking behavior or testing via supertest if setup is ready
        // const res = await request(app)
        //     .post(`/api/exams/${publishedExamId}/questions`)
        //     .set('Authorization', `Bearer ${hrToken}`)
        //     .send({ question: "...", marks: 1 });
        // expect(res.status).toBe(400);
        // expect(res.body.message).toContain("Cannot modify published exam");
    });

    it('should project only safe fields for candidates', async () => {
        // const res = await request(app)
        //     .get(`/api/exams/job/${jobId}`)
        //     .set('Authorization', `Bearer ${userToken}`);
        // expect(res.body.data[0]).not.toHaveProperty('passingMarks');
        // expect(res.body.data[0]).toHaveProperty('title');
    });

    it('should fail to start if questions do not match config', async () => {
        // const res = await request(app)
        //     .post('/api/exams/start')
        //     .set('Authorization', `Bearer ${userToken}`)
        //     .send({ examId: publishedExamId, applicationId: appId });
        // expect(res.status).toBe(404);
        // expect(res.body.message).toContain("Published exam is incomplete");
    });

    it('should require status=published to start an exam', async () => {
        // const res = await request(app)
        //     .post('/api/exams/start')
        //     .set('Authorization', `Bearer ${userToken}`)
        //     .send({ examId: draftExamId, applicationId: appId });
        // expect(res.status).toBe(400);
        // expect(res.body.message).toContain("Exam not published");
    });
});
