import express, { Express } from 'express';
import cors from 'cors';
import http from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import corsMiddleware from './middleware/corsMiddleware.js';
import quizRoutes from './routes/quizRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import homeworkRoutes from './routes/homeworkRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import participantRoutes from './routes/participantRoutes.js';
import answerRoutes from './routes/answerRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './utils/swagger-output.json' with { type: 'json' };
import { initializeSocket } from './socket/index.js';

// docker compose run app npx prisma migrate dev --name init
// node swagger.js

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Go to src
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Passport
app.use(passport.initialize());

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(express.static(path.join(__dirname, '../public')));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use('/auth', authRoutes);
app.use('/quiz', quizRoutes);
app.use('/category', categoryRoutes);
app.use('/question', questionRoutes);
app.use('/match', matchRoutes);
app.use('/match', participantRoutes);  // /match/:matchId/participants
app.use('/match', answerRoutes);       // /match/:matchId/answers
app.use('/rating', ratingRoutes);
app.use('/user', userRoutes);
app.use('/classrooms', classroomRoutes);
app.use('/homework', homeworkRoutes);
app.use('/reports', reportRoutes);
app.use('/ai', aiRoutes);
app.use('/notifications', notificationRoutes);

const server = http.createServer(app);

// Initialize Socket.IO with modular handlers
initializeSocket(server).then(() => {
    server.listen(PORT, () => {
        console.log(`Socket + server has running on ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize socket:', err);
});

