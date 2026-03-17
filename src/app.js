import express from 'express';
import authRoutes from './routes/authRoutes.js';

import courseRoutes from './routes/courseRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';

import userRoutes from './routes/userRoutes.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

app.use(express.json());



app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/subjects/:subjectId/lessons', lessonRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/teachers', teacherRoutes);

// auth routes
app.use('/api/auth', authRoutes);

// users routes
app.use("/api/users", userRoutes);







app.use(errorMiddleware);

export default app;