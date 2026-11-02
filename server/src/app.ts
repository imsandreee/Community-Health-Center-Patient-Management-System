import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { isDbConnected } from './db/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './utils/errors.js';

// Route modules
import authRouter from './routes/auth.js';
import patientsRouter from './routes/patients.js';
import appointmentsRouter from './routes/appointments.js';
import queueRouter from './routes/queue.js';
import vitalsRouter from './routes/vitals.js';
import consultationsRouter from './routes/consultations.js';
import prescriptionsRouter from './routes/prescriptions.js';
import labRequestsRouter from './routes/labRequests.js';
import billingRouter from './routes/billing.js';
import servicesRouter from './routes/services.js';
import communityRouter from './routes/community.js';
import reportsRouter from './routes/reports.js';
import notificationsRouter from './routes/notifications.js';
import usersRouter from './routes/users.js';
import auditLogsRouter from './routes/auditLogs.js';

export function createApp(): Express {
  const app = express();

  // Standard Middlewares
  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check endpoint
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'San Roque Community Health Center REST API',
      version: '1.0.0',
      database: isDbConnected() ? 'Connected (PostgreSQL 15+)' : 'Stateful In-Memory Fallback',
    });
  });

  // Mount API modules (Base: /api/v1)
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/patients', patientsRouter);
  app.use('/api/v1/appointments', appointmentsRouter);
  app.use('/api/v1/queue', queueRouter);
  app.use('/api/v1/vitals', vitalsRouter);
  app.use('/api/v1/consultations', consultationsRouter);
  app.use('/api/v1/prescriptions', prescriptionsRouter);
  app.use('/api/v1/lab-requests', labRequestsRouter);
  app.use('/api/v1/billing', billingRouter);
  app.use('/api/v1/services', servicesRouter);
  app.use('/api/v1/community', communityRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/audit-logs', auditLogsRouter);

  // 404 handler for undefined endpoints
  app.use((req: Request) => {
    throw notFound(`Endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`);
  });

  // Centralized RFC 7807 Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

