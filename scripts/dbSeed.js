import "dotenv/config";
import prisma from "../src/utils/prisma.js";
import { hashPassword } from "../src/utils/hashPassword.js";
import { encryptPassword } from "../src/utils/passwordCrypto.js";

const DEFAULT_PASSWORD = "12345678";
const NOW = new Date();

const schoolGradeCourses = [
  { name: "Grade 1", gradeLevel: 1 },
  { name: "Grade 2", gradeLevel: 2 },
  { name: "Grade 3", gradeLevel: 3 },
  { name: "Grade 4", gradeLevel: 4 },
  { name: "Grade 5", gradeLevel: 5 },
  { name: "Grade 6", gradeLevel: 6 },
  { name: "Grade 7", gradeLevel: 7 },
  { name: "Grade 8", gradeLevel: 8 },
  { name: "Grade 9", gradeLevel: 9 },
  { name: "Grade 10", gradeLevel: 10 },
  { name: "Grade 11", gradeLevel: 11 },
  { name: "Tawjihi", gradeLevel: 12 },
];

const academyCourseBlueprint = [
  {
    name: "Programming Foundations",
    modules: ["Introduction to Programming", "Problem Solving", "Algorithms Basics"],
  },
  {
    name: "Web Development",
    modules: ["HTML & CSS", "JavaScript Basics", "React Basics"],
  },
  {
    name: "Mobile Development",
    modules: ["Flutter Basics", "State Management", "Firebase Intro"],
  },
  {
    name: "UI/UX Basics",
    modules: ["Design Principles", "Wireframing", "UX Research"],
  },
  {
    name: "English Conversation",
    modules: ["Daily Speaking", "Business English", "Presentation Skills"],
  },
  {
    name: "Data Analysis",
    modules: ["Excel Basics", "SQL Basics", "Power BI Intro"],
  },
];

const pickSchoolSubjectsByGrade = (gradeLevel) => {
  const core = ["Arabic", "English", "Mathematics", "Science", "Islamic Studies", "Computer"];

  if (gradeLevel >= 7) {
    core.push("History", "Geography", "Civics");
  }

  if (gradeLevel >= 9) {
    core.push("Physics", "Chemistry", "Biology");
  }

  return core;
};

const accountSummary = {
  userAccounts: [],
  organizationAccounts: [],
  specialAccounts: [],
};

const hashAndEncryptPassword = async (password) => {
  const passwordHashed = await hashPassword(password);
  const passwordEncrypted = encryptPassword(password);

  return { passwordHashed, passwordEncrypted };
};

const ensureOrganization = async ({
  name,
  email,
  subdomain,
  role,
  password = DEFAULT_PASSWORD,
  description,
}) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const { passwordHashed } = await hashAndEncryptPassword(password);

  const existing = await prisma.organization.findUnique({ where: { Email: normalizedEmail } });

  if (existing) {
    const updated = await prisma.organization.update({
      where: { id: existing.id },
      data: {
        Name: name,
        subdomain,
        Role: role,
        Description: description,
        Password_Hashed: passwordHashed,
        status: "APPROVED",
      },
    });

    return updated;
  }

  return prisma.organization.create({
    data: {
      Name: name,
      Email: normalizedEmail,
      subdomain,
      Password_Hashed: passwordHashed,
      Role: role,
      Description: description,
      status: "APPROVED",
    },
  });
};

const ensureUser = async ({ email, name, role, password = DEFAULT_PASSWORD }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const { passwordHashed, passwordEncrypted } = await hashAndEncryptPassword(password);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role,
        passwordHashed,
        passwordEncrypted,
      },
    });
  }

  return prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      role,
      passwordHashed,
      passwordEncrypted,
    },
  });
};

const ensureTeacherProfile = async (userId, orgId, work = null, specialization = null) => {
  const existing = await prisma.teacher.findUnique({ where: { Teacher_id: userId } });

  if (existing) {
    return prisma.teacher.update({
      where: { Teacher_id: userId },
      data: {
        OrgId: orgId,
        Work: work,
        specialization,
      },
    });
  }

  return prisma.teacher.create({
    data: {
      Teacher_id: userId,
      OrgId: orgId,
      Work: work,
      specialization,
    },
  });
};

const ensureParentProfile = async (userId, nationalId, work = null) => {
  const existing = await prisma.parent.findUnique({ where: { Parent_id: userId } });

  if (!existing) {
    await prisma.parent.create({
      data: {
        Parent_id: userId,
        Work: work,
        nationalId,
      },
    });
  } else {
    await prisma.parent.update({
      where: { Parent_id: userId },
      data: {
        Work: work,
        nationalId,
      },
    });
  }

  return prisma.parent.findUnique({ where: { Parent_id: userId } });
};

const ensureSchoolStudentProfile = async ({ userId, orgId, courseId, gradeLevel, parentId, dob }) => {
  const existing = await prisma.student.findUnique({ where: { Student_id: userId } });

  if (existing) {
    return prisma.student.update({
      where: { Student_id: userId },
      data: {
        OrgId: orgId,
        Course_id: courseId,
        GradeLevel: gradeLevel,
        Parent_id: parentId,
        DOB: dob,
        AcademicStatus: "ACTIVE",
      },
    });
  }

  return prisma.student.create({
    data: {
      Student_id: userId,
      OrgId: orgId,
      Course_id: courseId,
      GradeLevel: gradeLevel,
      Parent_id: parentId,
      DOB: dob,
      AcademicStatus: "ACTIVE",
    },
  });
};

const ensureAcademyMembership = async ({ userId, orgId, courseIds }) => {
  await prisma.academy_user.upsert({
    where: { user_academy_id: userId },
    update: { OrgId: orgId },
    create: {
      user_academy_id: userId,
      OrgId: orgId,
    },
  });

  for (const courseId of courseIds) {
    await prisma.enrollment.upsert({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId,
        },
      },
      update: {},
      create: {
        user_Academy_id: userId,
        Course_id: courseId,
      },
    });
  }
};

const ensureSeedPlansExist = async () => {
  const plans = await prisma.plan.findMany({
    where: {
      name: {
        in: ["Starter", "Growth", "Enterprise"],
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const planByName = new Map(plans.map((plan) => [plan.name, plan]));
  const missing = ["Starter", "Growth", "Enterprise"].filter((name) => !planByName.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Missing seeded plans: ${missing.join(", ")}. Run \"npm run plan:seed\" before \"npm run db:seed\".`
    );
  }

  return {
    starterPlanId: planByName.get("Starter").id,
    growthPlanId: planByName.get("Growth").id,
  };
};

const ensureActiveSubscription = async ({ orgId, planId }) => {
  const existingActive = await prisma.subscription.findFirst({
    where: { organizationId: orgId, status: "ACTIVE" },
    orderBy: { id: "asc" },
  });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 365);

  let subscription;

  if (existingActive) {
    subscription = await prisma.subscription.update({
      where: { id: existingActive.id },
      data: {
        planId,
        startDate: NOW,
        endDate,
        autoRenew: true,
        status: "ACTIVE",
      },
    });
  } else {
    subscription = await prisma.subscription.create({
      data: {
        organizationId: orgId,
        planId,
        startDate: NOW,
        endDate,
        autoRenew: true,
        status: "ACTIVE",
      },
    });
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      subscriptionId: subscription.id,
      status: "SUCCESS",
    },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: orgId,
        amount: 0,
        paymentMethod: "SEED",
        status: "SUCCESS",
      },
    });
  }

  return subscription;
};

const ensureCourse = async ({ orgId, name, gradeLevel = null, description, isPaid, price }) => {
  const existing = await prisma.course.findFirst({
    where: { Org_id: orgId, Name: name },
    orderBy: { id: "asc" },
  });

  const payload = {
    Org_id: orgId,
    Name: name,
    GradeLevel: gradeLevel,
    Description: description,
    isPaid,
    price,
  };

  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.course.create({ data: payload });
};

const ensureCourseChat = async ({ courseId, organizationId, createdByUserId, title }) => {
  const existing = await prisma.chats.findUnique({ where: { course_id: courseId } });

  if (existing) {
    return prisma.chats.update({
      where: { id: existing.id },
      data: {
        organization_id: organizationId,
        created_by: createdByUserId,
        type: "COURSE_GROUP",
        title,
      },
    });
  }

  return prisma.chats.create({
    data: {
      organization_id: organizationId,
      course_id: courseId,
      subject_id: null,
      created_by: createdByUserId,
      type: "COURSE_GROUP",
      title,
    },
  });
};

const ensureSubject = async ({ courseId, teacherId, name, description }) => {
  const existing = await prisma.subject.findFirst({
    where: { Course_id: courseId, name },
    orderBy: { id: "asc" },
  });

  if (existing) {
    return prisma.subject.update({
      where: { id: existing.id },
      data: {
        Teacher_id: teacherId,
        Description: description,
      },
    });
  }

  return prisma.subject.create({
    data: {
      Course_id: courseId,
      Teacher_id: teacherId,
      name,
      Description: description,
    },
  });
};

const ensureLesson = async ({ subjectId, name, description }) => {
  const existing = await prisma.lesson.findFirst({
    where: { Subject_id: subjectId, name },
    orderBy: { id: "asc" },
  });

  if (existing) {
    return prisma.lesson.update({
      where: { id: existing.id },
      data: {
        Description: description,
      },
    });
  }

  return prisma.lesson.create({
    data: {
      Subject_id: subjectId,
      name,
      Description: description,
    },
  });
};

const ensureSchoolData = async ({ schoolOrg, systemBotUser, schoolTeachers }) => {
  const courseByName = new Map();

  for (const gradeCourse of schoolGradeCourses) {
    const course = await ensureCourse({
      orgId: schoolOrg.id,
      name: gradeCourse.name,
      gradeLevel: gradeCourse.gradeLevel,
      description: `${gradeCourse.name} curriculum`,
      isPaid: false,
      price: 0,
    });

    await ensureCourseChat({
      courseId: course.id,
      organizationId: schoolOrg.id,
      createdByUserId: systemBotUser.id,
      title: `${gradeCourse.name} Course Chat`,
    });

    const subjects = pickSchoolSubjectsByGrade(gradeCourse.gradeLevel);

    for (let index = 0; index < subjects.length; index += 1) {
      const subjectName = subjects[index];
      const teacher = schoolTeachers[index % schoolTeachers.length];

      const subject = await ensureSubject({
        courseId: course.id,
        teacherId: teacher.id,
        name: subjectName,
        description: `${subjectName} for ${gradeCourse.name}`,
      });

      await ensureLesson({
        subjectId: subject.id,
        name: `Introduction to ${subjectName}`,
        description: `Core introduction lesson for ${subjectName} in ${gradeCourse.name}.`,
      });
    }

    courseByName.set(gradeCourse.name, course);
  }

  return courseByName;
};

const ensureAcademyData = async ({ academyOrg, systemBotUser, academyTeachers }) => {
  const courseByName = new Map();

  for (const blueprint of academyCourseBlueprint) {
    const course = await ensureCourse({
      orgId: academyOrg.id,
      name: blueprint.name,
      gradeLevel: null,
      description: `${blueprint.name} track for academy learners`,
      isPaid: true,
      price: 79,
    });

    await ensureCourseChat({
      courseId: course.id,
      organizationId: academyOrg.id,
      createdByUserId: systemBotUser.id,
      title: `${blueprint.name} Course Chat`,
    });

    for (let index = 0; index < blueprint.modules.length; index += 1) {
      const moduleName = blueprint.modules[index];
      const teacher = academyTeachers[index % academyTeachers.length];

      const subject = await ensureSubject({
        courseId: course.id,
        teacherId: teacher.id,
        name: moduleName,
        description: `${moduleName} module inside ${blueprint.name}`,
      });

      await ensureLesson({
        subjectId: subject.id,
        name: `${moduleName} - Session 1`,
        description: `Hands-on starter lesson for ${moduleName}.`,
      });
    }

    courseByName.set(blueprint.name, course);
  }

  return courseByName;
};

const seed = async () => {
  console.log("[DB SEED] Starting full local system seed...");

  const { starterPlanId, growthPlanId } = await ensureSeedPlansExist();

  const schoolOrg = await ensureOrganization({
    name: "Learnova School",
    email: "school@learnova.com",
    subdomain: "school",
    role: "SCHOOL",
    description: "Seeded school organization for local testing",
  });

  const academyOrg = await ensureOrganization({
    name: "Learnova Academy",
    email: "academy@learnova.com",
    subdomain: "academy",
    role: "ACADEMY",
    description: "Seeded academy organization for local testing",
  });

  await ensureActiveSubscription({ orgId: schoolOrg.id, planId: starterPlanId });
  await ensureActiveSubscription({ orgId: academyOrg.id, planId: growthPlanId });

  const adminUser = await ensureUser({
    email: "admin@learnova.com",
    name: "Platform Admin",
    role: "ADMIN",
  });

  const systemBotUser = await ensureUser({
    email: "system-bot@learnova.local",
    name: "Learnova Bot",
    role: "ADMIN",
  });

  const schoolTeacherAccounts = [
    { email: "teacher@learnova.com", name: "School Teacher", work: "General Education", specialization: "Mathematics" },
    { email: "teacher.arabic@learnova.com", name: "Arabic Teacher", work: "Language", specialization: "Arabic" },
    { email: "teacher.science@learnova.com", name: "Science Teacher", work: "Science", specialization: "Physics" },
    { email: "teacher.history@learnova.com", name: "History Teacher", work: "Social Studies", specialization: "History" },
  ];

  const academyTeacherAccounts = [
    { email: "academy_teacher@learnova.com", name: "Academy Lead Teacher", work: "Technology", specialization: "Programming" },
    { email: "academy_uiux@learnova.com", name: "UIUX Instructor", work: "Design", specialization: "UI/UX" },
    { email: "academy_data@learnova.com", name: "Data Instructor", work: "Analytics", specialization: "Data Analysis" },
  ];

  const schoolTeachers = [];
  for (const account of schoolTeacherAccounts) {
    const user = await ensureUser({
      email: account.email,
      name: account.name,
      role: "TEACHER",
    });

    await ensureTeacherProfile(user.id, schoolOrg.id, account.work, account.specialization);
    schoolTeachers.push(user);
  }

  const academyTeachers = [];
  for (const account of academyTeacherAccounts) {
    const user = await ensureUser({
      email: account.email,
      name: account.name,
      role: "TEACHER",
    });

    await ensureTeacherProfile(user.id, academyOrg.id, account.work, account.specialization);
    academyTeachers.push(user);
  }

  const schoolCourseMap = await ensureSchoolData({
    schoolOrg,
    systemBotUser,
    schoolTeachers,
  });

  const academyCourseMap = await ensureAcademyData({
    academyOrg,
    systemBotUser,
    academyTeachers,
  });

  const parentUser = await ensureUser({
    email: "parent@learnova.com",
    name: "Primary Parent",
    role: "PARENT",
  });
  await ensureParentProfile(parentUser.id, "PARENT001", "Engineering");

  const schoolStudentUser = await ensureUser({
    email: "student@learnova.com",
    name: "Primary Student",
    role: "STUDENT",
  });

  const grade10Course = schoolCourseMap.get("Grade 10");
  await ensureSchoolStudentProfile({
    userId: schoolStudentUser.id,
    orgId: schoolOrg.id,
    courseId: grade10Course.id,
    gradeLevel: 10,
    parentId: parentUser.id,
    dob: new Date("2010-04-14"),
  });

  const extraSchoolStudents = [
    { email: "student.g1@learnova.com", name: "Grade 1 Student", grade: "Grade 1", nationalId: "PARENT101" },
    { email: "student.g5@learnova.com", name: "Grade 5 Student", grade: "Grade 5", nationalId: "PARENT105" },
    { email: "student.g8@learnova.com", name: "Grade 8 Student", grade: "Grade 8", nationalId: "PARENT108" },
    { email: "student.g11@learnova.com", name: "Grade 11 Student", grade: "Grade 11", nationalId: "PARENT111" },
    { email: "student.tawjihi@learnova.com", name: "Tawjihi Student", grade: "Tawjihi", nationalId: "PARENT112" },
  ];

  for (const entry of extraSchoolStudents) {
    const parentAccount = await ensureUser({
      email: `parent.${entry.grade.replace(/\s+/g, "").toLowerCase()}@learnova.com`,
      name: `Parent ${entry.grade}`,
      role: "PARENT",
    });

    await ensureParentProfile(parentAccount.id, entry.nationalId, "Parent");

    const studentUser = await ensureUser({
      email: entry.email,
      name: entry.name,
      role: "STUDENT",
    });

    const targetCourse = schoolCourseMap.get(entry.grade);

    await ensureSchoolStudentProfile({
      userId: studentUser.id,
      orgId: schoolOrg.id,
      courseId: targetCourse.id,
      gradeLevel: targetCourse.GradeLevel,
      parentId: parentAccount.id,
      dob: new Date("2011-09-01"),
    });
  }

  const academyStudentUser = await ensureUser({
    email: "academy_student@learnova.com",
    name: "Academy Student",
    role: "STUDENT",
  });

  await ensureAcademyMembership({
    userId: academyStudentUser.id,
    orgId: academyOrg.id,
    courseIds: [
      academyCourseMap.get("Programming Foundations").id,
      academyCourseMap.get("Web Development").id,
    ],
  });

  const academyStudentUser2 = await ensureUser({
    email: "academy_student2@learnova.com",
    name: "Academy Student Two",
    role: "STUDENT",
  });

  await ensureAcademyMembership({
    userId: academyStudentUser2.id,
    orgId: academyOrg.id,
    courseIds: [
      academyCourseMap.get("Mobile Development").id,
      academyCourseMap.get("Data Analysis").id,
    ],
  });

  const grade10Subjects = await prisma.subject.findMany({
    where: {
      Course_id: grade10Course.id,
      name: {
        in: ["Arabic", "English", "Mathematics", "Physics", "Chemistry"],
      },
    },
    select: { id: true },
  });

  await prisma.marks.deleteMany({
    where: {
      Student_id: schoolStudentUser.id,
      Subject_id: { in: grade10Subjects.map((subject) => subject.id) },
    },
  });

  for (const subject of grade10Subjects) {
    await prisma.marks.create({
      data: {
        Student_id: schoolStudentUser.id,
        Subject_id: subject.id,
        Numbers: 84,
        OutOf: 100,
        ExamPercentage: 100,
        MarkType: "EXAM",
        time: new Date("2026-02-15"),
      },
    });
  }

  accountSummary.userAccounts = [
    { email: "admin@learnova.com", password: DEFAULT_PASSWORD, role: "ADMIN" },
    { email: "teacher@learnova.com", password: DEFAULT_PASSWORD, role: "TEACHER", orgType: "SCHOOL" },
    { email: "student@learnova.com", password: DEFAULT_PASSWORD, role: "STUDENT", orgType: "SCHOOL" },
    { email: "parent@learnova.com", password: DEFAULT_PASSWORD, role: "PARENT", orgType: "SCHOOL", nationalId: "PARENT001" },
    { email: "academy_teacher@learnova.com", password: DEFAULT_PASSWORD, role: "TEACHER", orgType: "ACADEMY" },
    { email: "academy_student@learnova.com", password: DEFAULT_PASSWORD, role: "STUDENT", orgType: "ACADEMY" },
  ];

  accountSummary.organizationAccounts = [
    { email: "school@learnova.com", password: DEFAULT_PASSWORD, role: "SCHOOL", status: "APPROVED" },
    { email: "academy@learnova.com", password: DEFAULT_PASSWORD, role: "ACADEMY", status: "APPROVED" },
  ];

  accountSummary.specialAccounts = [
    { email: "system-bot@learnova.local", role: "SYSTEM_BOT", password: DEFAULT_PASSWORD },
  ];

  const counts = {
    organizations: await prisma.organization.count(),
    users: await prisma.user.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    parents: await prisma.parent.count(),
    academyUsers: await prisma.academy_user.count(),
    courses: await prisma.course.count(),
    subjects: await prisma.subject.count(),
    lessons: await prisma.lesson.count(),
    chats: await prisma.chats.count(),
    messages: await prisma.messages.count(),
    marks: await prisma.marks.count(),
    plans: await prisma.plan.count(),
    features: await prisma.feature.count(),
    subscriptions: await prisma.subscription.count(),
  };

  console.log("[DB SEED] Completed successfully.");
  console.log(JSON.stringify({ accountSummary, counts }, null, 2));
};

seed()
  .catch((error) => {
    console.error("[DB SEED] Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
