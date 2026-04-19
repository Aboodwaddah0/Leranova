import './config/env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import lessonAttachmentRoutes from './routes/lessonAttachmentRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
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

import userRoutes from './routes/userRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { handleStripeWebhook } from './controllers/stripeWebhookController.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(cors());
app.use(express.json());

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
app.use('/api/lessons/:lessonId/comments', commentRoutes);

app.use('/api/organizations', organizationRoutes);
app.use('/api/organization-profile', organizationSelfRoutes);

app.use('/api/teachers', teacherRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/admin/plans', adminPlanRoutes);
app.use('/api/admin', adminFeatureRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/school-settings', schoolSettingsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/student', studentExperienceRoutes);

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




