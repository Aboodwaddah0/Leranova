import express from 'express';
import authRoutes from './routes/authRoutes.js';
import session from 'express-session';
import passport from 'passport';
import './config/oauth.js';

import courseRoutes from './routes/courseRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import lessonAttachmentRoutes from './routes/lessonAttachmentRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import marksRoutes from './routes/marksRoutes.js';

import userRoutes from './routes/userRoutes.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

app.use(express.json());

// Session and Passport Configuration
app.use(session({
	secret: process.env.SESSION_SECRET || 'your-secret-key',
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
	},
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (_req, res) => {
	res.status(200).json({
		service: 'learnova-api',
		status: 'ok',
	});
});

app.get('/health', (_req, res) => {
	res.status(200).json({ status: 'healthy' });
});



app.use('/api/courses', courseRoutes);

app.use('/api/enrollments', enrollmentRoutes);

app.use('/api/courses/:courseId/subjects', subjectRoutes);

app.use('/api/subjects/:subjectId/lessons', lessonRoutes);
app.use('/api/lessons/:lessonId/attachments', lessonAttachmentRoutes);
app.use('/api/lessons/:lessonId/assets', lessonAttachmentRoutes);
app.use('/api/lessons/:lessonId/comments', commentRoutes);

app.use('/api/organizations', organizationRoutes);

app.use('/api/teachers', teacherRoutes);
app.use('/api/marks', marksRoutes);

// auth routes
app.use('/api/auth', authRoutes);

// users routes
app.use("/api/users", userRoutes);







app.use(errorMiddleware);

export default app;