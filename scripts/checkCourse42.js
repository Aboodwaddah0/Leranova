import "dotenv/config";
import prisma from "../src/utils/prisma.js";

try {
  // Check existing subjects for course 42
  const existingSubjects = await prisma.subject.findMany({
    where: { Course_id: 42 },
    select: { id: true, name: true, Course_id: true, Teacher_id: true },
    orderBy: { id: 'asc' }
  });

  console.log('=== EXISTING SUBJECTS FOR COURSE 42 ===');
  console.log(JSON.stringify(existingSubjects, null, 2));
  console.log(`Total: ${existingSubjects.length} subjects`);

  // Check course details
  const course = await prisma.course.findUnique({
    where: { id: 42 },
    select: { id: true, Name: true, Org_id: true }
  });
  console.log('\n=== COURSE 42 DETAILS ===');
  console.log(JSON.stringify(course, null, 2));

  // Check teacher
  const teacher = await prisma.user.findUnique({
    where: { email: 'academy_teacher@learnova.com' },
    select: { id: true, email: true, name: true }
  });

  console.log('\n=== ACADEMY TEACHER ===');
  console.log(JSON.stringify(teacher, null, 2));

  // Check teacher profile
  if (teacher?.id) {
    const teacherProfile = await prisma.teacher.findUnique({
      where: { Teacher_id: teacher.id },
      select: { Teacher_id: true, OrgId: true }
    });
    console.log('\n=== TEACHER PROFILE ===');
    console.log(JSON.stringify(teacherProfile, null, 2));
  }

  await prisma.$disconnect();
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
