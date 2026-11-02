import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { mockRepository } from '../db/index.js';
import { signToken } from '../middleware/auth.js';

describe('Empirical Re-Verification Suite (Phase 3 & 4 Iteration 2 Gate)', () => {
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

  beforeEach(() => {
    mockRepository.reset();
    app = createApp();
  });

  // ==========================================================================
  // OBJECTIVE 1: AUTOMATED HYPERTENSIVE TRIAGE SAFETY GUARD MATRIX
  // ==========================================================================
  describe('Objective 1: Automated Hypertensive Triage Safety Guard Matrix', () => {
    const patientId = 'e3b0c442-98fc-1c14-9afb-4c8996fb9241';

    const testCases: Array<{
      desc: string;
      systolic: number;
      diastolic: number;
      submittedFollowUp: boolean;
      expectedFollowUp: boolean;
    }> = [
      {
        desc: 'Sub-threshold normotensive reading (120/80, client false) -> remains false',
        systolic: 120,
        diastolic: 80,
        submittedFollowUp: false,
        expectedFollowUp: false,
      },
      {
        desc: 'Sub-threshold prehypertensive boundary (139/89, client false) -> remains false',
        systolic: 139,
        diastolic: 89,
        submittedFollowUp: false,
        expectedFollowUp: false,
      },
      {
        desc: 'Stage 2 Systolic boundary threshold (140/80, client false) -> coerced to true',
        systolic: 140,
        diastolic: 80,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Stage 2 Diastolic boundary threshold (130/90, client false) -> coerced to true',
        systolic: 130,
        diastolic: 90,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Stage 2 Both thresholds reached (140/90, client false) -> coerced to true',
        systolic: 140,
        diastolic: 90,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Pre-crisis upper boundary (179/119, client false) -> coerced to true',
        systolic: 179,
        diastolic: 119,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Hypertensive Crisis Systolic boundary (180/85, client false) -> coerced to true',
        systolic: 180,
        diastolic: 85,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Hypertensive Crisis Diastolic boundary (135/120, client false) -> coerced to true',
        systolic: 135,
        diastolic: 120,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Hypertensive Crisis Severe Emergency (220/130, client false) -> coerced to true',
        systolic: 220,
        diastolic: 130,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Normal BP with explicit follow-up request (118/78, client true) -> remains true',
        systolic: 118,
        diastolic: 78,
        submittedFollowUp: true,
        expectedFollowUp: true,
      },
      {
        desc: 'Max permissible schema boundary (300/200, client false) -> coerced to true',
        systolic: 300,
        diastolic: 200,
        submittedFollowUp: false,
        expectedFollowUp: true,
      },
      {
        desc: 'Min permissible schema boundary (50/30, client false) -> remains false',
        systolic: 50,
        diastolic: 30,
        submittedFollowUp: false,
        expectedFollowUp: false,
      },
    ];

    for (const tc of testCases) {
      it(`Triage Guard: ${tc.desc}`, async () => {
        const res = await request(app)
          .post('/api/v1/vitals')
          .set('Authorization', `Bearer ${nurseToken}`)
          .send({
            patientId,
            systolic: tc.systolic,
            diastolic: tc.diastolic,
            temperatureC: 36.8,
            heartRateBpm: 75,
            respiratoryRate: 16,
            weightKg: 65,
            heightCm: 165,
            nursingNotes: `Testing ${tc.desc}`,
            followUpRequired: tc.submittedFollowUp,
          });

        assert.equal(res.status, 201, `Expected HTTP 201 for BP ${tc.systolic}/${tc.diastolic}`);
        assert.equal(
          res.body.data.followUpRequired,
          tc.expectedFollowUp,
          `Expected followUpRequired=${tc.expectedFollowUp} for BP ${tc.systolic}/${tc.diastolic} when client sent ${tc.submittedFollowUp}`
        );
      });
    }

    it('Rejects invalid physiological out-of-range BP values at validation layer', async () => {
      // Systolic > 300
      const r1 = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId,
          systolic: 301,
          diastolic: 80,
          temperatureC: 36.5,
          heartRateBpm: 75,
          respiratoryRate: 16,
          weightKg: 60,
          heightCm: 160,
          nursingNotes: 'Systolic > 300',
        });
      assert.equal(r1.status, 400);

      // Systolic < 50
      const r2 = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId,
          systolic: 49,
          diastolic: 80,
          temperatureC: 36.5,
          heartRateBpm: 75,
          respiratoryRate: 16,
          weightKg: 60,
          heightCm: 160,
          nursingNotes: 'Systolic < 50',
        });
      assert.equal(r2.status, 400);

      // Diastolic > 200
      const r3 = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId,
          systolic: 120,
          diastolic: 201,
          temperatureC: 36.5,
          heartRateBpm: 75,
          respiratoryRate: 16,
          weightKg: 60,
          heightCm: 160,
          nursingNotes: 'Diastolic > 200',
        });
      assert.equal(r3.status, 400);

      // Diastolic < 30
      const r4 = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId,
          systolic: 120,
          diastolic: 29,
          temperatureC: 36.5,
          heartRateBpm: 75,
          respiratoryRate: 16,
          weightKg: 60,
          heightCm: 160,
          nursingNotes: 'Diastolic < 30',
        });
      assert.equal(r4.status, 400);
    });
  });

  // ==========================================================================
  // OBJECTIVE 2: MUTATION AUDIT LOGGING EXHAUSTIVE VERIFICATION
  // ==========================================================================
  describe('Objective 2: Mutation Audit Logging Exhaustive Verification', () => {
    it('Accurately creates immutable audit log entries across all critical operational mutations', async () => {
      // 1. Appointment Booking
      const apptRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9244',
          serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
          scheduledDate: '2026-11-25',
          timeSlot: '02:00 PM',
          reason: 'Routine quarterly checkup',
        });
      assert.equal(apptRes.status, 201);
      const apptCode = apptRes.body.data.appointmentCode;
      const apptId = apptRes.body.data.id;

      // 2. Appointment Status Transition (Cancel)
      const cancelRes = await request(app)
        .patch(`/api/v1/appointments/${apptId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'Cancelled',
          cancellationReason: 'Patient called to reschedule for next month',
        });
      assert.equal(cancelRes.status, 200);

      // 3. Pharmacy Dispensing
      const dispenseRes = await request(app)
        .post('/api/v1/prescriptions/RX-2026-001/dispense')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          notes: 'Dispensed 30 tablets of Losartan 50mg with patient counseling',
        });
      assert.equal(dispenseRes.status, 200);

      // 4. Billing Invoice Settlement
      const settleRes = await request(app)
        .post('/api/v1/billing/invoices/INV-2026-901/settle')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          paymentStatus: 'Paid',
          officialReceiptNumber: 'OR-2026-77701',
          philhealthClaimNumber: 'PHIC-2026-0099',
        });
      assert.equal(settleRes.status, 200);

      // 5. Order new lab request then record Diagnostic Results
      const createLabRes = await request(app)
        .post('/api/v1/lab-requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          testName: 'Complete Blood Count (CBC)',
          testCategory: 'Hematology',
          priority: 'Routine',
        });
      assert.equal(createLabRes.status, 201);
      const newLabCode = createLabRes.body.data.requestCode;

      const labResultRes = await request(app)
        .post(`/api/v1/lab-requests/${newLabCode}/results`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          results: [
            {
              parameterName: 'Hemoglobin',
              resultValue: '14.2',
              unit: 'g/dL',
              referenceRange: '12.0 - 16.0',
              isAbnormal: false,
            },
            {
              parameterName: 'White Blood Cells',
              resultValue: '6.8',
              unit: 'x10^9/L',
              referenceRange: '4.5 - 11.0',
              isAbnormal: false,
            },
          ],
          notes: 'Hematological parameters within normal limits',
        });
      assert.equal(labResultRes.status, 200);

      // 6. Query and Inspect Audit Logs
      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(auditRes.status, 200);

      const logs = auditRes.body.data;
      assert.ok(Array.isArray(logs), 'Audit logs must be an array');

      // Verify Appointment Booking Audit Log
      const bookingLog = logs.find(
        (l: any) => l.module === 'Appointments' && l.targetEntityId === apptCode && l.details.includes('Booked appointment')
      );
      assert.ok(bookingLog, `Audit log for booking ${apptCode} must exist`);
      assert.equal(bookingLog.actionType, 'Appointment');
      assert.equal(bookingLog.actorRole, 'staff');
      assert.ok(bookingLog.timestamp);
      assert.ok(bookingLog.logCode);

      // Verify Appointment Status Transition Audit Log
      const statusLog = logs.find(
        (l: any) => l.module === 'Appointments' && l.targetEntityId === apptCode && l.details.includes('Cancelled')
      );
      assert.ok(statusLog, `Audit log for transitioning ${apptCode} status must exist`);
      assert.equal(statusLog.actionType, 'Appointment');
      assert.match(statusLog.details, /Patient called to reschedule/);

      // Verify Pharmacy Dispensing Audit Log
      const rxLog = logs.find(
        (l: any) => l.module === 'Prescriptions' && l.targetEntityId === 'RX-2026-001'
      );
      assert.ok(rxLog, 'Audit log for prescription dispense must exist');
      assert.equal(rxLog.actionType, 'Patient Record');
      assert.equal(rxLog.actorRole, 'nurse');
      assert.match(rxLog.details, /Dispensed pharmacy prescription RX-2026-001/);

      // Verify Billing Settlement Audit Log
      const billLog = logs.find(
        (l: any) => l.module === 'Billing' && l.targetEntityId === 'INV-2026-901'
      );
      assert.ok(billLog, 'Audit log for billing invoice settlement must exist');
      assert.equal(billLog.actionType, 'Patient Record');
      assert.equal(billLog.actorRole, 'staff');
      assert.match(billLog.details, /OR: OR-2026-77701/);
      assert.match(billLog.details, /PHIC-2026-0099/);

      // Verify Lab Result Recording Audit Log
      const labLog = logs.find(
        (l: any) => l.module === 'Laboratory' && l.targetEntityId === newLabCode
      );
      assert.ok(labLog, `Audit log for lab result recording (${newLabCode}) must exist`);
      assert.equal(labLog.actionType, 'Patient Record');
      assert.equal(labLog.actorRole, 'doctor');
      assert.match(labLog.details, new RegExp(`Recorded laboratory diagnostic results for ${newLabCode}`));
    });
  });

  // ==========================================================================
  // OBJECTIVE 3: CONCURRENCY STRESS & RACE CONDITION HARNESS
  // ==========================================================================
  describe('Objective 3: Concurrency Stress & Race Condition Resistance', () => {
    const generalServiceId = '7c9e6679-7425-40de-944b-e07fc1f90ae1';

    it('Survives a 20-worker parallel burst double-booking attack: exactly 1 wins, 19 receive 409', async () => {
      const targetDate = '2026-12-01';
      const targetSlot = '11:00 AM';
      const targetPatient = 'e3b0c442-98fc-1c14-9afb-4c8996fb9241';

      const burst = Array.from({ length: 20 }, (_, idx) =>
        request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            patientId: targetPatient,
            serviceId: generalServiceId,
            scheduledDate: targetDate,
            timeSlot: targetSlot,
            reason: `Parallel assault worker #${idx + 1}`,
          })
      );

      const results = await Promise.all(burst);
      const passes = results.filter((r) => r.status === 201);
      const conflicts = results.filter((r) => r.status === 409);

      assert.equal(passes.length, 1, 'Strictly 1 booking request must succeed in race condition');
      assert.equal(conflicts.length, 19, 'Strictly 19 duplicate requests must be rejected with 409 Conflict');
      for (const c of conflicts) {
        assert.equal(c.body.code, 'SLOT_CONFLICT');
      }
    });

    it('Survives a 20-worker parallel burst across multiple patients: capacity limit 2 strictly enforced, 18 receive 409', async () => {
      const targetDate = '2026-12-02';
      const targetSlot = '01:00 PM';

      // 5 seed patients, we simulate distinct requests
      // First ensure each patient can only attempt once or distinct patients
      const patientIds = [
        'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
        'e3b0c442-98fc-1c14-9afb-4c8996fb9242',
        'e3b0c442-98fc-1c14-9afb-4c8996fb9243',
        'e3b0c442-98fc-1c14-9afb-4c8996fb9244',
        'e3b0c442-98fc-1c14-9afb-4c8996fb9245',
      ];

      // 20 requests distributing across the patients
      const burst = Array.from({ length: 20 }, (_, idx) => {
        const patientId = patientIds[idx % patientIds.length];
        return request(app)
          .post('/api/v1/appointments')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            patientId,
            serviceId: generalServiceId,
            scheduledDate: targetDate,
            timeSlot: targetSlot,
            reason: `Multi-patient assault worker #${idx + 1}`,
          });
      });

      const results = await Promise.all(burst);
      const passes = results.filter((r) => r.status === 201);
      const conflicts = results.filter((r) => r.status === 409);

      assert.equal(
        passes.length,
        2,
        `Capacity limit for service on slot is 2; exactly 2 must succeed, but got ${passes.length}`
      );
      assert.equal(
        conflicts.length,
        18,
        `Remaining 18 requests must fail with 409, but got ${conflicts.length}`
      );
    });

    it('Concurrent parallel status transitions execute deterministically without race condition corruptions', async () => {
      // Create an appointment first
      const createRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9245',
          serviceId: generalServiceId,
          scheduledDate: '2026-12-05',
          timeSlot: '10:00 AM',
          reason: 'Status transition concurrency test',
        });
      assert.equal(createRes.status, 201);
      const apptId = createRes.body.data.id;

      // 10 concurrent requests to transition status
      const transitions = [
        'Confirmed',
        'Cancelled',
        'Confirmed',
        'Cancelled',
        'Confirmed',
        'Cancelled',
        'Confirmed',
        'Cancelled',
        'Confirmed',
        'Completed',
      ];

      const burst = transitions.map((st, idx) =>
        request(app)
          .patch(`/api/v1/appointments/${apptId}/status`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            status: st,
            cancellationReason: st === 'Cancelled' ? `Reason ${idx}` : undefined,
          })
      );

      const results = await Promise.all(burst);
      for (const res of results) {
        assert.equal(res.status, 200, `Expected 200 for transition to ${res.body.data?.status}`);
      }

      // Check final appointment record is intact and has a valid status
      const finalRes = await request(app)
        .get(`/api/v1/appointments/${apptId}`)
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(finalRes.status, 200);
      assert.ok(
        ['Confirmed', 'Cancelled', 'Completed'].includes(finalRes.body.data.status),
        `Status ${finalRes.body.data.status} must be valid`
      );
    });

    it('Concurrent invoice settlements do not corrupt payment state', async () => {
      // 10 concurrent requests settling the exact same invoice
      const burst = Array.from({ length: 10 }, (_, idx) =>
        request(app)
          .post('/api/v1/billing/invoices/INV-2026-901/settle')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({
            paymentStatus: 'Paid',
            officialReceiptNumber: `OR-BURST-${idx + 1}`,
          })
      );

      const results = await Promise.all(burst);
      for (const res of results) {
        assert.equal(res.status, 200);
        assert.equal(res.body.data.paymentStatus, 'Paid');
      }

      // Verify billing invoices list shows it as Paid
      const listRes = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(listRes.status, 200);
      const inv = listRes.body.data.find((i: any) => i.invoiceCode === 'INV-2026-901');
      assert.equal(inv.paymentStatus, 'Paid');
      assert.ok(inv.paidAt);
      assert.ok(inv.officialReceiptNumber);
    });
  });
});
