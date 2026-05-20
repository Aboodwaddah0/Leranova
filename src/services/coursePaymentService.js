import prisma from '../utils/prisma.js';

/**
 * معالج منطق دفع الكورسات للطلاب الأكاديميين
 */

/**
 * التحقق مما إذا كان الطالب يستطيع الوصول للكورس
 * @param {number} userId - معرف الطالب الأكاديمي
 * @param {number} courseId - معرف الكورس
 * @returns {Promise<{canAccess: boolean, reason: string, requiresPayment: boolean}>}
 */
export const canAccessCourse = async (userId, courseId) => {
  try {
    // الحصول على معلومات الطالب الأكاديمي
    const academyUser = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      include: {
        organization: true,
        enrollment: {
          where: { Course_id: courseId }
        }
      }
    });

    if (!academyUser) {
      return {
        canAccess: false,
        reason: 'Student not found in academy system',
        requiresPayment: false
      };
    }

    // الحصول على معلومات الكورس
    const course = await prisma.track.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return {
        canAccess: false,
        reason: 'Course not found',
        requiresPayment: false
      };
    }

    // تحقق من أن الكورس ينتمي لنفس المنظمة
    if (course.Org_id !== academyUser.OrgId) {
      return {
        canAccess: false,
        reason: 'Course does not belong to your organization',
        requiresPayment: false
      };
    }

    // إذا كان الكورس مجاني، يمكن للطالب الوصول
    if (!course.isPaid || course.price === 0) {
      return {
        canAccess: true,
        reason: 'Course is free',
        requiresPayment: false
      };
    }

    // إذا كان الكورس مدفوع، تحقق من السجل
    const payment = await prisma.student_course_payment.findUnique({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId
        }
      }
    });

    // إذا لم يتم العثور على سجل دفع
    if (!payment) {
      return {
        canAccess: false,
        reason: 'Payment required for this course',
        requiresPayment: true
      };
    }

    // تحقق من حالة الدفع
    if (payment.status === 'SUCCESS') {
      return {
        canAccess: true,
        reason: 'Payment completed',
        requiresPayment: false
      };
    }

    // إذا كان الدفع معلق أو فاشل
    return {
      canAccess: false,
      reason: `Payment status: ${payment.status}`,
      requiresPayment: true
    };
  } catch (error) {
    console.error('Error checking course access:', error);
    throw error;
  }
};

/**
 * الحصول على حالة الدفع للطالب لكورس معين
 */
export const getCoursePaymentStatus = async (userId, courseId) => {
  try {
    const payment = await prisma.student_course_payment.findUnique({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId
        }
      },
      include: {
        track: true
      }
    });

    return payment || null;
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
};

/**
 * إنشاء سجل دفع جديد (معلق)
 */
export const createPaymentRecord = async (userId, courseId, amount) => {
  try {
    const payment = await prisma.student_course_payment.create({
      data: {
        user_Academy_id: userId,
        Course_id: courseId,
        amount: amount,
        paymentMethod: 'STRIPE',
        status: 'PENDING'
      },
      include: {
        track: true,
        academy_user: true
      }
    });

    return payment;
  } catch (error) {
    // إذا كان السجل موجود بالفعل، حدّثه
    if (error.code === 'P2002') {
      const payment = await prisma.student_course_payment.update({
        where: {
          user_Academy_id_Course_id: {
            user_Academy_id: userId,
            Course_id: courseId
          }
        },
        data: {
          status: 'PENDING',
          amount: amount
        },
        include: {
          track: true,
          academy_user: true
        }
      });
      return payment;
    }

    console.error('Error creating payment record:', error);
    throw error;
  }
};

/**
 * تحديث سجل الدفع عند نجاح العملية
 */
export const markPaymentSuccess = async (userId, courseId, stripePaymentIntentId) => {
  try {
    const payment = await prisma.student_course_payment.update({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId
        }
      },
      data: {
        status: 'SUCCESS',
        stripePaymentIntentId: stripePaymentIntentId,
        paidAt: new Date()
      },
      include: {
        track: true,
        academy_user: true
      }
    });

    return payment;
  } catch (error) {
    console.error('Error marking payment as success:', error);
    throw error;
  }
};

/**
 * تحديث سجل الدفع عند فشل العملية
 */
export const markPaymentFailed = async (userId, courseId, stripePaymentIntentId) => {
  try {
    const payment = await prisma.student_course_payment.update({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId
        }
      },
      data: {
        status: 'FAILED',
        stripePaymentIntentId: stripePaymentIntentId
      }
    });

    return payment;
  } catch (error) {
    console.error('Error marking payment as failed:', error);
    throw error;
  }
};

export const getStudentCoursePayments = async (userId) => {
  try {
    const payments = await prisma.student_course_payment.findMany({
      where: {
        user_Academy_id: userId
      },
      include: {
        track: {
          select: {
            id: true,
            Name: true,
            Description: true,
            Thumbnail: true,
            price: true,
            isPaid: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return payments;
  } catch (error) {
    console.error('Error fetching student payments:', error);
    throw error;
  }
};

/**
 * التحقق من هل الطالب دفع للكورس بالفعل
 */
export const hasStudentPaidForCourse = async (userId, courseId) => {
  try {
    const payment = await prisma.student_course_payment.findUnique({
      where: {
        user_Academy_id_Course_id: {
          user_Academy_id: userId,
          Course_id: courseId
        }
      }
    });

    return payment && payment.status === 'SUCCESS';
  } catch (error) {
    console.error('Error checking if student paid:', error);
    throw error;
  }
};

export default {
  canAccessCourse,
  getCoursePaymentStatus,
  createPaymentRecord,
  markPaymentSuccess,
  markPaymentFailed,
  getStudentCoursePayments,
  hasStudentPaidForCourse
};
