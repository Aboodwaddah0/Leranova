/**
 * seedReportData.js
 * Creates TWO test organizations with complete data for ALL 11 report types.
 *
 *   School org:  "Westbrook Academy School"  school2@learnova.test   Learnova@123
 *   Academy org: "TechLearn Academy"          academy2@learnova.test  Learnova@123
 *
 * Usage:
 *   docker exec learnova-api node scripts/seedReportData.js
 */

import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";

const log  = (msg) => console.log(`[SEED] ${msg}`);
const d    = (str) => new Date(str);

// Last 5 weekdays (for attendance)
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

// Deterministic score (60–98 range)
const markScore = (sIdx, subIdx, offset = 0) => {
  const base = 60 + ((sIdx * 7 + subIdx * 5 + offset) % 30);
  return Math.min(base, 98);
};

// Lookup letter grade from scale ranges
const getGrade = (rawScore, ranges) => {
  const r = ranges.find((x) => rawScore >= Number(x.minScore) && rawScore <= Number(x.maxScore));
  return r
    ? { letterGrade: r.grade, gpaPoints: Number(r.gpaPoints), isPassed: r.isPassing }
    : { letterGrade: "F", gpaPoints: 0, isPassed: false };
};

// ══════════════════════════════════════════════════════════════════════════════
//  PART 1 — SCHOOL ORG
// ══════════════════════════════════════════════════════════════════════════════

const seedSchool = async (pwHash) => {
  log("─── SCHOOL ORG ─────────────────────────────────────────────────────────");

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      Name:            "Westbrook Academy School",
      Email:           "school2@learnova.test",
      Password_Hashed: pwHash,
      Role:            "SCHOOL",
      status:          "APPROVED",
      Phone:           "+1-555-100-2000",
      Address:         "42 Scholar Lane, Westbrook",
      Description:     "Westbrook Academy School — seeded for report testing",
      organizationCode: "WBKS",
    },
  });
  const orgId = org.id;
  log(`School org created: id=${orgId}`);

  // 2. School settings
  await prisma.organization_school_settings.create({
    data: {
      OrgId:                    orgId,
      schoolYearStartMonth:     9,
      schoolYearStartDay:       1,
      promotionMonth:           6,
      promotionDay:             30,
      entryGradeMinAge:         6,
      passThresholdPercentage:  50,
      minSubjectPassPercentage: 50,
      requireAllSubjectsPass:   true,
      classRanges:              [{ from: 1, to: 12 }],
      maxFailedSubjects:        2,
      allowConditionalPromotion: true,
      conditionalMaxFailed:     1,
    },
  });

  // 3. Academic year
  const year = await prisma.academic_year.create({
    data: { OrgId: orgId, name: "2025-2026", startDate: d("2025-09-01"), endDate: d("2026-06-30"), numberOfTerms: 2, isActive: true },
  });
  const yearId = year.id;

  // 4. Terms (both CLOSED so reports work)
  const term1 = await prisma.term.create({
    data: { academicYearId: yearId, termNumber: 1, name: "Term 1", startDate: d("2025-09-01"), endDate: d("2026-01-31"), status: "CLOSED" },
  });
  const term2 = await prisma.term.create({
    data: { academicYearId: yearId, termNumber: 2, name: "Term 2", startDate: d("2026-02-01"), endDate: d("2026-06-30"), status: "CLOSED" },
  });
  log(`Academic year + terms created: year=${yearId}, term1=${term1.id}, term2=${term2.id}`);

  // 5. Grade scale
  const gradeScale = await prisma.grade_scale.create({ data: { OrgId: orgId, name: "Standard Scale" } });
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
  const scaleRanges = await prisma.grade_scale_range.findMany({ where: { gradeScaleId: gradeScale.id } });
  log("Grade scale created");

  // 6. Classes
  const grade4 = await prisma.track.create({ data: { Org_id: orgId, Name: "Grade 4", kind: "CLASS", GradeLevel: 4, price: 0, isPaid: false } });
  const grade5 = await prisma.track.create({ data: { Org_id: orgId, Name: "Grade 5", kind: "CLASS", GradeLevel: 5, price: 0, isPaid: false } });
  log(`Classes: grade4=${grade4.id}, grade5=${grade5.id}`);

  // 7. Teachers
  const teacherDefs = [
    { name: "Alice Mercer",  email: "alice.mercer@wbks.test",  spec: "Mathematics", gender: "FEMALE" },
    { name: "Brian Cole",    email: "brian.cole@wbks.test",    spec: "Science",     gender: "MALE"   },
    { name: "Clara Bishop",  email: "clara.bishop@wbks.test",  spec: "English",     gender: "FEMALE" },
  ];
  const teachers = [];
  for (const td of teacherDefs) {
    const u = await prisma.user.create({ data: { name: td.name, email: td.email, passwordHashed: pwHash, role: "TEACHER", gender: td.gender, mustChangePassword: false } });
    const t = await prisma.teacher.create({ data: { Teacher_id: u.id, OrgId: orgId, specialization: td.spec } });
    teachers.push({ userId: u.id, teacherId: t.Teacher_id, name: td.name });
    log(`Teacher: ${td.name} (id=${u.id})`);
  }
  const [tMath, tSci, tEng] = teachers;

  // 8. Subjects (3 per grade)
  const subjectDefs = [
    { classId: grade4.id, name: "Mathematics", teacherId: tMath.teacherId },
    { classId: grade4.id, name: "Science",     teacherId: tSci.teacherId  },
    { classId: grade4.id, name: "English",     teacherId: tEng.teacherId  },
    { classId: grade5.id, name: "Mathematics", teacherId: tMath.teacherId },
    { classId: grade5.id, name: "Science",     teacherId: tSci.teacherId  },
    { classId: grade5.id, name: "English",     teacherId: tEng.teacherId  },
  ];
  const subjects = [];
  for (const sd of subjectDefs) {
    const s = await prisma.course.create({ data: { Course_id: sd.classId, Teacher_id: sd.teacherId, name: sd.name, isPaid: false, price: 0, imageUrl: "" } });
    subjects.push({ ...s, classId: sd.classId });
  }
  const g4Sub = subjects.filter((s) => s.classId === grade4.id);
  const g5Sub = subjects.filter((s) => s.classId === grade5.id);
  log(`Subjects created: ${subjects.length}`);

  // 9. Assessment components (4 per subject, linked to term1)
  const compDefs = [
    { name: "Homework",     weight: 10, maxScore: 10 },
    { name: "Classwork",    weight: 20, maxScore: 20 },
    { name: "Midterm Exam", weight: 30, maxScore: 30 },
    { name: "Final Exam",   weight: 40, maxScore: 40 },
  ];
  const components = [];
  for (const subj of subjects) {
    for (const cd of compDefs) {
      const c = await prisma.assessment_component.create({
        data: { OrgId: orgId, subjectId: subj.id, termId: term1.id, name: cd.name, weight: cd.weight, maxScore: cd.maxScore },
      });
      components.push({ ...c, subjectId: subj.id });
    }
  }
  log(`Assessment components: ${components.length}`);

  // 10. Students (3 in grade4, 3 in grade5)
  const studentDefs = [
    { name: "Aiden Brooks",   email: "aiden@wbks.test",   dob: "2015-04-10", classId: grade4.id, grade: 4, gender: "MALE"   },
    { name: "Bella Harris",   email: "bella@wbks.test",   dob: "2015-08-22", classId: grade4.id, grade: 4, gender: "FEMALE" },
    { name: "Caleb Turner",   email: "caleb@wbks.test",   dob: "2015-01-17", classId: grade4.id, grade: 4, gender: "MALE"   },
    { name: "Diana Foster",   email: "diana@wbks.test",   dob: "2014-06-05", classId: grade5.id, grade: 5, gender: "FEMALE" },
    { name: "Ethan Grant",    email: "ethan2@wbks.test",  dob: "2014-12-01", classId: grade5.id, grade: 5, gender: "MALE"   },
    { name: "Fiona Hayes",    email: "fiona@wbks.test",   dob: "2014-09-14", classId: grade5.id, grade: 5, gender: "FEMALE" },
  ];
  const students = [];
  for (const sd of studentDefs) {
    const u = await prisma.user.create({ data: { name: sd.name, email: sd.email, passwordHashed: pwHash, role: "STUDENT", gender: sd.gender, mustChangePassword: false } });
    const s = await prisma.student.create({ data: { Student_id: u.id, OrgId: orgId, Course_id: sd.classId, GradeLevel: sd.grade, DOB: d(sd.dob), AcademicStatus: "ACTIVE" } });
    students.push({ userId: u.id, studentId: s.Student_id, classId: sd.classId, grade: sd.grade, name: sd.name });
    log(`Student: ${sd.name} (id=${u.id})`);
  }
  const g4Stu = students.filter((s) => s.classId === grade4.id);
  const g5Stu = students.filter((s) => s.classId === grade5.id);

  // 11. Parents
  const parentDefs = [
    { name: "George Brooks", email: "parent.g@wbks.test", gender: "MALE",   linkedIdxs: [0] },
    { name: "Helen Harris",  email: "parent.h@wbks.test", gender: "FEMALE", linkedIdxs: [1, 2] },
  ];
  const parentIds = [];
  for (const pd of parentDefs) {
    const u = await prisma.user.create({ data: { name: pd.name, email: pd.email, passwordHashed: pwHash, role: "PARENT", gender: pd.gender, mustChangePassword: false } });
    const p = await prisma.parent.create({ data: { Parent_id: u.id } });
    parentIds.push(u.id);
    for (const idx of pd.linkedIdxs) {
      await prisma.student.update({ where: { Student_id: students[idx].studentId }, data: { Parent_id: p.Parent_id } });
    }
    log(`Parent: ${pd.name}`);
  }

  // 12. Attendance (5 days × 6 students)
  const PATTERNS = [
    ["PRESENT", "PRESENT", "LATE",    "ABSENT",  "PRESENT"],
    ["PRESENT", "ABSENT",  "PRESENT", "PRESENT", "PRESENT"],
    ["LATE",    "PRESENT", "PRESENT", "EXCUSED", "PRESENT"],
    ["PRESENT", "PRESENT", "PRESENT", "LATE",    "ABSENT" ],
    ["ABSENT",  "PRESENT", "PRESENT", "PRESENT", "PRESENT"],
    ["PRESENT", "LATE",    "EXCUSED", "PRESENT", "PRESENT"],
  ];
  const attDates = getLastWeekDays();
  for (let i = 0; i < students.length; i++) {
    const stu = students[i];
    for (let j = 0; j < attDates.length; j++) {
      await prisma.attendance.create({
        data: { studentId: stu.studentId, classId: stu.classId, orgId, academicYearId: yearId, date: attDates[j], status: PATTERNS[i][j], markedBy: tMath.userId },
      });
    }
  }
  log(`Attendance: ${students.length * attDates.length} records`);

  // 13. Marks + 14. Computed grades
  let marksCount = 0;
  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const stu = students[sIdx];
    const classSubs = stu.classId === grade4.id ? g4Sub : g5Sub;

    for (let subIdx = 0; subIdx < classSubs.length; subIdx++) {
      const subj = classSubs[subIdx];
      const comps = components.filter((c) => c.subjectId === subj.id);

      let rawScore = 0;
      for (let cIdx = 0; cIdx < comps.length; cIdx++) {
        const comp = comps[cIdx];
        const pct  = markScore(sIdx, subIdx, cIdx); // 60–98
        const score = Math.round((pct / 100) * Number(comp.maxScore));
        await prisma.marks.create({
          data: {
            Student_id:     stu.studentId,
            Subject_id:     subj.id,
            Numbers:        score,
            OutOf:          comp.maxScore,
            ExamPercentage: comp.weight,
            MarkType:       comp.name === "Final Exam" ? "EXAM" : "MIDTERM",
            termId:         term1.id,
            componentId:    comp.id,
            time:           d("2026-01-20"),
          },
        });
        rawScore += (pct / 100) * Number(comp.weight);
        marksCount++;
      }

      rawScore = Math.round(rawScore * 100) / 100;
      const { letterGrade, gpaPoints, isPassed } = getGrade(rawScore, scaleRanges);
      await prisma.computed_grade.create({
        data: { studentId: stu.studentId, subjectId: subj.id, termId: term1.id, OrgId: orgId, rawScore, letterGrade, gpaPoints, isPassed },
      });
    }
  }
  log(`Marks: ${marksCount}, Computed grades: ${students.length * 3}`);

  // 15. Student notes
  await prisma.student_note.createMany({
    data: [
      { studentId: students[0].studentId, teacherId: tMath.teacherId, orgId, title: "Great Progress",   content: "Aiden has shown remarkable improvement in algebra this term.",        isRead: false },
      { studentId: students[1].studentId, teacherId: tSci.teacherId,  orgId, title: "Lab Participation", content: "Bella needs to actively participate in science lab sessions.",         isRead: false },
      { studentId: students[3].studentId, teacherId: tEng.teacherId,  orgId, title: "Writing Skills",   content: "Diana excels at creative writing but needs work on grammar rules.",    isRead: true  },
      { studentId: students[4].studentId, teacherId: tMath.teacherId, orgId, title: "Attendance Alert", content: "Ethan missed 3 Math sessions this week — please contact the parent.", isRead: false },
      { studentId: students[2].studentId, teacherId: tEng.teacherId,  orgId, title: "Reading Award",   content: "Caleb won the class reading award — excellent comprehension skills.",   isRead: true  },
    ],
  });
  log("Student notes: 5");

  // 16. Promotion history (4 promoted, 1 conditional, 1 retained)
  const promoDecisions = ["PROMOTED", "PROMOTED", "CONDITIONAL", "PROMOTED", "PROMOTED", "RETAINED"];
  for (let i = 0; i < students.length; i++) {
    const stu = students[i];
    await prisma.student_promotion_history.create({
      data: {
        Student_id:      stu.studentId,
        OrgId:           orgId,
        fromGradeLevel:  stu.grade,
        toGradeLevel:    promoDecisions[i] === "PROMOTED" ? stu.grade + 1 : stu.grade,
        decision:        promoDecisions[i],
        finalPercentage: 60 + i * 5,
        reason:          promoDecisions[i] === "RETAINED" ? "Failed more than 2 subjects" : null,
        schoolYear:      2025,
        academicYearId:  yearId,
      },
    });
  }
  log("Promotion history: 6 records");

  // 17. Student certificates (for first 4 students — those who passed/conditional)
  const certStudents = students.slice(0, 4); // skip idx 4 (PROMOTED) actually let me do the promoted ones
  const promotedStudents = students.filter((_, i) => promoDecisions[i] !== "RETAINED");
  for (const stu of promotedStudents) {
    const classSubs = stu.classId === grade4.id ? g4Sub : g5Sub;
    // Issue certificate for the first subject only (avoid unique constraint issues in bulk)
    const subj = classSubs[0];
    await prisma.student_certificate.create({
      data: { studentId: stu.studentId, orgId, subjectId: subj.id, trackId: stu.classId, termId: term1.id, isPublished: true },
    });
  }
  log(`Certificates: ${promotedStudents.length} published`);

  // 18. Registration numbers
  const allSchoolUsers = [...teachers.map((t) => t.userId), ...students.map((s) => s.userId), ...parentIds];
  let seq = 0;
  for (const uid of allSchoolUsers) {
    seq++;
    await prisma.user.update({ where: { id: uid }, data: { registrationNumber: `WBKS-${String(seq).padStart(5, "0")}` } });
  }
  await prisma.organization.update({ where: { id: orgId }, data: { userSequence: seq } });
  log(`Registration numbers: WBKS-00001 → WBKS-${String(seq).padStart(5, "0")}`);

  return { orgId, yearId, term1, term2, grade4, grade5, g4Sub, g5Sub, students };
};

// ══════════════════════════════════════════════════════════════════════════════
//  PART 2 — ACADEMY ORG
// ══════════════════════════════════════════════════════════════════════════════

const seedAcademy = async (pwHash) => {
  log("─── ACADEMY ORG ────────────────────────────────────────────────────────");

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      Name:            "TechLearn Academy",
      Email:           "academy2@learnova.test",
      Password_Hashed: pwHash,
      Role:            "ACADEMY",
      status:          "APPROVED",
      Phone:           "+1-555-200-3000",
      Address:         "77 Innovation Drive, TechCity",
      Description:     "TechLearn Academy — seeded for report testing",
      organizationCode: "TCLRN",
    },
  });
  const orgId = org.id;
  log(`Academy org created: id=${orgId}`);

  // 2. Teachers
  const teacherDefs = [
    { name: "Marco Silva",   email: "marco@tclrn.test",   spec: "Web Development", gender: "MALE"   },
    { name: "Nadia Petrov",  email: "nadia@tclrn.test",   spec: "Data Science",    gender: "FEMALE" },
  ];
  const teachers = [];
  for (const td of teacherDefs) {
    const u = await prisma.user.create({ data: { name: td.name, email: td.email, passwordHashed: pwHash, role: "TEACHER", gender: td.gender } });
    await prisma.teacher.create({ data: { Teacher_id: u.id, OrgId: orgId, specialization: td.spec } });
    teachers.push({ userId: u.id, teacherId: u.id, name: td.name });
  }
  const [tWeb, tData] = teachers;

  // 3. Tracks (PAID)
  const trackDefs = [
    { name: "Full-Stack Web Development", desc: "From HTML/CSS to React and Node.js", teacherId: tWeb.teacherId, price: 199 },
    { name: "Python & Data Science",      desc: "Python, Pandas, ML and visualisation", teacherId: tData.teacherId, price: 149 },
  ];
  const tracks = [];
  for (const td of trackDefs) {
    const t = await prisma.track.create({
      data: { Org_id: orgId, Teacher_id: td.teacherId, Name: td.name, Description: td.desc, kind: "TRACK", price: td.price, isPaid: true },
    });
    tracks.push(t);
    log(`Track: ${td.name} (id=${t.id}, price=${td.price})`);
  }
  const [webTrack, dataTrack] = tracks;

  // 4. Subjects (3 under Web, 2 under Data)
  const subjectDefs = [
    { trackId: webTrack.id,  name: "HTML & CSS",         teacherId: tWeb.teacherId  },
    { trackId: webTrack.id,  name: "JavaScript",          teacherId: tWeb.teacherId  },
    { trackId: webTrack.id,  name: "React.js",            teacherId: tWeb.teacherId  },
    { trackId: dataTrack.id, name: "Python Fundamentals", teacherId: tData.teacherId },
    { trackId: dataTrack.id, name: "Machine Learning",    teacherId: tData.teacherId },
  ];
  const subjects = [];
  for (const sd of subjectDefs) {
    const s = await prisma.course.create({ data: { Course_id: sd.trackId, Teacher_id: sd.teacherId, name: sd.name, isPaid: false, price: 0, imageUrl: "" } });
    subjects.push({ ...s, trackId: sd.trackId });
  }
  log(`Subjects: ${subjects.length}`);

  // 5. Lessons (3 per subject = 15 total)
  const lessonTemplates = {
    "HTML & CSS":         [{ name: "HTML Basics" }, { name: "CSS Styling" }, { name: "Flexbox & Grid" }],
    "JavaScript":         [{ name: "Variables & Types" }, { name: "Functions" }, { name: "DOM & Events" }],
    "React.js":           [{ name: "Components & Props" }, { name: "State & Hooks" }, { name: "React Router" }],
    "Python Fundamentals":[{ name: "Syntax & Types" }, { name: "Lists & Dicts" }, { name: "File I/O" }],
    "Machine Learning":   [{ name: "Linear Regression" }, { name: "Classification" }, { name: "Model Evaluation" }],
  };
  const lessons = [];
  for (const sub of subjects) {
    for (const tmpl of (lessonTemplates[sub.name] ?? [])) {
      const l = await prisma.lesson.create({ data: { Subject_id: sub.id, name: tmpl.name } });
      lessons.push({ ...l, subjectId: sub.id, trackId: sub.trackId });
    }
  }
  log(`Lessons: ${lessons.length}`);

  // 6. Quizzes + questions (1 quiz per lesson)
  const quizzes = [];
  for (const lesson of lessons) {
    const quiz = await prisma.quiz.create({
      data: { lessonId: lesson.id, title: `${lesson.name} Quiz`, difficulty: "MEDIUM", passingScore: 70, isPublished: true },
    });
    // 3 questions per quiz
    await prisma.quiz_question.createMany({
      data: [
        { quizId: quiz.id, lang: "en", type: "MULTIPLE_CHOICE", question: `What is the main purpose of ${lesson.name}?`,   options: JSON.stringify(["Option A", "Option B", "Option C", "Option D"]), correctAnswer: 0, orderIndex: 0 },
        { quizId: quiz.id, lang: "en", type: "MULTIPLE_CHOICE", question: `Which concept is central to ${lesson.name}?`,   options: JSON.stringify(["Concept X", "Concept Y", "Concept Z", "None"]),     correctAnswer: 1, orderIndex: 1 },
        { quizId: quiz.id, lang: "en", type: "MULTIPLE_CHOICE", question: `Best practice when using ${lesson.name} is to:`, options: JSON.stringify(["Always A", "Always B", "It depends", "Never"]),       correctAnswer: 2, orderIndex: 2 },
      ],
    });
    quizzes.push({ ...quiz, lessonId: lesson.id });
  }
  log(`Quizzes: ${quizzes.length} (${quizzes.length * 3} questions)`);

  // 7. Students
  const studentDefs = [
    { name: "Omar Hassan",    email: "omar@tclrn.test",    gender: "MALE",   dob: "2000-03-15" },
    { name: "Priya Sharma",   email: "priya@tclrn.test",   gender: "FEMALE", dob: "2001-07-22" },
    { name: "Leo Carter",     email: "leo@tclrn.test",     gender: "MALE",   dob: "1999-11-08" },
    { name: "Sara Kim",       email: "sara@tclrn.test",    gender: "FEMALE", dob: "2002-05-30" },
    { name: "Yusuf Diallo",   email: "yusuf@tclrn.test",   gender: "MALE",   dob: "2000-09-18" },
  ];
  const students = [];
  for (const sd of studentDefs) {
    const u  = await prisma.user.create({ data: { name: sd.name, email: sd.email, passwordHashed: pwHash, role: "STUDENT", gender: sd.gender } });
    const au = await prisma.academy_user.create({ data: { user_academy_id: u.id, OrgId: orgId, DOB: d(sd.dob), AcademicStatus: "ACTIVE" } });
    students.push({ userId: u.id, academyUserId: au.user_academy_id, name: sd.name });
    log(`Student: ${sd.name} (id=${u.id})`);
  }

  // 8. Enrollments (all students in both tracks)
  for (const stu of students) {
    for (const track of tracks) {
      await prisma.enrollment.create({ data: { user_Academy_id: stu.academyUserId, Course_id: track.id } });
    }
  }
  log(`Enrollments: ${students.length * tracks.length}`);

  // 9. Lesson progress (varied completion rates)
  // Student 0: 100%, Student 1: 60%, Student 2: 40%, Students 3-4: 20%
  const completionRates = [1.0, 0.6, 0.4, 0.2, 0.2];
  for (let sIdx = 0; sIdx < students.length; sIdx++) {
    const stu  = students[sIdx];
    const rate = completionRates[sIdx];
    const count = Math.floor(lessons.length * rate);
    for (let lIdx = 0; lIdx < count; lIdx++) {
      await prisma.lesson_progress.create({
        data: { studentId: stu.userId, lessonId: lessons[lIdx].id, isCompleted: true, watchedSeconds: 1800, videoDurationSeconds: 1800 },
      });
    }
  }
  log("Lesson progress created");

  // 10. Quiz attempts (varied scores)
  // Different scores per student: 95, 82, 65, 74, 45
  const quizScores = [95, 82, 65, 74, 45];
  let attemptCount = 0;
  for (let qIdx = 0; qIdx < quizzes.length; qIdx++) {
    const quiz = quizzes[qIdx];
    // Each quiz gets attempts from students 0-3 (student 4 only attempts some)
    const attemptingStudents = qIdx % 3 === 0 ? students : students.slice(0, 4);
    for (const stu of attemptingStudents) {
      const sIdx  = students.indexOf(stu);
      const score = Math.min(95, Math.max(40, quizScores[sIdx] + ((qIdx * 3 + sIdx) % 10) - 5));
      await prisma.quiz_attempt.create({
        data: {
          quizId:    quiz.id,
          studentId: stu.userId,
          answers:   JSON.stringify({ "1": 0, "2": 1, "3": 2 }),
          score,
          isPassed:  score >= 70,
        },
      });
      attemptCount++;
    }
  }
  log(`Quiz attempts: ${attemptCount}`);

  // 11. Payments (7 COMPLETED, 2 PENDING, 1 FAILED across 5 students × 2 tracks)
  // Layout: students[0-3] × webTrack COMPLETED (4), students[0-2] × dataTrack COMPLETED (3) = 7
  //         students[3] × dataTrack PENDING (1), students[4] × webTrack PENDING (1) = 2
  //         students[4] × dataTrack FAILED (1) = 1
  const paymentPlan = [
    { stuIdx: 0, trackIdx: 0, status: "COMPLETED" },
    { stuIdx: 1, trackIdx: 0, status: "COMPLETED" },
    { stuIdx: 2, trackIdx: 0, status: "COMPLETED" },
    { stuIdx: 3, trackIdx: 0, status: "COMPLETED" },
    { stuIdx: 0, trackIdx: 1, status: "COMPLETED" },
    { stuIdx: 1, trackIdx: 1, status: "COMPLETED" },
    { stuIdx: 2, trackIdx: 1, status: "COMPLETED" },
    { stuIdx: 3, trackIdx: 1, status: "PENDING"   },
    { stuIdx: 4, trackIdx: 0, status: "PENDING"   },
    { stuIdx: 4, trackIdx: 1, status: "FAILED"    },
  ];
  for (const pp of paymentPlan) {
    const stu   = students[pp.stuIdx];
    const track = tracks[pp.trackIdx];
    await prisma.student_course_payment.create({
      data: {
        user_Academy_id: stu.academyUserId,
        Course_id:       track.id,
        amount:          track.price,
        paymentMethod:   "STRIPE",
        status:          pp.status,
        paidAt:          pp.status === "COMPLETED" ? d("2026-01-10") : null,
      },
    });
  }
  log(`Payments: 7 COMPLETED, 2 PENDING, 1 FAILED`);

  // 12. Registration numbers
  const allAcademyUsers = [...teachers.map((t) => t.userId), ...students.map((s) => s.userId)];
  let seq = 0;
  for (const uid of allAcademyUsers) {
    seq++;
    await prisma.user.update({ where: { id: uid }, data: { registrationNumber: `TCLRN-${String(seq).padStart(5, "0")}` } });
  }
  await prisma.organization.update({ where: { id: orgId }, data: { userSequence: seq } });
  log(`Registration numbers: TCLRN-00001 → TCLRN-${String(seq).padStart(5, "0")}`);

  return { orgId, tracks, subjects, lessons, students };
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════════

const run = async () => {
  await prisma.$connect();
  log("Connected to database");

  const pwHash = await hashPassword("Learnova@123");

  const school  = await seedSchool(pwHash);
  const academy = await seedAcademy(pwHash);

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║              REPORT SEED COMPLETE ✓                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  All accounts use password:  Learnova@123                            ║
╠═══════════════════════╦══════════════════════════════════════════════╣
║  SCHOOL ORG (WBKS)    ║  school2@learnova.test                       ║
║  Academy Report       ║  select Grade 4 class + Term 1               ║
║  Attendance Report    ║  select Grade 4 or Grade 5                   ║
║  Class Performance    ║  select any class + Term 1                   ║
║  Subject Analytics    ║  select any subject + Term 1                 ║
║  Parent Notes         ║  no filter needed                            ║
║  Term Summary         ║  select academic year + Term 1               ║
╠═══════════════════════╬══════════════════════════════════════════════╣
║  ACADEMY ORG (TCLRN)  ║  academy2@learnova.test                      ║
║  Enrollment Report    ║  no filter needed                            ║
║  Student Progress     ║  select any track                            ║
║  Quiz Performance     ║  select any track                            ║
║  Revenue Report       ║  7 COMPLETED · 2 PENDING · 1 FAILED          ║
║  Course Completion    ║  no filter needed                            ║
╚═══════════════════════╩══════════════════════════════════════════════╝
`);

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error("[SEED] Error:", err.message, err.stack);
  prisma.$disconnect();
  process.exit(1);
});
