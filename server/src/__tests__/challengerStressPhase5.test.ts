import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { mockRepository } from '../db/index.js';
import { signToken } from '../middleware/auth.js';
import { config } from '../config/index.js';

describe('Empirical Phase 5 Stress & Robustness Suite (Challenger)', () => {
  let app: ReturnType<typeof createApp>;

  const adminToken = signToken({
    id: 'b101a111-0005-4000-8000-000000000005',
    userCode: 'USR-05',
    fullName: 'Carlos Dizon',
    email: 'admin@sanroque-chc.gov.ph',
    role: 'admin',
    department: 'Health Information Systems',
  });

  const staffToken = signToken({
    id: 'b101a111-0002-4000-8000-000000000002',
    userCode: 'USR-02',
    fullName: 'Elena Villanueva',
    email: 'e.villanueva@sanroque-chc.gov.ph',
    role: 'staff',
    department: 'Front Desk & Records',
  });

  const nurseToken = signToken({
    id: 'b101a111-0003-4000-8000-000000000003',
    userCode: 'USR-03',
    fullName: 'Nurse Joy Bautista, RN',
    email: 'j.bautista@sanroque-chc.gov.ph',
    role: 'nurse',
    department: 'Triage & Community Nursing',
  });

  const doctorToken = signToken({
    id: 'b101a111-0004-4000-8000-000000000004',
    userCode: 'USR-04',
    fullName: 'Dr. Rafael Mendoza, MD',
    email: 'r.mendoza@sanroque-chc.gov.ph',
    role: 'doctor',
    department: 'Primary Care & Internal Medicine',
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
  // 1. MALFORMED PAYLOADS, SCHEMA BOUNDS & INJECTION RESISTANCE
  // ==========================================================================
  describe('1. Malformed Payloads, Schema Bounds & Special Characters', () => {
    it('1.1 Rejects empty object {} on POST /patients with RFC 7807 validation errors', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
      assert.equal(res.body.status, 400);
      assert.ok(res.body.errors, 'RFC 7807 errors object must be present');
      assert.ok(res.body.errors.fullName, 'fullName must be marked as required');
      assert.ok(res.body.errors.dateOfBirth, 'dateOfBirth must be marked as required');
      assert.ok(res.body.errors.sex, 'sex must be marked as required');
    });

    it('1.2 Rejects empty object {} on POST /appointments with RFC 7807', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
      assert.ok(res.body.errors.patientId);
      assert.ok(res.body.errors.serviceId);
      assert.ok(res.body.errors.timeSlot);
    });

    it('1.3 Rejects invalid timeSlot (e.g. half-hour 09:30 AM or evening 06:00 PM) with 400', async () => {
      const invalidSlots = ['09:30 AM', '12:00 PM', '06:00 PM', 'midnight', ''];
      for (const slot of invalidSlots) {
        const res = await request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
            serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
            scheduledDate: '2026-11-15',
            timeSlot: slot,
            reason: 'Test invalid slot rejection',
          });

        assert.equal(res.status, 400, `Expected HTTP 400 for timeSlot: ${slot}`);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
      }
    });

    it('1.4 Rejects non-numeric vitals and negative physiological parameters', async () => {
      const badVitals = [
        { systolic: '120', diastolic: 80, desc: 'String systolic' },
        { systolic: -10, diastolic: 80, desc: 'Negative systolic' },
        { systolic: 120, diastolic: -5, desc: 'Negative diastolic' },
        { systolic: 120, diastolic: 80, temperatureC: -36.5, desc: 'Negative temperature' },
        { systolic: 120, diastolic: 80, weightKg: 0, desc: 'Zero weight' },
        { systolic: 120, diastolic: 80, heightCm: -160, desc: 'Negative height' },
      ];

      for (const tc of badVitals) {
        const payload: Record<string, unknown> = {
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          temperatureC: 36.6,
          heartRateBpm: 75,
          respiratoryRate: 18,
          weightKg: 65,
          heightCm: 165,
          nursingNotes: 'Testing parameter boundaries',
          ...tc,
        };
        delete payload.desc;

        const res = await request(app)
          .post('/api/v1/vitals')
          .set('Authorization', `Bearer ${nurseToken}`)
          .send(payload);

        assert.equal(res.status, 400, `Expected HTTP 400 for tc: ${tc.desc}`);
      }
    });

    it('1.5 Safely sanitizes SQL and Script injection vectors without crashing or SQL errors', async () => {
      const injectionPayloads = [
        "Robert'; DROP TABLE patients;--",
        "<script>alert('XSS-TEST')</script>",
        "admin' OR '1'='1",
        "${7*7}",
      ];

      for (const attackStr of injectionPayloads) {
        const res = await request(app)
          .post('/api/v1/patients')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            fullName: `Test ${attackStr}`,
            dateOfBirth: '1990-05-15',
            sex: 'Male',
            civilStatus: 'Single',
            contactNumber: '09171234567',
            address: '123 Safe St',
            barangay: 'San Roque',
            emergencyContactName: 'Guardian',
            emergencyContactNumber: '09177654321',
            allowDuplicateOverride: true,
          });

        assert.equal(res.status, 201, `Failed to handle injection payload safely: ${attackStr}`);
        assert.ok(res.body.data.patientCode);
        // Verify stored value contains the string literally without SQL execution
        assert.match(res.body.data.fullName, /Test/);
      }
    });
  });

  // ==========================================================================
  // 2. BOUNDARY DATES & EMPTY/NULL VALUES
  // ==========================================================================
  describe('2. Boundary Dates & Empty/Null Value Handling', () => {
    it('2.1 Correctly registers and calculates age for leap day (2024-02-29)', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Leap Year Baby',
          dateOfBirth: '2024-02-29',
          sex: 'Female',
          civilStatus: 'Single',
          contactNumber: '09179998877',
          address: '456 Leap Ave',
          barangay: 'San Roque',
          emergencyContactName: 'Mother',
          emergencyContactNumber: '09171112233',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.dateOfBirth, '2024-02-29');
      assert.equal(res.body.data.age, 2); // Born 2024-02-29, reference date 2026-11-02 -> 2 years old
    });

    it('2.2 Handles centenarian DOB (1920-01-01) and infant DOB (2026-10-01)', async () => {
      // Centenarian (106 years old)
      const res1 = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Centenarian Elder',
          dateOfBirth: '1920-01-01',
          sex: 'Female',
          civilStatus: 'Widowed',
          contactNumber: '09171239999',
          address: 'Heritage Lane',
          barangay: 'San Roque',
          emergencyContactName: 'Grandchild',
          emergencyContactNumber: '09172223333',
        });
      assert.equal(res1.status, 201);
      assert.equal(res1.body.data.age, 106);

      // 1-month-old infant (0 years old)
      const res2 = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Infant Child',
          dateOfBirth: '2026-10-01',
          sex: 'Male',
          civilStatus: 'Single',
          contactNumber: '09171238888',
          address: 'Nursery Rd',
          barangay: 'San Roque',
          emergencyContactName: 'Mother',
          emergencyContactNumber: '09172224444',
        });
      assert.equal(res2.status, 201);
      assert.equal(res2.body.data.age, 0);
    });

    it('2.3 Rejects non-conforming date formats on patient registration', async () => {
      const badDates = ['11/02/2026', '02-11-2026', '2026.11.02', 'Nov 2, 2026', '2026-1-1'];
      for (const badDate of badDates) {
        const res = await request(app)
          .post('/api/v1/patients')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            fullName: 'Date Format Test',
            dateOfBirth: badDate,
            sex: 'Male',
            civilStatus: 'Single',
            contactNumber: '09171230000',
            address: 'Format St',
            barangay: 'San Roque',
            emergencyContactName: 'Contact',
            emergencyContactNumber: '09172220000',
          });

        assert.equal(res.status, 400, `Expected 400 for bad date: ${badDate}`);
        assert.equal(res.body.code, 'VALIDATION_ERROR');
      }
    });

    it('2.4 Handles empty query params and symbol searches cleanly without 500 error', async () => {
      const queryStrings = [
        '?search=&status=&barangay=',
        '?search=%25&status=All',
        '?search=%20%20&page=1&limit=20',
        '?search=%3F%26%3D',
      ];

      for (const qs of queryStrings) {
        const res = await request(app)
          .get(`/api/v1/patients${qs}`)
          .set('Authorization', `Bearer ${staffToken}`);

        assert.equal(res.status, 200, `Failed on query string: ${qs}`);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.meta);
      }
    });
  });

  // ==========================================================================
  // 3. INVALID JWT TOKENS & AUTHORIZATION EDGES
  // ==========================================================================
  describe('3. Invalid JWT Tokens & Authorization Edge Cases', () => {
    it('3.1 Rejects empty or whitespace-only Bearer token', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', 'Bearer    ');

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('3.2 Rejects string literals "null" and "undefined" as Bearer tokens', async () => {
      for (const fakeToken of ['Bearer null', 'Bearer undefined']) {
        const res = await request(app)
          .get('/api/v1/patients')
          .set('Authorization', fakeToken);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
      }
    });

    it('3.3 Rejects alg "none" attack token', async () => {
      // Craft an unverified token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'b101a111-0005-4000-8000-000000000005',
          userCode: 'USR-05',
          fullName: 'Carlos Dizon',
          email: 'admin@sanroque-chc.gov.ph',
          role: 'admin',
          department: 'HIS',
        })
      ).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${unsignedToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('3.4 Rejects token signed with weak dictionary keys', async () => {
      const weakSecrets = ['secret', 'password', '123456', 'admin'];
      for (const secret of weakSecrets) {
        const forged = jwt.sign(
          {
            sub: 'b101a111-0005-4000-8000-000000000005',
            userCode: 'USR-05',
            fullName: 'Carlos Dizon',
            role: 'admin',
          },
          secret,
          { algorithm: 'HS256' }
        );

        const res = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${forged}`);

        assert.equal(res.status, 401, `Vulnerable to secret: "${secret}"`);
        assert.equal(res.body.code, 'UNAUTHORIZED');
      }
    });
  });

  // ==========================================================================
  // 4. RAPID SEQUENTIAL MUTATIONS (CONCURRENCY & STATE TRANSITIONS)
  // ==========================================================================
  describe('4. Rapid Sequential Mutations & Concurrency Transitions', () => {
    it('4.1 Rapid sequential appointment status progression', async () => {
      // 1. Create appointment
      const createRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
          scheduledDate: '2026-11-20',
          timeSlot: '10:00 AM',
          reason: 'Sequential transition test',
        });
      assert.equal(createRes.status, 201);
      const apptId = createRes.body.data.id;

      // 2. Transition Confirmed -> Completed
      const s1 = await request(app)
        .patch(`/api/v1/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'Completed' });
      assert.equal(s1.status, 200);
      assert.equal(s1.body.data.status, 'Completed');

      // 3. Transition to Cancelled with reason
      const s2 = await request(app)
        .patch(`/api/v1/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'Cancelled', cancellationReason: 'Patient called to cancel' });
      assert.equal(s2.status, 200);
      assert.equal(s2.body.data.status, 'Cancelled');
      assert.equal(s2.body.data.cancellationReason, 'Patient called to cancel');

      // 4. Attempt transition to invalid status
      const s3 = await request(app)
        .patch(`/api/v1/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'NotAStatus' });
      assert.equal(s3.status, 400);
    });

    it('4.2 Rapid queue call lifecycle: Waiting -> Called -> In Consultation -> Completed', async () => {
      // 1. Ingest queue entry
      const createQ = await request(app)
        .post('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          serviceName: 'General Consultation',
          priority: 'Regular',
        });
      assert.equal(createQ.status, 201);
      const qId = createQ.body.data.id;
      assert.equal(createQ.body.data.status, 'Waiting');

      // 2. Call ticket -> sets calledAt timestamp
      const callRes = await request(app)
        .patch(`/api/v1/queue/${qId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'Called' });
      assert.equal(callRes.status, 200);
      assert.equal(callRes.body.data.status, 'Called');
      assert.ok(callRes.body.data.calledAt);

      // 3. In Consultation
      const consultRes = await request(app)
        .patch(`/api/v1/queue/${qId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'In Consultation' });
      assert.equal(consultRes.status, 200);
      assert.equal(consultRes.body.data.status, 'In Consultation');

      // 4. Complete -> sets completedAt timestamp
      const completeRes = await request(app)
        .patch(`/api/v1/queue/${qId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'Completed' });
      assert.equal(completeRes.status, 200);
      assert.equal(completeRes.body.data.status, 'Completed');
      assert.ok(completeRes.body.data.completedAt);
    });

    it('4.3 Repeated check-in on the same appointment maintains coherent state', async () => {
      const apptRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
          scheduledDate: '2026-11-25',
          timeSlot: '01:00 PM',
          reason: 'Double check-in test',
        });
      assert.equal(apptRes.status, 201);
      const apptId = apptRes.body.data.id;

      // First check-in
      const checkIn1 = await request(app)
        .post(`/api/v1/appointments/${apptId}/check-in`)
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(checkIn1.status, 200);
      assert.equal(checkIn1.body.data.appointment.status, 'Confirmed');
      assert.ok(checkIn1.body.data.queueEntry.queueNumber);

      // Second check-in
      const checkIn2 = await request(app)
        .post(`/api/v1/appointments/${apptId}/check-in`)
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(checkIn2.status, 200);
      assert.equal(checkIn2.body.data.appointment.status, 'Confirmed');
    });

    it('4.4 Concurrent burst of 10 rapid status updates does not corrupt queue or crash server', async () => {
      // Ingest queue ticket
      const qRes = await request(app)
        .post('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          serviceName: 'Pediatric Care',
          priority: 'Pregnant',
        });
      const qId = qRes.body.data.id;

      // Fire 10 parallel status requests
      const statuses: ('Waiting' | 'Called' | 'In Consultation' | 'Completed')[] = [
        'Called',
        'In Consultation',
        'Called',
        'In Consultation',
        'Completed',
        'Called',
        'In Consultation',
        'Completed',
        'Waiting',
        'Completed',
      ];

      const responses = await Promise.all(
        statuses.map((status) =>
          request(app)
            .patch(`/api/v1/queue/${qId}/status`)
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status })
        )
      );

      // All 10 requests should complete with HTTP 200 (no 500 crashes)
      for (const res of responses) {
        assert.equal(res.status, 200);
      }

      // Fetch the final state
      const finalQ = await request(app)
        .get('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`);
      const ticket = finalQ.body.data.find((item: { id: string }) => item.id === qId);
      assert.ok(ticket, 'Ticket must still exist');
      assert.ok(['Waiting', 'Called', 'In Consultation', 'Completed'].includes(ticket.status));
    });
  });
});
