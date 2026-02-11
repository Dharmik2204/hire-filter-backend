
const BASE_URL = 'http://localhost:5000/api';
const AUTH_URL = 'http://localhost:5000/api/auth';
const HEALTH_URL = 'http://localhost:5000/health';

async function testEndpoint(name, url, method = 'GET', expectedStatuses = [200]) {
    try {
        const options = { method };
        if (method === 'POST' || method === 'PUT') {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify({});
        }

        const res = await fetch(url, options);
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text.substring(0, 100);
        }

        const statusMatch = expectedStatuses.includes(res.status);
        const icon = statusMatch ? '✅' : '❌';

        console.log(`${icon} [${method}] ${name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: ${res.status} (Expected: ${expectedStatuses.join(' or ')})`);
        if (!statusMatch) {
            console.log(`   Response:`, data);
        }
        console.log('---');

    } catch (error) {
        console.log(`❌ [${method}] ${name}`);
        console.error(`   Error: ${error.message}`);
        console.log('---');
    }
}

async function run() {
    console.log("Starting API Verification...\n");

    // 1. Health
    await testEndpoint('Health Check', HEALTH_URL, 'GET', [200]);

    // 2. Auth (Public)
    await testEndpoint('Auth - Login (Invalid Creds)', `${AUTH_URL}/login`, 'POST', [400, 401]); // 400 validation, 401 invalid creds
    await testEndpoint('Auth - Signup (Validation)', `${AUTH_URL}/signup`, 'POST', [400]);
    await testEndpoint('Auth - Forgot Password', `${AUTH_URL}/forgot-password`, 'POST', [400]);

    // 3. User Routes (Protected)
    // Expect 401 Unauthorized because we are not sending a token. 
    // This confirms the route is mounted and middleware is active.
    await testEndpoint('User - Get Profile', `${BASE_URL}/users/getProfile`, 'GET', [401]);
    await testEndpoint('User - Update Profile', `${BASE_URL}/users/updateProfile`, 'PUT', [401]);

    // 4. Job Routes (Mixed)
    await testEndpoint('Jobs - Get All (Public)', `${BASE_URL}/jobs`, 'GET', [200]); // Public
    await testEndpoint('Jobs - Create (Protected)', `${BASE_URL}/jobs`, 'POST', [401]);

    // 5. Application Routes (Protected)
    await testEndpoint('Apps - My Apps', `${BASE_URL}/application/my`, 'GET', [401]);

    // 6. Exam Routes (Protected)
    await testEndpoint('Exams - Create', `${BASE_URL}/exams`, 'POST', [401]);

    // 7. Rank Routes (Protected)
    await testEndpoint('Ranks - Get (Invalid ID)', `${BASE_URL}/ranks/123`, 'GET', [401]);

    console.log("\nVerification Complete.");
}

run();
