import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import {
  createSubjectCheckoutSession,
  ensureStripeConfigured,
  retrieveCheckoutSession,
} from './stripeService.js';

const toUpper = (value) => String(value || '').trim().toUpperCase();
const PAID_SUBSCRIPTION_FILTER = {
  OR: [
    { paymentStatus: 'PAID' },
    { status: 'PAID' },
    { status: 'SUCCESS' },
  ],
};

const ensureAcademySubjectChat = async ({ orgId, subjectId, createdByUserId, title }) => {
  const existing = await prisma.chats.findFirst({
    where: {
      organization_id: orgId,
      subject_id: subjectId,
      type: 'GROUP',
    },
    select: {
      id: true,
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
      created_by: createdByUserId,
      type: 'GROUP',
      title: title || null,
    },
    select: {
      id: true,
    },
  });
};

const ensureUserIsStudent = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, email: true },
  });

  if (!user || toUpper(user.role) !== 'STUDENT') {
    throw new AppError('Student account required', 403);
  }

  return user;
};

export const resolveStudentContext = async (userId) => {
  await ensureUserIsStudent(userId);

  const academyUser = await prisma.academy_user.findUnique({
    where: { user_academy_id: userId },
    select: {
      user_academy_id: true,
      OrgId: true,
      organization: {
        select: {
          id: true,
          Name: true,
          Role: true,
        },
      },
    },
  });

  if (academyUser?.organization && toUpper(academyUser.organization.Role) === 'ACADEMY') {
    return {
      mode: 'ACADEMY',
      userId,
      orgId: academyUser.OrgId,
      organizationName: academyUser.organization.Name,
      academyUserId: academyUser.user_academy_id,
    };
  }

  const schoolStudent = await prisma.student.findUnique({
    where: { Student_id: userId },
    select: {
      Student_id: true,
      OrgId: true,
      Course_id: true,
      GradeLevel: true,
      organization: {
        select: {
          id: true,
          Name: true,
          Role: true,
        },
      },
      course: {
        select: {
          id: true,
          Name: true,
          kind: true,
        },
      },
    },
  });

  if (schoolStudent?.organization && toUpper(schoolStudent.organization.Role) === 'SCHOOL') {
    if (!schoolStudent.Course_id) {
      throw new AppError('School student is not assigned to a class', 409);
    }

    return {
      mode: 'SCHOOL',
      userId,
      orgId: schoolStudent.OrgId,
      organizationName: schoolStudent.organization.Name,
      classCourseId: schoolStudent.Course_id,
      className: schoolStudent.course?.Name || 'Class',
      gradeLevel: schoolStudent.GradeLevel,
    };
  }

  throw new AppError('Student is not linked to a valid school/academy profile', 404);
};

export const isAcademySubjectSubscribed = async (userId, subjectId) => {
  const subscription = await prisma.student_subject_subscription.findUnique({
    where: {
      user_Academy_id_Subject_id: {
        user_Academy_id: userId,
        Subject_id: subjectId,
      },
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
    },
  });

  return Boolean(
    subscription && ['PAID', 'SUCCESS'].includes(toUpper(subscription.paymentStatus || subscription.status)),
  );
};

export const ensureStudentCanAccessSubject = async ({ userId, subjectId }) => {
  const context = await resolveStudentContext(userId);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      Course_id: true,
      course: {
        select: {
          id: true,
          Org_id: true,
          Name: true,
          kind: true,
        },
      },
    },
  });

  if (!subject || !subject.course) {
    throw new AppError('Subject not found', 404);
  }

  if (subject.course.Org_id !== context.orgId) {
    throw new AppError('Cross-organization subject access denied', 403);
  }

  if (context.mode === 'SCHOOL') {
    if (subject.Course_id !== context.classCourseId) {
      throw new AppError('School student can only access class subjects', 403);
    }

    return { context, subject };
  }

  const subscribed = await isAcademySubjectSubscribed(userId, subject.id);
  if (!subscribed) {
    throw new AppError('Subscription required for this material', 402);
  }

  return { context, subject };
};

export const getStudentContextSummary = async (userId) => {
  const context = await resolveStudentContext(userId);

  if (context.mode === 'SCHOOL') {
    const subjectCount = await prisma.subject.count({
      where: { Course_id: context.classCourseId },
    });

    return {
      mode: context.mode,
      organization: {
        id: context.orgId,
        name: context.organizationName,
      },
      class: {
        id: context.classCourseId,
        name: context.className,
        gradeLevel: context.gradeLevel,
        subjectCount,
      },
    };
  }

  const trackCount = await prisma.course.count({
    where: {
      Org_id: context.orgId,
      kind: 'TRACK',
    },
  });

  const subscribedSubjectCount = await prisma.student_subject_subscription.count({
    where: {
      user_Academy_id: userId,
      ...PAID_SUBSCRIPTION_FILTER,
    },
  });

  return {
    mode: context.mode,
    organization: {
      id: context.orgId,
      name: context.organizationName,
    },
    academy: {
      trackCount,
      subscribedSubjectCount,
    },
  };
};

export const getSchoolStudentSubjects = async (userId) => {
  const context = await resolveStudentContext(userId);

  if (context.mode !== 'SCHOOL') {
    throw new AppError('School student profile required', 403);
  }

  const subjects = await prisma.subject.findMany({
    where: {
      Course_id: context.classCourseId,
    },
    include: {
      teacher: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          lesson: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  return {
    class: {
      id: context.classCourseId,
      name: context.className,
      gradeLevel: context.gradeLevel,
    },
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      description: subject.Description,
      lessonCount: subject._count.lesson,
      teacher: {
        id: subject.teacher?.Teacher_id || null,
        name: subject.teacher?.user?.name || null,
      },
    })),
  };
};

export const getAcademyTracks = async (userId) => {
  const context = await resolveStudentContext(userId);

  if (context.mode !== 'ACADEMY') {
    throw new AppError('Academy student profile required', 403);
  }

  const tracks = await prisma.course.findMany({
    where: {
      Org_id: context.orgId,
      kind: 'TRACK',
    },
    include: {
      subject: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  const trackIds = tracks.map((track) => track.id);

  const subscriptions = trackIds.length
    ? await prisma.student_subject_subscription.findMany({
        where: {
          user_Academy_id: userId,
          ...PAID_SUBSCRIPTION_FILTER,
          subject: {
            Course_id: { in: trackIds },
          },
        },
        select: {
          Subject_id: true,
          subject: {
            select: {
              Course_id: true,
            },
          },
        },
      })
    : [];

  const subscriptionByTrack = new Map();
  for (const row of subscriptions) {
    const key = row.subject?.Course_id;
    if (!key) continue;
    subscriptionByTrack.set(key, (subscriptionByTrack.get(key) || 0) + 1);
  }

  return tracks.map((track) => ({
    id: track.id,
    name: track.Name,
    description: track.Description,
    thumbnail: track.Thumbnail,
    subjectCount: track.subject.length,
    subscribedSubjectCount: subscriptionByTrack.get(track.id) || 0,
  }));
};

export const getAcademyTrackSubjects = async (userId, trackId) => {
  const context = await resolveStudentContext(userId);

  if (context.mode !== 'ACADEMY') {
    throw new AppError('Academy student profile required', 403);
  }

  const track = await prisma.course.findFirst({
    where: {
      id: trackId,
      Org_id: context.orgId,
      kind: 'TRACK',
    },
    select: {
      id: true,
      Name: true,
      Description: true,
    },
  });

  if (!track) {
    throw new AppError('Track not found', 404);
  }

  const subjects = await prisma.subject.findMany({
    where: {
      Course_id: track.id,
    },
    include: {
      _count: {
        select: {
          lesson: true,
        },
      },
      teacher: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      subscriptions: {
        where: {
          user_Academy_id: userId,
        },
        select: {
          id: true,
          paymentStatus: true,
          status: true,
          stripeSessionId: true,
          paidAt: true,
        },
        take: 1,
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  return {
    track: {
      id: track.id,
      name: track.Name,
      description: track.Description,
    },
    subjects: subjects.map((subject) => {
      const subscription = subject.subscriptions[0] || null;
      const isSubscribed = Boolean(
        subscription && ['PAID', 'SUCCESS'].includes(toUpper(subscription.paymentStatus || subscription.status)),
      );

      return {
        id: subject.id,
        name: subject.name,
        trackId: subject.Course_id,
        description: subject.Description,
        imageUrl: subject.imageUrl,
        isPaid: Boolean(subject.isPaid),
        price: Number(subject.price || 0),
        isSubscribed,
        subscriptionStatus: subscription?.status || null,
        paidAt: subscription?.paidAt || null,
        lessonCount: subject._count.lesson,
        teacher: {
          id: subject.teacher?.Teacher_id || null,
          name: subject.teacher?.user?.name || null,
        },
      };
    }),
  };
};

export const subscribeAcademySubject = async ({ userId, subjectId, paymentMethod = 'MANUAL' }) => {
  const context = await resolveStudentContext(userId);

  if (context.mode !== 'ACADEMY') {
    throw new AppError('Academy student profile required', 403);
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      course: {
        Org_id: context.orgId,
        kind: 'TRACK',
      },
    },
    select: {
      id: true,
      name: true,
      isPaid: true,
      price: true,
      imageUrl: true,
      Course_id: true,
    },
  });

  if (!subject) {
    throw new AppError('Material not found in this academy', 404);
  }

  const amount = Number(subject.isPaid ? subject.price : 0);

  const resolvedMethod = toUpper(paymentMethod || 'STRIPE');

  if (subject.isPaid && resolvedMethod === 'STRIPE') {
    ensureStripeConfigured();

    const academyUser = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!academyUser?.user?.email) {
      throw new AppError('Academy user email not found for Stripe checkout', 404);
    }

    await prisma.student_subject_subscription.upsert({
      where: {
        user_Academy_id_Subject_id: {
          user_Academy_id: userId,
          Subject_id: subject.id,
        },
      },
      update: {
        amount,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PENDING',
        stripeSessionId: null,
        status: 'PENDING',
        paidAt: null,
      },
      create: {
        user_Academy_id: userId,
        Subject_id: subject.id,
        amount,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PENDING',
        stripeSessionId: null,
        status: 'PENDING',
        paidAt: null,
      },
    });

    const session = await createSubjectCheckoutSession({
      userId,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectImage: subject.imageUrl,
      amount,
      userEmail: academyUser.user.email,
      organizationId: context.orgId,
      courseId: subject.Course_id,
    });

    await prisma.student_subject_subscription.upsert({
      where: {
        user_Academy_id_Subject_id: {
          user_Academy_id: userId,
          Subject_id: subject.id,
        },
      },
      update: {
        stripeSessionId: session.id,
      },
      create: {
        user_Academy_id: userId,
        Subject_id: subject.id,
        amount,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PENDING',
        stripeSessionId: session.id,
        status: 'PENDING',
      },
    });

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      status: 'PENDING',
      requiresPayment: true,
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
      amount,
      paymentMethod: 'STRIPE',
      paymentStatus: 'PENDING',
      paidAt: null,
    };
  }

  const subscription = await prisma.student_subject_subscription.upsert({
    where: {
      user_Academy_id_Subject_id: {
        user_Academy_id: userId,
        Subject_id: subject.id,
      },
    },
    update: {
      amount,
      paymentMethod,
      paymentStatus: 'PAID',
      stripeSessionId: null,
      status: 'SUCCESS',
      paidAt: new Date(),
    },
    create: {
      user_Academy_id: userId,
      Subject_id: subject.id,
      amount,
      paymentMethod,
      paymentStatus: 'PAID',
      stripeSessionId: null,
      status: 'SUCCESS',
      paidAt: new Date(),
    },
  });

  await prisma.enrollment.upsert({
    where: {
      user_Academy_id_Course_id: {
        user_Academy_id: userId,
        Course_id: subject.Course_id,
      },
    },
    update: {},
    create: {
      user_Academy_id: userId,
      Course_id: subject.Course_id,
    },
  });

  await ensureAcademySubjectChat({
    orgId: context.orgId,
    subjectId: subject.id,
    createdByUserId: userId,
    title: subject.name,
  });

  return {
    id: subscription.id,
    subjectId: subject.id,
    subjectName: subject.name,
    status: subscription.status,
    requiresPayment: false,
    amount: Number(subscription.amount || 0),
    paymentMethod: subscription.paymentMethod,
    paidAt: subscription.paidAt,
  };
};

export const verifyAcademySubjectCheckout = async ({ userId, sessionId }) => {
  if (!sessionId) {
    throw new AppError('session_id is required', 400);
  }

  const context = await resolveStudentContext(userId);

  if (context.mode !== 'ACADEMY') {
    throw new AppError('Academy student profile required', 403);
  }

  const session = await retrieveCheckoutSession(sessionId);
  const metadata = session?.metadata || {};

  if (toUpper(metadata.type) !== 'SUBJECT_SUBSCRIPTION') {
    throw new AppError('Unsupported checkout session type', 400);
  }

  const metadataUserId = Number(metadata.userId);
  const subjectId = Number(metadata.subjectId);
  const courseId = Number(metadata.courseId);
  const orgId = Number(metadata.organizationId);

  if (!metadataUserId || metadataUserId !== Number(userId)) {
    throw new AppError('Checkout session does not belong to this student', 403);
  }

  if (!subjectId || !courseId || !orgId || orgId !== Number(context.orgId)) {
    throw new AppError('Invalid checkout metadata', 400);
  }

  if (String(session.payment_status || '').toLowerCase() !== 'paid') {
    return {
      verified: false,
      status: String(session.payment_status || 'UNPAID').toUpperCase(),
      subjectId,
    };
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      Course_id: courseId,
      course: {
        Org_id: context.orgId,
      },
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const amount = Number(subject.price || 0);

  const subscription = await prisma.student_subject_subscription.upsert({
    where: {
      user_Academy_id_Subject_id: {
        user_Academy_id: userId,
        Subject_id: subject.id,
      },
    },
    update: {
      amount,
      paymentMethod: 'STRIPE',
      paymentStatus: 'PAID',
      stripeSessionId: sessionId,
      status: 'SUCCESS',
      paidAt: new Date(),
    },
    create: {
      user_Academy_id: userId,
      Subject_id: subject.id,
      amount,
      paymentMethod: 'STRIPE',
      paymentStatus: 'PAID',
      stripeSessionId: sessionId,
      status: 'SUCCESS',
      paidAt: new Date(),
    },
  });

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

  await ensureAcademySubjectChat({
    orgId: context.orgId,
    subjectId: subject.id,
    createdByUserId: userId,
    title: subject.name,
  });

  return {
    verified: true,
    subjectId: subject.id,
    subjectName: subject.name,
    status: subscription.status,
    paidAt: subscription.paidAt,
  };
};

export const getAcademySubjectSubscriptions = async (userId) => {
  const context = await resolveStudentContext(userId);

  if (context.mode !== 'ACADEMY') {
    throw new AppError('Academy student profile required', 403);
  }

  const subscriptions = await prisma.student_subject_subscription.findMany({
    where: {
      user_Academy_id: userId,
      ...PAID_SUBSCRIPTION_FILTER,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          Course_id: true,
          course: {
            select: {
              id: true,
              Name: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return subscriptions.map((item) => ({
    id: item.id,
    subjectId: item.Subject_id,
    subjectName: item.subject?.name || null,
    trackId: item.subject?.Course_id || null,
    trackName: item.subject?.course?.Name || null,
    amount: Number(item.amount || 0),
    status: item.status,
    paidAt: item.paidAt,
  }));
};
