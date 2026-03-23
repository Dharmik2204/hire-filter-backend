# HireFilter - AI-Powered Recruitment & Applicant Tracking Platform (Backend Documentation)

---

## 1. Executive Summary
HireFilter is a high-performance, event-driven RESTful API engineered to streamline the end-to-end recruitment lifecycle. Built on a foundation of Node.js and MongoDB, the platform bridges the gap between candidates, recruiters (HR), and system administrators through real-time communication, automated applicant tracking, and a proprietary **Skills-Matrix Ranking Engine**.

The system is designed for high availability, implementing stateless JWT authentication, role-based access control (RBAC), and real-time state synchronization via WebSocket (Socket.io).

---

## 2. Core Architectural Pillars
The backend adheres to a refined **MRCSR (Model-Route-Controller-Service-Repository)** pattern, ensuring strict separation of concerns and a maintainable, testable codebase.

- **Presentation Layer (Routes):** Standardized URI structures with integrated Joi validation and security middleware.
- **Business Logic Layer (Services/Controllers):** Pure business rules, including the core ranking algorithms and notification dispatchers.
- **Data Access Layer (Repositories):** Abstracted persistence logic to decouple the business layer from Mongoose complexity.
- **Persistence Layer (Models):** Strongly-typed MongoDB schemas with strategic indexing for performant search.

---

## 3. Technology Stack & Infrastructure
- **Runtime:** Node.js (LTS), Express.js
- **Persistence:** MongoDB (Distributed via Atlas) with Mongoose ODM
- **Real-Time Subsystem:** Socket.io (WebSocket)
- **Security:** 
  - JWT (JSON Web Tokens) for stateless authentication.
  - Bcrypt for cryptographically secure password hashing.
  - CORS, Rate Limiting, and NoSQL Injection sanitization.
- **Cloud Integrations:**
  - **Cloudinary:** Edge-cached storage for resumes, avatars, and portfolio assets.
  - **Resend/Nodemailer:** Transactional email delivery for OTP and status updates.
- **Quality Assurance:** Jest, Supertest (Integration & Unit Testing)

---

## 4. System Modules & Functional Areas

### 4.1 Identity & Access Management (IAM)
- **Role-Based Access Control (RBAC):** Hierarchical permissions for `Admin`, `HR`, and `Candidate`.
- **OTP-Verified Signup:** Secure multi-step onboarding using ephemeral keys.
- **Stateless Session Management:** JWT-based verification with role-level guardrails.

### 4.2 Job & Application Lifecycle
- **Advanced Search Engine:** Full-text indexing for multi-parameter job discovery.
- **Skills-Matrix Ranking:** A deterministic algorithm that calculates candidate compatibility based on a 100% skill-match intersection. No external assessments required; ranking is instantaneous upon application.
- **Status Pipeline:** Standardized state transitions: `Applied` ➔ `Screening` ➔ `Interviewing` ➔ `Shortlisted` ➔ `Offer` ➔ `Hired`.

### 4.3 Real-Time Messaging & Notifications
- **Messaging:** 1:1 bidirectional chat with typing indicators and read receipts.
- **Notification Engine:** Unified dispatcher for In-App (Socket), Email, and Persistence-based alerts.

---

## 5. API Reference & Data Contracts

### 5.1 Global Response Format
All API responses follow a immutable JSend-inspired structure:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation Summary",
  "data": { ... },
  "errors": []
}
```

### 5.2 Key Endpoints
| Component | Route | Method | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | POST | Authenticates user and returns JWT. |
| **Jobs** | `/api/jobs` | GET | Paginated job listings with advanced filters. |
| **Applications** | `/api/application/:jobId/apply` | POST | Submits application and triggers re-ranking. |
| **Ranking** | `/api/ranks/:jobId` | GET | Returns ranked candidates (HR/Admin only). |
| **Messages** | `/api/messages/send` | POST | Dispatches real-time message via Socket.io. |

---

## 6. Data Modeling & Persistence
The system utilizes a relational-inspired strategy within MongoDB using Mongoose Population.

### 6.1 Application Schema (Core Entity)
```javascript
{
  job: ObjectId,        // Ref: Job  
  user: ObjectId,       // Ref: User
  score: Number,        // Normalized Skills Match (0-100)
  rank: Number,         // Calculated global position for the Job
  matchedSkills: [],    // Intersection of Job Requirements & Candidate Profile
  status: String,       // Current pipeline state
}
```
*Indexing: Compound index on `{ job: 1, score: -1 }` for high-speed rank retrieval.*

---

## 7. Security Implementation
- **Rate Limiting:** Protects IAM endpoints from brute force and DoS.
- **Input Sanitization:** Automated middleware to prevent XSS and NoSQL injection.
- **Environment Isolation:** Strict `.env` management with a production-ready configuration strategy.

---

## 8. Verification & Development Workflow
- **Unit Testing:** Jest suites covering core utilities (Ranking, Authentication).
- **Environment:** `npm run dev` (Nodemon hot-reloading) for rapid iteration.
- **Deployment-Ready:** Fully structured for containerization (Docker) and CI/CD pipelines.

---

## 9. Notes for UML & System Modeling
- **Sequence (Ranking):** `POST /apply` ➔ `Intersection Algorithm` ➔ `Bulk Update (Ranks)` ➔ `Socket Broadcast`.
- **State (Job):** `Open` ➔ `Filled` ➔ `Closed`.
- **Class Relationships:** `Job` (1:N) `Application` (N:1) `User`.

---
*Created by HireFilter Engineering Team - Senior Developer Technical Spec Ver 2.1*