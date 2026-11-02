import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { AuthenticatedRequest, PatientEntity } from '../types/index.js';
import { conflict, forbidden, notFound } from '../utils/errors.js';
import { calculateAge, detectDuplicatePatient, generatePatientId } from '../utils/healthLogic.js';

const router = Router();

const patientRegisterSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(['Female', 'Male']),
  civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Separated']),
  contactNumber: z.string().min(7),
  email: z.string().email().optional().nullable(),
  address: z.string().min(3),
  barangay: z.string().min(2),
  emergencyContactName: z.string().min(2),
  emergencyContactNumber: z.string().min(7),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  allowDuplicateOverride: z.boolean().optional().default(false),
});

/**
 * 6. GET /api/v1/patients
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('patients', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    let records = [...store.patients];

    // If partitioned to own records (role == 'patient')
    if (req.scopeToOwn && req.user?.patientId) {
      records = records.filter(
        (p) => p.id === req.user!.patientId || p.patientCode === req.user!.patientId
      );
    }

    const { search, barangay, status, page = '1', limit = '20' } = req.query as Record<string, string>;

    if (status) {
      records = records.filter((p) => p.status.toLowerCase() === status.toLowerCase());
    }

    if (barangay) {
      records = records.filter((p) =>
        p.barangay.toLowerCase().includes(barangay.toLowerCase())
      );
    }

    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.patientCode.toLowerCase().includes(q) ||
          p.contactNumber.includes(q)
      );
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const total = records.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = records.slice(startIndex, startIndex + limitNum);

    res.status(200).json({
      success: true,
      data: paginated,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  }
);

/**
 * 11. POST /api/v1/patients/check-duplicate
 */
router.post(
  '/check-duplicate',
  authMiddleware,
  enforceSection5RBAC('patients', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const { fullName, dateOfBirth, excludeId } = req.body || {};
    const store = mockRepository.getStore();

    const check = detectDuplicatePatient(
      { fullName: fullName || '', dateOfBirth: dateOfBirth || '' },
      store.patients,
      excludeId
    );

    res.status(200).json({
      success: true,
      data: {
        isDuplicate: check.isDuplicate,
        matchReason: check.reason ?? null,
        existingPatient: check.matchedPatient
          ? {
            id: check.matchedPatient.id,
            patientCode: check.matchedPatient.patientCode,
            fullName: check.matchedPatient.fullName,
            dateOfBirth: check.matchedPatient.dateOfBirth,
          }
          : null,
      },
    });
  }
);

/**
 * 7. GET /api/v1/patients/:id
 */
router.get(
  '/:id',
  authMiddleware,
  enforceSection5RBAC('patients', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const patient = store.patients.find((p) => p.id === id || p.patientCode === id);
    if (!patient) {
      throw notFound(`Patient with ID or code '${id}' not found.`);
    }

    // Patient role can only view their own record
    if (
      req.user?.role === 'patient' &&
      req.user.patientId !== patient.id &&
      req.user.patientId !== patient.patientCode
    ) {
      throw forbidden('You are only authorized to view your own patient demographic profile.');
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  }
);

/**
 * 8. POST /api/v1/patients
 */
router.post(
  '/',
  authMiddleware,
  enforceSection5RBAC('patients', 'manage'),
  validate({ body: patientRegisterSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    // Check duplicate
    const check = detectDuplicatePatient(
      { fullName: body.fullName, dateOfBirth: body.dateOfBirth },
      store.patients
    );

    if (check.isDuplicate && !body.allowDuplicateOverride) {
      throw conflict(
        check.reason || 'Candidate patient record already registered. Set allowDuplicateOverride: true to proceed.',
        'PATIENT_DUPLICATE_CANDIDATE'
      );
    }

    const patientCode = generatePatientId(store.patients);
    const newPatient: PatientEntity = {
      id: `pat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientCode,
      fullName: body.fullName.trim(),
      dateOfBirth: body.dateOfBirth,
      age: calculateAge(body.dateOfBirth),
      sex: body.sex,
      civilStatus: body.civilStatus,
      contactNumber: body.contactNumber,
      email: body.email || null,
      address: body.address,
      barangay: body.barangay,
      emergencyContactName: body.emergencyContactName,
      emergencyContactNumber: body.emergencyContactNumber,
      bloodType: body.bloodType || 'Unknown',
      allergies: body.allergies || 'None known',
      status: 'Active',
      registrationDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.patients.unshift(newPatient);
    supabaseRepository.persistPatient(newPatient).catch((err) => console.warn('[DB Error]', err));

    // Audit log
    store.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      logCode: `AUD-${store.auditLogs.length + 9001}`,
      timestamp: new Date().toISOString(),
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      actionType: 'Patient Record',
      module: 'Patients',
      targetEntityId: newPatient.patientCode,
      details: `Registered new patient ${newPatient.fullName} (${newPatient.patientCode}) in ${newPatient.barangay}.`,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: newPatient,
    });
  }
);

/**
 * 9. PUT /api/v1/patients/:id
 */
router.put(
  '/:id',
  authMiddleware,
  enforceSection5RBAC('patients', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const patient = store.patients.find((p) => p.id === id || p.patientCode === id);
    if (!patient) {
      throw notFound(`Patient with ID or code '${id}' not found.`);
    }

    const update = req.body;
    Object.assign(patient, update, {
      updatedAt: new Date().toISOString(),
      age: update.dateOfBirth ? calculateAge(update.dateOfBirth) : patient.age,
    });
    supabaseRepository.persistPatient(patient).catch((err) => console.warn('[DB Error]', err));

    res.status(200).json({
      success: true,
      data: patient,
    });
  }
);

/**
 * 10. PATCH /api/v1/patients/:id/status
 */
router.patch(
  '/:id/status',
  authMiddleware,
  enforceSection5RBAC('patients', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['Active', 'Archived'].includes(status)) {
      throw conflict("Invalid status. Expected 'Active' or 'Archived'.");
    }

    const store = mockRepository.getStore();
    const patient = store.patients.find((p) => p.id === id || p.patientCode === id);
    if (!patient) {
      throw notFound(`Patient with ID or code '${id}' not found.`);
    }

    patient.status = status;
    patient.updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        id: patient.id,
        patientCode: patient.patientCode,
        status: patient.status,
      },
    });
  }
);

export default router;

