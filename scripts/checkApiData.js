import "dotenv/config";
import prisma from "../src/utils/prisma.js";

try {
  console.log('=== CHECKING COURSE 42 API DATA ===\n');

  // Check subjects endpoint data
  const subjects = await prisma.subject.findMany({
    where: { Course_id: 42 },
    select: { id: true, name: true, Course_id: true, Teacher_id: true }
  });

  console.log('✅ Subjects in DB:');
  console.log(JSON.stringify(subjects, null, 2));

  // Check lessons for each subject
  console.log('\n✅ Lessons by subject:');
  for (const subject of subjects) {
    const lessons = await prisma.lesson.findMany({
      where: { Subject_id: subject.id },
      select: { id: true, name: true, Subject_id: true }
    });
    console.log(`\nSubject ${subject.id} (${subject.name}): ${lessons.length} lessons`);
    if (lessons.length > 0) {
      console.log(JSON.stringify(lessons, null, 2));
    }
  }

  // Now simulate what the API returns
  console.log('\n=== SIMULATING API RESPONSE ===\n');
  const apiResponse = await prisma.course.findUnique({
    where: { id: 42 },
    select: {
      id: true,
      Name: true,
      Org_id: true,
      subject: {
        select: {
          id: true,
          name: true,
          Teacher_id: true
        }
      }
    }
  });

  console.log('API would return:');
  console.log(JSON.stringify(apiResponse, null, 2));

  await prisma.$disconnect();
} catch (e) {
  console.error('Error:', e.message);
  console.error(e);
  process.exit(1);
}
