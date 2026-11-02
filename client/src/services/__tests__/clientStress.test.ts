import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  patientsApi,
  appointmentsApi,
  queueApi,
  servicesApi,
} from '../api';

test('5. RFC 7807 Problem Details parsing under malformed, non-JSON, and edge payloads', async () => {
  const originalFetch = globalThis.fetch;

  try {
    // 5.1 Test server returning 502 Bad Gateway HTML
    globalThis.fetch = async (): Promise<Response> => {
      return new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
    };

    await assert.rejects(
      async () => {
        await patientsApi.list();
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 502);
        assert.match(err.message, /Server returned non-JSON response \(502\)/);
        return true;
      }
    );

    // 5.2 Test server returning RFC 7807 with rich validation field errors
    globalThis.fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          type: 'https://api.sanroque-chc.gov.ph/errors/validation-failed',
          title: 'Validation Failed (400)',
          status: 400,
          detail: 'The submitted request payload failed schema validation rules.',
          instance: '/api/v1/patients',
          code: 'VALIDATION_ERROR',
          errors: {
            fullName: ['String must contain at least 2 character(s)'],
            dateOfBirth: ['Invalid date format. Expected YYYY-MM-DD'],
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    };

    await assert.rejects(
      async () => {
        await patientsApi.create({
          fullName: 'A',
          dateOfBirth: 'invalid',
          sex: 'Male',
          civilStatus: 'Single',
          contactNumber: '123',
          address: 'St',
          barangay: 'Brgy',
          emergencyContactName: 'EC',
          emergencyContactNumber: '123',
          registrationDate: '2026-11-02',
          status: 'Active',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.code, 'VALIDATION_ERROR');
        assert.equal(err.title, 'Validation Failed (400)');
        assert.equal(err.detail, 'The submitted request payload failed schema validation rules.');
        assert.ok(err.errors?.fullName);
        assert.ok(err.errors?.dateOfBirth);
        return true;
      }
    );

    // 5.3 Test server returning minimalist/legacy error { error: 'Conflict' }
    globalThis.fetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ error: 'Conflict occurred' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await assert.rejects(
      async () => {
        await appointmentsApi.create({
          patientId: 'p-1',
          serviceId: 's-1',
          scheduledDate: '2026-11-02',
          timeSlot: '09:00 AM',
          assignedPersonnel: 'Dr. Mendoza',
          reason: 'Test conflict',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.message, 'Conflict occurred');
        return true;
      }
    );

    // 5.4 Test server returning completely empty JSON body {} on 500 error
    globalThis.fetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({}), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await assert.rejects(
      async () => {
        await queueApi.list();
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 500);
        assert.match(err.message, /Request failed \(500\)/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('6. Network error simulation (offline, abort, DNS failure) does not crash client service layer', async () => {
  const originalFetch = globalThis.fetch;

  try {
    // 6.1 Simulate network disconnected (fetch throws TypeError)
    globalThis.fetch = async (): Promise<Response> => {
      throw new TypeError('Failed to fetch');
    };

    await assert.rejects(
      async () => {
        await servicesApi.list();
      },
      (err: unknown) => {
        assert.ok(err instanceof TypeError);
        assert.equal((err as Error).message, 'Failed to fetch');
        return true;
      }
    );

    // 6.2 Simulate request timeout / abort (DOMException)
    globalThis.fetch = async (): Promise<Response> => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    };

    await assert.rejects(
      async () => {
        await appointmentsApi.list();
      },
      (err: unknown) => {
        assert.equal((err as Error).name, 'AbortError');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('7. Toast alert formatting resilience against varied ApiError error payloads', () => {
  // Mirror the handleMutationError logic from App.tsx
  function formatErrorMessage(err: unknown, fallbackTitle: string): { title: string; message: string } {
    if (err instanceof ApiError) {
      const errorDetails = err.errors
        ? Object.entries(err.errors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}`)
            .join(' | ')
        : '';
      const detailMsg = err.detail || err.message;
      const fullMessage = errorDetails ? `${detailMsg} (${errorDetails})` : detailMsg;
      return { title: err.title || fallbackTitle, message: fullMessage };
    } else if (err instanceof Error) {
      return { title: fallbackTitle, message: err.message };
    } else {
      return { title: fallbackTitle, message: 'An unexpected error occurred during operation.' };
    }
  }

  // Case A: Full RFC 7807 with field errors
  const errA = new ApiError(
    'Payload failed validation',
    400,
    'VALIDATION_ERROR',
    'Bad Request',
    'Payload failed validation',
    { email: ['Invalid email format'], password: ['Too short'] }
  );
  const toastA = formatErrorMessage(errA, 'Fallback Title');
  assert.equal(toastA.title, 'Bad Request');
  assert.equal(toastA.message, 'Payload failed validation (email: Invalid email format | password: Too short)');

  // Case B: ApiError without title or errors
  const errB = new ApiError('Not Found', 404);
  const toastB = formatErrorMessage(errB, 'Fallback Not Found');
  assert.equal(toastB.title, 'Fallback Not Found');
  assert.equal(toastB.message, 'Not Found');

  // Case C: Standard native Error (e.g. TypeError from fetch offline)
  const errC = new TypeError('Failed to fetch');
  const toastC = formatErrorMessage(errC, 'Connection Error');
  assert.equal(toastC.title, 'Connection Error');
  assert.equal(toastC.message, 'Failed to fetch');

  // Case D: Arbitrary throw (non-Error primitive)
  const toastD = formatErrorMessage('something broke', 'Operation Failed');
  assert.equal(toastD.title, 'Operation Failed');
  assert.equal(toastD.message, 'An unexpected error occurred during operation.');
});

test('8. Rapid sequential mutations on client services execute deterministically', async () => {
  const originalFetch = globalThis.fetch;
  const callLog: string[] = [];

  try {
    let callCount = 0;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      callCount++;
      const currentCall = callCount;
      const body = init?.body ? JSON.parse(init.body as string) : {};
      callLog.push(`Call ${currentCall}: ${init?.method} ${input.toString()} status=${body.status}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'apt-seq',
            appointmentCode: 'APT-SEQ',
            status: body.status || 'Confirmed',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    // Sequential transitions: Confirmed -> In Consultation -> Completed
    await appointmentsApi.updateStatus('apt-seq', 'Confirmed');
    await appointmentsApi.updateStatus('apt-seq', 'In Consultation' as any);
    await appointmentsApi.updateStatus('apt-seq', 'Completed');

    assert.equal(callLog.length, 3);
    assert.match(callLog[0], /status=Confirmed/);
    assert.match(callLog[1], /status=In Consultation/);
    assert.match(callLog[2], /status=Completed/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
