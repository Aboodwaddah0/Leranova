import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

app.use(express.json());



// auth routes
app.use('/api/auth', authRoutes);





// users routes
app.use("/api/users", userRoutes);






app.use(errorMiddleware);

export default app;