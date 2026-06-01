/**
 * School Test Seed — creates a complete school organization with all features populated.
 * Run AFTER db:reset to get a clean slate.
 *
 * Usage:
 *   docker exec learnova-api node scripts/schoolTestSeed.js
 *
 * All accounts use password: Learnova@123
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";

const log = (msg) => console.log(`[SEED] ${msg}`);

// ── helpers ───────────────────────────────────────────────────────────────────

const d = (str) => new Date(str);

// Last 5 working days before today (Mon–Fri)
const getLastWeekDays = () => {
  const days = [];
  const today = new Date();
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1); // start from yesterday
  while (days.length < 5) {
    const dow = cursor.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor.toISOString().slice(0, 10)));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse(); // oldest first
};

const ATTENDANCE_PATTERNS = [
  ["PRESENT", "PRESENT", "LATE",   "ABSENT",  "PRESENT"],
  ["PRESENT", "ABSENT",  "PRESENT", "PRESENT", "PRESENT"],
  ["LATE",    "PRESENT", "PRESENT", "EXCUSED", "PRESENT"],
  ["PRESENT", "PRESENT", "PRESENT", "LATE",    "ABSENT"],
  ["ABSENT",  "PRESENT", "PRESENT", "PRESENT", "PRESENT"],
  ["PRESENT", "LATE",    "ABSENT",  "PRESENT", "PRESENT"],
];

// Deterministic marks: varies by studentIdx + subjectIdx
const markScore = (studentIdx, subjectIdx, isExam) => {
  const base = 60 + (studentIdx * 7 + subjectIdx * 5) % 30;
  return isExam ? Math.min(base + 10, 98) : base;
};

// ── main ──────────────────────────────────────────────────────────────────────

const run = async () => {
  await prisma.$connect();
  log("Connected to database");

  const pwHash = await hashPassword("Learnova@123");
  log("Password hashed");

  // ── 1. Organization ──────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      Name: "تلفيت للتعليم",
      Email: "school@learnova.test",
      Password_Hashed: pwHash,
      Role: "SCHOOL",
      status: "APPROVED",
      Phone: "+962799000001",
      Address: "عمّان، الأردن",
      organizationCode: "TALFEET",
    },
  });
  const orgId = org.id;
  log(`Organization created: id=${orgId}`);

  // ── 2. School settings ───────────────────────────────────────────────────
  await prisma.organization_school_settings.create({
    data: {
      OrgId: orgId,
      schoolYearStartMonth: 9,
      schoolYearStartDay: 1,
      promotionMonth: 6,
      promotionDay: 30,
      entryGradeMinAge: 6,
      passThresholdPercentage: 50,
      minSubjectPassPercentage: 50,
      requireAllSubjectsPass: true,
      classRanges: [{ from: 1, to: 12 }],
      maxFailedSubjects: 2,
      allowConditionalPromotion: false,
    },
  });
  log("School settings created");

  // ── 3. Academic year ─────────────────────────────────────────────────────
  const year = await prisma.academic_year.create({
    data: {
      OrgId: orgId,
      name: "2025-2026",
      startDate: d("2025-09-01"),
      endDate: d("2026-06-30"),
      numberOfTerms: 2,
      isActive: true,
    },
  });
  const yearId = year.id;
  log(`Academic year created: id=${yearId}`);

  // ── 4. Terms ─────────────────────────────────────────────────────────────
  const term1 = await prisma.term.create({
    data: {
      academicYearId: yearId,
      termNumber: 1,
      name: "الفصل الأول",
      startDate: d("2025-09-01"),
      endDate: d("2026-01-31"),
      status: "ACTIVE",
    },
  });
  const term2 = await prisma.term.create({
    data: {
      academicYearId: yearId,
      termNumber: 2,
      name: "الفصل الثاني",
      startDate: d("2026-02-01"),
      endDate: d("2026-06-30"),
      status: "PLANNED",
    },
  });
  log(`Terms created: term1=${term1.id}, term2=${term2.id}`);

  // ── 5. Grade classes (tracks) ────────────────────────────────────────────
  const grade4 = await prisma.track.create({
    data: {
      Org_id: orgId,
      Name: "الصف الرابع",
      kind: "CLASS",
      GradeLevel: 4,
      price: 0,
      isPaid: false,
    },
  });
  const grade5 = await prisma.track.create({
    data: {
      Org_id: orgId,
      Name: "الصف الخامس",
      kind: "CLASS",
      GradeLevel: 5,
      price: 0,
      isPaid: false,
    },
  });
  log(`Classes created: grade4=${grade4.id}, grade5=${grade5.id}`);

  // ── 6. Teachers ──────────────────────────────────────────────────────────
  const teacherData = [
    { name: "أحمد حسن",  email: "ahmed@learnova.test",  spec: "الرياضيات" },
    { name: "سارة علي",   email: "sara@learnova.test",   spec: "العلوم"     },
    { name: "عمر خالد",  email: "omar@learnova.test",   spec: "اللغة الإنجليزية" },
  ];

  const teachers = [];
  for (const td of teacherData) {
    const tUser = await prisma.user.create({
      data: {
        name: td.name,
        email: td.email,
        passwordHashed: pwHash,
        role: "TEACHER",
        mustChangePassword: false,
      },
    });
    const teacher = await prisma.teacher.create({
      data: {
        Teacher_id: tUser.id,
        OrgId: orgId,
        specialization: td.spec,
      },
    });
    teachers.push({ userId: tUser.id, teacherId: teacher.Teacher_id, ...td });
    log(`Teacher: ${td.name} (userId=${tUser.id})`);
  }
  const [t_math, t_science, t_english] = teachers;

  // ── 7. Subjects (courses) ─────────────────────────────────────────────────
  // Grade 4: Math, Science, English
  // Grade 5: Math, Science, English
  const subjectDefs = [
    { classId: grade4.id, name: "الرياضيات",        teacherId: t_math.teacherId    },
    { classId: grade4.id, name: "العلوم",             teacherId: t_science.teacherId },
    { classId: grade4.id, name: "اللغة الإنجليزية",   teacherId: t_english.teacherId },
    { classId: grade5.id, name: "الرياضيات",        teacherId: t_math.teacherId    },
    { classId: grade5.id, name: "العلوم",             teacherId: t_science.teacherId },
    { classId: grade5.id, name: "اللغة الإنجليزية",   teacherId: t_english.teacherId },
  ];

  const subjects = [];
  for (const sd of subjectDefs) {
    const sub = await prisma.course.create({
      data: {
        Course_id: sd.classId,
        Teacher_id: sd.teacherId,
        name: sd.name,
        isPaid: false,
        price: 0,
        imageUrl: "",
      },
    });
    subjects.push({ ...sub, classId: sd.classId });
    log(`Subject: ${sd.name} (id=${sub.id}, class=${sd.classId})`);
  }

  const g4Subjects = subjects.filter((s) => s.classId === grade4.id);
  const g5Subjects = subjects.filter((s) => s.classId === grade5.id);

  // ── 8. Students ───────────────────────────────────────────────────────────
  const studentDefs = [
    { name: "علي محمد",     email: "ali@learnova.test",     classId: grade4.id, grade: 4 },
    { name: "فاطمة أحمد",   email: "fatima@learnova.test",  classId: grade4.id, grade: 4 },
    { name: "حسن خالد",    email: "hassan@learnova.test",  classId: grade4.id, grade: 4 },
    { name: "نور عمر",     email: "nour@learnova.test",    classId: grade5.id, grade: 5 },
    { name: "كريم سامي",   email: "kareem@learnova.test",  classId: grade5.id, grade: 5 },
    { name: "ليلى حسن",    email: "layla@learnova.test",   classId: grade5.id, grade: 5 },
  ];

  const students = [];
  for (const sd of studentDefs) {
    const sUser = await prisma.user.create({
      data: {
        name: sd.name,
        email: sd.email,
        passwordHashed: pwHash,
        role: "STUDENT",
        mustChangePassword: false,
      },
    });
    const student = await prisma.student.create({
      data: {
        Student_id: sUser.id,
        OrgId: orgId,
        Course_id: sd.classId,
        GradeLevel: sd.grade,
        AcademicStatus: "ACTIVE",
      },
    });
    students.push({ userId: sUser.id, studentId: student.Student_id, classId: sd.classId, ...sd });
    log(`Student: ${sd.name} (userId=${sUser.id})`);
  }

  // ── 9. Parent (linked to first student: علي) ──────────────────────────────
  const parentUser = await prisma.user.create({
    data: {
      name: "محمد علي",
      email: "parent@learnova.test",
      passwordHashed: pwHash,
      role: "PARENT",
      mustChangePassword: false,
    },
  });
  const parent = await prisma.parent.create({
    data: {
      Parent_id: parentUser.id,
    },
  });
  // Link parent to student Ali
  await prisma.student.update({
    where: { Student_id: students[0].studentId },
    data: { Parent_id: parent.Parent_id },
  });
  log(`Parent created (userId=${parentUser.id}), linked to ${students[0].name}`);

  // ── 10. Attendance records ────────────────────────────────────────────────
  const attendanceDates = getLastWeekDays();
  log(`Attendance dates: ${attendanceDates.map((d) => d.toISOString().slice(0, 10)).join(", ")}`);

  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const student = students[sIdx];
    const classSubjects = student.classId === grade4.id ? g4Subjects : g5Subjects;
    const pattern = ATTENDANCE_PATTERNS[sIdx % ATTENDANCE_PATTERNS.length];

    for (const subject of classSubjects) {
      // Find the teacher who teaches this subject
      const teacherUserId =
        subject.Teacher_id === t_math.teacherId    ? t_math.userId    :
        subject.Teacher_id === t_science.teacherId ? t_science.userId :
        t_english.userId;

      for (let dIdx = 0; dIdx < attendanceDates.length; dIdx++) {
        const status = pattern[dIdx];
        await prisma.attendance.create({
          data: {
            studentId:     student.studentId,
            classId:       student.classId,
            subjectId:     subject.id,
            orgId:         orgId,
            academicYearId: yearId,
            date:          attendanceDates[dIdx],
            status:        status,
            markedBy:      teacherUserId,
          },
        });
      }
    }
  }
  log("Attendance records created");

  // ── 11. Marks ─────────────────────────────────────────────────────────────
  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const student = students[sIdx];
    const classSubjects = student.classId === grade4.id ? g4Subjects : g5Subjects;

    for (let subIdx = 0; subIdx < classSubjects.length; subIdx++) {
      const subject = classSubjects[subIdx];

      // MIDTERM mark
      await prisma.marks.create({
        data: {
          Student_id:     student.studentId,
          Subject_id:     subject.id,
          Numbers:        markScore(sIdx, subIdx, false),
          OutOf:          100,
          ExamPercentage: 40,
          MarkType:       "MIDTERM",
          termId:         term1.id,
          time:           d("2025-11-15"),
        },
      });

      // EXAM mark
      await prisma.marks.create({
        data: {
          Student_id:     student.studentId,
          Subject_id:     subject.id,
          Numbers:        markScore(sIdx, subIdx, true),
          OutOf:          100,
          ExamPercentage: 60,
          MarkType:       "EXAM",
          termId:         term1.id,
          time:           d("2026-01-20"),
        },
      });
    }
  }
  log("Marks created");

  // ── 12. School events ─────────────────────────────────────────────────────
  // Use first teacher's userId as createdBy (org has no user.id)
  const creatorId = teachers[0].userId;

  await prisma.school_event.createMany({
    data: [
      {
        orgId,
        createdBy: creatorId,
        title: "إجازة رأس السنة",
        description: "عطلة رأس السنة الميلادية",
        startDate: d("2026-01-01"),
        endDate: d("2026-01-03"),
        type: "HOLIDAY",
        termId: term1.id,
        isPublished: true,
      },
      {
        orgId,
        createdBy: creatorId,
        title: "امتحانات الفصل الأول",
        description: "امتحانات نهاية الفصل الدراسي الأول",
        startDate: d("2026-01-15"),
        endDate: d("2026-01-29"),
        type: "EXAM",
        termId: term1.id,
        isPublished: true,
      },
      {
        orgId,
        createdBy: creatorId,
        title: "اجتماع أولياء الأمور",
        description: "الاجتماع الدوري مع أولياء الأمور لمناقشة التقدم الدراسي",
        startDate: d("2026-02-10"),
        endDate: d("2026-02-10"),
        type: "PTA_MEETING",
        termId: term2.id,
        isPublished: true,
      },
    ],
  });
  log("School events created");

  // ── 13. Grade scale ───────────────────────────────────────────────────────
  const gradeScale = await prisma.grade_scale.create({
    data: { OrgId: orgId, name: "النظام القياسي" },
  });

  await prisma.grade_scale_range.createMany({
    data: [
      { gradeScaleId: gradeScale.id, grade: "A+", minScore: 95, maxScore: 100, gpaPoints: 4.0, isPassing: true },
      { gradeScaleId: gradeScale.id, grade: "A",  minScore: 85, maxScore:  94, gpaPoints: 3.7, isPassing: true },
      { gradeScaleId: gradeScale.id, grade: "B",  minScore: 75, maxScore:  84, gpaPoints: 3.0, isPassing: true },
      { gradeScaleId: gradeScale.id, grade: "C",  minScore: 65, maxScore:  74, gpaPoints: 2.0, isPassing: true },
      { gradeScaleId: gradeScale.id, grade: "D",  minScore: 50, maxScore:  64, gpaPoints: 1.0, isPassing: true },
      { gradeScaleId: gradeScale.id, grade: "F",  minScore:  0, maxScore:  49, gpaPoints: 0.0, isPassing: false },
    ],
  });
  log("Grade scale created");

  // ── 14. Assign registration numbers + update userSequence ────────────────
  const allUserIds = [
    ...teachers.map(t => t.userId),
    ...students.map(s => s.userId),
    parentUser.id,
  ];
  let seq = 0;
  for (const uid of allUserIds) {
    seq++;
    const regNum = `TALFEET-${String(seq).padStart(5, '0')}`;
    await prisma.user.update({ where: { id: uid }, data: { registrationNumber: regNum } });
  }
  await prisma.organization.update({
    where: { id: orgId },
    data: { userSequence: seq },
  });
  log(`Registration numbers assigned (TALFEET-00001 → TALFEET-${String(seq).padStart(5, '0')})`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║             SCHOOL SEED COMPLETE ✓                   ║");
  console.log("╠═══════════════════════════════════════════════════════╣");
  console.log("║  All accounts use password: Learnova@123              ║");
  console.log("╠═══════════════════════════════════════════════════════╣");
  console.log("║  Role          │ Email                                 ║");
  console.log("║  School Org    │ school@learnova.test                  ║");
  console.log("║  Teacher Math  │ ahmed@learnova.test                   ║");
  console.log("║  Teacher Sci   │ sara@learnova.test                    ║");
  console.log("║  Teacher Eng   │ omar@learnova.test                    ║");
  console.log("║  Student G4    │ ali@learnova.test                     ║");
  console.log("║  Student G5    │ nour@learnova.test                    ║");
  console.log("║  Parent        │ parent@learnova.test                  ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[SEED] Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
