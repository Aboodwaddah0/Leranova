/**
 * School Test Seed — creates a complete school organization with ALL features populated.
 *
 * Usage:
 *   1. docker exec learnova-api node scripts/resetPlans.js   (seed plans first)
 *   2. docker exec learnova-api node scripts/schoolTestSeed.js
 *
 * All accounts use password: Learnova@123
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";

const log = (msg) => console.log(`[SEED] ${msg}`);
const d = (str) => new Date(str);

const getLastWeekDays = () => {
  const days = [];
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (days.length < 5) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor.toISOString().slice(0, 10)));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
};

const ATTENDANCE_PATTERNS = [
  ["PRESENT", "PRESENT", "LATE",    "ABSENT",  "PRESENT"],
  ["PRESENT", "ABSENT",  "PRESENT", "PRESENT", "PRESENT"],
  ["LATE",    "PRESENT", "PRESENT", "EXCUSED", "PRESENT"],
  ["PRESENT", "PRESENT", "PRESENT", "LATE",    "ABSENT"],
  ["ABSENT",  "PRESENT", "PRESENT", "PRESENT", "PRESENT"],
  ["PRESENT", "LATE",    "ABSENT",  "PRESENT", "PRESENT"],
];

const markScore = (studentIdx, subjectIdx, offset = 0) => {
  const base = 60 + (studentIdx * 7 + subjectIdx * 5 + offset) % 30;
  return Math.min(base, 98);
};

const run = async () => {
  await prisma.$connect();
  log("Connected to database");

  const pwHash = await hashPassword("Learnova@123");
  log("Password hashed");

  // ── 1. Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      Name: "Greenfield International School",
      Email: "school@learnova.test",
      Password_Hashed: pwHash,
      Role: "SCHOOL",
      status: "APPROVED",
      Phone: "+1-555-000-0100",
      Address: "123 Education Blvd, Springfield",
      Description: "Greenfield International School — Excellence in Education from Grade 4 to Grade 5",
      organizationCode: "GRNSFL",
    },
  });
  const orgId = org.id;
  log(`Organization created: id=${orgId}`);

  // ── 2. School settings ───────────────────────────────────────────────────────
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

  // ── 3. Academic year ─────────────────────────────────────────────────────────
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

  // ── 4. Terms ─────────────────────────────────────────────────────────────────
  // Both terms are CLOSED so the seed is immediately ready for promotion testing
  // (runAnnualPromotionForOrg requires every term in the active year to be CLOSED/LOCKED).
  const term1 = await prisma.term.create({
    data: {
      academicYearId: yearId,
      termNumber: 1,
      name: "First Semester",
      startDate: d("2025-09-01"),
      endDate: d("2026-01-31"),
      status: "CLOSED",
    },
  });
  const term2 = await prisma.term.create({
    data: {
      academicYearId: yearId,
      termNumber: 2,
      name: "Second Semester",
      startDate: d("2026-02-01"),
      endDate: d("2026-06-30"),
      status: "CLOSED",
    },
  });
  log(`Terms created: term1=${term1.id}, term2=${term2.id}`);

  // ── 4b. Next academic year (target session for promotion) ───────────────────
  const nextYear = await prisma.academic_year.create({
    data: {
      OrgId: orgId,
      name: "2026-2027",
      startDate: d("2026-09-01"),
      endDate: d("2027-06-30"),
      numberOfTerms: 2,
      isActive: false,
    },
  });
  await prisma.term.create({
    data: {
      academicYearId: nextYear.id,
      termNumber: 1,
      name: "First Semester",
      startDate: d("2026-09-01"),
      endDate: d("2027-01-31"),
      status: "PLANNED",
    },
  });
  await prisma.term.create({
    data: {
      academicYearId: nextYear.id,
      termNumber: 2,
      name: "Second Semester",
      startDate: d("2027-02-01"),
      endDate: d("2027-06-30"),
      status: "PLANNED",
    },
  });
  log(`Next academic year created: id=${nextYear.id} (target session for promotion)`);

  // ── 5. Grade classes (tracks) ────────────────────────────────────────────────
  const grade4 = await prisma.track.create({
    data: { Org_id: orgId, Name: "Grade 4", kind: "CLASS", GradeLevel: 4, price: 0, isPaid: false },
  });
  const grade5 = await prisma.track.create({
    data: { Org_id: orgId, Name: "Grade 5", kind: "CLASS", GradeLevel: 5, price: 0, isPaid: false },
  });
  log(`Classes created: grade4=${grade4.id}, grade5=${grade5.id}`);

  // ── 6. Teachers ──────────────────────────────────────────────────────────────
  const teacherDefs = [
    { name: "James Carter",   email: "james@learnova.test",  spec: "Mathematics", bio: "10+ years teaching Math — specializes in making numbers fun",       gender: "MALE"   },
    { name: "Emily Roberts",  email: "emily@learnova.test",  spec: "Science",     bio: "Passionate Science educator with a background in Biology",           gender: "FEMALE" },
    { name: "David Thompson", email: "david@learnova.test",  spec: "English",     bio: "Cambridge-certified English teacher and published short-story author", gender: "MALE"   },
  ];

  const teachers = [];
  for (const td of teacherDefs) {
    const tUser = await prisma.user.create({
      data: { name: td.name, email: td.email, passwordHashed: pwHash, role: "TEACHER", gender: td.gender, mustChangePassword: false },
    });
    const teacher = await prisma.teacher.create({
      data: { Teacher_id: tUser.id, OrgId: orgId, specialization: td.spec, bio: td.bio },
    });
    teachers.push({ userId: tUser.id, teacherId: teacher.Teacher_id, ...td });
    log(`Teacher: ${td.name} (userId=${tUser.id})`);
  }
  const [t_math, t_science, t_english] = teachers;

  // ── 7. Subjects (courses) ────────────────────────────────────────────────────
  const subjectDefs = [
    { classId: grade4.id, name: "Mathematics",  teacherId: t_math.teacherId,    desc: "Grade 4 Mathematics — numbers, operations, fractions and geometry" },
    { classId: grade4.id, name: "Science",       teacherId: t_science.teacherId, desc: "Grade 4 Science — living things, matter and the natural world"      },
    { classId: grade4.id, name: "English",       teacherId: t_english.teacherId, desc: "Grade 4 English — reading, writing and grammar fundamentals"         },
    { classId: grade5.id, name: "Mathematics",  teacherId: t_math.teacherId,    desc: "Grade 5 Mathematics — advanced operations, decimals and ratios"      },
    { classId: grade5.id, name: "Science",       teacherId: t_science.teacherId, desc: "Grade 5 Science — ecosystems, energy and the physical world"        },
    { classId: grade5.id, name: "English",       teacherId: t_english.teacherId, desc: "Grade 5 English — comprehension, essay writing and literature"       },
  ];

  const subjects = [];
  for (const sd of subjectDefs) {
    const sub = await prisma.course.create({
      data: { Course_id: sd.classId, Teacher_id: sd.teacherId, name: sd.name, Description: sd.desc, isPaid: false, price: 0, imageUrl: "" },
    });
    subjects.push({ ...sub, classId: sd.classId });
    log(`Subject: ${sd.name} (id=${sub.id}, grade=${sd.classId === grade4.id ? 4 : 5})`);
  }
  const g4Subjects = subjects.filter((s) => s.classId === grade4.id);
  const g5Subjects = subjects.filter((s) => s.classId === grade5.id);

  // ── 8. Lessons ───────────────────────────────────────────────────────────────
  const lessonTemplates = {
    "Mathematics": [
      { name: "Natural Numbers",      desc: "Understanding natural numbers and applying addition, subtraction, multiplication and division" },
      { name: "Fractions",            desc: "Introduction to fractions: numerator, denominator, simplifying and comparing fractions"       },
      { name: "Geometry & Shapes",    desc: "Identifying 2D and 3D shapes, calculating area and perimeter of basic figures"                },
    ],
    "Science": [
      { name: "States of Matter",     desc: "Exploring solids, liquids and gases — properties and how matter changes state"                },
      { name: "Living Things",         desc: "Classification of living organisms and their life cycles"                                    },
      { name: "Energy & Forces",       desc: "Introduction to energy types (heat, light, electrical) and simple forces"                   },
    ],
    "English": [
      { name: "Greetings & Introductions", desc: "Learn how to greet people, introduce yourself and hold a basic conversation"            },
      { name: "Reading Comprehension",     desc: "Strategies for understanding short texts: main idea, details and vocabulary in context" },
      { name: "Writing Skills",            desc: "Sentence structure, punctuation and building a simple paragraph"                        },
    ],
  };

  const allLessons = [];
  for (const subj of subjects) {
    const templates = lessonTemplates[subj.name] ?? [];
    for (const tmpl of templates) {
      const lesson = await prisma.lesson.create({
        data: { Subject_id: subj.id, name: tmpl.name, Description: tmpl.desc },
      });
      allLessons.push({ ...lesson, subjectId: subj.id });
    }
  }
  log(`Lessons created: ${allLessons.length} total`);

  // ── 9. Assessment components ─────────────────────────────────────────────────
  const componentDefs = [
    { name: "Homework",    weight: 10, maxScore: 10 },
    { name: "Classwork",   weight: 20, maxScore: 20 },
    { name: "Midterm Exam", weight: 30, maxScore: 30 },
    { name: "Final Exam",   weight: 40, maxScore: 40 },
  ];

  const assessmentComponents = [];
  for (const subj of subjects) {
    for (const cd of componentDefs) {
      const comp = await prisma.assessment_component.create({
        data: { OrgId: orgId, subjectId: subj.id, termId: term1.id, name: cd.name, weight: cd.weight, maxScore: cd.maxScore },
      });
      assessmentComponents.push({ ...comp, subjectId: subj.id });
    }
  }
  log(`Assessment components created: ${assessmentComponents.length} total`);

  // ── 10. Students ─────────────────────────────────────────────────────────────
  const studentDefs = [
    { name: "Liam Johnson",   email: "liam@learnova.test",    dob: "2015-03-15", classId: grade4.id, grade: 4, gender: "MALE"   },
    { name: "Olivia Smith",   email: "olivia@learnova.test",  dob: "2015-07-20", classId: grade4.id, grade: 4, gender: "FEMALE" },
    { name: "Noah Williams",  email: "noah@learnova.test",    dob: "2015-01-08", classId: grade4.id, grade: 4, gender: "MALE"   },
    { name: "Emma Brown",     email: "emma@learnova.test",    dob: "2014-05-10", classId: grade5.id, grade: 5, gender: "FEMALE" },
    { name: "Ethan Davis",    email: "ethan@learnova.test",   dob: "2014-11-25", classId: grade5.id, grade: 5, gender: "MALE"   },
    { name: "Sophia Wilson",  email: "sophia@learnova.test",  dob: "2014-09-03", classId: grade5.id, grade: 5, gender: "FEMALE" },
  ];

  const students = [];
  for (const sd of studentDefs) {
    const sUser = await prisma.user.create({
      data: { name: sd.name, email: sd.email, passwordHashed: pwHash, role: "STUDENT", gender: sd.gender, mustChangePassword: false },
    });
    const student = await prisma.student.create({
      data: { Student_id: sUser.id, OrgId: orgId, Course_id: sd.classId, GradeLevel: sd.grade, DOB: d(sd.dob), AcademicStatus: "ACTIVE" },
    });
    students.push({ userId: sUser.id, studentId: student.Student_id, classId: sd.classId, ...sd });
    log(`Student: ${sd.name} (userId=${sUser.id})`);
  }

  // ── 11. Parents ──────────────────────────────────────────────────────────────
  const parentDefs = [
    { name: "Robert Johnson", email: "parent1@learnova.test", gender: "MALE",   linkedIdxs: [0]    }, // father of Liam
    { name: "Susan Smith",    email: "parent2@learnova.test", gender: "FEMALE", linkedIdxs: [1, 2] }, // mother of Olivia & Noah
  ];

  const parentUserIds = [];
  for (const pd of parentDefs) {
    const pUser = await prisma.user.create({
      data: { name: pd.name, email: pd.email, passwordHashed: pwHash, role: "PARENT", gender: pd.gender, mustChangePassword: false },
    });
    const parent = await prisma.parent.create({ data: { Parent_id: pUser.id } });
    parentUserIds.push(pUser.id);
    for (const idx of pd.linkedIdxs) {
      await prisma.student.update({ where: { Student_id: students[idx].studentId }, data: { Parent_id: parent.Parent_id } });
    }
    log(`Parent: ${pd.name} (userId=${pUser.id}) → students [${pd.linkedIdxs.join(",")}]`);
  }

  // ── 12. Attendance (one record per student per day) ──────────────────────────
  const attendanceDates = getLastWeekDays();
  log(`Attendance dates: ${attendanceDates.map((d) => d.toISOString().slice(0, 10)).join(", ")}`);

  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const student = students[sIdx];
    const pattern = ATTENDANCE_PATTERNS[sIdx % ATTENDANCE_PATTERNS.length];
    for (let dIdx = 0; dIdx < attendanceDates.length; dIdx++) {
      await prisma.attendance.create({
        data: {
          studentId:      student.studentId,
          classId:        student.classId,
          orgId,
          academicYearId: yearId,
          date:           attendanceDates[dIdx],
          status:         pattern[dIdx],
          markedBy:       teachers[0].userId,
        },
      });
    }
  }
  log("Attendance records created");

  // ── 13. Marks ────────────────────────────────────────────────────────────────
  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const student = students[sIdx];
    const classSubjects = student.classId === grade4.id ? g4Subjects : g5Subjects;

    for (let subIdx = 0; subIdx < classSubjects.length; subIdx++) {
      const subject = classSubjects[subIdx];
      const comps = assessmentComponents.filter((c) => c.subjectId === subject.id);

      for (let cIdx = 0; cIdx < comps.length; cIdx++) {
        const comp = comps[cIdx];
        const isFinal = comp.name === "Final Exam";
        const raw = markScore(sIdx, subIdx, cIdx);
        const score = Math.round((raw / 100) * Number(comp.maxScore));
        await prisma.marks.create({
          data: {
            Student_id:     student.studentId,
            Subject_id:     subject.id,
            Numbers:        score,
            OutOf:          comp.maxScore,
            ExamPercentage: comp.weight,
            MarkType:       isFinal ? "EXAM" : "MIDTERM",
            termId:         term1.id,
            componentId:    comp.id,
            time:           d("2026-01-20"),
          },
        });
      }
    }
  }
  log("Marks created");

  // ── 14. Timetable slots ──────────────────────────────────────────────────────
  const timetableSlots = [
    // Grade 4  (Mon/Wed/Thu)
    { trackId: grade4.id, courseId: g4Subjects[0].id, teacherId: t_math.teacherId,    dayOfWeek: 1, startTime: "08:00", endTime: "08:45", roomNumber: "101" },
    { trackId: grade4.id, courseId: g4Subjects[1].id, teacherId: t_science.teacherId, dayOfWeek: 1, startTime: "09:00", endTime: "09:45", roomNumber: "102" },
    { trackId: grade4.id, courseId: g4Subjects[2].id, teacherId: t_english.teacherId, dayOfWeek: 1, startTime: "10:00", endTime: "10:45", roomNumber: "103" },
    { trackId: grade4.id, courseId: g4Subjects[0].id, teacherId: t_math.teacherId,    dayOfWeek: 3, startTime: "08:00", endTime: "08:45", roomNumber: "101" },
    { trackId: grade4.id, courseId: g4Subjects[1].id, teacherId: t_science.teacherId, dayOfWeek: 3, startTime: "09:00", endTime: "09:45", roomNumber: "102" },
    { trackId: grade4.id, courseId: g4Subjects[2].id, teacherId: t_english.teacherId, dayOfWeek: 4, startTime: "08:00", endTime: "08:45", roomNumber: "103" },
    // Grade 5  (Tue/Thu/Fri)
    { trackId: grade5.id, courseId: g5Subjects[0].id, teacherId: t_math.teacherId,    dayOfWeek: 2, startTime: "08:00", endTime: "08:45", roomNumber: "201" },
    { trackId: grade5.id, courseId: g5Subjects[1].id, teacherId: t_science.teacherId, dayOfWeek: 2, startTime: "09:00", endTime: "09:45", roomNumber: "202" },
    { trackId: grade5.id, courseId: g5Subjects[2].id, teacherId: t_english.teacherId, dayOfWeek: 2, startTime: "10:00", endTime: "10:45", roomNumber: "203" },
    { trackId: grade5.id, courseId: g5Subjects[0].id, teacherId: t_math.teacherId,    dayOfWeek: 4, startTime: "08:00", endTime: "08:45", roomNumber: "201" },
    { trackId: grade5.id, courseId: g5Subjects[1].id, teacherId: t_science.teacherId, dayOfWeek: 4, startTime: "09:00", endTime: "09:45", roomNumber: "202" },
    { trackId: grade5.id, courseId: g5Subjects[2].id, teacherId: t_english.teacherId, dayOfWeek: 5, startTime: "08:00", endTime: "08:45", roomNumber: "203" },
  ];

  for (const slot of timetableSlots) {
    await prisma.timetable_slot.create({ data: { orgId, academicYearId: yearId, isActive: true, ...slot } });
  }
  log(`Timetable slots created: ${timetableSlots.length}`);

  // ── 15. School events ────────────────────────────────────────────────────────
  const creatorId = teachers[0].userId;
  await prisma.school_event.createMany({
    data: [
      { orgId, createdBy: creatorId, title: "New Year Holiday",         description: "School closed for New Year celebrations",                           startDate: d("2026-01-01"), endDate: d("2026-01-03"), type: "HOLIDAY",     termId: term1.id, isPublished: true },
      { orgId, createdBy: creatorId, title: "First Semester Finals",    description: "End-of-semester examinations for all grades",                       startDate: d("2026-01-15"), endDate: d("2026-01-29"), type: "EXAM",        termId: term1.id, isPublished: true },
      { orgId, createdBy: creatorId, title: "Parent-Teacher Meeting",   description: "Quarterly progress meeting for parents and teachers",               startDate: d("2026-02-10"), endDate: d("2026-02-10"), type: "PTA_MEETING", termId: term2.id, isPublished: true },
      { orgId, createdBy: creatorId, title: "School Sports Day",        description: "Annual inter-class sports competition — all students participate",   startDate: d("2026-03-15"), endDate: d("2026-03-15"), type: "ACTIVITY",    termId: term2.id, isPublished: true },
      { orgId, createdBy: creatorId, title: "Second Semester Finals",   description: "End-of-year examinations — results determine grade promotion",       startDate: d("2026-06-01"), endDate: d("2026-06-15"), type: "EXAM",        termId: term2.id, isPublished: true },
    ],
  });
  log("School events created");

  // ── 16. Grade scale ──────────────────────────────────────────────────────────
  const gradeScale = await prisma.grade_scale.create({ data: { OrgId: orgId, name: "Standard Grading Scale" } });
  await prisma.grade_scale_range.createMany({
    data: [
      { gradeScaleId: gradeScale.id, grade: "A+", minScore: 95, maxScore: 100, gpaPoints: 4.0, isPassing: true  },
      { gradeScaleId: gradeScale.id, grade: "A",  minScore: 85, maxScore:  94, gpaPoints: 3.7, isPassing: true  },
      { gradeScaleId: gradeScale.id, grade: "B+", minScore: 80, maxScore:  84, gpaPoints: 3.3, isPassing: true  },
      { gradeScaleId: gradeScale.id, grade: "B",  minScore: 75, maxScore:  79, gpaPoints: 3.0, isPassing: true  },
      { gradeScaleId: gradeScale.id, grade: "C",  minScore: 65, maxScore:  74, gpaPoints: 2.0, isPassing: true  },
      { gradeScaleId: gradeScale.id, grade: "D",  minScore: 50, maxScore:  64, gpaPoints: 1.0, isPassing: true  },
      { gradeScaleId: gradeScale.id, grade: "F",  minScore:  0, maxScore:  49, gpaPoints: 0.0, isPassing: false },
    ],
  });
  log("Grade scale created");

  // ── 17. Subscription ─────────────────────────────────────────────────────────
  const schoolPlan = await prisma.plan.findFirst({ where: { name: "School Edition" } });
  if (schoolPlan) {
    const sub = await prisma.subscription.create({
      data: { organizationId: orgId, planId: schoolPlan.id, startDate: d("2025-09-01"), endDate: d("2026-08-31"), status: "ACTIVE", autoRenew: true },
    });
    await prisma.payment.create({
      data: { subscriptionId: sub.id, organizationId: orgId, amount: schoolPlan.price, paymentMethod: "MANUAL", status: "COMPLETED", paymentDate: d("2025-09-01") },
    });
    log(`Subscription to "${schoolPlan.name}" created`);
  } else {
    log("⚠  School Edition plan not found — run scripts/resetPlans.js first");
  }

  // ── 18. Student notes ────────────────────────────────────────────────────────
  await prisma.student_note.createMany({
    data: [
      { studentId: students[0].studentId, teacherId: t_math.teacherId,    orgId, title: "Math Note",    content: "Liam shows great improvement in solving multi-step problems",              isRead: false },
      { studentId: students[1].studentId, teacherId: t_science.teacherId, orgId, title: "Science Note",  content: "Olivia needs additional support in chemistry lab experiments",              isRead: false },
      { studentId: students[3].studentId, teacherId: t_english.teacherId, orgId, title: "English Note",  content: "Emma excels at oral presentations — needs to work on written structure",    isRead: true  },
      { studentId: students[4].studentId, teacherId: t_math.teacherId,    orgId, title: "Absence Alert", content: "Ethan has missed 3 Math sessions this week — please follow up with parent", isRead: false },
    ],
  });
  log("Student notes created");

  // ── 19. Registration numbers ─────────────────────────────────────────────────
  const allUsers = [...teachers.map((t) => t.userId), ...students.map((s) => s.userId), ...parentUserIds];
  let seq = 0;
  for (const uid of allUsers) {
    seq++;
    await prisma.user.update({ where: { id: uid }, data: { registrationNumber: `GRNSFL-${String(seq).padStart(5, "0")}` } });
  }
  await prisma.organization.update({ where: { id: orgId }, data: { userSequence: seq } });
  log(`Registration numbers: GRNSFL-00001 → GRNSFL-${String(seq).padStart(5, "0")}`);

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  SCHOOL SEED COMPLETE ✓                          ║
╠══════════════════════════════════════════════════════════════════╣
║  All accounts use password:  Learnova@123                        ║
╠══════════════════════════╦═══════════════════════════════════════╣
║  Role                    ║ Email                                  ║
╠══════════════════════════╬═══════════════════════════════════════╣
║  School Org              ║ school@learnova.test                   ║
║  Teacher (Mathematics)   ║ james@learnova.test                    ║
║  Teacher (Science)       ║ emily@learnova.test                    ║
║  Teacher (English)       ║ david@learnova.test                    ║
║  Student Grade 4 (Liam)  ║ liam@learnova.test                     ║
║  Student Grade 4 (Olivia)║ olivia@learnova.test                   ║
║  Student Grade 4 (Noah)  ║ noah@learnova.test                     ║
║  Student Grade 5 (Emma)  ║ emma@learnova.test                     ║
║  Student Grade 5 (Ethan) ║ ethan@learnova.test                    ║
║  Student Grade 5 (Sophia)║ sophia@learnova.test                   ║
║  Parent (Robert)         ║ parent1@learnova.test                  ║
║  Parent (Susan)          ║ parent2@learnova.test                  ║
╠══════════════════════════╩═══════════════════════════════════════╣
║  Org Code: GRNSFL                                                 ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[SEED] Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
