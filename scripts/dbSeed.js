import 'dotenv/config';
import prisma from '../src/utils/prisma.js';
import { hashPassword } from '../src/utils/hashPassword.js';
import { encryptPassword } from '../src/utils/passwordCrypto.js';

const DEFAULT_PASSWORD = '12345678';

const schoolClasses = [
  {
    name: 'Grade 10',
    gradeLevel: 10,
    subjects: ['Arabic', 'English', 'Mathematics', 'Biology', 'Chemistry', 'Physics'],
  },
  {
    name: 'Grade 11',
    gradeLevel: 11,
    subjects: ['Arabic', 'English', 'Mathematics', 'Biology', 'Physics', 'History'],
  },
  {
    name: 'Tawjihi',
    gradeLevel: 12,
    subjects: ['Arabic', 'English', 'Advanced Mathematics', 'Physics', 'Chemistry', 'Civics'],
  },
];

const academyTracks = [
  {
    name: 'Programming Track',
    description: 'Core software engineering path for academy learners.',
    subjects: [
      { name: 'C++', isPaid: true, price: 10, imageUrl: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80' },
      { name: 'Python', isPaid: true, price: 15, imageUrl: 'https://images.unsplash.com/photo-1526378800651-c32d170fe6f8?auto=format&fit=crop&w=1200&q=80' },
      { name: 'Java', isPaid: true, price: 12, imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80' },
      { name: 'Data Structures', isPaid: true, price: 20, imageUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80' },
    ],
  },
  {
    name: 'Design Track',
    description: 'UI/UX practical path from basics to delivery.',
    subjects: [
      { name: 'UI/UX Basics', isPaid: true, price: 10, imageUrl: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80' },
      { name: 'Figma Mastery', isPaid: true, price: 15, imageUrl: 'https://images.unsplash.com/photo-1586717799252-bd134ad00e26?auto=format&fit=crop&w=1200&q=80' },
    ],
  },
  {
    name: 'AI Track',
    description: 'Data and prompting foundations for AI workflows.',
    subjects: [
      { name: 'Data Analysis', isPaid: true, price: 18, imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80' },
      { name: 'Prompt Engineering', isPaid: true, price: 12, imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80' },
    ],
  },
];

const lessonSections = [
  {
    section: 'Section 1 - Foundations',
    lectures: [
      { title: 'Introduction', description: 'Main concepts and learning outcomes.' },
      { title: 'Core Concepts', description: 'Detailed explanation of the core ideas.' },
      { title: 'Quick Check', description: 'Short recap and understanding check.' },
    ],
  },
  {
    section: 'Section 2 - Practical',
    lectures: [
      { title: 'Hands-on Walkthrough', description: 'Guided practical implementation.' },
      { title: 'Mini Project', description: 'Build a small feature from start to finish.' },
      { title: 'Common Mistakes', description: 'Fix the most common learner mistakes.' },
    ],
  },
  {
    section: 'Section 3 - Advanced',
    lectures: [
      { title: 'Optimization', description: 'Improve quality and performance.' },
      { title: 'Best Practices', description: 'Production-ready conventions and patterns.' },
      { title: 'Final Recap', description: 'Wrap-up and next learning steps.' },
    ],
  },
];

const ensureUser = async ({ email, name, role, password = DEFAULT_PASSWORD }) => {
  const passwordHashed = await hashPassword(password);
  const passwordEncrypted = encryptPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
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
      email,
      role,
      passwordHashed,
      passwordEncrypted,
    },
  });
};

const ensureOrganization = async ({ name, email, role, subdomain }) => {
  const passwordHashed = await hashPassword(DEFAULT_PASSWORD);

  const existing = await prisma.organization.findUnique({ where: { Email: email } });
  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        Name: name,
        Role: role,
        subdomain,
        status: 'APPROVED',
        Password_Hashed: passwordHashed,
      },
    });
  }

  return prisma.organization.create({
    data: {
      Name: name,
      Email: email,
      subdomain,
      Role: role,
      status: 'APPROVED',
      Password_Hashed: passwordHashed,
    },
  });
};

const ensureTeacher = async ({ user, orgId, specialization }) => {
  return prisma.teacher.upsert({
    where: { Teacher_id: user.id },
    update: {
      OrgId: orgId,
      specialization,
      Work: specialization,
    },
    create: {
      Teacher_id: user.id,
      OrgId: orgId,
      specialization,
      Work: specialization,
    },
  });
};

const ensureCourse = async ({ orgId, name, gradeLevel = null, kind, description, isPaid = false, price = 0 }) => {
  const existing = await prisma.course.findFirst({
    where: {
      Org_id: orgId,
      Name: name,
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return prisma.course.update({
      where: { id: existing.id },
      data: {
        GradeLevel: gradeLevel,
        kind,
        Description: description,
        isPaid,
        price,
      },
    });
  }

  return prisma.course.create({
    data: {
      Org_id: orgId,
      Name: name,
      GradeLevel: gradeLevel,
      kind,
      Description: description,
      isPaid,
      price,
    },
  });
};

const ensureSubject = async ({ courseId, teacherId, name, description, imageUrl = '', isPaid = false, price = 0 }) => {
  const existing = await prisma.subject.findFirst({
    where: {
      Course_id: courseId,
      name,
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return prisma.subject.update({
      where: { id: existing.id },
      data: {
        Teacher_id: teacherId,
        Description: description,
        imageUrl,
        isPaid,
        price,
      },
    });
  }

  return prisma.subject.create({
    data: {
      Course_id: courseId,
      Teacher_id: teacherId,
      name,
      Description: description,
      imageUrl,
      isPaid,
      price,
    },
  });
};

const ensureLessons = async ({ subjectId, subjectName }) => {
  for (const section of lessonSections) {
    for (let lectureIndex = 0; lectureIndex < section.lectures.length; lectureIndex += 1) {
      const lecture = section.lectures[lectureIndex];
      const lessonName = `${section.section} :: ${subjectName} - ${lecture.title}`;

      const existing = await prisma.lesson.findFirst({
        where: {
          Subject_id: subjectId,
          name: lessonName,
        },
        orderBy: { id: 'asc' },
      });

      const lesson = existing
        ? await prisma.lesson.update({
            where: { id: existing.id },
            data: { Description: lecture.description },
          })
        : await prisma.lesson.create({
            data: {
              Subject_id: subjectId,
              name: lessonName,
              Description: lecture.description,
            },
          });

      const existingAttachment = await prisma.lesson_attachment.findFirst({
        where: {
          lessonId: lesson.id,
          originalName: `${lessonName}.pdf`,
        },
      });

      if (!existingAttachment) {
        await prisma.lesson_attachment.create({
          data: {
            lessonId: lesson.id,
            fileUrl: `https://cdn.learnova.local/seed/${subjectId}/${lesson.id}.pdf`,
            filePublicId: `seed/${subjectId}/${lesson.id}`,
            fileResourceType: 'raw',
            mimeType: 'application/pdf',
            originalName: `${lessonName}.pdf`,
            fileType: 'PDF',
            sizeBytes: BigInt(64000),
          },
        });
      }
    }
  }
};

const ensureSchoolStudent = async ({ user, orgId, classCourseId, gradeLevel }) => {
  return prisma.student.upsert({
    where: { Student_id: user.id },
    update: {
      OrgId: orgId,
      Course_id: classCourseId,
      GradeLevel: gradeLevel,
      AcademicStatus: 'ACTIVE',
    },
    create: {
      Student_id: user.id,
      OrgId: orgId,
      Course_id: classCourseId,
      GradeLevel: gradeLevel,
      AcademicStatus: 'ACTIVE',
    },
  });
};

const ensureAcademyMembership = async ({ userId, orgId }) => {
  await prisma.student.deleteMany({
    where: {
      Student_id: userId,
    },
  });

  await prisma.academy_user.upsert({
    where: { user_academy_id: userId },
    update: { OrgId: orgId },
    create: {
      user_academy_id: userId,
      OrgId: orgId,
    },
  });
};

const ensureClassChat = async ({ orgId, classId, createdBy, title }) => {
  const existing = await prisma.chats.findFirst({
    where: {
      organization_id: orgId,
      class_id: classId,
      type: 'CLASS_GROUP',
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.chats.create({
    data: {
      organization_id: orgId,
      class_id: classId,
      created_by: createdBy,
      type: 'CLASS_GROUP',
      title,
    },
  });
};

const ensureSubjectChat = async ({ orgId, subjectId, createdBy, title }) => {
  const existing = await prisma.chats.findFirst({
    where: {
      organization_id: orgId,
      subject_id: subjectId,
      type: 'GROUP',
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.chats.create({
    data: {
      organization_id: orgId,
      subject_id: subjectId,
      created_by: createdBy,
      type: 'GROUP',
      title,
    },
  });
};

const addMessageIfMissing = async ({ chatId, senderId, content }) => {
  const existing = await prisma.messages.findFirst({
    where: {
      chat_id: chatId,
      sender_user_id: senderId,
      content,
    },
  });

  if (!existing) {
    await prisma.messages.create({
      data: {
        chat_id: chatId,
        sender_user_id: senderId,
        content,
        message_type: 'text',
      },
    });
  }
};

const cleanupAcademyData = async ({ academyOrgId }) => {
  await prisma.messages.deleteMany({
    where: {
      chats: {
        organization_id: academyOrgId,
      },
    },
  });

  await prisma.chat_participants.deleteMany({
    where: {
      chats: {
        organization_id: academyOrgId,
      },
    },
  });

  await prisma.chats.deleteMany({
    where: {
      organization_id: academyOrgId,
    },
  });

  await prisma.student_subject_subscription.deleteMany({
    where: {
      subject: {
        course: {
          Org_id: academyOrgId,
        },
      },
    },
  });

  await prisma.student_course_payment.deleteMany({
    where: {
      course: {
        Org_id: academyOrgId,
      },
    },
  });

  await prisma.enrollment.deleteMany({
    where: {
      course: {
        Org_id: academyOrgId,
      },
    },
  });

  await prisma.course.deleteMany({
    where: {
      Org_id: academyOrgId,
      kind: 'TRACK',
    },
  });
};

const seed = async () => {
  console.log('[DB SEED] Seeding school and academy flows...');

  await prisma.messages.deleteMany();
  await prisma.chat_participants.deleteMany();
  await prisma.chats.deleteMany();

  const schoolOrg = await ensureOrganization({
    name: 'Jerusalem Future School',
    email: 'school@learnova.com',
    role: 'SCHOOL',
    subdomain: 'jerusalem-school',
  });

  const academyOrg = await ensureOrganization({
    name: 'Learnova Professional Academy',
    email: 'academy@learnova.com',
    role: 'ACADEMY',
    subdomain: 'learnova-academy',
  });

  const systemBot = await ensureUser({
    email: 'system-bot@learnova.local',
    name: 'Learnova Bot',
    role: 'ADMIN',
  });

  const schoolTeachers = [
    await ensureUser({ email: 'teacher.math.school@learnova.com', name: 'Ms. Rania Math', role: 'TEACHER' }),
    await ensureUser({ email: 'teacher.science.school@learnova.com', name: 'Mr. Kareem Science', role: 'TEACHER' }),
    await ensureUser({ email: 'teacher.language.school@learnova.com', name: 'Ms. Huda Language', role: 'TEACHER' }),
  ];

  await ensureTeacher({ user: schoolTeachers[0], orgId: schoolOrg.id, specialization: 'Mathematics' });
  await ensureTeacher({ user: schoolTeachers[1], orgId: schoolOrg.id, specialization: 'Science' });
  await ensureTeacher({ user: schoolTeachers[2], orgId: schoolOrg.id, specialization: 'Languages' });

  const academyTeachers = [
    await ensureUser({ email: 'teacher.programming.academy@learnova.com', name: 'Eng. Omar Dev', role: 'TEACHER' }),
    await ensureUser({ email: 'teacher.design.academy@learnova.com', name: 'Ms. Dana UX', role: 'TEACHER' }),
    await ensureUser({ email: 'teacher.ai.academy@learnova.com', name: 'Dr. Samer AI', role: 'TEACHER' }),
  ];

  await ensureTeacher({ user: academyTeachers[0], orgId: academyOrg.id, specialization: 'Programming' });
  await ensureTeacher({ user: academyTeachers[1], orgId: academyOrg.id, specialization: 'Design' });
  await ensureTeacher({ user: academyTeachers[2], orgId: academyOrg.id, specialization: 'Data and AI' });

  await cleanupAcademyData({ academyOrgId: academyOrg.id });

  const schoolCourseMap = new Map();
  for (const classBlueprint of schoolClasses) {
    const classCourse = await ensureCourse({
      orgId: schoolOrg.id,
      name: classBlueprint.name,
      gradeLevel: classBlueprint.gradeLevel,
      kind: 'CLASS',
      description: `${classBlueprint.name} class curriculum`,
      isPaid: false,
      price: 0,
    });
    schoolCourseMap.set(classBlueprint.name, classCourse);

    for (let idx = 0; idx < classBlueprint.subjects.length; idx += 1) {
      const teacher = schoolTeachers[idx % schoolTeachers.length];
      const subject = await ensureSubject({
        courseId: classCourse.id,
        teacherId: teacher.id,
        name: classBlueprint.subjects[idx],
        description: `${classBlueprint.subjects[idx]} for ${classBlueprint.name}`,
        isPaid: false,
        price: 0,
      });

      await ensureLessons({ subjectId: subject.id, subjectName: subject.name });
    }
  }

  const schoolStudents = [
    { email: 'student.school.g10@learnova.com', name: 'Yazan Grade10', className: 'Grade 10' },
    { email: 'student.school.g11@learnova.com', name: 'Mira Grade11', className: 'Grade 11' },
    { email: 'student.school.tawjihi@learnova.com', name: 'Ahmad Tawjihi', className: 'Tawjihi' },
  ];

  for (const studentRow of schoolStudents) {
    const user = await ensureUser({ email: studentRow.email, name: studentRow.name, role: 'STUDENT' });
    const classCourse = schoolCourseMap.get(studentRow.className);
    await ensureSchoolStudent({
      user,
      orgId: schoolOrg.id,
      classCourseId: classCourse.id,
      gradeLevel: classCourse.GradeLevel,
    });

  }

  const tawjihiCourse = schoolCourseMap.get('Tawjihi');
  const tawjihiSubjects = await prisma.subject.findMany({
    where: { Course_id: tawjihiCourse.id },
    take: 3,
    orderBy: { id: 'asc' },
  });

  const tawjihiStudent = await prisma.user.findUnique({ where: { email: 'student.school.tawjihi@learnova.com' } });
  if (tawjihiStudent) {
    await prisma.marks.deleteMany({ where: { Student_id: tawjihiStudent.id } });

    for (const subject of tawjihiSubjects) {
      await prisma.marks.create({
        data: {
          Student_id: tawjihiStudent.id,
          Subject_id: subject.id,
          Numbers: 88,
          OutOf: 100,
          ExamPercentage: 100,
          MarkType: 'EXAM',
          time: new Date('2026-03-14'),
        },
      });
    }
  }

  const academyTrackMap = new Map();
  const academySubjectMap = new Map();

  for (let trackIndex = 0; trackIndex < academyTracks.length; trackIndex += 1) {
    const track = academyTracks[trackIndex];
    const course = await ensureCourse({
      orgId: academyOrg.id,
      name: track.name,
      gradeLevel: null,
      kind: 'TRACK',
      description: track.description,
      isPaid: false,
      price: 0,
    });

    academyTrackMap.set(track.name, course);

    for (let idx = 0; idx < track.subjects.length; idx += 1) {
      const subjectBlueprint = track.subjects[idx];
      const teacher = academyTeachers[trackIndex % academyTeachers.length];
      const subject = await ensureSubject({
        courseId: course.id,
        teacherId: teacher.id,
        name: subjectBlueprint.name,
        description: `${subjectBlueprint.name} material in ${track.name}`,
        imageUrl: subjectBlueprint.imageUrl || '',
        isPaid: subjectBlueprint.isPaid,
        price: subjectBlueprint.price,
      });

      academySubjectMap.set(`${track.name}::${subjectBlueprint.name}`, subject);
      await ensureLessons({ subjectId: subject.id, subjectName: subject.name });
    }
  }

  const academyStudents = [
    {
      email: 'student.academy.one@learnova.com',
      name: 'Lina Academy',
      subscriptions: ['Programming Track::Python', 'Design Track::Figma Mastery'],
    },
    {
      email: 'student.academy.two@learnova.com',
      name: 'Zaid Academy',
      subscriptions: ['Programming Track::C++', 'AI Track::Data Analysis'],
    },
    {
      email: 'student.academy.three@learnova.com',
      name: 'Rama Academy',
      subscriptions: ['AI Track::Prompt Engineering'],
    },
    {
      email: 'academy_student@learnova.com',
      name: 'Academy Student',
      subscriptions: ['Programming Track::Python'],
    },
    {
      email: 'academy_student2@learnova.com',
      name: 'Academy Student Two',
      subscriptions: ['Design Track::UI/UX Basics'],
    },
    {
      email: 'academy_buyer@learnova.com',
      name: 'Academy Buyer',
      subscriptions: [],
    },
    // Add new students for testing payment flow
    {
      email: 'test.buyer.one@learnova.com',
      name: 'Test Buyer One',
      subscriptions: ['Programming Track::Java'],
    },
    {
      email: 'test.buyer.two@learnova.com',
      name: 'Test Buyer Two',
      subscriptions: ['Design Track::Figma Mastery'],
    },
    {
      email: 'test.buyer.three@learnova.com',
      name: 'Test Buyer Three',
      subscriptions: ['AI Track::Prompt Engineering', 'Programming Track::Python'],
    },
    {
      email: 'premium.student@learnova.com',
      name: 'Premium Student',
      subscriptions: ['Programming Track::C++', 'Programming Track::Python', 'Programming Track::Java', 'Programming Track::Data Structures'],
    },
  ];

  for (const academyStudent of academyStudents) {
    const user = await ensureUser({ email: academyStudent.email, name: academyStudent.name, role: 'STUDENT' });
    await ensureAcademyMembership({ userId: user.id, orgId: academyOrg.id });

    for (const key of academyStudent.subscriptions) {
      const subject = academySubjectMap.get(key);
      if (!subject) {
        continue;
      }

      await prisma.student_subject_subscription.upsert({
        where: {
          user_Academy_id_Subject_id: {
            user_Academy_id: user.id,
            Subject_id: subject.id,
          },
        },
        update: {
          amount: subject.price,
          paymentMethod: 'SEED',
          paymentStatus: 'PAID',
          stripeSessionId: null,
          status: 'SUCCESS',
          paidAt: new Date(),
        },
        create: {
          user_Academy_id: user.id,
          Subject_id: subject.id,
          amount: subject.price,
          paymentMethod: 'SEED',
          paymentStatus: 'PAID',
          stripeSessionId: null,
          status: 'SUCCESS',
          paidAt: new Date(),
        },
      });

      await prisma.enrollment.upsert({
        where: {
          user_Academy_id_Course_id: {
            user_Academy_id: user.id,
            Course_id: subject.Course_id,
          },
        },
        update: {},
        create: {
          user_Academy_id: user.id,
          Course_id: subject.Course_id,
        },
      });

      await prisma.student_course_payment.upsert({
        where: {
          user_Academy_id_Course_id: {
            user_Academy_id: user.id,
            Course_id: subject.Course_id,
          },
        },
        update: {
          amount: subject.price,
          paymentMethod: 'SEED',
          status: 'SUCCESS',
          paidAt: new Date(),
        },
        create: {
          user_Academy_id: user.id,
          Course_id: subject.Course_id,
          amount: subject.price,
          paymentMethod: 'SEED',
          status: 'SUCCESS',
          paidAt: new Date(),
        },
      });

    }
  }

  // ========== CREATE ACADEMY CHATS WITH MESSAGES ==========
  console.log('[DB SEED] Creating academy chats and messages...');

  const programmingCourse = academyTrackMap.get('Programming Track');
  const pythonSubject = academySubjectMap.get('Programming Track::Python');
  const cppSubject = academySubjectMap.get('Programming Track::C++');
  const designCourse = academyTrackMap.get('Design Track');
  const figmaMasterySubject = academySubjectMap.get('Design Track::Figma Mastery');

  // Create programming chat
  if (pythonSubject) {
    const programmingChat = await ensureSubjectChat({
      orgId: academyOrg.id,
      subjectId: pythonSubject.id,
      createdBy: academyTeachers[0].id,
      title: `Programming Track - Python Chat`,
    });

    // Add participants
    for (const student of academyStudents) {
      const user = await prisma.user.findUnique({ where: { email: student.email } });
      if (user) {
        await prisma.chat_participants.upsert({
          where: {
            chat_id_user_id: {
              chat_id: programmingChat.id,
              user_id: user.id,
            },
          },
          update: {},
          create: {
            chat_id: programmingChat.id,
            user_id: user.id,
            role_in_chat: 'member',
          },
        });
      }
    }

    // Add teacher to chat
    await prisma.chat_participants.upsert({
      where: {
        chat_id_user_id: {
          chat_id: programmingChat.id,
          user_id: academyTeachers[0].id,
        },
      },
      update: {},
      create: {
        chat_id: programmingChat.id,
        user_id: academyTeachers[0].id,
        role_in_chat: 'teacher',
      },
    });

    // Add initial messages
    const messageTexts = [
      'Welcome to Python Programming! 🎉',
      'Today we will cover fundamentals of Python.',
      'Let\'s start with variables and data types.',
      'Any questions about the introduction?',
      'Great! Let\'s move to the next topic.',
      'Here\'s a practical example for you to try.',
      'Feel free to ask if anything is unclear.',
    ];

    for (let i = 0; i < messageTexts.length; i++) {
      const sender = i % 2 === 0 ? academyTeachers[0] : academyStudents[0];
      const senderUser = await prisma.user.findUnique({ where: { email: sender.email } });
      if (senderUser) {
        await addMessageIfMissing({
          chatId: programmingChat.id,
          senderId: senderUser.id,
          content: messageTexts[i],
        });
      }
    }
  }

  // Create design chat
  if (figmaMasterySubject) {
    const designChat = await ensureSubjectChat({
      orgId: academyOrg.id,
      subjectId: figmaMasterySubject.id,
      createdBy: academyTeachers[1].id,
      title: `Design Track - Figma Mastery Chat`,
    });

    // Add participants
    const designStudents = academyStudents.filter(s => s.subscriptions.some(sub => sub.includes('Design')));
    for (const student of designStudents) {
      const user = await prisma.user.findUnique({ where: { email: student.email } });
      if (user) {
        await prisma.chat_participants.upsert({
          where: {
            chat_id_user_id: {
              chat_id: designChat.id,
              user_id: user.id,
            },
          },
          update: {},
          create: {
            chat_id: designChat.id,
            user_id: user.id,
            role_in_chat: 'member',
          },
        });
      }
    }

    // Add teacher
    await prisma.chat_participants.upsert({
      where: {
        chat_id_user_id: {
          chat_id: designChat.id,
          user_id: academyTeachers[1].id,
        },
      },
      update: {},
      create: {
        chat_id: designChat.id,
        user_id: academyTeachers[1].id,
        role_in_chat: 'teacher',
      },
    });

    const designMessages = [
      'Welcome to Figma Mastery course!',
      'Today we\'ll learn UI design principles.',
      'Figma is the leading design tool in the industry.',
      'Let me share my screen to show you the basics.',
      'We\'ll create a simple dashboard together.',
      'Try following along with me.',
      'Perfect! Now you know the essentials.',
    ];

    for (let i = 0; i < designMessages.length; i++) {
      const sender = i % 2 === 0 ? academyTeachers[1] : (designStudents[0] || academyStudents[1]);
      const senderUser = await prisma.user.findUnique({ where: { email: sender.email } });
      if (senderUser) {
        await addMessageIfMissing({
          chatId: designChat.id,
          senderId: senderUser.id,
          content: designMessages[i],
        });
      }
    }
  }

  // Create AI track chat
  const aiTrackCourse = academyTrackMap.get('AI Track');
  const dataAnalysisSubject = academySubjectMap.get('AI Track::Data Analysis');
  if (dataAnalysisSubject) {
    const aiChat = await ensureSubjectChat({
      orgId: academyOrg.id,
      subjectId: dataAnalysisSubject.id,
      createdBy: academyTeachers[2].id,
      title: `AI Track - Data Analysis Chat`,
    });

    // Add all academy students
    for (const student of academyStudents) {
      const user = await prisma.user.findUnique({ where: { email: student.email } });
      if (user) {
        await prisma.chat_participants.upsert({
          where: {
            chat_id_user_id: {
              chat_id: aiChat.id,
              user_id: user.id,
            },
          },
          update: {},
          create: {
            chat_id: aiChat.id,
            user_id: user.id,
            role_in_chat: 'member',
          },
        });
      }
    }

    // Add teacher
    await prisma.chat_participants.upsert({
      where: {
        chat_id_user_id: {
          chat_id: aiChat.id,
          user_id: academyTeachers[2].id,
        },
      },
      update: {},
      create: {
        chat_id: aiChat.id,
        user_id: academyTeachers[2].id,
        role_in_chat: 'teacher',
      },
    });

    const aiMessages = [
      'Welcome to Data Analysis for AI!',
      'Data is the foundation of all AI models.',
      'We\'ll start with data preprocessing.',
      'This is crucial for model accuracy.',
      'Let\'s explore some real datasets.',
      'Notice the patterns in this data?',
      'Excellent observations from the class!',
    ];

    for (let i = 0; i < aiMessages.length; i++) {
      const sender = i % 2 === 0 ? academyTeachers[2] : academyStudents[Math.floor(Math.random() * academyStudents.length)];
      const senderUser = await prisma.user.findUnique({ where: { email: sender.email } });
      if (senderUser) {
        await addMessageIfMissing({
          chatId: aiChat.id,
          senderId: senderUser.id,
          content: aiMessages[i],
        });
      }
    }
  }

  // ========== CREATE SCHOOL CHATS WITH MESSAGES ==========
  const grade11Course = schoolCourseMap.get('Grade 11');
  const grade11Subjects = await prisma.subject.findMany({
    where: { Course_id: grade11Course.id },
    take: 2,
  });

  if (grade11Subjects.length > 0) {
    const schoolChatSubject = grade11Subjects[0];
    const schoolChat = await ensureSubjectChat({
      orgId: schoolOrg.id,
      subjectId: schoolChatSubject.id,
      createdBy: schoolTeachers[0].id,
      title: `Grade 11 - ${schoolChatSubject.name} Chat`,
    });

    // Add students and teachers
    for (const student of schoolStudents) {
      const user = await prisma.user.findUnique({ where: { email: student.email } });
      if (user && student.className === 'Grade 11') {
        await prisma.chat_participants.upsert({
          where: {
            chat_id_user_id: {
              chat_id: schoolChat.id,
              user_id: user.id,
            },
          },
          update: {},
          create: {
            chat_id: schoolChat.id,
            user_id: user.id,
            role_in_chat: 'member',
          },
        });
      }
    }

    await prisma.chat_participants.upsert({
      where: {
        chat_id_user_id: {
          chat_id: schoolChat.id,
          user_id: schoolTeachers[0].id,
        },
      },
      update: {},
      create: {
        chat_id: schoolChat.id,
        user_id: schoolTeachers[0].id,
        role_in_chat: 'teacher',
      },
    });

    const schoolMessages = [
      'Good morning class! ☀️',
      'Today\'s lesson is on important topics',
      'Please open your textbooks to chapter 5.',
      'Who can summarize the main points?',
      'Great summary!',
      'Let\'s discuss the applications.',
      'Homework: Complete the exercises.',
    ];

    for (let i = 0; i < schoolMessages.length; i++) {
      const sender = i % 2 === 0 ? schoolTeachers[0] : (schoolStudents.find(s => s.className === 'Grade 11') || schoolStudents[0]);
      const senderUser = await prisma.user.findUnique({ where: { email: sender.email } });
      if (senderUser) {
        await addMessageIfMissing({
          chatId: schoolChat.id,
          senderId: senderUser.id,
          content: schoolMessages[i],
        });
      }
    }
  }

  const summary = {
    organizations: await prisma.organization.count(),
    courses: await prisma.course.count(),
    subjects: await prisma.subject.count(),
    lessons: await prisma.lesson.count(),
    students: await prisma.student.count(),
    academyUsers: await prisma.academy_user.count(),
    subjectSubscriptions: await prisma.student_subject_subscription.count(),
    coursePayments: await prisma.student_course_payment.count(),
    chats: await prisma.chats.count(),
    messages: await prisma.messages.count(),
    chatParticipants: await prisma.chat_participants.count(),
    marks: await prisma.marks.count(),
  };

  console.log('[DB SEED] Completed.');
  console.log(JSON.stringify({
    loginAccounts: {
      // School Accounts
      schoolStudent1: { email: 'student.school.g10@learnova.com', password: DEFAULT_PASSWORD, type: 'School Student - Grade 10' },
      schoolStudent2: { email: 'student.school.g11@learnova.com', password: DEFAULT_PASSWORD, type: 'School Student - Grade 11' },
      schoolStudent3: { email: 'student.school.tawjihi@learnova.com', password: DEFAULT_PASSWORD, type: 'School Student - Tawjihi' },
      
      // Academy Students with existing subscriptions
      academyStudent1: { email: 'student.academy.one@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Lina (Python + Figma)' },
      academyStudent2: { email: 'student.academy.two@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Zaid (C++ + Data Analysis)' },
      academyStudent3: { email: 'student.academy.three@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Rama (Prompt Engineering)' },
      
      // Academy Students - Ready for payment testing
      testBuyer1: { email: 'test.buyer.one@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Test Buyer (Java)' },
      testBuyer2: { email: 'test.buyer.two@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Test Buyer (Figma)' },
      testBuyer3: { email: 'test.buyer.three@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Test Buyer (AI + Python)' },
      premiumStudent: { email: 'premium.student@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Premium (All Programming)' },
      
      // Free accounts
      academyStudent: { email: 'academy_student@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Free Student' },
      academyStudent2: { email: 'academy_student2@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Free Student 2' },
      academyBuyer: { email: 'academy_buyer@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy - Buyer (No purchases yet)' },
      
      // Organization Accounts
      schoolOrg: { email: 'school@learnova.com', password: DEFAULT_PASSWORD, type: 'School Organization' },
      academyOrg: { email: 'academy@learnova.com', password: DEFAULT_PASSWORD, type: 'Academy Organization' },
    },
    summary,
    paidCourses: {
      programmingTrack: {
        courses: ['C++: $10', 'Python: $15', 'Java: $12', 'Data Structures: $20'],
        totalIfAllPurchased: '$57',
      },
      designTrack: {
        courses: ['UI/UX Basics: $10', 'Figma Mastery: $15'],
        totalIfAllPurchased: '$25',
      },
      aiTrack: {
        courses: ['Data Analysis: $18', 'Prompt Engineering: $12'],
        totalIfAllPurchased: '$30',
      },
    },
    chatRooms: {
      programmingChat: 'Python Programming group with messages',
      designChat: 'Figma Mastery group with messages',
      aiChat: 'Data Analysis group with messages',
      schoolChat: 'Grade 11 subject group with messages',
    },
  }, null, 2));
};

seed()
  .catch((error) => {
    console.error('[DB SEED] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
