import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import './types/express.js';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction, isTest } from './config/env.js';
import { prisma } from './config/prisma.js';
import { AppError } from './utils/appError.js';
import { sendError, sendSuccess } from './utils/apiResponse.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import habitRoutes from './modules/habits/habit.routes.js';
import transactionRoutes from './modules/transactions/transaction.routes.js';
import noteRoutes from './modules/notes/note.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

const API_PREFIX = '/api/v1';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser clients (curl, mobile apps) send no Origin header.
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(AppError.forbidden(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  if (!isTest) {
    app.use(morgan(isProduction ? 'combined' : 'dev'));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Public health check: verifies the API and the database connection.
  app.get(`${API_PREFIX}/health`, async (_req: Request, res: Response) => {
    const startedAt = Date.now();
    let database: { status: 'up' | 'down'; latency_ms: number; error?: string } = {
      status: 'down',
      latency_ms: 0,
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      database = { status: 'up', latency_ms: Date.now() - startedAt };
    } catch (error) {
      database = {
        status: 'down',
        latency_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }

    const healthy = database.status === 'up';

    return sendSuccess(
      res,
      {
        status: healthy ? 'healthy' : 'degraded',
        environment: env.NODE_ENV,
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database,
      },
      {
        statusCode: healthy ? 200 : 503,
        message: healthy ? 'Service is healthy' : 'Service is degraded',
      },
    );
  });

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/tasks`, taskRoutes);
  app.use(`${API_PREFIX}/habits`, habitRoutes);
  app.use(`${API_PREFIX}/transactions`, transactionRoutes);
  app.use(`${API_PREFIX}/notes`, noteRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);

  app.use((req: Request, _res: Response, next) => {
    next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
  });

  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
