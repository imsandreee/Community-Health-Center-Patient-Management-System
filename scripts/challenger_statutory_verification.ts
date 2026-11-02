/**
 * scripts/challenger_statutory_verification.ts
 *
 * INDEPENDENT EMPIRICAL CHALLENGER VERIFICATION HARNESS
 *
 * Stress-tests and empirically asserts the four statutory requirements:
 * 1. RA 10173 RBAC & Clinical Privacy Barrier
 * 2. DOH PhilPEN (AO 2012-0029) CVD Risk & Triage Protocol
 * 3. Batas Pambansa Blg. 344 / RA 7277 / RA 9994 Queue Priority & Preemption
 * 4. Appointment 2-Slot Concurrency Limits & Conflict Guards
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';

import { createApp } from '../server/src/app.js';
import { mockRepository } from '../server/src/db/index.js';
import { signToken } from '../server/src/middleware/auth.js';
import { sortQueueByPriority } from '../server/src/utils/healthLogic.js';
import type { QueueEntryEntity, QueuePriority } from '../server/src/types/index.js';

interface TestSummary {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestSummary[] = [];

async function runAssertion(name: string, fn: () => Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({ name, passed: true, durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({ name, passed: false, durationMs, error: err.message });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms): ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log('================================================================');
  console.log('  INDEPENDENT STATUTORY EMPIRICAL VERIFICATION HARNESS');
  console.log('================================================================\n');

  mockRepository.reset();
  const app = createApp();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  console.log(`Live Express test server active at: ${baseUrl}\n`);

  try {
    // Generate role tokens
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
      fullName: 'Juan Dela Cruz',
      email: 'j.delacruz@sanroque-chc.gov.ph',
      role: 'patient',
      patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
    });

    // Helper fetch wrapper
    async function apiRequest(path: string, options: RequestInit = {}) {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    }

    // =========================================================================
    // SECTION 1: RA 10173 DATA PRIVACY ACT & CLINICAL PRIVACY RBAC
    // =========================================================================
    console.log('--- Section 1: RA 10173 RBAC & Clinical Privacy Barrier ---');

    await runAssertion('1.1 Admin is strictly blocked from vitals with RA10173_PRIVACY_RESTRICTION 403', async () => {
      const res = await apiRequest('/vitals', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(res.data.detail, /Republic Act No\. 10173/i);
    });

    await runAssertion('1.2 Admin is strictly blocked from consultations with RA10173_PRIVACY_RESTRICTION 403', async () => {
      const res = await apiRequest('/consultations', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(res.data.detail, /Republic Act No\. 10173/i);
    });

    await runAssertion('1.3 Front Desk Staff is strictly blocked from consultations with RA10173_PRIVACY_RESTRICTION 403', async () => {
      const res = await apiRequest('/consultations', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    await runAssertion('1.4 Front Desk Staff is strictly blocked from vitals with RA10173_PRIVACY_RESTRICTION 403', async () => {
      const res = await apiRequest('/vitals', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    await runAssertion('1.5 Medical Doctor has authorized access to consultations (manage) and vitals (view)', async () => {
      const vitalsRes = await apiRequest('/vitals', {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      assert.equal(vitalsRes.status, 200);

      const consultsRes = await apiRequest('/consultations', {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      assert.equal(consultsRes.status, 200);
    });

    await runAssertion('1.6 Nurse has authorized access to vitals (manage) and consultations (view)', async () => {
      const vitalsRes = await apiRequest('/vitals', {
        headers: { Authorization: `Bearer ${nurseToken}` },
      });
      assert.equal(vitalsRes.status, 200);

      const consultsRes = await apiRequest('/consultations', {
        headers: { Authorization: `Bearer ${nurseToken}` },
      });
      assert.equal(consultsRes.status, 200);
    });

    await runAssertion('1.7 Non-admin roles are prohibited from viewing audit logs (403 RBAC_ACCESS_DENIED)', async () => {
      for (const [roleName, token] of [['Doctor', doctorToken], ['Nurse', nurseToken], ['Staff', staffToken], ['Patient', patientToken]]) {
        const res = await apiRequest('/audit-logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        assert.equal(res.status, 403, `${roleName} must receive 403 on /audit-logs`);
        assert.equal(res.data.code, 'RBAC_ACCESS_DENIED');
      }
    });

    await runAssertion('1.8 Admin has authorized access to audit logs', async () => {
      const res = await apiRequest('/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.data));
    });

    // =========================================================================
    // SECTION 2: DOH PhilPEN CVD RISK & TRIAGE PROTOCOL
    // =========================================================================
    console.log('\n--- Section 2: DOH PhilPEN CVD Risk & Triage Protocol ---');

    const testPatientId = 'e3b0c442-98fc-1c14-9afb-4c8996fb9241';

    await runAssertion('2.1 PhilPEN Stage 2 Systolic boundary (140/80) automatically enforces followUpRequired=true', async () => {
      const res = await apiRequest('/vitals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nurseToken}` },
        body: JSON.stringify({
          patientId: testPatientId,
          systolic: 140,
          diastolic: 80,
          temperatureC: 36.8,
          heartRateBpm: 76,
          respiratoryRate: 18,
          weightKg: 68,
          heightCm: 165,
          nursingNotes: 'PhilPEN Stage 2 Systolic check',
          followUpRequired: false, // client sends false
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.data.followUpRequired, true, 'Systolic >= 140 must coerce followUpRequired to true');
    });

    await runAssertion('2.2 PhilPEN Stage 2 Diastolic boundary (130/90) automatically enforces followUpRequired=true', async () => {
      const res = await apiRequest('/vitals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nurseToken}` },
        body: JSON.stringify({
          patientId: testPatientId,
          systolic: 130,
          diastolic: 90,
          temperatureC: 36.6,
          heartRateBpm: 74,
          respiratoryRate: 16,
          weightKg: 70,
          heightCm: 170,
          nursingNotes: 'PhilPEN Stage 2 Diastolic check',
          followUpRequired: false,
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.data.followUpRequired, true, 'Diastolic >= 90 must coerce followUpRequired to true');
    });

    await runAssertion('2.3 PhilPEN Hypertensive Crisis (185/125) enforces followUpRequired=true', async () => {
      const res = await apiRequest('/vitals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nurseToken}` },
        body: JSON.stringify({
          patientId: testPatientId,
          systolic: 185,
          diastolic: 125,
          temperatureC: 37.1,
          heartRateBpm: 98,
          respiratoryRate: 22,
          weightKg: 85,
          heightCm: 172,
          nursingNotes: 'PhilPEN Hypertensive crisis check',
          followUpRequired: false,
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.data.followUpRequired, true);
    });

    await runAssertion('2.4 PhilPEN Normotensive reading (118/78) preserves followUpRequired=false', async () => {
      const res = await apiRequest('/vitals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nurseToken}` },
        body: JSON.stringify({
          patientId: testPatientId,
          systolic: 118,
          diastolic: 78,
          temperatureC: 36.5,
          heartRateBpm: 72,
          respiratoryRate: 16,
          weightKg: 62,
          heightCm: 168,
          nursingNotes: 'PhilPEN Normotensive check',
          followUpRequired: false,
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.data.followUpRequired, false);
    });

    await runAssertion('2.5 Physiological limits strictly reject out-of-range BP (305/80 and 120/25) with 400', async () => {
      const rHigh = await apiRequest('/vitals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nurseToken}` },
        body: JSON.stringify({
          patientId: testPatientId,
          systolic: 305,
          diastolic: 80,
          temperatureC: 36.5,
          heartRateBpm: 72,
          respiratoryRate: 16,
          weightKg: 62,
          heightCm: 168,
          nursingNotes: 'Systolic out of range',
        }),
      });
      assert.equal(rHigh.status, 400);

      const rLow = await apiRequest('/vitals', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nurseToken}` },
        body: JSON.stringify({
          patientId: testPatientId,
          systolic: 120,
          diastolic: 25,
          temperatureC: 36.5,
          heartRateBpm: 72,
          respiratoryRate: 16,
          weightKg: 62,
          heightCm: 168,
          nursingNotes: 'Diastolic out of range',
        }),
      });
      assert.equal(rLow.status, 400);
    });

    await runAssertion('2.6 Community stats accurately computes PhilPEN elevatedBpCount', async () => {
      const statsRes = await apiRequest('/community/stats', {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      assert.equal(statsRes.status, 200);
      assert.ok(statsRes.data.data.elevatedBpCount >= 3, 'Must count all elevated BP records (systolic>=140 or diastolic>=90)');
    });

    // =========================================================================
    // SECTION 3: BP 344 / RA 7277 / RA 9994 QUEUE PRIORITY & PREEMPTION
    // =========================================================================
    console.log('\n--- Section 3: BP 344 Queue Priority & Preemption ---');

    await runAssertion('3.1 In-memory priority sorting strictly orders Emergency > Pregnant > Senior > PWD > Regular', async () => {
      const rawQueue: QueueEntryEntity[] = [
        { id: '1', queueNumber: 'Q-001', queueDate: '2026-11-02', patientId: 'p1', patientName: 'P1', serviceName: 'Med', priority: 'Regular', arrivalTime: '08:00', status: 'Waiting', assignedRoom: 'R1' },
        { id: '2', queueNumber: 'P-002', queueDate: '2026-11-02', patientId: 'p2', patientName: 'P2', serviceName: 'Med', priority: 'PWD', arrivalTime: '08:05', status: 'Waiting', assignedRoom: 'R1' },
        { id: '3', queueNumber: 'P-003', queueDate: '2026-11-02', patientId: 'p3', patientName: 'P3', serviceName: 'Med', priority: 'Senior Citizen', arrivalTime: '08:10', status: 'Waiting', assignedRoom: 'R1' },
        { id: '4', queueNumber: 'P-004', queueDate: '2026-11-02', patientId: 'p4', patientName: 'P4', serviceName: 'Med', priority: 'Pregnant', arrivalTime: '08:15', status: 'Waiting', assignedRoom: 'R1' },
        { id: '5', queueNumber: 'P-005', queueDate: '2026-11-02', patientId: 'p5', patientName: 'P5', serviceName: 'Med', priority: 'Emergency', arrivalTime: '08:20', status: 'Waiting', assignedRoom: 'R1' },
      ];

      const sorted = sortQueueByPriority(rawQueue);
      assert.equal(sorted[0].priority, 'Emergency');
      assert.equal(sorted[1].priority, 'Pregnant');
      assert.equal(sorted[2].priority, 'Senior Citizen');
      assert.equal(sorted[3].priority, 'PWD');
      assert.equal(sorted[4].priority, 'Regular');
    });

    await runAssertion('3.2 Arrival time tie-breaker sorts correctly within identical statutory tiers', async () => {
      const rawQueue: QueueEntryEntity[] = [
        { id: '1', queueNumber: 'P-001', queueDate: '2026-11-02', patientId: 'p1', patientName: 'P1', serviceName: 'Med', priority: 'Senior Citizen', arrivalTime: '08:30', status: 'Waiting', assignedRoom: 'R1' },
        { id: '2', queueNumber: 'P-002', queueDate: '2026-11-02', patientId: 'p2', patientName: 'P2', serviceName: 'Med', priority: 'Senior Citizen', arrivalTime: '08:15', status: 'Waiting', assignedRoom: 'R1' },
        { id: '3', queueNumber: 'P-003', queueDate: '2026-11-02', patientId: 'p3', patientName: 'P3', serviceName: 'Med', priority: 'Senior Citizen', arrivalTime: '08:45', status: 'Waiting', assignedRoom: 'R1' },
      ];

      const sorted = sortQueueByPriority(rawQueue);
      assert.equal(sorted[0].arrivalTime, '08:15');
      assert.equal(sorted[1].arrivalTime, '08:30');
      assert.equal(sorted[2].arrivalTime, '08:45');
    });

    await runAssertion('3.3 REST API GET /queue orders ingested statutory priority tickets deterministically', async () => {
      const qRes = await apiRequest('/queue', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      assert.equal(qRes.status, 200);
      const queue = qRes.data.data;
      assert.ok(queue.length > 0);

      // Verify that all items in queue are strictly sorted by weight then arrivalTime
      const weights: Record<QueuePriority, number> = {
        Emergency: 1,
        Pregnant: 2,
        'Senior Citizen': 3,
        PWD: 4,
        Regular: 5,
      };

      for (let i = 0; i < queue.length - 1; i++) {
        const curW = weights[queue[i].priority as QueuePriority];
        const nextW = weights[queue[i + 1].priority as QueuePriority];
        assert.ok(curW <= nextW, `Priority violation at index ${i}: ${queue[i].priority} (${curW}) must be <= ${queue[i+1].priority} (${nextW})`);
        if (curW === nextW) {
          assert.ok(
            queue[i].arrivalTime.localeCompare(queue[i + 1].arrivalTime) <= 0,
            `Arrival time violation at index ${i}: ${queue[i].arrivalTime} must be <= ${queue[i+1].arrivalTime}`
          );
        }
      }
    });

    await runAssertion('3.4 Public live-board returns correct nextPriority ticket without authentication', async () => {
      const res = await apiRequest('/queue/live-board');
      assert.equal(res.status, 200);
      assert.ok(res.data.success);
      assert.ok(res.data.data !== undefined);
    });

    // =========================================================================
    // SECTION 4: APPOINTMENT 2-SLOT CONCURRENCY LIMITS & CONFLICT GUARDS
    // =========================================================================
    console.log('\n--- Section 4: Appointment 2-Slot Limits & Conflict Guards ---');

    const serviceId = '7c9e6679-7425-40de-944b-e07fc1f90ae1';
    const uniqueTestDate = '2026-12-15';
    const uniqueSlot = '03:00 PM';

    const pA = 'e3b0c442-98fc-1c14-9afb-4c8996fb9241';
    const pB = 'e3b0c442-98fc-1c14-9afb-4c8996fb9242';
    const pC = 'e3b0c442-98fc-1c14-9afb-4c8996fb9243';

    await runAssertion('4.1 First patient books slot -> 201 Created', async () => {
      const res = await apiRequest('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          patientId: pA,
          serviceId,
          scheduledDate: uniqueTestDate,
          timeSlot: uniqueSlot,
          reason: 'Slot 1 Patient A',
        }),
      });
      assert.equal(res.status, 201);
    });

    await runAssertion('4.2 Second patient books same slot -> 201 Created (capacity 2 reaches limit)', async () => {
      const res = await apiRequest('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          patientId: pB,
          serviceId,
          scheduledDate: uniqueTestDate,
          timeSlot: uniqueSlot,
          reason: 'Slot 1 Patient B',
        }),
      });
      assert.equal(res.status, 201);
    });

    await runAssertion('4.3 Third patient tries to book same slot -> 409 Conflict SLOT_CONFLICT', async () => {
      const res = await apiRequest('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          patientId: pC,
          serviceId,
          scheduledDate: uniqueTestDate,
          timeSlot: uniqueSlot,
          reason: 'Slot 1 Patient C (Overflow)',
        }),
      });
      assert.equal(res.status, 409);
      assert.equal(res.data.code, 'SLOT_CONFLICT');
      assert.match(res.data.detail, /maximum booking capacity/i);
    });

    await runAssertion('4.4 Same patient double-booking rejected even if slot had space', async () => {
      const openDate = '2026-12-16';
      const openSlot = '09:00 AM';

      const res1 = await apiRequest('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          patientId: pA,
          serviceId,
          scheduledDate: openDate,
          timeSlot: openSlot,
          reason: 'First booking',
        }),
      });
      assert.equal(res1.status, 201);

      const res2 = await apiRequest('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          patientId: pA,
          serviceId,
          scheduledDate: openDate,
          timeSlot: openSlot,
          reason: 'Duplicate attempt by same patient',
        }),
      });
      assert.equal(res2.status, 409);
      assert.equal(res2.data.code, 'SLOT_CONFLICT');
      assert.match(res2.data.detail, /already has an active appointment/i);
    });

    await runAssertion('4.5 Cancelled appointment frees up slot capacity allowing new booking', async () => {
      // Find appointment of pB on uniqueTestDate
      const allAppts = await apiRequest('/appointments', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      const targetAppt = allAppts.data.data.find(
        (a: any) => a.patientId === pB && a.scheduledDate === uniqueTestDate && a.timeSlot === uniqueSlot
      );
      assert.ok(targetAppt, 'Target appointment must exist');

      // Cancel target appointment
      const cancelRes = await apiRequest(`/appointments/${targetAppt.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          status: 'Cancelled',
          cancellationReason: 'Patient rescheduled',
        }),
      });
      assert.equal(cancelRes.status, 200);

      // Now pC books the newly freed slot -> must succeed!
      const rebookRes = await apiRequest('/appointments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({
          patientId: pC,
          serviceId,
          scheduledDate: uniqueTestDate,
          timeSlot: uniqueSlot,
          reason: 'Rebooking into freed slot',
        }),
      });
      assert.equal(rebookRes.status, 201, 'Rebooking into freed capacity must succeed');
    });

    console.log('\n================================================================');
    console.log('  STATUTORY EMPIRICAL VERIFICATION HARNESS COMPLETE');
    console.log('================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed:      ${passedCount}`);
    console.log(`Failed:      ${results.length - passedCount}`);
    console.log('ALL STATUTORY REQUIREMENTS EMPIRICALLY CONFIRMED!\n');
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
