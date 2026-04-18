import "dotenv/config";

const BASE_URL = "http://localhost:5000/api";

async function testSubjectsAndLessons() {
  try {
    console.log("🔍 Testing Subjects and Lessons Endpoints\n");

    // Get token for academy_student
    console.log("1️⃣ Login as academy_student...");
    const loginRes = await fetch(`${BASE_URL}/auth/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "academy_student@learnova.com",
        password: "12345678",
      }),
    });

    const loginData = await loginRes.json();
    const token = loginData?.data?.token || loginData?.token;
    
    if (!token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    console.log("✅ Token obtained\n");

    const headers = { Authorization: `Bearer ${token}` };

    // Test subjects endpoint
    console.log("2️⃣ Fetching subjects for course 42...");
    const subjectsRes = await fetch(`${BASE_URL}/courses/42/subjects`, {
      headers,
    });

    const subjectsData = await subjectsRes.json();
    const subjects = subjectsData?.data;
    
    console.log(`Status: ${subjectsRes.status}`);
    console.log(`Response:`, JSON.stringify(subjectsData, null, 2));
    console.log(`✅ Got ${subjects?.length || 0} subjects:`);
    console.log(JSON.stringify(subjects, null, 2));

    // Test lessons for each subject
    if (subjects && subjects.length > 0) {
      console.log("\n3️⃣ Fetching lessons for each subject...\n");

      for (const subject of subjects) {
        console.log(`  Subject ${subject.id} (${subject.name}):`);
        try {
          const lessonsRes = await fetch(
            `${BASE_URL}/subjects/${subject.id}/lessons`,
            { headers }
          );
          const lessonsData = await lessonsRes.json();
          const lessons = lessonsData?.data;
          console.log(`    Status: ${lessonsRes.status}`);
          console.log(`    ✅ Found ${lessons?.length || 0} lessons`);
          if (lessons && lessons.length > 0) {
            console.log(
              `       Examples: ${lessons
                .slice(0, 2)
                .map((l) => l.name)
                .join(", ")}`
            );
          }
        } catch (e) {
          console.log(`    ❌ Error: ${e.message}`);
        }
      }
    }

    console.log("\n✅ Test complete!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testSubjectsAndLessons();
