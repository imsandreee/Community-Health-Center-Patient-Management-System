/**
 * scripts/adversarial_integration_probe.ts
 *
 * EMPIRICAL INTEGRATION PROBE & ADVERSARIAL CHALLENGER HARNESS
 *
 * This script tests the full client-server integration end-to-end:
 * It launches the live Express application on an ephemeral port,
 * intercepts client fetch requests to forward them to the live server,
 * executes authentic JWT authentication, and executes tests across:
 *
 *  a. Appointment Check-in flow (POST /appointments/:id/check-in)
 *     - Hyphenated appointmentCode / UUID
 *     - { appointment, queueEntry } envelope unwrapping
 *     - Non-existent ID 404 RFC 7807
 *
 *  b. Patient update flow (PUT /patients/:id)
 *     - Field updates and re-calculated age on dateOfBirth change
 *     - Client adaptPatient unwrapping
 *     - Non-existent ID 404 RFC 7807
 *
 *  c. Service status toggle (PATCH /services/:id/status)
 *     - { status: 'Active' | 'Inactive' }
 *     - Rejection of invalid status ('Paused', '', etc.) with HTTP 400 RFC 7807
 *
 *  d. User status toggle (PATCH /users/:id/status)
 *     - { status: 'Active' | 'Inactive' | 'Suspended' }
 *     - Rejection of invalid status ('Banned', 'Terminated') with HTTP 400 RFC 7807
 *
 *  e. Consultation amendment payload (POST /consultations/:id/amendments)
 *     - { reason, newDiagnosis, newTreatmentPlan, newPrescription }
 *     - Rejection of missing fields / short reasons with HTTP 400 RFC 7807
 *     - Immutability of previous history
 *
 *  f. Appointment time slot constraints
 *     - 7 valid hourly slots accepted
 *     - Invalid half-hour slots rejected with HTTP 400 RFC 7807 problem details
 *     - Client AppointmentModule.tsx slot configuration audit
 *
 *  g. ApiError extraction of detail, title, errors, and code
 *     - Authentic server-generated validation failure caught as ApiError
 *     - Field-level error extraction and message formatting
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Server dependencies
import { createApp } from '../server/src/app.js';
import { mockRepository } from '../server/src/db/index.js';
import { signToken } from '../server/src/middleware/auth.js';

// Client dependencies
import {
  ApiError,
  setAuthToken,
  clearAuthToken,
  authApi,
  appointmentsApi,
  patientsApi,
  servicesApi,
  usersApi,
  consultationsApi,
} from '../client/src/services/api.js';

interface ProbeResult {
  section: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const probeResults: ProbeResult[] = [];

async function runTest(
  section: string,
  testName: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = performance.now();
  try {
    await fn();
    const duration = Math.round((performance.now() - start) * 100) / 100;
    probeResults.push({ section, testName, passed: true, durationMs: duration });
    console.log(`  ✓ [PASS] ${section} - ${testName} (${duration}ms)`);
  } catch (err: unknown) {
    const duration = Math.round((performance.now() - start) * 100) / 100;
    const errorMsg = err instanceof Error ? err.stack || err.message : String(err);
    probeResults.push({
      section,
      testName,
      passed: false,
      durationMs: duration,
      error: errorMsg,
    });
    console.error(`  ✗ [FAIL] ${section} - ${testName} (${duration}ms)`);
    console.error(`    ${errorMsg}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('  STARTING ADVERSARIAL INTEGRATION PROBE SUITE (PHASE 5)');
  console.log('================================================================\n');

  // 1. Initialize clean mock repository & Express app
  mockRepository.reset();
  const app = createApp();

  // 2. Start live HTTP server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as AddressInfo;
  const liveBaseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  console.log(`Live Express test server listening at: ${liveBaseUrl}\n`);

  // 3. Patch global fetch so client api calls target the live server
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlStr = input.toString();
    // Rewrite default client URL (http://localhost:5000/api/v1) to ephemeral liveBaseUrl
    if (urlStr.startsWith('http://localhost:5000/api/v1')) {
      urlStr = urlStr.replace('http://localhost:5000/api/v1', liveBaseUrl);
    }
    return nativeFetch(urlStr, init);
  };

  try {
    // Authenticate client with admin credentials to test privileged endpoints
    console.log('▶ [Setup] Authenticating with server via authApi.login...');
    const loginRes = await authApi.login('admin@sanroque-chc.gov.ph', 'Password123!');
    assert.ok(loginRes.token, 'Must return authentic JWT token');
    assert.equal(loginRes.user.role, 'admin');
    console.log(`  ✓ Authenticated as ${loginRes.user.name} (${loginRes.user.role})\n`);

    // =========================================================================
    // SECTION A: Appointment Check-In Flow (POST /appointments/:id/check-in)
    // =========================================================================
    console.log('--- Section A: Appointment Check-in Flow ---');

    await runTest('Section A', 'A.1 Check-in accepts hyphenated appointmentCode and unwraps { appointment, queueEntry }', async () => {
      // Seeded appointment APT-2026-801 is Scheduled
      const result = await appointmentsApi.checkIn('APT-2026-801');
      assert.ok(result.appointment, 'Response must contain unwrapped appointment');
      assert.ok(result.queueEntry, 'Response must contain unwrapped queueEntry');
      assert.equal(result.appointment.id, 'APT-2026-801');
      assert.equal(result.appointment.status, 'Confirmed');
      assert.ok(result.queueEntry.queueNumber.startsWith('Q-'), 'Queue number must start with Q-');
      assert.equal(result.queueEntry.status, 'Waiting');
      assert.equal(result.queueEntry.source, 'Appointment');
    });

    await runTest('Section A', 'A.2 Check-in accepts internal UUID id format as well', async () => {
      // Find another appointment or test by id
      const store = mockRepository.getStore();
      const appt2 = store.appointments.find((a) => a.id !== 'APT-2026-0801');
      assert.ok(appt2, 'Secondary appointment must exist');

      const result = await appointmentsApi.checkIn(appt2.id);
      assert.equal(result.appointment.status, 'Confirmed');
      assert.ok(result.queueEntry.queueNumber);
    });

    await runTest('Section A', 'A.3 Check-in on non-existent appointment ID returns 404 with RFC 7807 problem details', async () => {
      let caughtErr: ApiError | null = null;
      try {
        await appointmentsApi.checkIn('APT-DOES-NOT-EXIST-999');
      } catch (err) {
        if (err instanceof ApiError) caughtErr = err;
      }
      assert.ok(caughtErr, 'Must throw ApiError');
      assert.equal(caughtErr.status, 404);
      assert.equal(caughtErr.title, 'Resource Not Found');
      assert.ok(caughtErr.detail?.includes('APT-DOES-NOT-EXIST-999'));
    });

    // =========================================================================
    // SECTION B: Patient Update Flow (PUT /patients/:id)
    // =========================================================================
    console.log('\n--- Section B: Patient Update Flow ---');

    await runTest('Section B', 'B.1 PUT /patients/:id updates fields and returns adapted patient', async () => {
      const updatePayload = {
        fullName: 'Maria Clara Santos-Alvarez',
        contactNumber: '0917-888-9999',
        address: 'Blk 12 Lot 4, Narra Street, San Roque',
        barangay: 'San Roque',
      };

      const updated = await patientsApi.update('CHC-2026-0101', updatePayload);
      assert.equal(updated.fullName, 'Maria Clara Santos-Alvarez');
      assert.equal(updated.contactNumber, '0917-888-9999');
      assert.equal(updated.address, 'Blk 12 Lot 4, Narra Street, San Roque');
      assert.equal(updated.id, 'CHC-2026-0101');
    });

    await runTest('Section B', 'B.2 PUT /patients/:id recalculates age when dateOfBirth is updated', async () => {
      // Set birth date to 1996-02-10 (30 years old as of reference 2026)
      const updated = await patientsApi.update('CHC-2026-0101', {
        dateOfBirth: '1996-02-10',
      });
      assert.equal(updated.dateOfBirth, '1996-02-10');
      assert.equal(updated.age, 30);
    });

    await runTest('Section B', 'B.3 PUT /patients/:id on non-existent ID throws 404 ApiError', async () => {
      let caughtErr: ApiError | null = null;
      try {
        await patientsApi.update('CHC-9999-9999', { fullName: 'Nobody' });
      } catch (err) {
        if (err instanceof ApiError) caughtErr = err;
      }
      assert.ok(caughtErr, 'Must throw ApiError on non-existent patient');
      assert.equal(caughtErr.status, 404);
      assert.equal(caughtErr.title, 'Resource Not Found');
    });

    // =========================================================================
    // SECTION C: Service Status Toggle (PATCH /services/:id/status)
    // =========================================================================
    console.log('\n--- Section C: Service Status Toggle ---');

    await runTest('Section C', 'C.1 PATCH /services/:id/status toggles from Active to Inactive', async () => {
      const result = await servicesApi.updateStatus('SRV-01', 'Inactive');
      assert.equal(result.id, 'SRV-01');
      assert.equal(result.status, 'Inactive');

      // Verify in backend repository
      const store = mockRepository.getStore();
      const svc = store.services.find((s) => s.id === 'SRV-01' || s.serviceCode === 'SRV-01');
      assert.equal(svc?.status, 'Inactive');
    });

    await runTest('Section C', 'C.2 PATCH /services/:id/status toggles back from Inactive to Active', async () => {
      const result = await servicesApi.updateStatus('SRV-01', 'Active');
      assert.equal(result.status, 'Active');

      const store = mockRepository.getStore();
      const svc = store.services.find((s) => s.id === 'SRV-01' || s.serviceCode === 'SRV-01');
      assert.equal(svc?.status, 'Active');
    });

    await runTest('Section C', 'C.3 PATCH /services/:id/status rejects invalid status with HTTP 400 RFC 7807', async () => {
      let caughtErr: ApiError | null = null;
      try {
        // Attempt adversarial status
        await servicesApi.updateStatus('SRV-01', 'Suspended' as any);
      } catch (err) {
        if (err instanceof ApiError) caughtErr = err;
      }
      assert.ok(caughtErr, 'Must throw ApiError');
      assert.equal(caughtErr.status, 400);
      assert.ok(caughtErr.detail?.includes("Invalid status. Expected 'Active' or 'Inactive'."));
    });

    await runTest('Section C', 'C.4 Direct HTTP PATCH /services/:id/status with empty body rejects with 400', async () => {
      const rawRes = await nativeFetch(`${liveBaseUrl}/services/SRV-01/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginRes.token}`,
        },
        body: JSON.stringify({}),
      });
      assert.equal(rawRes.status, 400);
      const json = await rawRes.json();
      assert.equal(json.status, 400);
      assert.equal(json.title, 'Bad Request');
      assert.ok(json.detail?.includes('Invalid status'));
    });

    // =========================================================================
    // SECTION D: User Status Toggle (PATCH /users/:id/status)
    // =========================================================================
    console.log('\n--- Section D: User Status Toggle ---');

    await runTest('Section D', 'D.1 PATCH /users/:id/status sets status to Inactive', async () => {
      const result = await usersApi.updateStatus('USR-02', 'Inactive');
      assert.equal(result.status, 'Inactive');
    });

    await runTest('Section D', 'D.2 PATCH /users/:id/status sets status to Suspended', async () => {
      const result = await usersApi.updateStatus('USR-02', 'Suspended');
      assert.equal(result.status, 'Suspended');
    });

    await runTest('Section D', 'D.3 PATCH /users/:id/status restores status to Active', async () => {
      const result = await usersApi.updateStatus('USR-02', 'Active');
      assert.equal(result.status, 'Active');
    });

    await runTest('Section D', 'D.4 PATCH /users/:id/status rejects invalid status with HTTP 400 RFC 7807', async () => {
      let caughtErr: ApiError | null = null;
      try {
        await usersApi.updateStatus('USR-02', 'Terminated' as any);
      } catch (err) {
        if (err instanceof ApiError) caughtErr = err;
      }
      assert.ok(caughtErr, 'Must throw ApiError for invalid user status');
      assert.equal(caughtErr.status, 400);
      assert.ok(caughtErr.detail?.includes("Expected 'Active', 'Inactive', or 'Suspended'"));
    });

    // =========================================================================
    // SECTION E: Consultation Amendment Payload
    // =========================================================================
    console.log('\n--- Section E: Consultation Amendment Payload ---');

    // Authenticate as doctor to manage consultations
    const doctorLogin = await authApi.login('r.mendoza@sanroque-chc.gov.ph', 'Password123!');
    assert.equal(doctorLogin.user.role, 'doctor');

    // Get an existing consultation
    const existingCons = await consultationsApi.list({ limit: 1 });
    assert.ok(existingCons.data.length > 0, 'At least one consultation must exist');
    const targetConsultation = existingCons.data[0];

    await runTest('Section E', 'E.1 POST /consultations/:id/amendments applies amendment with reason, newDiagnosis, newTreatmentPlan', async () => {
      const amended = await consultationsApi.amend(targetConsultation.id, {
        reason: 'Repeat diagnostic blood smear confirmed acute malaria infection',
        newDiagnosis: 'Plasmodium Falciparum Malaria - Uncomplicated',
        newTreatmentPlan: 'Artemether-Lumefantrine 20/120mg oral regimen x 3 days',
      });

      assert.equal(amended.diagnosis, 'Plasmodium Falciparum Malaria - Uncomplicated');
      assert.equal(amended.treatmentPlan, 'Artemether-Lumefantrine 20/120mg oral regimen x 3 days');
      assert.ok(amended.amendments.length > 0);
      // Newest amendment is prepended at index 0 via unshift
      const latestAmendment = amended.amendments[0];
      assert.equal(latestAmendment.reason, 'Repeat diagnostic blood smear confirmed acute malaria infection');
      assert.equal(latestAmendment.previousDiagnosis, 'Essential (Primary) Hypertension');
    });

    await runTest('Section E', 'E.2 POST /consultations/:id/amendments preserves historical amendments without overwriting', async () => {
      const secondAmended = await consultationsApi.amend(targetConsultation.id, {
        reason: 'Patient experienced mild nausea; prescribed antiemetic',
        newDiagnosis: 'Plasmodium Falciparum Malaria - Uncomplicated with mild drug-induced nausea',
        newTreatmentPlan: 'Continue Artemether-Lumefantrine + Metoclopramide 10mg PO PRN',
      });

      assert.ok(secondAmended.amendments.length >= 2, 'History must contain at least two amendments');
      // Index 0: newest amendment
      assert.equal(secondAmended.amendments[0].reason, 'Patient experienced mild nausea; prescribed antiemetic');
      // Index 1: previous amendment preserved
      assert.equal(
        secondAmended.amendments[1].reason,
        'Repeat diagnostic blood smear confirmed acute malaria infection'
      );
      assert.equal(secondAmended.diagnosis, 'Plasmodium Falciparum Malaria - Uncomplicated with mild drug-induced nausea');
    });

    await runTest('Section E', 'E.3 POST /consultations/:id/amendments rejects missing newDiagnosis or too-short reason with HTTP 400', async () => {
      // Direct raw fetch with incomplete body
      const rawRes = await nativeFetch(
        `${liveBaseUrl}/consultations/${targetConsultation.id}/amendments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${doctorLogin.token}`,
          },
          body: JSON.stringify({
            reason: 'no', // too short (<3 chars)
            // missing newDiagnosis and newTreatmentPlan
          }),
        }
      );

      assert.equal(rawRes.status, 400);
      const json = await rawRes.json();
      assert.equal(json.status, 400);
      assert.equal(json.code, 'VALIDATION_ERROR');
      assert.ok(json.errors);
      assert.ok(json.errors.reason, 'Must flag reason constraint error');
      assert.ok(json.errors.newDiagnosis, 'Must flag missing newDiagnosis');
      assert.ok(json.errors.newTreatmentPlan, 'Must flag missing newTreatmentPlan');
    });

    // =========================================================================
    // SECTION F: Appointment Time Slot Constraints
    // =========================================================================
    console.log('\n--- Section F: Appointment Time Slot Constraints ---');

    // Switch to staff user
    const staffLogin = await authApi.login('e.villanueva@sanroque-chc.gov.ph', 'Password123!');

    await runTest('Section F', 'F.1 Hourly slots are accepted by server Zod schema', async () => {
      const validSlots = [
        '08:00 AM',
        '09:00 AM',
        '10:00 AM',
        '11:00 AM',
        '01:00 PM',
        '02:00 PM',
        '03:00 PM',
      ];

      // Test scheduling on future days to avoid capacity collisions
      for (let i = 0; i < validSlots.length; i++) {
        const slot = validSlots[i];
        const date = `2026-11-${String(15 + i).padStart(2, '0')}`;
        const rawRes = await nativeFetch(`${liveBaseUrl}/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffLogin.token}`,
          },
          body: JSON.stringify({
            patientId: 'CHC-2026-0101',
            serviceId: 'SRV-01',
            scheduledDate: date,
            timeSlot: slot,
            assignedPersonnel: 'Dr. Rafael Mendoza, MD',
            reason: `Routine follow up check at ${slot}`,
          }),
        });
        assert.equal(
          rawRes.status,
          201,
          `Hourly slot '${slot}' on ${date} must be accepted with 201 Created (got ${rawRes.status})`
        );
      }
    });

    await runTest('Section F', 'F.2 Half-hour and non-standard slots are strictly rejected with HTTP 400 RFC 7807', async () => {
      const invalidSlots = [
        '08:30 AM',
        '09:30 AM', // previously in AppointmentModule initial state
        '10:30 AM',
        '11:30 AM',
        '12:00 PM',
        '01:30 PM',
        '02:30 PM',
        '03:30 PM',
        '04:00 PM',
        '14:00',
      ];

      for (const slot of invalidSlots) {
        const rawRes = await nativeFetch(`${liveBaseUrl}/appointments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffLogin.token}`,
          },
          body: JSON.stringify({
            patientId: 'CHC-2026-0101',
            serviceId: 'SRV-01',
            scheduledDate: '2026-11-25',
            timeSlot: slot,
            assignedPersonnel: 'Dr. Rafael Mendoza, MD',
            reason: 'Invalid slot probe test',
          }),
        });

        assert.equal(
          rawRes.status,
          400,
          `Slot '${slot}' must be rejected with 400 (got ${rawRes.status})`
        );
        const json = await rawRes.json();
        assert.equal(json.status, 400);
        assert.equal(json.title, 'Validation Failed (400)');
        assert.equal(json.code, 'VALIDATION_ERROR');
        assert.ok(json.errors?.timeSlot, `Must include error for field 'timeSlot'`);
      }
    });

    await runTest('Section F', 'F.3 Verify client AppointmentModule.tsx source code contains only valid hourly slots', async () => {
      const modulePath = path.resolve('client/src/components/AppointmentModule.tsx');
      const content = fs.readFileSync(modulePath, 'utf8');

      // Check TIME_SLOTS definition
      assert.ok(
        content.includes("'08:00 AM'"),
        "AppointmentModule must include '08:00 AM'"
      );
      assert.ok(
        content.includes("'03:00 PM'"),
        "AppointmentModule must include '03:00 PM'"
      );

      // Verify no half hour slots in TIME_SLOTS
      assert.ok(
        !content.includes("'09:30 AM'"),
        "AppointmentModule MUST NOT include '09:30 AM' in TIME_SLOTS or initial state"
      );
      assert.ok(
        !content.includes("'10:30 AM'"),
        "AppointmentModule MUST NOT include '10:30 AM'"
      );

      // Verify default selectedTimeSlot
      assert.ok(
        content.includes("useState('09:00 AM')") || content.includes('useState("09:00 AM")'),
        "AppointmentModule selectedTimeSlot must default to '09:00 AM'"
      );
    });

    // =========================================================================
    // SECTION G: ApiError Extraction of detail, title, and errors
    // =========================================================================
    console.log('\n--- Section G: ApiError RFC 7807 Extraction ---');

    await runTest('Section G', 'G.1 ApiError accurately captures RFC 7807 detail, title, errors, and code from live server', async () => {
      let caughtApiError: ApiError | null = null;
      try {
        // Attempt creating appointment with half-hour slot via client API wrapper
        await appointmentsApi.create({
          patientId: 'CHC-2026-0101',
          serviceId: 'SRV-01',
          scheduledDate: '2026-11-26',
          timeSlot: '09:30 AM', // rejected half-hour slot
          assignedPersonnel: 'Dr. Rafael Mendoza, MD',
          reason: 'ApiError probe test',
        });
      } catch (err) {
        if (err instanceof ApiError) {
          caughtApiError = err;
        }
      }

      assert.ok(caughtApiError, 'Client call must throw an ApiError instance');
      assert.equal(caughtApiError.name, 'ApiError');
      assert.equal(caughtApiError.status, 400);
      assert.equal(caughtApiError.title, 'Validation Failed (400)');
      assert.equal(
        caughtApiError.detail,
        'The submitted request payload failed schema validation rules.'
      );
      assert.equal(caughtApiError.code, 'VALIDATION_ERROR');
      assert.ok(caughtApiError.errors, 'ApiError must contain parsed field errors object');
      assert.ok(
        Array.isArray(caughtApiError.errors?.timeSlot),
        "errors object must contain 'timeSlot' array"
      );
      assert.ok(
        caughtApiError.errors.timeSlot[0].includes('Invalid enum value') ||
          caughtApiError.errors.timeSlot[0].includes('Expected')
      );
      assert.equal(
        caughtApiError.message,
        'The submitted request payload failed schema validation rules.'
      );
    });

    await runTest('Section G', 'G.2 ApiError captures 409 Conflict detail from patient double-booking', async () => {
      // Re-switch to staff
      setAuthToken(staffLogin.token);

      // Create appointment at future date
      const testDate = '2026-11-28';
      const slot = '10:00 AM';
      await appointmentsApi.create({
        patientId: 'CHC-2026-0101',
        serviceId: 'SRV-01',
        scheduledDate: testDate,
        timeSlot: slot,
        assignedPersonnel: 'Dr. Rafael Mendoza, MD',
        reason: 'First booking',
      });

      // Attempt second booking for same patient at exact same date & slot
      let conflictErr: ApiError | null = null;
      try {
        await appointmentsApi.create({
          patientId: 'CHC-2026-0101',
          serviceId: 'SRV-01',
          scheduledDate: testDate,
          timeSlot: slot,
          assignedPersonnel: 'Dr. Rafael Mendoza, MD',
          reason: 'Conflict booking probe',
        });
      } catch (err) {
        if (err instanceof ApiError) conflictErr = err;
      }

      assert.ok(conflictErr, 'Must throw ApiError on double booking');
      assert.equal(conflictErr.status, 409);
      assert.equal(conflictErr.title, 'Conflict / Business Rule Violation');
      assert.equal(conflictErr.code, 'SLOT_CONFLICT');
      assert.ok(conflictErr.detail?.includes('already has an active appointment'));
    });

    console.log('\n================================================================');
    console.log('  PROBE SUITE EXECUTION SUMMARY');
    console.log('================================================================');

    const total = probeResults.length;
    const passed = probeResults.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log(`Total probes executed: ${total}`);
    console.log(`Passed:               ${passed}`);
    console.log(`Failed:               ${failed}`);

    if (failed > 0) {
      console.error('\nFAILED PROBES:');
      probeResults.filter((r) => !r.passed).forEach((r) => {
        console.error(`  - [${r.section}] ${r.testName}: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('\nALL 20 ADVERSARIAL INTEGRATION PROBES PASSED WITH 100% SUCCESS!');
    }
  } finally {
    // Restore global fetch and close server
    globalThis.fetch = nativeFetch;
    clearAuthToken();
    server.close();
  }
}

main().catch((err) => {
  console.error('Fatal probe runner error:', err);
  process.exit(1);
});
