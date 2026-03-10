import express from 'express';
import cors from 'cors';
import errorMiddleware from './middlewares/errorMiddleware.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import lessonAssetsRoutes from './routes/lessonAssetsRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import marksRoutes from './routes/marksRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import academyUserRoutes from './routes/academyUserRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/lesson-assets', lessonAssetsRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/academy-users', academyUserRoutes);

app.use(errorMiddleware);

export default app;
