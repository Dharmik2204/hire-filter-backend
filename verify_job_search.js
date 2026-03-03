import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/jobs';

async function testSearch(title, params) {
    try {
        const res = await axios.get(BASE_URL, { params });
        console.log(`✅ ${title}`);
        console.log(`   URL: ${res.config.url}?${new URLSearchParams(res.config.params).toString()}`);
        console.log(`   Total Results: ${res.data.data.pagination?.total || 0}`);
        if (res.data.data.jobs?.length > 0) {
            console.log(`   First Result: ${res.data.data.jobs[0].jobTitle} @ ${res.data.data.jobs[0].companyName}`);
        }
    } catch (err) {
        console.log(`❌ ${title}`);
        console.log(`   Error: ${err.response?.data?.message || err.message}`);
    }
    console.log('---');
}

async function runTests() {
    console.log("Starting Job Search API Verification...\n");

    // 1. Basic Fetch
    await testSearch('All Jobs (Default)', { page: 1, limit: 2 });

    // 2. Global Search
    await testSearch('Global Search: "Developer"', { search: 'Developer' });

    // 3. Filter by Company
    await testSearch('Filter by Company Name', { companyName: 'Google' });

    // 4. Case-Insensitive Location
    await testSearch('Location Search (lowercase)', { location: 'mumbai' });

    // 5. Experience Range
    await testSearch('Experience Range (0-5 years)', { minExperience: 0, maxExperience: 5 });

    // 6. Salary Range 
    await testSearch('Salary Filter (Min 500,000)', { minSalary: 500000 });

    // 7. Sorting
    await testSearch('Sort by Title (ASC)', { sortBy: 'jobTitle', order: 'asc' });

    console.log("\nVerification Complete.");
}

runTests();
