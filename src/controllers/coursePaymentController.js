import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import {
  createCourseCheckoutSession,
  ensureStripeConfigured,
} from '../services/stripeService.js';
import * as coursePaymentService from '../services/coursePaymentService.js';
import * as enrollmentService from '../services/enrollmentService.js';

/**
 * بدء عملية الدفع أو الالتحاق المباشر
 * POST /enrollment/initiate-payment
 */
export const initiatePayment = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const { courseId } = req.body;
    const orgId = req.user?.organization_id || req.user?.OrgId;

    if (!userId || !courseId || !orgId) {
      return next(new AppError('Missing required fields: userId, courseId, orgId', 400));
    }

    // استخدم دالة enrollment الموجودة للتعامل مع الالتحاق مع الدفع
    const result = await enrollmentService.initiateEnrollmentWithPayment(orgId, userId, courseId);

    // إذا تم الالتحاق مباشرة (مجاني)
    if (result.enrolled) {
      return res.status(200).json({
        success: true,
        message: result.message,
        enrolled: true,
        enrollment: result.enrollment || null,
      });
    }

    // إذا تم الدفع مطلوب
    if (result.requiresPayment) {
      // احصل على معلومات الكورس والطالب
      const course = await prisma.track.findUnique({
        where: { id: courseId },
      });

      const academyUser = await prisma.academy_user.findUnique({
        where: { user_academy_id: userId },
        include: {
          user: true,
        },
      });

      if (!course || !academyUser) {
        return next(new AppError('Course or user not found', 404));
      }

      try {
        // تأكد من أن Stripe مكون
        ensureStripeConfigured();

        // أنشئ جلسة Stripe
        const session = await createCourseCheckoutSession({
          userId: userId,
          courseId: courseId,
          courseName: course.Name,
          amount: course.price,
          userEmail: academyUser.user.email,
          organizationId: course.Org_id,
        });

        // محدّث سجل الدفع مع Stripe session ID
        const paymentRecord = await prisma.student_course_payment.update({
          where: {
            user_Academy_id_Course_id: {
              user_Academy_id: userId,
              Course_id: courseId,
            },
          },
          data: {
            stripePaymentIntentId: session.id,
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Payment required. Redirecting to checkout...',
          enrolled: false,
          requiresPayment: true,
          checkoutUrl: session.url,
          paymentId: paymentRecord.id,
          amount: course.price,
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return next(
          new AppError(
            'Payment setup failed. Please try again or contact support.',
            402,
          ),
        );
      }
    }

    return next(new AppError('Unknown enrollment state', 500));
  } catch (error) {
    console.error('Error in initiatePayment:', error);
    next(
      new AppError(error.message || 'Error initiating payment', 500),
    );
  }
};

/**
 * الحصول على حالة الدفع
 * GET /courses/:courseId/payment-status
 */
export const getCoursePaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const { courseId } = req.params;

    if (!userId || !courseId) {
      return next(new AppError('Missing required fields: userId, courseId', 400));
    }

    // تحقق من هل الطالب من مدرسة (وصول مجاني)
    const student = await prisma.student.findUnique({
      where: { Student_id: userId },
    });

    if (student) {
      return res.status(200).json({
        success: true,
        studentType: 'SCHOOL',
        isPaid: false,
        canAccess: true,
        message: 'School students have free access to all courses',
      });
    }

    // احصل على معلومات الدفع للطالب الأكاديمي
    const paymentStatus = await coursePaymentService.getCoursePaymentStatus(
      userId,
      parseInt(courseId),
    );

    const course = await prisma.track.findUnique({
      where: { id: parseInt(courseId) },
      select: { isPaid: true, price: true, Name: true },
    });

    if (!course) {
      return next(new AppError('Course not found', 404));
    }

    // إذا لم يكن هناك سجل دفع
    if (!paymentStatus) {
      return res.status(200).json({
        success: true,
        studentType: 'ACADEMY',
        isPaid: course.isPaid,
        canAccess: !course.isPaid,
        status: 'NOT_PAID',
        amount: course.price,
        message: course.isPaid
          ? 'Payment required to access this course'
          : 'Free course',
      });
    }

    return res.status(200).json({
      success: true,
      studentType: 'ACADEMY',
      isPaid: course.isPaid,
      canAccess: paymentStatus.status === 'SUCCESS',
      status: paymentStatus.status,
      amount: paymentStatus.amount,
      paidAt: paymentStatus.paidAt,
      message: `Payment status: ${paymentStatus.status}`,
    });
  } catch (error) {
    console.error('Error in getCoursePaymentStatus:', error);
    next(
      new AppError(error.message || 'Error checking payment status', 500),
    );
  }
};

/**
 * معالج webhook من Stripe للدفعات الناجحة
 * POST /payment/webhook/stripe
 */
export const handleStripeWebhook = async (req, res, next) => {
  try {
    const { data, type } = req.body;

    // معالجة الأنواع المختلفة من أحداث Stripe
    if (type === 'checkout.session.completed') {
      const session = data.object;

      // تحقق من أن هذا دفع كورس (وليس دفع اشتراك)
      if (session.metadata?.type === 'COURSE_PAYMENT') {
        const userId = parseInt(session.metadata.userId);
        const courseId = parseInt(session.metadata.courseId);
        const paymentIntentId = session.payment_intent;

        // حدّث سجل الدفع
        const payment = await coursePaymentService.markPaymentSuccess(
          userId,
          courseId,
          paymentIntentId,
        );

        // أنشئ التحاق قاعدة البيانات
        if (payment) {
          const academyUser = await prisma.academy_user.findUnique({
            where: { user_academy_id: userId },
          });

          const course = await prisma.track.findUnique({
            where: { id: courseId },
          });

          if (academyUser && course) {
            // تحقق من عدم وجود التحاق مسبق
            const existingEnrollment = await prisma.enrollment.findUnique({
              where: {
                user_Academy_id_Course_id: {
                  user_Academy_id: userId,
                  Course_id: courseId,
                },
              },
            });

            if (!existingEnrollment) {
              await prisma.enrollment.create({
                data: {
                  user_Academy_id: userId,
                  Course_id: courseId,
                },
              });
            }
          }

          return res.status(200).json({
            success: true,
            message: `Course payment completed for user ${userId}`,
            payment: payment,
          });
        }
      }
    }

    if (type === 'payment_intent.payment_failed') {
      const paymentIntent = data.object;
      const metadata = paymentIntent.metadata || {};

      if (metadata.type === 'COURSE_PAYMENT') {
        const userId = parseInt(metadata.userId);
        const courseId = parseInt(metadata.courseId);

        // حدّث سجل الدفع
        const payment = await coursePaymentService.markPaymentFailed(
          userId,
          courseId,
          paymentIntent.id,
        );

        return res.status(200).json({
          success: true,
          message: `Course payment failed for user ${userId}`,
          payment: payment,
        });
      }
    }

    // أنواع أحداث أخرى
    return res.status(200).json({
      success: true,
      message: `Webhook received: ${type}`,
    });
  } catch (error) {
    console.error('Error in handleStripeWebhook:', error);
    next(
      new AppError(error.message || 'Error processing webhook', 500),
    );
  }
};

/**
 * الحصول على جميع مشتريات الطالب
 * GET /payment/student/purchases
 */
export const getStudentPurchases = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return next(new AppError('User ID is missing', 400));
    }

    const purchases = await coursePaymentService.getStudentCoursePayments(userId);

    return res.status(200).json({
      success: true,
      purchases: purchases,
      total: purchases.length,
    });
  } catch (error) {
    console.error('Error in getStudentPurchases:', error);
    next(
      new AppError(error.message || 'Error fetching purchases', 500),
    );
  }
};

export default {
  initiatePayment,
  getCoursePaymentStatus,
  handleStripeWebhook,
  getStudentPurchases,
};
