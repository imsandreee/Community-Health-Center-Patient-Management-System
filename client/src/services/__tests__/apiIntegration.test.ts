import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  authApi,
  patientsApi,
  appointmentsApi,
  queueApi,
  vitalsApi,
  consultationsApi,
  prescriptionsApi,
  labRequestsApi,
  billingApi,
  servicesApi,
  communityApi,
  reportsApi,
  notificationsApi,
  usersApi,
  auditLogsApi,
} from '../api';

test('1. ApiError parses and exposes RFC 7807 Problem Details fields', () => {
  const err = new ApiError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    'Bad Request',
    'The submitted payload failed schema validation rules.',
    { scheduledDate: ['Date must be YYYY-MM-DD format'] },
    'https://api.sanroque-chc.gov.ph/errors/validation-failed'
  );

  assert.equal(err.status, 400);
  assert.equal(err.code, 'VALIDATION_ERROR');
  assert.equal(err.title, 'Bad Request');
  assert.equal(err.detail, 'The submitted payload failed schema validation rules.');
  assert.equal(err.message, 'The submitted payload failed schema validation rules.');
  assert.deepEqual(err.errors, { scheduledDate: ['Date must be YYYY-MM-DD format'] });
  assert.equal(err.type, 'https://api.sanroque-chc.gov.ph/errors/validation-failed');
});

test('2. Token management and RA 10173 session cleanup', () => {
  // Test clean storage & retrieval
  setAuthToken('test-jwt-token-12345');
  assert.equal(getAuthToken(), 'test-jwt-token-12345');

  // Test session purge
  clearAuthToken();
  assert.equal(getAuthToken(), null);
});

test('3. All 15 API domain service modules are defined and properly typed', () => {
  const domains = [
    authApi,
    patientsApi,
    appointmentsApi,
    queueApi,
    vitalsApi,
    consultationsApi,
    prescriptionsApi,
    labRequestsApi,
    billingApi,
    servicesApi,
    communityApi,
    reportsApi,
    notificationsApi,
    usersApi,
    auditLogsApi,
  ];

  assert.equal(domains.length, 15);
  domains.forEach((domain, idx) => {
    assert.ok(domain, `Domain service at index ${idx} must be defined`);
    assert.equal(typeof domain, 'object');
  });
});

test('4. Route alignment & method contracts via simulated fetch', async () => {
  const originalFetch = globalThis.fetch;
  const capturedRequests: { url: string; method: string; body?: unknown; headers?: Record<string, string> }[] = [];

  try {
    // Intercept fetch
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      const headers = (init?.headers || {}) as Record<string, string>;

      capturedRequests.push({ url: urlStr, method, body, headers });

      // Return synthetic responses matching backend contract
      if (urlStr.includes('/appointments/apt-101/check-in')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              appointment: {
                id: 'apt-101',
                appointmentCode: 'APT-2026-0801',
                patientId: 'p-1',
                scheduledDate: '2026-11-02',
                timeSlot: '09:00 AM',
                status: 'Confirmed',
              },
              queueEntry: {
                id: 'q-201',
                queueNumber: 'Q-010',
                patientId: 'p-1',
                priority: 'Regular',
                status: 'Waiting',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/patients/CHC-2026-0101') && method === 'PUT') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'p-1',
              patientCode: 'CHC-2026-0101',
              fullName: 'Maria Clara Santos Updated',
              status: 'Active',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/services/svc-01/status') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'svc-01',
              serviceCode: 'SVC-01',
              name: 'General Consultation',
              status: body.status,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/users/USR-02/status') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'u-2',
              userCode: 'USR-02',
              fullName: 'Elena Villanueva',
              status: body.status,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/community/activities') && method === 'GET') {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'act-1',
                activityCode: 'ACT-2026-01',
                title: 'Community Immunization Outreach',
                activityDate: '2026-11-10',
                coordinatorName: 'Nurse Joy Bautista, RN',
                status: 'Scheduled',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/community/activities') && method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'act-2',
              activityCode: 'ACT-2026-02',
              title: body.title,
              activityDate: body.activityDate,
              coordinatorName: 'Carlos Dizon',
              status: 'Scheduled',
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/consultations/con-1/amendments') && method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'con-1',
              consultationCode: 'CON-2026-001',
              diagnosis: body.newDiagnosis,
              treatmentPlan: body.newTreatmentPlan,
              amendments: [
                {
                  amendedAt: '2026-11-02 10:30',
                  amendedByName: 'Dr. Rafael Mendoza, MD',
                  reason: body.reason,
                  newDiagnosis: body.newDiagnosis,
                  newTreatmentPlan: body.newTreatmentPlan,
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/auth/password-recovery')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'If the provided identifier matches an account, instructions have been dispatched.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // 4.1 Appointment Check-In: calls /check-in and unpacks both appointment and queueEntry
    const checkInResult = await appointmentsApi.checkIn('apt-101');
    assert.equal(checkInResult.appointment.id, 'APT-2026-0801');
    assert.equal(checkInResult.appointment.status, 'Confirmed');
    assert.equal(checkInResult.queueEntry.queueNumber, 'Q-010');
    assert.ok(capturedRequests.some((r) => r.url.endsWith('/appointments/apt-101/check-in') && r.method === 'POST'));

    // 4.2 Patient Update: calls PUT /patients/:id
    const updatedPatient = await patientsApi.update('CHC-2026-0101', { fullName: 'Maria Clara Santos Updated' });
    assert.equal(updatedPatient.fullName, 'Maria Clara Santos Updated');
    assert.ok(capturedRequests.some((r) => r.url.endsWith('/patients/CHC-2026-0101') && r.method === 'PUT'));

    // 4.3 Service Status: calls PATCH /services/:id/status with { status }
    const updatedSvc = await servicesApi.updateStatus('svc-01', 'Inactive');
    assert.equal(updatedSvc.status, 'Inactive');
    assert.ok(
      capturedRequests.some(
        (r) => r.url.endsWith('/services/svc-01/status') && r.method === 'PATCH' && (r.body as any).status === 'Inactive'
      )
    );

    // 4.4 User Status: calls PATCH /users/:id/status with { status }
    const updatedUser = await usersApi.updateStatus('USR-02', 'Inactive');
    assert.equal(updatedUser.status, 'Inactive');
    assert.ok(
      capturedRequests.some(
        (r) => r.url.endsWith('/users/USR-02/status') && r.method === 'PATCH' && (r.body as any).status === 'Inactive'
      )
    );

    // 4.5 Community Activities: calls /community/activities on GET and POST
    const activities = await communityApi.list();
    assert.equal(activities.length, 1);
    assert.equal(activities[0].title, 'Community Immunization Outreach');
    assert.equal(activities[0].date, '2026-11-10');
    assert.equal(activities[0].coordinator, 'Nurse Joy Bautista, RN');
    assert.ok(capturedRequests.some((r) => r.url.endsWith('/community/activities') && r.method === 'GET'));

    await communityApi.create({
      title: 'Maternal Nutrition Screening',
      category: 'Nutrition & Screening',
      barangay: 'San Roque',
      date: '2026-11-15',
      coordinator: 'Carlos Dizon',
      participantsCount: 25,
      targetCount: 50,
      status: 'Scheduled',
      summaryNotes: 'Screening drive for pregnant mothers.',
    });
    assert.ok(
      capturedRequests.some(
        (r) =>
          r.url.endsWith('/community/activities') &&
          r.method === 'POST' &&
          (r.body as any).activityDate === '2026-11-15'
      )
    );

    // 4.6 Consultation Amendment: transmits newDiagnosis, newTreatmentPlan, reason
    const amended = await consultationsApi.amend('con-1', {
      reason: 'Additional laboratory results confirmed Hypertension Stage 2',
      newDiagnosis: 'Essential Hypertension Stage 2',
      newTreatmentPlan: 'Amlodipine 10mg OD + Losartan 50mg OD',
    });
    assert.equal(amended.diagnosis, 'Essential Hypertension Stage 2');
    assert.ok(
      capturedRequests.some(
        (r) =>
          r.url.endsWith('/consultations/con-1/amendments') &&
          r.method === 'POST' &&
          (r.body as any).newDiagnosis === 'Essential Hypertension Stage 2' &&
          (r.body as any).newTreatmentPlan === 'Amlodipine 10mg OD + Losartan 50mg OD'
      )
    );

    // 4.7 Envelope unwrapping safely handles response with message and no data
    await authApi.passwordRecovery('maria.santos@patient.chc.ph');
    assert.ok(capturedRequests.some((r) => r.url.endsWith('/auth/password-recovery') && r.method === 'POST'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

