const BASE_URL = 'http://localhost:5000/api';

async function main() {
  const loginRes = await fetch(`${BASE_URL}/auth/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'academy_student@learnova.com', password: '12345678' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.token || loginJson?.token;

  if (!token) {
    throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const subjectsRes = await fetch(`${BASE_URL}/courses/42/subjects`, { headers });
  const subjectsJson = await subjectsRes.json();
  const subjects = subjectsJson?.data || [];

  const javaSubject = subjects.find((s) => Number(s.id) === 278) || subjects[0];
  const lessonsRes = await fetch(`${BASE_URL}/subjects/${javaSubject.id}/lessons`, { headers });
  const lessonsJson = await lessonsRes.json();
  const lessons = lessonsJson?.data || [];
  const targetLesson = lessons.find((l) => Number(l.id) === 1455) || lessons[0];

  const assetsRes = await fetch(`${BASE_URL}/lessons/${targetLesson.id}/assets`, { headers });
  const assetsJson = await assetsRes.json();
  const assets = assetsJson?.data || [];

  const aiRes = await fetch(`${BASE_URL}/chatbot/ask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question: 'اعطني ملخص سريع لهذا الدرس',
      course_id: 42,
      subject_id: Number(javaSubject.id),
      lesson_id: Number(targetLesson.id),
    }),
  });
  const aiJson = await aiRes.json();

  console.log(JSON.stringify({
    subjectsStatus: subjectsRes.status,
    subjectsCount: subjects.length,
    lessonsStatus: lessonsRes.status,
    lessonsCount: lessons.length,
    assetsStatus: assetsRes.status,
    assetsCount: assets.length,
    sampleAsset: assets[0] || null,
    aiStatus: aiRes.status,
    aiHasAnswer: Boolean(aiJson?.data?.answer || aiJson?.answer),
    aiMessage: aiJson?.message || null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
