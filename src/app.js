import express from 'express';
import authRoutes from './routes/authRoutes.js';

import courseRoutes from './routes/courseRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';

import userRoutes from './routes/userRoutes.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

app.use(express.json());


app.use('/api/auth/org', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);


// auth routes
app.use('/api/auth', authRoutes);





// users routes
app.use("/api/users", userRoutes);







app.use(errorMiddleware);

export default app;