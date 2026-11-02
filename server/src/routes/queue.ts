import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, QueueEntryEntity, QueuePriority, QueueStatus } from '../types/index.js';
import { notFound, badRequest } from '../utils/errors.js';
import { generateQueueNumber, sortQueueByPriority } from '../utils/healthLogic.js';

const router = Router();

const queueCreateSchema = z.object({
  patientId: z.string().min(1),
  serviceName: z.string().min(2),
  priority: z.enum(['Regular', 'Senior Citizen', 'PWD', 'Pregnant', 'Emergency']),
  assignedRoom: z.string().optional().default('Consultation Room 1'),
});

/**
 * 17. GET /api/v1/queue/live-board (Public feed)
 */
router.get('/live-board', optionalAuthMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const store = mockRepository.getStore();
  const sorted = sortQueueByPriority(store.queue);

  const nowInConsultation = sorted.find((q) => q.status === 'In Consultation') || null;
  const currentlyCalled = sorted.find((q) => q.status === 'Called') || null;
  const nextPriority = sorted.find((q) => q.status === 'Waiting') || null;

  res.status(200).json({
    success: true,
    data: {
      nowInConsultation: nowInConsultation
        ? {
          queueNumber: nowInConsultation.queueNumber,
          assignedRoom: nowInConsultation.assignedRoom,
        }
        : null,
      currentlyCalled: currentlyCalled
        ? {
          queueNumber: currentlyCalled.queueNumber,
          assignedRoom: currentlyCalled.assignedRoom,
        }
        : null,
      nextPriority: nextPriority
        ? {
          queueNumber: nextPriority.queueNumber,
          priority: nextPriority.priority,
        }
        : null,
    },
  });
});

/**
 * 16. GET /api/v1/queue
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('queue', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    let records = [...store.queue];

    if (req.scopeToOwn && req.user?.patientId) {
      records = records.filter((q) => q.patientId === req.user!.patientId);
    }

    const { status } = req.query as Record<string, string>;
    if (status && status !== 'All') {
      records = records.filter((q) => q.status.toLowerCase() === status.toLowerCase());
    }

    const sorted = sortQueueByPriority(records);

    res.status(200).json({
      success: true,
      data: sorted,
    });
  }
);

/**
 * 18. POST /api/v1/queue
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('queue', 'manage'),
  validate({ body: queueCreateSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const patient = store.patients.find(
      (p) => p.id === body.patientId || p.patientCode === body.patientId
    );
    if (!patient) {
      throw notFound(`Patient '${body.patientId}' not found.`);
    }

    const priorityWeights: Record<QueuePriority, number> = {
      Emergency: 1,
      Pregnant: 2,
      'Senior Citizen': 3,
      PWD: 4,
      Regular: 5,
    };

    const priority = body.priority as QueuePriority;
    const queueNumber = generateQueueNumber(store.queue, priority);

    const newEntry: QueueEntryEntity = {
      id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      queueNumber,
      queueDate: new Date().toISOString().split('T')[0],
      patientId: patient.id,
      patientName: patient.fullName,
      serviceName: body.serviceName,
      priority,
      priorityWeight: priorityWeights[priority] ?? 5,
      status: 'Waiting',
      source: 'Walk-in',
      assignedRoom: body.assignedRoom || 'Consultation Room 1',
      arrivalTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.queue.push(newEntry);
    supabaseRepository.persistQueueEntry(newEntry).catch((err) => console.warn('[DB Error]', err));

    res.status(201).json({
      success: true,
      data: newEntry,
    });
  }
);

/**
 * 19. PATCH /api/v1/queue/:id/status
 */
router.patch(
  '/:id/status',
  authMiddleware,
  enforceSection5RBAC('queue', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body || {};

    const validStatuses: QueueStatus[] = [
      'Waiting',
      'Called',
      'In Consultation',
      'Completed',
      'Skipped',
      'Cancelled',
    ];

    if (!status || !validStatuses.includes(status)) {
      throw badRequest(`Invalid queue status '${status}'.`);
    }

    const store = mockRepository.getStore();
    const entry = store.queue.find((q) => q.id === id || q.queueNumber === id);
    if (!entry) {
      throw notFound(`Queue ticket '${id}' not found.`);
    }

    entry.status = status;
    const nowIso = new Date().toISOString();
    entry.updatedAt = nowIso;

    if (status === 'Called') {
      entry.calledAt = nowIso;
    } else if (status === 'Completed') {
      entry.completedAt = nowIso;
    }
    supabaseRepository.persistQueueEntry(entry).catch((err) => console.warn('[DB Error]', err));

    res.status(200).json({
      success: true,
      data: entry,
    });
  }
);

export default router;

