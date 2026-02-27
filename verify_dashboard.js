const BASE_URL = 'http://localhost:5000/api';

async function testEndpoint(name, url, method = 'GET', expectedStatuses = [200]) {
    try {
        const options = { method };
        const res = await fetch(url, options);
        const statusMatch = expectedStatuses.includes(res.status);
        const icon = statusMatch ? '✅' : '❌';

        console.log(`${icon} [${method}] ${name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Status: ${res.status} (Expected: ${expectedStatuses.join(' or ')})`);
        console.log('---');

    } catch (error) {
        console.log(`❌ [${method}] ${name}`);
        console.error(`   Error: ${error.message}`);
        console.log('---');
    }
}

async function run() {
    console.log("Starting Dashboard API Verification...\n");

    // 1. Dashboard Routes (Protected - should return 401 without token)
    await testEndpoint('Dashboard - User Stats', `${BASE_URL}/dashboard/user-stats`, 'GET', [401]);
    await testEndpoint('Dashboard - HR Stats', `${BASE_URL}/dashboard/hr-stats`, 'GET', [401]);

    // 2. Application Detail Route (Protected - should return 401 without token)
    await testEndpoint('Application - Get Details (Invalid ID)', `${BASE_URL}/application/123`, 'GET', [401]);

    console.log("\nVerification Complete.");
}

run();
