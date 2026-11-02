import { Router, Response } from 'express';
import { z } from 'zod';
import { mockRepository, supabaseRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  AuthenticatedRequest,
  AppointmentEntity,
  AppointmentStatus,
  QueuePriority,
} from '../types/index.js';
import { conflict, notFound, badRequest } from '../utils/errors.js';
import { checkAppointmentConflict, generateQueueNumber } from '../utils/healthLogic.js';
import { logAuditEvent } from '../utils/audit.js';

const router = Router();

const appointmentCreateSchema = z.object({
  patientId: z.string().min(1),
  serviceId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.enum([
    '08:00 AM',
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
  ]),
  reason: z.string().min(3),
});

/**
 * 12. GET /api/v1/appointments
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('appointments', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();
    let records = [...store.appointments];

    if (req.scopeToOwn && req.user?.patientId) {
      records = records.filter(
        (a) => a.patientId === req.user!.patientId
      );
    }

    const { status, serviceId, date } = req.query as Record<string, string>;
    if (status) {
      records = records.filter((a) => a.status.toLowerCase() === status.toLowerCase());
    }
    if (serviceId) {
      records = records.filter((a) => a.serviceId === serviceId);
    }
    if (date) {
      records = records.filter((a) => a.scheduledDate === date);
    }

    res.status(200).json({
      success: true,
      data: records,
    });
  }
);

/**
 * Check conflict helper / endpoint
 */
router.post(
  '/check-conflict',
  authMiddleware,
  enforceSection5RBAC('appointments', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const { patientId, scheduledDate, timeSlot, serviceId, excludeId } = req.body || {};
    const store = mockRepository.getStore();

    const conflictResult = checkAppointmentConflict(
      {
        patientId: patientId || '',
        scheduledDate: scheduledDate || '',
        timeSlot: timeSlot || '',
        serviceId: serviceId || '',
      },
      store.appointments,
      excludeId
    );

    res.status(200).json({
      success: true,
      data: conflictResult,
    });
  }
);

/**
 * GET /api/v1/appointments/:id
 */
router.get(
  '/:id',
  authMiddleware,
  enforceSection5RBAC('appointments', 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const appt = store.appointments.find((a) => a.id === id || a.appointmentCode === id);
    if (!appt) {
      throw notFound(`Appointment with ID '${id}' not found.`);
    }

    res.status(200).json({
      success: true,
      data: appt,
    });
  }
);

/**
 * 13. POST /api/v1/appointments
 */
router.post(
  '/',
  authMiddleware,
  validate({ body: appointmentCreateSchema }),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body;
    const store = mockRepository.getStore();

    const patient = store.patients.find(
      (p) => p.id === body.patientId || p.patientCode === body.patientId
    );
    if (!patient) {
      throw notFound(`Patient with ID '${body.patientId}' does not exist.`);
    }

    const service = store.services.find(
      (s) => s.id === body.serviceId || s.serviceCode === body.serviceId
    );
    if (!service) {
      throw notFound(`Healthcare service with ID '${body.serviceId}' does not exist.`);
    }

    // Enforce Rule FR-015: Conflict Checking
    const conflictResult = checkAppointmentConflict(
      {
        patientId: patient.id,
        scheduledDate: body.scheduledDate,
        timeSlot: body.timeSlot,
        serviceId: service.id,
      },
      store.appointments
    );

    if (conflictResult.hasConflict) {
      throw conflict(
        conflictResult.reason || 'Scheduling conflict detected (FR-015).',
        'SLOT_CONFLICT'
      );
    }

    const isPatientRole = req.user?.role === 'patient';
    const status: AppointmentStatus = isPatientRole ? 'Pending' : 'Confirmed';
    const nextCodeNum = store.appointments.length + 801;
    const appointmentCode = `APT-2026-${nextCodeNum}`;

    const newAppointment: AppointmentEntity = {
      id: `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      appointmentCode,
      patientId: patient.id,
      patientName: patient.fullName,
      serviceId: service.id,
      serviceName: service.name,
      scheduledDate: body.scheduledDate,
      timeSlot: body.timeSlot,
      assignedPersonnel: service.assignedPersonnelName,
      status,
      reason: body.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.appointments.unshift(newAppointment);
    supabaseRepository.persistAppointment(newAppointment).catch((err) => console.warn('[DB Error]', err));

    logAuditEvent({
      actorId: req.user?.id,
      actorName: req.user?.fullName || 'System',
      actorRole: req.user?.role || 'patient',
      actionType: 'Appointment',
      module: 'Appointments',
      targetEntityId: newAppointment.appointmentCode,
      details: `Booked appointment ${newAppointment.appointmentCode} for patient ${patient.fullName} on ${body.scheduledDate} ${body.timeSlot} (${service.name}).`,
    });

    res.status(201).json({
      success: true,
      data: newAppointment,
    });
  }
);

/**
 * 14. PATCH /api/v1/appointments/:id/status
 */
router.patch(
  '/:id/status',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, cancellationReason } = req.body || {};

    const validStatuses: AppointmentStatus[] = [
      'Pending',
      'Approved',
      'Confirmed',
      'Completed',
      'Cancelled',
      'Rejected',
      'No-show',
    ];

    if (!status || !validStatuses.includes(status)) {
      throw badRequest(`Invalid appointment status '${status}'.`);
    }

    const store = mockRepository.getStore();
    const appt = store.appointments.find((a) => a.id === id || a.appointmentCode === id);
    if (!appt) {
      throw notFound(`Appointment with ID '${id}' not found.`);
    }

    // Role check: patients can only cancel their own pending/approved visits
    if (req.user?.role === 'patient') {
      if (appt.patientId !== req.user.patientId) {
        throw conflict('You can only cancel your own appointments.');
      }
      if (status !== 'Cancelled') {
        throw conflict('Patients can only transition appointments to Cancelled status.');
      }
    }

    appt.status = status;
    if (cancellationReason) {
      appt.cancellationReason = cancellationReason;
    }
    appt.updatedAt = new Date().toISOString();
    supabaseRepository.persistAppointment(appt).catch((err) => console.warn('[DB Error]', err));

    logAuditEvent({
      actorId: req.user?.id,
      actorName: req.user?.fullName || 'System',
      actorRole: req.user?.role || 'staff',
      actionType: 'Appointment',
      module: 'Appointments',
      targetEntityId: appt.appointmentCode,
      details: `Transitioned appointment ${appt.appointmentCode} status to '${status}'${cancellationReason ? ` (Reason: ${cancellationReason})` : ''}.`,
    });

    res.status(200).json({
      success: true,
      data: appt,
    });
  }
);

/**
 * 15. POST /api/v1/appointments/:id/check-in
 */
router.post(
  '/:id/check-in',
  authMiddleware,
  enforceSection5RBAC('appointments', 'manage'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const store = mockRepository.getStore();

    const appt = store.appointments.find((a) => a.id === id || a.appointmentCode === id);
    if (!appt) {
      throw notFound(`Appointment with ID '${id}' not found.`);
    }

    appt.status = 'Confirmed';
    appt.updatedAt = new Date().toISOString();
    supabaseRepository.persistAppointment(appt).catch((err) => console.warn('[DB Error]', err));

    const patient = store.patients.find((p) => p.id === appt.patientId);
    let priority: QueuePriority = 'Regular';
    let weight = 5;

    if (patient) {
      if (patient.age >= 60) {
        priority = 'Senior Citizen';
        weight = 3;
      }
    }

    const queueNumber = generateQueueNumber(store.queue, priority);
    const newQueueEntry = {
      id: `q-${Date.now()}`,
      queueNumber,
      queueDate: new Date().toISOString().split('T')[0],
      patientId: appt.patientId,
      patientName: appt.patientName,
      serviceId: appt.serviceId,
      serviceName: appt.serviceName || 'General Consultation',
      priority,
      priorityWeight: weight,
      status: 'Waiting' as const,
      source: 'Appointment' as const,
      assignedRoom: 'Consultation Room 1',
      arrivalTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.queue.push(newQueueEntry);

    res.status(200).json({
      success: true,
      data: {
        appointment: appt,
        queueEntry: newQueueEntry,
      },
    });
  }
);

export default router;

