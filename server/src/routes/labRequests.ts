import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, LabRequestEntity } from '../types/index.js';
import { forbidden, notFound } from '../utils/errors.js';
import { logAuditEvent } from '../utils/audit.js';

const router = Router();

const labRequestSchema = z.object({
  patientId: z.string().min(1),
  consultationId: z.string().optional().nullable(),
  testName: z.string().min(2),
  testCategory: z.enum([
    'Hematology',
    'Clinical Microscopy',
    'Blood Chemistry',
    'Serology & Immunology',
    'Microbiology',
  ]),
  priority: z.enum(['Routine', 'Urgent', 'Emergency']).default('Routine'),
});

/**
 * GET /api/v1/lab-requests
 */
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const store = mockRepository.getStore();
  let records = [...store.labRequests];

  if (req.user?.role === 'patient') {
    records = records.filter((l) => l.patientId === req.user!.patientId);
  }

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * 27. POST /api/v1/lab-requests
 */
router.post(
  '/',
  authMiddleware,
  validate({ body: labRequestSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'doctor') {
      throw forbidden('Only licensed medical doctors can order diagnostic laboratory tests.');
    }

    const body = req.body;
    const store = mockRepository.getStore();
    const patient = store.patients.find((p) => p.id === body.patientId || p.patientCode === body.patientId);
    if (!patient) {
      throw notFound(`Patient '${body.patientId}' not found.`);
    }

    const requestCode = `LAB-2026-${store.labRequests.length + 101}`;
    const newRequest: LabRequestEntity = {
      id: `lab-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestCode,
      consultationId: body.consultationId || null,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: req.user!.id,
      testCategory: body.testCategory,
      testName: body.testName,
      priority: body.priority,
      status: 'Requested',
      results: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.labRequests.unshift(newRequest);

    res.status(201).json({
      success: true,
      data: newRequest,
    });
  }
);

/**
 * 28. POST /api/v1/lab-requests/:id/results
 */
router.post(
  '/:id/results',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'doctor' && req.user?.role !== 'nurse') {
      throw forbidden('Only clinical personnel can record laboratory test results.');
    }

    const { id } = req.params;
    const { results, notes } = req.body || {};
    const store = mockRepository.getStore();

    const record = store.labRequests.find((l) => l.id === id || l.requestCode === id);
    if (!record) {
      throw notFound(`Laboratory request '${id}' not found.`);
    }

    record.status = 'Completed';
    record.completedAt = new Date().toISOString();
    if (notes) record.technologistNotes = notes;
    record.updatedAt = new Date().toISOString();

    if (Array.isArray(results)) {
      record.results = results.map((r, idx) => ({
        id: `res-${Date.now()}-${idx}`,
        labRequestId: record.id,
        parameterName: r.parameterName || 'Parameter',
        resultValue: String(r.resultValue ?? ''),
        unit: r.unit || '',
        referenceRange: r.referenceRange || '',
        isAbnormal: Boolean(r.isAbnormal),
        createdAt: new Date().toISOString(),
      }));
    }

    logAuditEvent({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Patient Record',
      module: 'Laboratory',
      targetEntityId: record.requestCode,
      details: `Recorded laboratory diagnostic results for ${record.requestCode} (${record.testName}) for patient ${record.patientName || record.patientId}.`,
    });

    res.status(200).json({
      success: true,
      data: record,
    });
  }
);

export default router;

