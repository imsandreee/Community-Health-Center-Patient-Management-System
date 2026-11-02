import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository } from '../db/index.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, HealthcareServiceEntity } from '../types/index.js';
import { notFound, badRequest } from '../utils/errors.js';

const router = Router();

const serviceCreateSchema = z.object({
  name: z.string().min(2),
  category: z.enum([
    'Primary Care',
    'Maternal & Child',
    'Preventive & Immunization',
    'Administrative & Screening',
  ]),
  description: z.string().min(5),
  schedule: z.string().min(3),
  assignedPersonnelName: z.string().min(2),
  dailyCapacity: z.number().int().positive().default(30),
});

/**
 * 31. GET /api/v1/services (Public / all roles)
 */
router.get('/', optionalAuthMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const store = mockRepository.getStore();
  const { category, status } = _req.query as Record<string, string>;

  let records = [...store.services];
  if (category) {
    records = records.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }
  if (status) {
    records = records.filter((s) => s.status.toLowerCase() === status.toLowerCase());
  }

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * 32. POST /api/v1/services (Admin only)
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('services', 'manage'),
  validate({ body: serviceCreateSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const serviceCode = `SRV-${String(store.services.length + 1).padStart(2, '0')}`;
    const newService: HealthcareServiceEntity = {
      id: `srv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      serviceCode,
      name: body.name,
      category: body.category,
      description: body.description,
      schedule: body.schedule,
      assignedPersonnelName: body.assignedPersonnelName,
      dailyCapacity: body.dailyCapacity,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.services.push(newService);

    res.status(201).json({
      success: true,
      data: newService,
    });
  }
);

/**
 * 33. PATCH /api/v1/services/:id/status (Admin only)
 */
router.patch(
  '/:id/status',
  authMiddleware,
  enforceSection5RBAC('services', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['Active', 'Inactive'].includes(status)) {
      throw badRequest("Invalid status. Expected 'Active' or 'Inactive'.");
    }

    const store = mockRepository.getStore();
    const service = store.services.find((s) => s.id === id || s.serviceCode === id);
    if (!service) {
      throw notFound(`Healthcare service '${id}' not found.`);
    }

    service.status = status;
    service.updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: service,
    });
  }
);

export default router;

