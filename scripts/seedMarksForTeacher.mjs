import 'dotenv/config';
import prisma from '../src/utils/prisma.js';

const teacherEmail = process.argv[2] || 'abood.waddah@talfeet.com';
const TARGET_GRADE = process.argv[3] ? parseInt(process.argv[3], 10) : 7; // الصف السابع by default
const MARK_MIN = 30; // أدنى علامة
const MARK_MAX = 95; // أعلى علامة

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(async () => {
  try {
    console.log('[seedMarksForTeacher] teacher:', teacherEmail);

    const teacherUser = await prisma.user.findUnique({ where: { email: teacherEmail } });
    if (!teacherUser) throw new Error(`User not found: ${teacherEmail}`);

    const teacher = await prisma.teacher.findUnique({ where: { Teacher_id: teacherUser.id } });
    if (!teacher) throw new Error(`Teacher record not found for user id ${teacherUser.id}`);

    const orgId = teacher.OrgId;
    console.log('[seedMarksForTeacher] orgId:', orgId);

    const course = await prisma.course.findFirst({
      where: { Org_id: orgId, GradeLevel: TARGET_GRADE },
      orderBy: { id: 'asc' },
    });
    if (!course) throw new Error(`No course found for Grade ${TARGET_GRADE} in org ${orgId}.`);

    console.log('[seedMarksForTeacher] target course:', course.Name, course.id);

    const subjects = await prisma.subject.findMany({ where: { Course_id: course.id } });
    if (!subjects.length) throw new Error('No subjects found for the course.');

    const students = await prisma.student.findMany({ where: { Course_id: course.id } });
    if (!students.length) throw new Error('No students found in the class.');

    const subjectIds = subjects.map(s => s.id);
    const studentIds = students.map(s => s.Student_id);

    // Remove existing marks for these students/subjects (safe for dev/testing)
    const deleted = await prisma.marks.deleteMany({
      where: {
        Student_id: { in: studentIds },
        Subject_id: { in: subjectIds },
      },
    });

    console.log(`[seedMarksForTeacher] deleted ${deleted.count || deleted} existing marks`);

    const created = [];
    for (const student of students) {
      for (const subject of subjects) {
        const base = (student.Student_id % 5) * 12; // 0,12,24,36,48
        const score = Math.max(MARK_MIN, Math.min(MARK_MAX, base + rand(40, 70)));
        const m = await prisma.marks.create({
          data: {
            Student_id: student.Student_id,
            Subject_id: subject.id,
            Numbers: score,
            OutOf: 100,
            ExamPercentage: 100,
            MarkType: 'EXAM',
            time: new Date(),
          },
        });
        created.push(m);
      }
    }

    console.log(`[seedMarksForTeacher] done. Created ${created.length} marks for ${students.length} students × ${subjects.length} subjects.`);
    process.exit(0);
  } catch (err) {
    console.error('[seedMarksForTeacher] ERROR:', err.message || err);
    process.exit(1);
  }
})();
