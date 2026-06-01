import prisma from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/hashPassword.js';

const pw = await hashPassword('School@2026');

// ── Org ──────────────────────────────────────────────────────────────────────
const org = await prisma.organization.create({
  data: { Name: 'Greenfield Academy', Email: 'admin@greenfield.edu', Password_Hashed: pw, Role: 'ACADEMY', status: 'APPROVED', organizationCode: 'GREEN', Phone: '+1-555-0100', Address: '123 Learning Ave, Springfield' },
});
const orgId = org.id;
await prisma.organization_school_settings.create({ data: { OrgId: orgId, passThresholdPercentage: 50, minSubjectPassPercentage: 50, requireAllSubjectsPass: true, classRanges: [{ from: 1, to: 12 }], maxFailedSubjects: 2 } });

// ── Year + Terms ─────────────────────────────────────────────────────────────
const yr = await prisma.academic_year.create({ data: { OrgId: orgId, name: '2025-2026', startDate: new Date('2025-09-01'), endDate: new Date('2026-06-30'), numberOfTerms: 2, isActive: true } });
const t1 = await prisma.term.create({ data: { academicYearId: yr.id, termNumber: 1, name: 'First Semester',  startDate: new Date('2025-09-01'), endDate: new Date('2026-01-31'), status: 'ACTIVE'  } });
const t2 = await prisma.term.create({ data: { academicYearId: yr.id, termNumber: 2, name: 'Second Semester', startDate: new Date('2026-02-01'), endDate: new Date('2026-06-30'), status: 'PLANNED' } });

// ── Classes ──────────────────────────────────────────────────────────────────
const c4 = await prisma.track.create({ data: { Org_id: orgId, Name: 'Grade 4', kind: 'CLASS', GradeLevel: 4, price: 0, isPaid: false } });
const c5 = await prisma.track.create({ data: { Org_id: orgId, Name: 'Grade 5', kind: 'CLASS', GradeLevel: 5, price: 0, isPaid: false } });

// ── Teachers ─────────────────────────────────────────────────────────────────
const mkTeacher = async (name, email, spec) => {
  const u = await prisma.user.create({ data: { name, email, passwordHashed: pw, role: 'TEACHER', mustChangePassword: false } });
  await prisma.teacher.create({ data: { Teacher_id: u.id, OrgId: orgId, specialization: spec } });
  return u.id;
};
const tM = await mkTeacher('Sarah Johnson', 'sarah@greenfield.edu',  'Mathematics');
const tS = await mkTeacher('Mark Williams', 'mark@greenfield.edu',   'Science');
const tE = await mkTeacher('Emily Davis',   'emily@greenfield.edu',  'English Language');

// ── Subjects ─────────────────────────────────────────────────────────────────
const mkSubject = async (classId, name, teacherId) =>
  prisma.course.create({ data: { Course_id: classId, Teacher_id: teacherId, name, isPaid: false, price: 0, imageUrl: '' } });

const g4m = await mkSubject(c4.id, 'Mathematics', tM);
const g4s = await mkSubject(c4.id, 'Science',     tS);
const g4e = await mkSubject(c4.id, 'English',     tE);
const g5m = await mkSubject(c5.id, 'Mathematics', tM);
const g5s = await mkSubject(c5.id, 'Science',     tS);
const g5e = await mkSubject(c5.id, 'English',     tE);

// ── Students ─────────────────────────────────────────────────────────────────
const mkStudent = async (name, email, classId, grade) => {
  const u = await prisma.user.create({ data: { name, email, passwordHashed: pw, role: 'STUDENT', mustChangePassword: false } });
  await prisma.student.create({ data: { Student_id: u.id, OrgId: orgId, Course_id: classId, GradeLevel: grade, AcademicStatus: 'ACTIVE' } });
  return u.id;
};
const s1 = await mkStudent('James Anderson', 'james@greenfield.edu',  c4.id, 4);
const s2 = await mkStudent('Olivia Brown',   'olivia@greenfield.edu', c4.id, 4);
const s3 = await mkStudent('Noah Taylor',    'noah@greenfield.edu',   c4.id, 4);
const s4 = await mkStudent('Emma Wilson',    'emma@greenfield.edu',   c5.id, 5);
const s5 = await mkStudent('Liam Martin',    'liam@greenfield.edu',   c5.id, 5);
const s6 = await mkStudent('Sophia Lee',     'sophia@greenfield.edu', c5.id, 5);

// ── Parent ───────────────────────────────────────────────────────────────────
const pu = await prisma.user.create({ data: { name: 'Robert Anderson', email: 'parent@greenfield.edu', passwordHashed: pw, role: 'PARENT', mustChangePassword: false } });
await prisma.parent.create({ data: { Parent_id: pu.id } });
await prisma.student.update({ where: { Student_id: s1 }, data: { Parent_id: pu.id } });

// ── Registration numbers ─────────────────────────────────────────────────────
const allIds = [tM, tS, tE, s1, s2, s3, s4, s5, s6, pu.id];
for (let i = 0; i < allIds.length; i++) {
  await prisma.user.update({ where: { id: allIds[i] }, data: { registrationNumber: `GREEN-${String(i + 1).padStart(5, '0')}` } });
}
await prisma.organization.update({ where: { id: orgId }, data: { userSequence: allIds.length } });

// ── Marks ────────────────────────────────────────────────────────────────────
const g4Students = [[s1,0],[s2,1],[s3,2]], g5Students = [[s4,3],[s5,4],[s6,5]];
const baseScores = [[72,78],[68,82],[85,90],[60,75],[88,94],[70,80]];
for (const [sid, idx] of [...g4Students, ...g5Students]) {
  const subs = idx < 3 ? [g4m, g4s, g4e] : [g5m, g5s, g5e];
  for (let j = 0; j < subs.length; j++) {
    const [mid, exam] = baseScores[(idx + j) % baseScores.length];
    await prisma.marks.create({ data: { Student_id: sid, Subject_id: subs[j].id, Numbers: mid,  OutOf: 100, ExamPercentage: 40, MarkType: 'MIDTERM', termId: t1.id, time: new Date('2025-11-20') } });
    await prisma.marks.create({ data: { Student_id: sid, Subject_id: subs[j].id, Numbers: exam, OutOf: 100, ExamPercentage: 60, MarkType: 'EXAM',    termId: t1.id, time: new Date('2026-01-22') } });
  }
}

// ── Attendance ───────────────────────────────────────────────────────────────
const getDays = () => { const d = []; let c = new Date(); c.setDate(c.getDate() - 1); while (d.length < 5) { if (c.getDay() !== 0 && c.getDay() !== 6) d.push(new Date(c.toISOString().slice(0, 10))); c.setDate(c.getDate() - 1); } return d.reverse(); };
const days = getDays();
const pats = [['PRESENT','PRESENT','LATE','ABSENT','PRESENT'],['PRESENT','ABSENT','PRESENT','PRESENT','PRESENT'],['PRESENT','PRESENT','PRESENT','LATE','PRESENT']];
for (const [sid, idx] of [...g4Students, ...g5Students]) {
  const subs = idx < 3 ? [g4m, g4s, g4e] : [g5m, g5s, g5e];
  const classId = idx < 3 ? c4.id : c5.id;
  const pat = pats[idx % pats.length];
  for (const sub of subs) {
    for (let di = 0; di < days.length; di++) {
      await prisma.attendance.create({ data: { studentId: sid, classId, subjectId: sub.id, orgId, academicYearId: yr.id, date: days[di], status: pat[di % pat.length], markedBy: sub.Teacher_id } });
    }
  }
}

// ── Timetable ────────────────────────────────────────────────────────────────
const slots = [
  { trackId: c4.id, courseId: g4m.id, teacherId: tM, dayOfWeek: 1, startTime: '08:00', endTime: '08:45', roomNumber: '101' },
  { trackId: c4.id, courseId: g4s.id, teacherId: tS, dayOfWeek: 1, startTime: '09:00', endTime: '09:45', roomNumber: '102' },
  { trackId: c4.id, courseId: g4e.id, teacherId: tE, dayOfWeek: 1, startTime: '10:00', endTime: '10:45', roomNumber: '103' },
  { trackId: c4.id, courseId: g4m.id, teacherId: tM, dayOfWeek: 2, startTime: '08:00', endTime: '08:45', roomNumber: '101' },
  { trackId: c4.id, courseId: g4s.id, teacherId: tS, dayOfWeek: 2, startTime: '09:00', endTime: '09:45', roomNumber: '102' },
  { trackId: c4.id, courseId: g4e.id, teacherId: tE, dayOfWeek: 3, startTime: '08:00', endTime: '08:45', roomNumber: '103' },
  { trackId: c5.id, courseId: g5m.id, teacherId: tM, dayOfWeek: 1, startTime: '08:00', endTime: '08:45', roomNumber: '201' },
  { trackId: c5.id, courseId: g5s.id, teacherId: tS, dayOfWeek: 1, startTime: '09:00', endTime: '09:45', roomNumber: '202' },
  { trackId: c5.id, courseId: g5e.id, teacherId: tE, dayOfWeek: 1, startTime: '10:00', endTime: '10:45', roomNumber: '203' },
  { trackId: c5.id, courseId: g5m.id, teacherId: tM, dayOfWeek: 2, startTime: '08:00', endTime: '08:45', roomNumber: '201' },
  { trackId: c5.id, courseId: g5s.id, teacherId: tS, dayOfWeek: 2, startTime: '09:00', endTime: '09:45', roomNumber: '202' },
  { trackId: c5.id, courseId: g5e.id, teacherId: tE, dayOfWeek: 3, startTime: '08:00', endTime: '08:45', roomNumber: '203' },
];
await prisma.timetable_slot.createMany({ data: slots.map(s => ({ ...s, orgId, academicYearId: yr.id })), skipDuplicates: true });

// ── School events ─────────────────────────────────────────────────────────────
await prisma.school_event.createMany({ data: [
  { orgId, createdBy: tM, title: 'New Year Holiday',             description: 'School closed for New Year', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-03'), type: 'HOLIDAY',     termId: t1.id, isPublished: true },
  { orgId, createdBy: tM, title: 'Final Exams - First Semester', description: 'End of semester exams',     startDate: new Date('2026-01-15'), endDate: new Date('2026-01-29'), type: 'EXAM',        termId: t1.id, isPublished: true },
  { orgId, createdBy: tM, title: 'Parent-Teacher Meeting',       description: 'Progress review session',   startDate: new Date('2026-02-10'), endDate: new Date('2026-02-10'), type: 'PTA_MEETING', termId: t2.id, isPublished: true },
] });

// ── Grade scale ───────────────────────────────────────────────────────────────
const gs = await prisma.grade_scale.create({ data: { OrgId: orgId, name: 'Standard Scale' } });
await prisma.grade_scale_range.createMany({ data: [
  { gradeScaleId: gs.id, grade: 'A+', minScore: 95, maxScore: 100, gpaPoints: 4.0, isPassing: true  },
  { gradeScaleId: gs.id, grade: 'A',  minScore: 85, maxScore: 94,  gpaPoints: 3.7, isPassing: true  },
  { gradeScaleId: gs.id, grade: 'B',  minScore: 75, maxScore: 84,  gpaPoints: 3.0, isPassing: true  },
  { gradeScaleId: gs.id, grade: 'C',  minScore: 65, maxScore: 74,  gpaPoints: 2.0, isPassing: true  },
  { gradeScaleId: gs.id, grade: 'D',  minScore: 50, maxScore: 64,  gpaPoints: 1.0, isPassing: true  },
  { gradeScaleId: gs.id, grade: 'F',  minScore:  0, maxScore: 49,  gpaPoints: 0.0, isPassing: false },
] });

console.log('\n✅ Greenfield Academy seeded!');
await prisma.$disconnect();
