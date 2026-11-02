import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, ConsultationEntity } from '../types/index.js';
import { forbidden, notFound } from '../utils/errors.js';

const router = Router();

const consultationCreateSchema = z.object({
  patientId: z.string().min(1),
  vitalSignId: z.string().optional().nullable(),
  chiefComplaint: z.string().min(2),
  medicalHistory: z.string().min(2),
  clinicalFindings: z.string().min(2),
  diagnosis: z.string().min(2),
  icdCode: z.string().min(2),
  treatmentPlan: z.string().min(2),
  prescriptionDetails: z.string().min(2),
  followUpDate: z.string().optional().nullable(),
  consultationNotes: z.string().optional().nullable(),
});

const amendmentCreateSchema = z.object({
  reason: z.string().min(3),
  newDiagnosis: z.string().min(2),
  newTreatmentPlan: z.string().min(2),
  newPrescription: z.string().optional().nullable(),
});

/**
 * 22. GET /api/v1/consultations
 * Strict Section 5 RBAC: Admin and Staff are rejected with 403 Forbidden under RA 10173.
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('consultations', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    let records = [...store.consultations];

    const { patientId } = req.query as Record<string, string>;

    if (req.scopeToOwn && req.user?.patientId) {
      records = records.filter(
        (c) => c.patientId === req.user!.patientId
      );
    } else if (patientId) {
      records = records.filter(
        (c) => c.patientId === patientId || c.id === patientId
      );
    }

    res.status(200).json({
      success: true,
      data: records,
    });
  }
);

/**
 * GET /api/v1/consultations/:id
 */
router.get(
  '/:id',
  authMiddleware,
  enforceSection5RBAC('consultations', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const record = store.consultations.find(
      (c) => c.id === id || c.consultationCode === id
    );
    if (!record) {
      throw notFound(`Consultation record '${id}' not found.`);
    }

    if (req.scopeToOwn && req.user?.patientId && record.patientId !== req.user.patientId) {
      throw forbidden('You are only authorized to view your own clinical consultation records.');
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  }
);

/**
 * 23. POST /api/v1/consultations
 * Sole authority: Doctor ('manage' level)
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('consultations', 'manage'),
  validate({ body: consultationCreateSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const patient = store.patients.find(
      (p) => p.id === body.patientId || p.patientCode === body.patientId
    );
    if (!patient) {
      throw notFound(`Patient '${body.patientId}' not found.`);
    }

    const consultationCode = `CON-2026-${store.consultations.length + 301}`;
    const newRecord: ConsultationEntity = {
      id: `con-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      consultationCode,
      patientId: patient.id,
      patientName: patient.fullName,
      attendingDoctorId: req.user!.id,
      attendingDoctorName: req.user!.fullName,
      vitalSignId: body.vitalSignId || null,
      consultationDate: new Date().toISOString().split('T')[0],
      chiefComplaint: body.chiefComplaint,
      medicalHistory: body.medicalHistory,
      clinicalFindings: body.clinicalFindings,
      diagnosis: body.diagnosis,
      icdCode: body.icdCode,
      treatmentPlan: body.treatmentPlan,
      prescriptionDetails: body.prescriptionDetails,
      followUpDate: body.followUpDate || null,
      consultationNotes: body.consultationNotes || null,
      amendments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.consultations.unshift(newRecord);
    supabaseRepository.persistConsultation(newRecord).catch((err) => console.warn('[DB Error]', err));

    // Audit log
    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      logCode: `AUD-${store.auditLogs.length + 9001}`,
      timestamp: new Date().toISOString(),
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Patient Record',
      module: 'Consultations',
      targetEntityId: newRecord.consultationCode,
      details: `Documented clinical consultation for ${patient.fullName}: Diagnosis: ${newRecord.diagnosis} (${newRecord.icdCode})`,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: newRecord,
    });
  }
);

/**
 * 24. POST /api/v1/consultations/:id/amendments
 * Auditable amendment process (FR-028)
 */
router.post(
  '/:id/amendments',
  authMiddleware,
  enforceSection5RBAC('consultations', 'manage'),
  validate({ body: amendmentCreateSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const body = req.body;
    const store = mockRepository.getStore();

    const record = store.consultations.find(
      (c) => c.id === id || c.consultationCode === id
    );
    if (!record) {
      throw notFound(`Consultation record '${id}' not found.`);
    }

    const amendment = {
      id: `amd-${Date.now()}`,
      consultationId: record.id,
      amendedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      amendedById: req.user!.id,
      amendedByName: req.user!.fullName,
      reason: body.reason,
      previousDiagnosis: record.diagnosis,
      previousTreatmentPlan: record.treatmentPlan,
      previousPrescription: record.prescriptionDetails,
      newDiagnosis: body.newDiagnosis,
      newTreatmentPlan: body.newTreatmentPlan,
      newPrescription: body.newPrescription ?? record.prescriptionDetails,
      createdAt: new Date().toISOString(),
    };

    if (!record.amendments) {
      record.amendments = [];
    }
    record.amendments.unshift(amendment);

    // Update active fields on consultation without deleting original
    record.diagnosis = body.newDiagnosis;
    record.treatmentPlan = body.newTreatmentPlan;
    if (body.newPrescription) {
      record.prescriptionDetails = body.newPrescription;
    }
    record.updatedAt = new Date().toISOString();

    // Audit log
    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      logCode: `AUD-${store.auditLogs.length + 9001}`,
      timestamp: new Date().toISOString(),
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Clinical Amendment',
      module: 'Consultations',
      targetEntityId: record.consultationCode,
      details: `Preserved amendment ${amendment.id} for ${record.consultationCode}: Reason: ${amendment.reason}`,
      createdAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      data: record,
    });
  }
);

export default router;

