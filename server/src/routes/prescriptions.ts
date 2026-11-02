import { Router, Response } from 'express';
import { mockRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import { notFound, forbidden } from '../utils/errors.js';
import { logAuditEvent } from '../utils/audit.js';

const router = Router();

/**
 * 25. GET /api/v1/prescriptions
 */
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const store = mockRepository.getStore();
  let records = [...store.prescriptions];

  if (req.user?.role === 'patient') {
    records = records.filter((p) => p.patientId === req.user!.patientId);
  }

  const { patientId, status } = req.query as Record<string, string>;
  if (patientId) {
    records = records.filter((p) => p.patientId === patientId);
  }
  if (status) {
    records = records.filter((p) => p.status.toLowerCase() === status.toLowerCase());
  }

  res.status(200).json({
    success: true,
    data: records,
  });
});

/**
 * 26. POST /api/v1/prescriptions/:id/dispense
 */
router.post('/:id/dispense', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'nurse' && req.user?.role !== 'staff') {
    throw forbidden('Only nurse or front-desk staff can record pharmacy dispensing.');
  }

  const { id } = req.params;
  const { notes } = req.body || {};
  const store = mockRepository.getStore();

  const record = store.prescriptions.find((p) => p.id === id || p.prescriptionCode === id);
  if (!record) {
    throw notFound(`Prescription '${id}' not found.`);
  }

  record.status = 'Dispensed';
  record.dispensedById = req.user!.id;
  record.dispensedAt = new Date().toISOString();
  if (notes) record.notes = notes;
  record.updatedAt = new Date().toISOString();

  if (record.items) {
    for (const item of record.items) {
      item.quantityDispensed = item.quantityPrescribed;
    }
  }

  logAuditEvent({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    actorRole: req.user!.role,
    actionType: 'Patient Record',
    module: 'Prescriptions',
    targetEntityId: record.prescriptionCode,
    details: `Dispensed pharmacy prescription ${record.prescriptionCode} with ${record.items?.length || 0} medication item(s).`,
  });

  res.status(200).json({
    success: true,
    data: {
      status: record.status,
      dispensedAt: record.dispensedAt,
      prescription: record,
    },
  });
});

export default router;

