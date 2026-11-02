import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, VitalSignEntity } from '../types/index.js';
import { forbidden, notFound } from '../utils/errors.js';
import { calculateBMI } from '../utils/healthLogic.js';

const router = Router();

const vitalsCreateSchema = z.object({
  patientId: z.string().min(1),
  systolic: z.number().int().min(50).max(300),
  diastolic: z.number().int().min(30).max(200),
  temperatureC: z.number().min(30.0).max(45.0),
  heartRateBpm: z.number().int().min(30).max(250),
  respiratoryRate: z.number().int().min(8).max(80),
  weightKg: z.number().positive().max(500),
  heightCm: z.number().positive().max(300),
  nursingNotes: z.string().min(1),
  followUpRequired: z.boolean().default(false),
});

/**
 * 20. GET /api/v1/vitals
 * Strict Section 5 RBAC: Admin is rejected with 403 Forbidden under RA 10173.
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('vitals', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    let records = [...store.vitals];

    const { patientId } = req.query as Record<string, string>;

    if (req.scopeToOwn && req.user?.patientId) {
      records = records.filter(
        (v) => v.patientId === req.user!.patientId
      );
    } else if (patientId) {
      records = records.filter(
        (v) => v.patientId === patientId || v.id === patientId
      );
    }

    res.status(200).json({
      success: true,
      data: records,
    });
  }
);

/**
 * GET /api/v1/vitals/:id
 */
router.get(
  '/:id',
  authMiddleware,
  enforceSection5RBAC('vitals', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const record = store.vitals.find((v) => v.id === id || v.vitalCode === id);
    if (!record) {
      throw notFound(`Vital signs record '${id}' not found.`);
    }

    if (req.scopeToOwn && req.user?.patientId && record.patientId !== req.user.patientId) {
      throw forbidden('You are only authorized to view your own clinical vital signs records.');
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  }
);

/**
 * 21. POST /api/v1/vitals
 * Access: Nurse (Full manage). Staff/Admin blocked from writing.
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('vitals', 'write'),
  validate({ body: vitalsCreateSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const patient = store.patients.find(
      (p) => p.id === body.patientId || p.patientCode === body.patientId
    );
    if (!patient) {
      throw notFound(`Patient '${body.patientId}' not found.`);
    }

    const { bmi, category } = calculateBMI(body.weightKg, body.heightCm);
    const vitalCode = `VIT-2026-${store.vitals.length + 501}`;

    // Automated clinical safety guard: coerce followUpRequired = true for hypertensive/crisis BP per PhilPEN
    const isHypertensive = body.systolic >= 140 || body.diastolic >= 90;
    const isCrisis = body.systolic >= 180 || body.diastolic >= 120;
    const followUpRequired = Boolean(body.followUpRequired || isHypertensive || isCrisis);

    const newRecord: VitalSignEntity = {
      id: `vit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vitalCode,
      patientId: patient.id,
      patientName: patient.fullName,
      recordedById: req.user!.id,
      recordedByName: req.user!.fullName,
      recordedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      systolic: body.systolic,
      diastolic: body.diastolic,
      temperatureC: body.temperatureC,
      heartRateBpm: body.heartRateBpm,
      respiratoryRate: body.respiratoryRate,
      weightKg: body.weightKg,
      heightCm: body.heightCm,
      bmi,
      bmiCategory: category,
      nursingNotes: body.nursingNotes,
      followUpRequired,
      createdAt: new Date().toISOString(),
    };

    store.vitals.unshift(newRecord);
    supabaseRepository.persistVitalSign(newRecord).catch((err) => console.warn('[DB Error]', err));

    // Audit log
    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      logCode: `AUD-${store.auditLogs.length + 9001}`,
      timestamp: new Date().toISOString(),
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Patient Record',
      module: 'Vital Signs',
      targetEntityId: newRecord.vitalCode,
      details: `Recorded vital signs for ${patient.fullName}: BP ${newRecord.systolic}/${newRecord.diastolic}, BMI ${newRecord.bmi} (${newRecord.bmiCategory})`,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: newRecord,
    });
  }
);

export default router;

