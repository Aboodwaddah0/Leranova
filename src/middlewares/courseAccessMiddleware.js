import * as coursePaymentService from '../services/coursePaymentService.js';
import AppError from '../utils/appError.js';
import prisma from '../utils/prisma.js';

/**
 * Middleware للتحقق من وصول الطالب للكورس
 * يفحص:
 * 1. إذا كان الطالب من مدرسة → وصول مباشر
 * 2. إذا كان الطالب من أكاديمية → تحقق من الدفع
 */
export const checkCourseAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const courseId = parseInt(req.params.courseId || req.body.courseId);

    if (!userId || !courseId) {
      return next(new AppError('User ID or Course ID is missing', 400));
    }

    // 1. تحقق من أن المستخدم من أكاديمية
    const academyUser = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
      include: {
        organization: true,
      },
    });

    if (academyUser) {
      // طالب أكاديمي - تحقق من الدفع
      const accessResult = await coursePaymentService.canAccessCourse(userId, courseId);

      if (!accessResult.canAccess) {
        return next(
          new AppError(
            accessResult.requiresPayment
              ? 'Payment required for this course'
              : accessResult.reason,
            accessResult.requiresPayment ? 402 : 403,
          ),
        );
      }

      // أضف معلومات الدفع للـ request
      req.coursePaymentInfo = {
        isPaid: true,
        studentType: 'ACADEMY',
      };

      return next();
    }

    // 2. تحقق من أن المستخدم من مدرسة
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
      include: {
        organization: true,
      },
    });

    if (student) {
      // طالب مدرسة - وصول مجاني دائماً
      req.coursePaymentInfo = {
        isPaid: false,
        studentType: 'SCHOOL',
      };

      return next();
    }

    // المستخدم ليس طالب أكاديمي ولا مدرسة
    return next(new AppError('User type not recognized', 403));
  } catch (error) {
    console.error('Error in checkCourseAccess middleware:', error);
    next(new AppError('Error checking course access', 500));
  }
};

/**
 * Middleware للتحقق من أن الكورس موجود والطالب لديه وصول
 */
export const verifyCourseBelongsToOrg = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.courseId || req.body.courseId);
    const userId = req.user?.id || req.user?.user_id;

    if (!courseId || !userId) {
      return next(new AppError('Course ID or User ID is missing', 400));
    }

    // احصل على الكورس
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        organization: true,
      },
    });

    if (!course) {
      return next(new AppError('Course not found', 404));
    }

    // احصل على نوع المستخدم
    const academyUser = await prisma.academy_user.findUnique({
      where: { user_academy_id: userId },
    });

    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
    });

    // تحقق من أن الكورس ينتمي لنفس المنظمة
    if (academyUser && academyUser.OrgId !== course.Org_id) {
      return next(new AppError('Course does not belong to your organization', 403));
    }

    if (student && student.OrgId !== course.Org_id) {
      return next(new AppError('Course does not belong to your organization', 403));
    }

    // أضف معلومات الكورس للـ request
    req.course = course;

    next();
  } catch (error) {
    console.error('Error in verifyCourseBelongsToOrg middleware:', error);
    next(new AppError('Error verifying course', 500));
  }
};

export default checkCourseAccess;
