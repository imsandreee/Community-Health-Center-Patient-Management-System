import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { mockRepository } from '../db/index.js';
import { signToken } from '../middleware/auth.js';
import {
  calculateBMI,
  checkAppointmentConflict,
  sortQueueByPriority,
  detectDuplicatePatient,
  generatePatientId,
  computeCommunityStats,
} from '../utils/healthLogic.js';
import { QueueEntryEntity, QueuePriority } from '../types/index.js';

describe('Empirical Concurrency, Stress & Clinical Edge-Case Challenge Suite', () => {
  let app: ReturnType<typeof createApp>;

  const staffToken = signToken({
    id: 'b101a111-0002-4000-8000-000000000002',
    userCode: 'USR-02',
    fullName: 'Elena Villanueva',
    email: 'e.villanueva@sanroque-chc.gov.ph',
    role: 'staff',
    department: 'Front Desk & Records',
  });

  const doctorToken = signToken({
    id: 'b101a111-0004-4000-8000-000000000004',
    userCode: 'USR-04',
    fullName: 'Dr. Rafael Mendoza, MD',
    email: 'r.mendoza@sanroque-chc.gov.ph',
    role: 'doctor',
    department: 'Primary Care & Internal Medicine',
  });

  const nurseToken = signToken({
    id: 'b101a111-0003-4000-8000-000000000003',
    userCode: 'USR-03',
    fullName: 'Nurse Joy Bautista, RN',
    email: 'j.bautista@sanroque-chc.gov.ph',
    role: 'nurse',
    department: 'Triage & Community Nursing',
  });

  const patientToken = signToken({
    id: 'b101a111-0001-4000-8000-000000000001',
    userCode: 'USR-01',
    fullName: 'Maria Clara Santos',
    email: 'maria.santos@patient.chc.ph',
    role: 'patient',
    department: 'Patient Portal',
    patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
  });

  beforeEach(() => {
    mockRepository.reset();
    app = createApp();
  });

  // ==========================================================================
  // 1. APPOINTMENT CONCURRENCY, SLOT CONFLICTS & REBOOKING (FR-015)
  // ==========================================================================
  describe('1. Appointment Slot Concurrency, Conflict & Partial-Index Rebooking', () => {
    const targetDate = '2026-11-20';
    const targetSlot = '09:00 AM' as const;
    const generalServiceId = '7c9e6679-7425-40de-944b-e07fc1f90ae1'; // General Consultation
    const maternalServiceId = '7c9e6679-7425-40de-944b-e07fc1f90ae2'; // Maternal Care
    const patient1Id = 'e3b0c442-98fc-1c14-9afb-4c8996fb9241'; // Maria Clara Santos
    const patient2Id = 'e3b0c442-98fc-1c14-9afb-4c8996fb9242'; // Roberto Dela Cruz
    const patient3Id = 'e3b0c442-98fc-1c14-9afb-4c8996fb9243'; // Angela Mae Reyes
    const patient4Id = 'e3b0c442-98fc-1c14-9afb-4c8996fb9244'; // Lucas Miguel Tolentino
    const patient5Id = 'e3b0c442-98fc-1c14-9afb-4c8996fb9245'; // Evelyn Mercado

    it('1.1 Concurrency Burst: Rejects simultaneous double-booking for the exact same patient and slot', async () => {
      // Fire 6 simultaneous booking requests for Patient 1 on the exact same date and slot
      const burstRequests = Array.from({ length: 6 }, (_, idx) =>
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            patientId: patient1Id,
            serviceId: generalServiceId,
            scheduledDate: targetDate,
            timeSlot: targetSlot,
            reason: `Parallel burst attempt #${idx + 1}`,
          })
      );

      const responses = await Promise.all(burstRequests);

      const successResponses = responses.filter((r) => r.status === 201);
      const conflictResponses = responses.filter((r) => r.status === 409);

      // Exactly ONE request must succeed; all subsequent concurrent attempts must be rejected with 409 Conflict
      assert.equal(successResponses.length, 1, 'Only one booking must succeed');
      assert.equal(conflictResponses.length, 5, 'All other concurrent duplicate bookings must fail with 409');

      for (const res of conflictResponses) {
        assert.equal(res.body.code, 'SLOT_CONFLICT');
        assert.match(res.body.detail, /already has an active appointment/i);
      }
    });

    it('1.2 Cross-Service Slot Conflict: Patient cannot book another service at the exact same active slot', async () => {
      // Step 1: Book General Outpatient Consultation for Patient 1
      const res1 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient1Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Initial consultation booking',
        });
      assert.equal(res1.status, 201);

      // Step 2: Attempt to book Maternal Care for the SAME patient at the EXACT same time slot
      const res2 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient1Id,
          serviceId: maternalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Cross-service conflict attempt',
        });

      assert.equal(res2.status, 409);
      assert.equal(res2.body.code, 'SLOT_CONFLICT');
      assert.match(res2.body.detail, /already has an active appointment/i);
    });

    it('1.3 Service Slot Capacity: Enforces hard limit of 2 bookings per service per slot (3rd rejected with 409)', async () => {
      // Booking 1: Patient 2 for General Outpatient Consultation at targetSlot
      const b1 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient2Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Slot capacity booking 1 of 2',
        });
      assert.equal(b1.status, 201);

      // Booking 2: Patient 3 for General Outpatient Consultation at targetSlot
      const b2 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient3Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Slot capacity booking 2 of 2',
        });
      assert.equal(b2.status, 201);

      // Booking 3: Patient 4 attempting to book the SAME slot & service (Must be rejected: capacity reached)
      const b3 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient4Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Capacity overflow attempt',
        });

      assert.equal(b3.status, 409);
      assert.equal(b3.body.code, 'SLOT_CONFLICT');
      assert.match(b3.body.detail, /maximum booking capacity/i);

      // Booking 4: Patient 4 booking the SAME slot but for a DIFFERENT service (Maternal Care) must succeed
      const b4 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient4Id,
          serviceId: maternalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Booking different service in same time slot',
        });
      assert.equal(b4.status, 201);
    });

    it('1.4 Partial Unique Index Re-booking: Allows re-booking a cancelled or rejected slot', async () => {
      // Step 1: Patient 1 books slot
      const initialRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient1Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'First booking to be cancelled',
        });
      assert.equal(initialRes.status, 201);
      const apptId = initialRes.body.data.id;

      // Step 2: Cancel the appointment
      const cancelRes = await request(app)
        .patch(`/api/v1/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Patient had personal scheduling conflict',
        });
      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.data.status, 'Cancelled');

      // Step 3: Patient 1 re-books the exact same date and time slot
      // Per PostgreSQL partial unique index WHERE status IN ('Pending', 'Approved', 'Confirmed'), this MUST be permitted!
      const rebookRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient1Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Re-booking following resolved personal conflict',
        });

      assert.equal(rebookRes.status, 201);
      assert.notEqual(rebookRes.body.data.id, apptId);
      assert.equal(rebookRes.body.data.status, 'Confirmed');

      // Step 4: Reject the new appointment
      const newApptId = rebookRes.body.data.id;
      const rejectRes = await request(app)
        .patch(`/api/v1/appointments/${newApptId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'Rejected',
          cancellationReason: 'Service unavailable due to urgent doctor surgery',
        });
      assert.equal(rejectRes.status, 200);
      assert.equal(rejectRes.body.data.status, 'Rejected');

      // Step 5: Patient 1 re-books AGAIN after rejection - must succeed
      const rebookAfterReject = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patient1Id,
          serviceId: generalServiceId,
          scheduledDate: targetDate,
          timeSlot: targetSlot,
          reason: 'Re-booking following clinic rejection clearance',
        });
      assert.equal(rebookAfterReject.status, 201);
    });
  });

  // ==========================================================================
  // 2. DETERMINISTIC QUEUE PRIORITY SORTING (RA 9994 / BP 344)
  // ==========================================================================
  describe('2. Deterministic Queue Priority Ordering & Tie-Breaking Engine', () => {
    it('2.1 Pure Logic Engine: Strictly orders Emergency (1) < Pregnant (2) < Senior (3) < PWD (4) < Regular (5) with arrival time tie-breaker', () => {
      const testEntries: QueueEntryEntity[] = [
        {
          id: 'q-reg-late',
          queueNumber: 'Q-005',
          queueDate: '2026-11-02',
          patientId: 'p-1',
          patientName: 'Regular Patient Late',
          serviceName: 'Consultation',
          priority: 'Regular',
          priorityWeight: 5,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 1',
          arrivalTime: '2026-11-02 08:30',
          createdAt: '2026-11-02T08:30:00Z',
          updatedAt: '2026-11-02T08:30:00Z',
        },
        {
          id: 'q-pwd-late',
          queueNumber: 'P-004',
          queueDate: '2026-11-02',
          patientId: 'p-2',
          patientName: 'PWD Late',
          serviceName: 'Consultation',
          priority: 'PWD',
          priorityWeight: 4,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 1',
          arrivalTime: '2026-11-02 08:40',
          createdAt: '2026-11-02T08:40:00Z',
          updatedAt: '2026-11-02T08:40:00Z',
        },
        {
          id: 'q-preg-late',
          queueNumber: 'P-002',
          queueDate: '2026-11-02',
          patientId: 'p-3',
          patientName: 'Pregnant Late',
          serviceName: 'Consultation',
          priority: 'Pregnant',
          priorityWeight: 2,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 2',
          arrivalTime: '2026-11-02 09:15',
          createdAt: '2026-11-02T09:15:00Z',
          updatedAt: '2026-11-02T09:15:00Z',
        },
        {
          id: 'q-emer',
          queueNumber: 'P-000',
          queueDate: '2026-11-02',
          patientId: 'p-4',
          patientName: 'Emergency Case',
          serviceName: 'ER',
          priority: 'Emergency',
          priorityWeight: 1,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'ER',
          arrivalTime: '2026-11-02 09:30',
          createdAt: '2026-11-02T09:30:00Z',
          updatedAt: '2026-11-02T09:30:00Z',
        },
        {
          id: 'q-senior-late',
          queueNumber: 'P-003',
          queueDate: '2026-11-02',
          patientId: 'p-5',
          patientName: 'Senior Late',
          serviceName: 'Consultation',
          priority: 'Senior Citizen',
          priorityWeight: 3,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 1',
          arrivalTime: '2026-11-02 08:45',
          createdAt: '2026-11-02T08:45:00Z',
          updatedAt: '2026-11-02T08:45:00Z',
        },
        {
          id: 'q-reg-early',
          queueNumber: 'Q-001',
          queueDate: '2026-11-02',
          patientId: 'p-6',
          patientName: 'Regular Patient Early',
          serviceName: 'Consultation',
          priority: 'Regular',
          priorityWeight: 5,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 1',
          arrivalTime: '2026-11-02 08:00',
          createdAt: '2026-11-02T08:00:00Z',
          updatedAt: '2026-11-02T08:00:00Z',
        },
        {
          id: 'q-preg-early',
          queueNumber: 'P-001',
          queueDate: '2026-11-02',
          patientId: 'p-7',
          patientName: 'Pregnant Early',
          serviceName: 'Consultation',
          priority: 'Pregnant',
          priorityWeight: 2,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 2',
          arrivalTime: '2026-11-02 09:00',
          createdAt: '2026-11-02T09:00:00Z',
          updatedAt: '2026-11-02T09:00:00Z',
        },
        {
          id: 'q-senior-early',
          queueNumber: 'P-008',
          queueDate: '2026-11-02',
          patientId: 'p-8',
          patientName: 'Senior Early',
          serviceName: 'Consultation',
          priority: 'Senior Citizen',
          priorityWeight: 3,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 1',
          arrivalTime: '2026-11-02 08:30',
          createdAt: '2026-11-02T08:30:00Z',
          updatedAt: '2026-11-02T08:30:00Z',
        },
        {
          id: 'q-pwd-early',
          queueNumber: 'P-007',
          queueDate: '2026-11-02',
          patientId: 'p-9',
          patientName: 'PWD Early',
          serviceName: 'Consultation',
          priority: 'PWD',
          priorityWeight: 4,
          status: 'Waiting',
          source: 'Walk-in',
          assignedRoom: 'Room 1',
          arrivalTime: '2026-11-02 08:15',
          createdAt: '2026-11-02T08:15:00Z',
          updatedAt: '2026-11-02T08:15:00Z',
        },
      ];

      const sorted = sortQueueByPriority(testEntries);

      // Verify deterministic sequence
      assert.equal(sorted[0].patientName, 'Emergency Case', 'Emergency (1) must be 1st');
      assert.equal(sorted[1].patientName, 'Pregnant Early', 'Pregnant Early (2) must be 2nd');
      assert.equal(sorted[2].patientName, 'Pregnant Late', 'Pregnant Late (2) must be 3rd');
      assert.equal(sorted[3].patientName, 'Senior Early', 'Senior Early (3) must be 4th');
      assert.equal(sorted[4].patientName, 'Senior Late', 'Senior Late (3) must be 5th');
      assert.equal(sorted[5].patientName, 'PWD Early', 'PWD Early (4) must be 6th');
      assert.equal(sorted[6].patientName, 'PWD Late', 'PWD Late (4) must be 7th');
      assert.equal(sorted[7].patientName, 'Regular Patient Early', 'Regular Early (5) must be 8th');
      assert.equal(sorted[8].patientName, 'Regular Patient Late', 'Regular Late (5) must be 9th');
    });

    it('2.2 REST API Verification: Ingests mixed queue tickets and asserts deterministic GET /api/v1/queue ordering', async () => {
      // Ingest Emergency ticket
      const emer = await request(app)
        .post('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          serviceName: 'Emergency Triage',
          priority: 'Emergency',
          assignedRoom: 'ER Station',
        });
      assert.equal(emer.status, 201);
      assert.equal(emer.body.data.priorityWeight, 1);
      assert.match(emer.body.data.queueNumber, /^P-\d+$/);

      // Ingest Regular ticket
      const reg = await request(app)
        .post('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9245',
          serviceName: 'General Consultation',
          priority: 'Regular',
          assignedRoom: 'Consultation Room 1',
        });
      assert.equal(reg.status, 201);
      assert.equal(reg.body.data.priorityWeight, 5);
      assert.match(reg.body.data.queueNumber, /^Q-\d+$/);

      // Ingest Pregnant ticket
      const preg = await request(app)
        .post('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9243',
          serviceName: 'Prenatal Care',
          priority: 'Pregnant',
          assignedRoom: 'Consultation Room 2',
        });
      assert.equal(preg.status, 201);
      assert.equal(preg.body.data.priorityWeight, 2);

      // Fetch queue from API
      const listRes = await request(app)
        .get('/api/v1/queue?status=Waiting')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(listRes.status, 200);

      const waitingTickets = listRes.body.data as QueueEntryEntity[];
      assert.ok(waitingTickets.length >= 3);

      // Verify that all Emergency tickets appear before Pregnant tickets, which appear before Regular tickets
      const emergencyIdx = waitingTickets.findIndex((t) => t.priority === 'Emergency');
      const pregnantIdx = waitingTickets.findIndex((t) => t.priority === 'Pregnant');
      const regularIdx = waitingTickets.findIndex((t) => t.priority === 'Regular');

      assert.ok(emergencyIdx >= 0 && pregnantIdx >= 0 && regularIdx >= 0);
      assert.ok(emergencyIdx < pregnantIdx, 'Emergency must be ahead of Pregnant in waiting queue');
      assert.ok(pregnantIdx < regularIdx, 'Pregnant must be ahead of Regular in waiting queue');

      // Verify Live Board nextPriority reflects top waiting ticket
      const liveRes = await request(app).get('/api/v1/queue/live-board');
      assert.equal(liveRes.status, 200);
      assert.ok(liveRes.body.data.nextPriority);
      assert.equal(liveRes.body.data.nextPriority.queueNumber, waitingTickets[0].queueNumber);
    });
  });

  // ==========================================================================
  // 3. PATIENT DUPLICATE RECORD DETECTION & OVERRIDE (FR-010)
  // ==========================================================================
  describe('3. Patient Duplicate Record Detection, Normalization & Override', () => {
    it('3.1 Blocks duplicate registration with exact match on fullName + dob with 409', async () => {
      // Existing patient Maria Clara Santos has dob 1988-04-12
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Maria Clara Santos',
          dateOfBirth: '1988-04-12',
          sex: 'Female',
          civilStatus: 'Single',
          contactNumber: '+63 917 111 2233',
          address: '12 Rizal St, San Roque',
          barangay: 'San Roque',
          emergencyContactName: 'Clara Santos',
          emergencyContactNumber: '+63 917 111 9999',
          allowDuplicateOverride: false,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PATIENT_DUPLICATE_CANDIDATE');
      assert.match(res.body.detail, /exact match on full name and birth date/i);
    });

    it('3.2 Blocks normalized duplicates with varied casing and irregular spacing', async () => {
      // Irregular spacing and upper/lower case
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: '   maria    CLARA   santos   ',
          dateOfBirth: '1992-05-14',
          sex: 'Female',
          civilStatus: 'Single',
          contactNumber: '+63 917 000 0000',
          address: 'Anywhere',
          barangay: 'San Roque',
          emergencyContactName: 'Contact',
          emergencyContactNumber: '+63 917 000 0000',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PATIENT_DUPLICATE_CANDIDATE');
    });

    it('3.3 Bypasses duplicate warning when allowDuplicateOverride: true is explicitly provided', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Maria Clara Santos',
          dateOfBirth: '1992-05-14',
          sex: 'Female',
          civilStatus: 'Married',
          contactNumber: '+63 917 555 8899',
          address: '45 Bonifacio St',
          barangay: 'Santa Elena',
          emergencyContactName: 'Mateo Santos',
          emergencyContactNumber: '+63 917 555 0000',
          allowDuplicateOverride: true, // Physical verification override
        });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      assert.match(res.body.data.patientCode, /^CHC-2026-\d{4}$/);
      assert.equal(res.body.data.fullName, 'Maria Clara Santos');
    });

    it('3.4 Sequential ID generation increments without collision or NaN corruption', () => {
      const mockList = [
        { id: 'pat-1', patientCode: 'CHC-2026-0101' },
        { id: 'pat-2', patientCode: 'CHC-2026-0102' },
        { id: 'pat-3', patientCode: 'CHC-2026-0106' },
      ];

      const nextId = generatePatientId(mockList, 2026);
      assert.equal(nextId, 'CHC-2026-0107');

      // Empty list fallback
      assert.equal(generatePatientId([], 2026), 'CHC-2026-0101');
    });
  });

  // ==========================================================================
  // 4. BMI & PHILPEN BLOOD PRESSURE BOUNDARY CHECKS
  // ==========================================================================
  describe('4. BMI Calculation & PhilPEN Blood Pressure Clinical Boundaries', () => {
    it('4.1 BMI Calculation Mathematical Precision & Boundary Classifications', () => {
      // Boundary 1: Underweight (< 18.5)
      const b1 = calculateBMI(45.0, 160.0); // 45 / (1.6 * 1.6) = 17.578 -> 17.6
      assert.equal(b1.bmi, 17.6);
      assert.equal(b1.category, 'Underweight');

      // Boundary 2: Critical Underweight edge at 18.4
      const b184 = calculateBMI(18.4, 100.0);
      assert.equal(b184.bmi, 18.4);
      assert.equal(b184.category, 'Underweight');

      // Boundary 3: Exactly 18.5
      const b185 = calculateBMI(18.5, 100.0);
      assert.equal(b185.bmi, 18.5);
      assert.equal(b185.category, 'Normal');

      // Boundary 4: Upper Normal edge at 22.9 / 24.9
      const b229 = calculateBMI(22.9, 100.0);
      assert.equal(b229.bmi, 22.9);
      assert.equal(b229.category, 'Normal');

      // Boundary 5: Obese category boundary
      const b300 = calculateBMI(30.0, 100.0);
      assert.equal(b300.bmi, 30.0);
      assert.equal(b300.category, 'Obese');

      // Invalid / Zero inputs safeguard
      assert.deepEqual(calculateBMI(0, 160), { bmi: 0, category: 'Normal' });
      assert.deepEqual(calculateBMI(60, 0), { bmi: 0, category: 'Normal' });
      assert.deepEqual(calculateBMI(-70, 160), { bmi: 0, category: 'Normal' });
    });

    it('4.2 PhilPEN Elevated BP Threshold (Systolic >= 140 OR Diastolic >= 90)', async () => {
      // Record vitals with elevated BP (140/85 - systolic threshold reached)
      const res1 = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 140,
          diastolic: 85,
          temperatureC: 36.6,
          heartRateBpm: 76,
          respiratoryRate: 16,
          weightKg: 65,
          heightCm: 160,
          nursingNotes: 'Systolic 140 mmHg flagged under PhilPEN',
          followUpRequired: true,
        });
      assert.equal(res1.status, 201);
      assert.equal(res1.body.data.systolic, 140);
      assert.equal(res1.body.data.followUpRequired, true);

      // Record vitals with elevated diastolic (130/90 - diastolic threshold reached)
      const res2 = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9242',
          systolic: 130,
          diastolic: 90,
          temperatureC: 36.7,
          heartRateBpm: 80,
          respiratoryRate: 18,
          weightKg: 70,
          heightCm: 165,
          nursingNotes: 'Diastolic 90 mmHg flagged under PhilPEN',
          followUpRequired: true,
        });
      assert.equal(res2.status, 201);

      // Verify that community surveillance statistics accurately aggregate elevated BP counts
      const statsRes = await request(app)
        .get('/api/v1/community/stats')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(statsRes.status, 200);
      assert.ok(statsRes.body.data.elevatedBpCount >= 2);
    });

    it('4.3 PhilPEN Hypertensive Crisis Range (Systolic >= 180 and/or Diastolic >= 120)', async () => {
      // Acute hypertensive crisis reading: 210/125 mmHg
      const res = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 210,
          diastolic: 125,
          temperatureC: 37.0,
          heartRateBpm: 104,
          respiratoryRate: 24,
          weightKg: 85.0,
          heightCm: 168.0,
          nursingNotes: 'Acute hypertensive emergency reading - patient symptomatic with blurred vision.',
          followUpRequired: false, // Client submits false; backend clinical safety guard coerces to true
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.systolic, 210);
      assert.equal(res.body.data.diastolic, 125);
      assert.equal(res.body.data.followUpRequired, true, 'Backend must coerce followUpRequired to true for BP >= 180/120');

      // Verify validation limits: reject absurd out-of-range clinical measurements (e.g. systolic > 300)
      const absurdRes = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 350, // Max schema is 300
          diastolic: 90,
          temperatureC: 36.5,
          heartRateBpm: 75,
          respiratoryRate: 16,
          weightKg: 60,
          heightCm: 160,
          nursingNotes: 'Absurd BP test',
        });

      assert.equal(absurdRes.status, 400);
      assert.equal(absurdRes.body.code, 'VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // 5. CONSULTATION AMENDMENT HISTORY PRESERVATION (FR-028)
  // ==========================================================================
  describe('5. Consultation Amendment Immutability & Full Historical Traceability', () => {
    it('5.1 Preserves chained chronological amendment history without destructive overwriting', async () => {
      // Step 1: Doctor creates a new consultation
      const createRes = await request(app)
        .post('/api/v1/consultations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9242',
          chiefComplaint: 'Productive cough and fever x 3 days',
          medicalHistory: 'Smoker x 10 pack-years, hypertensive',
          clinicalFindings: 'Rhonchi in right lower lung field, febrile 38.4C',
          diagnosis: 'Acute Bronchitis',
          icdCode: 'J20.9',
          treatmentPlan: 'Hydration, steam inhalation, and oral Paracetamol 500mg Q6H PRN',
          prescriptionDetails: 'Paracetamol 500mg #15',
        });

      assert.equal(createRes.status, 201);
      const consultation = createRes.body.data;
      const consultationId = consultation.id;
      assert.equal(consultation.diagnosis, 'Acute Bronchitis');
      assert.equal(consultation.amendments.length, 0);

      // Step 2: Apply Amendment 1 (Following CXR results showing pneumonia)
      const amd1Reason = 'Chest X-ray shows right lower lobe consolidation consistent with Community-Acquired Pneumonia';
      const amd1Diagnosis = 'Community-Acquired Pneumonia (CAP) - Moderate Risk';
      const amd1Treatment = 'Initiate oral Azithromycin 500mg OD x 3 days plus Amoxicillin-Clavulanic acid 1g BID x 7 days';
      const amd1Rx = 'Azithromycin 500mg #3, Co-amoxiclav 1g #14';

      const amd1Res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/amendments`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          reason: amd1Reason,
          newDiagnosis: amd1Diagnosis,
          newTreatmentPlan: amd1Treatment,
          newPrescription: amd1Rx,
        });

      assert.equal(amd1Res.status, 200);
      const updatedConsultation1 = amd1Res.body.data;

      // Active consultation fields must reflect Amendment 1
      assert.equal(updatedConsultation1.diagnosis, amd1Diagnosis);
      assert.equal(updatedConsultation1.treatmentPlan, amd1Treatment);
      assert.equal(updatedConsultation1.prescriptionDetails, amd1Rx);

      // Amendment history must retain the original state
      assert.equal(updatedConsultation1.amendments.length, 1);
      assert.equal(updatedConsultation1.amendments[0].previousDiagnosis, 'Acute Bronchitis');
      assert.equal(updatedConsultation1.amendments[0].previousTreatmentPlan, 'Hydration, steam inhalation, and oral Paracetamol 500mg Q6H PRN');
      assert.equal(updatedConsultation1.amendments[0].reason, amd1Reason);
      assert.equal(updatedConsultation1.amendments[0].amendedByName, 'Dr. Rafael Mendoza, MD');

      // Step 3: Apply Amendment 2 (Patient develops allergic rash to penicillin)
      const amd2Reason = 'Patient developed generalized maculopapular allergic rash to Co-amoxiclav; switched to Levofloxacin';
      const amd2Diagnosis = 'Community-Acquired Pneumonia with Penicillin Allergy';
      const amd2Treatment = 'Discontinue Co-amoxiclav immediately. Start Levofloxacin 500mg PO once daily x 7 days and Cetirizine 10mg OD';
      const amd2Rx = 'Levofloxacin 500mg #7, Cetirizine 10mg #5';

      const amd2Res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/amendments`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          reason: amd2Reason,
          newDiagnosis: amd2Diagnosis,
          newTreatmentPlan: amd2Treatment,
          newPrescription: amd2Rx,
        });

      assert.equal(amd2Res.status, 200);
      const updatedConsultation2 = amd2Res.body.data;

      // Active consultation fields must now reflect Amendment 2
      assert.equal(updatedConsultation2.diagnosis, amd2Diagnosis);
      assert.equal(updatedConsultation2.treatmentPlan, amd2Treatment);
      assert.equal(updatedConsultation2.prescriptionDetails, amd2Rx);

      // Amendment history must now have 2 chronological records preserving the chain:
      // index 0: amendment 2 (previous was CAP Moderate Risk)
      // index 1: amendment 1 (previous was Acute Bronchitis)
      assert.equal(updatedConsultation2.amendments.length, 2);
      assert.equal(updatedConsultation2.amendments[0].previousDiagnosis, amd1Diagnosis);
      assert.equal(updatedConsultation2.amendments[0].newDiagnosis, amd2Diagnosis);
      assert.equal(updatedConsultation2.amendments[0].reason, amd2Reason);

      assert.equal(updatedConsultation2.amendments[1].previousDiagnosis, 'Acute Bronchitis');
      assert.equal(updatedConsultation2.amendments[1].newDiagnosis, amd1Diagnosis);
      assert.equal(updatedConsultation2.amendments[1].reason, amd1Reason);

      // Verify immutable audit logs reflect both amendments
      const auditRes = await request(app)
        .get(`/api/v1/audit-logs?module=Consultations`)
        .set('Authorization', `Bearer ${signToken({
          id: 'b101a111-0005-4000-8000-000000000005',
          userCode: 'USR-05',
          fullName: 'Carlos Dizon',
          email: 'admin@sanroque-chc.gov.ph',
          role: 'admin',
          department: 'Health Information Systems',
        })}`);

      assert.equal(auditRes.status, 200);
      const consultationLogs = auditRes.body.data.filter(
        (l: any) => l.actionType === 'Clinical Amendment'
      );
      assert.ok(consultationLogs.length >= 2, 'Audit logs must capture every clinical amendment');
    });
  });
});
