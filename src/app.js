import './config/env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import lessonAttachmentRoutes from './routes/lessonAttachmentRoutes.js';
import lessonProgressRoutes from './routes/lessonProgressRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import lessonAiContentRoutes from './routes/lessonAiContentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import organizationSelfRoutes from './routes/organizationSelfRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import marksRoutes from './routes/marksRoutes.js';
import adminPlanRoutes from './routes/adminPlanRoutes.js';
import adminFeatureRoutes from './routes/adminFeatureRoutes.js';
import schoolSettingsRoutes from './routes/schoolSettingsRoutes.js';
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js';
import studentExperienceRoutes from './routes/studentExperienceRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import academicYearRoutes from './routes/academicYearRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import meRoutes from './routes/meRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import { listPublicEventsController } from './controllers/calendarController.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import assessmentComponentRoutes from './routes/assessmentComponentRoutes.js';
import gradeScaleRoutes from './routes/gradeScaleRoutes.js';
import computedGradeRoutes from './routes/computedGradeRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

import userRoutes from './routes/userRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { handleStripeWebhook } from './controllers/stripeWebhookController.js';
import { confirmCheckoutController } from './controllers/checkoutConfirmController.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';
import { authMiddleware } from './middlewares/authMiddleware.js';

const app = express();

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(cors());
app.use(express.json());

app.get('/api/checkout/confirm', confirmCheckoutController);

app.get('/', (_req, res) => {
	res.status(200).json({
		service: 'learnova-api',
		status: 'ok',
	});
});

app.get('/health', (_req, res) => {
	res.status(200).json({ status: 'healthy' });
});

app.use('/api/courses/:courseId/subjects', subjectRoutes);

app.use('/api/courses', courseRoutes);

app.use('/api/enrollments', enrollmentRoutes);

app.use('/api/subjects/:subjectId/lessons', lessonRoutes);
app.use('/api/lessons/:lessonId/attachments', lessonAttachmentRoutes);
app.use('/api/lessons/:lessonId/assets', lessonAttachmentRoutes);
app.use('/api/lessons/progress', lessonProgressRoutes);
app.use('/api/lessons/:lessonId/comments', commentRoutes);
app.use('/api/lessons/:lessonId/ai-content', lessonAiContentRoutes);
app.use('/api/subjects/:subjectId/lessons/:lessonId', quizRoutes);
app.use('/api/lessons/:lessonId', quizRoutes);

app.use('/api/organizations', organizationRoutes);
app.use('/api/organization-profile', organizationSelfRoutes);

app.use('/api/teachers', teacherRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/admin/plans', adminPlanRoutes);
app.use('/api/admin', adminFeatureRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/school-settings', schoolSettingsRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/student/gamification', gamificationRoutes);
app.use('/api/student/certificates', certificateRoutes);
app.use('/api/student', studentExperienceRoutes);

app.use('/api/notes', noteRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/me', meRoutes);
// Public calendar read — any authenticated user (must come BEFORE the org-gated router)
app.get('/api/school-calendar/public', authMiddleware, listPublicEventsController);
app.use('/api/school-calendar', calendarRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assessment-components', assessmentComponentRoutes);
app.use('/api/grade-scale', gradeScaleRoutes);
app.use('/api/computed-grades', computedGradeRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/reports', reportRoutes);

// auth routes
app.use('/api/auth', authRoutes);

// users routes
app.use("/api/users", userRoutes);

// subscription routes
app.use('/api/subscriptions', subscriptionRoutes);

// payment routes
app.use('/api/payment', paymentRoutes);

app.use(errorMiddleware);

export default app;




