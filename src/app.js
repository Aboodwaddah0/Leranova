import express from 'express';
import authRoutes from './routes/authRoutes.js';

import courseRoutes from './routes/courseRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import lessonRagAssetRoutes from './routes/lessonRagAssetRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';

import userRoutes from './routes/userRoutes.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

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



app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/subjects/:subjectId/lessons', lessonRoutes);
app.use('/api/lessons/:lessonId/assets', lessonRagAssetRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/teachers', teacherRoutes);

// auth routes
app.use('/api/auth', authRoutes);

// users routes
app.use("/api/users", userRoutes);







app.use(errorMiddleware);

export default app;