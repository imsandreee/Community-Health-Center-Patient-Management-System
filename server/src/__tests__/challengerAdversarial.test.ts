import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { mockRepository } from '../db/index.js';
import { signToken } from '../middleware/auth.js';
import { config } from '../config/index.js';

describe('Challenger Empirical Adversarial & Security Test Suite (Phases 3 & 4)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    mockRepository.reset();
    app = createApp();
  });

  // ==========================================================================
  // 1. ADVERSARIAL AUTHENTICATION & JWT INTEGRITY (Missing, Expired, Malformed, Tampered)
  // ==========================================================================
  describe('Adversarial Authentication & Token Integrity Standards', () => {
    it('1.1 Rejects request with missing Authorization header with 401 RFC 7807', async () => {
      const res = await request(app).get('/api/v1/patients');
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
      assert.equal(res.body.status, 401);
      assert.equal(res.body.title, 'Unauthorized');
      assert.ok(res.body.type);
      assert.ok(res.body.instance);
      assert.ok(res.body.timestamp);
      assert.match(res.body.detail, /Missing or malformed Authorization header/i);
    });

    it('1.2 Rejects non-Bearer schemes (e.g. Basic, Token, Raw) with 401 RFC 7807', async () => {
      const badSchemes = [
        'Basic dXNlcjpwYXNz',
        'Token abcdef123456',
        'Bearer',
        'bearer',
      ];

      for (const authHeader of badSchemes) {
        const res = await request(app)
          .get('/api/v1/patients')
          .set('Authorization', authHeader);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
        assert.equal(res.body.status, 401);
      }
    });

    it('1.3 Rejects malformed and garbage JWT tokens with 401 RFC 7807', async () => {
      const malformedTokens = [
        'Bearer not.a.valid.jwt',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corrupt.signature',
        'Bearer 1234567890',
      ];

      for (const token of malformedTokens) {
        const res = await request(app)
          .get('/api/v1/patients')
          .set('Authorization', token);

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
        assert.match(res.body.detail, /JWT verification failed/i);
      }
    });

    it('1.4 Rejects expired JWT token with 401 RFC 7807', async () => {
      // Craft an expired JWT token
      const expiredToken = jwt.sign(
        {
          sub: 'b101a111-0004-4000-8000-000000000004',
          userCode: 'USR-04',
          fullName: 'Dr. Rafael Mendoza, MD',
          email: 'r.mendoza@sanroque-chc.gov.ph',
          role: 'doctor',
          department: 'Primary Care',
        },
        config.jwtSecret,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${expiredToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
      assert.match(res.body.detail, /jwt expired/i);
    });

    it('1.5 Rejects token signed with forged secret key with 401 RFC 7807', async () => {
      const forgedToken = jwt.sign(
        {
          sub: 'b101a111-0005-4000-8000-000000000005',
          userCode: 'USR-05',
          fullName: 'Carlos Dizon',
          email: 'admin@sanroque-chc.gov.ph',
          role: 'admin',
          department: 'Health Information Systems',
        },
        'malicious_unauthorized_forged_secret_key_12345',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${forgedToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
      assert.match(res.body.detail, /invalid signature/i);
    });

    it('1.6 Rejects tampered payload with modified role privilege elevation', async () => {
      // Sign legitimate patient token
      const legitToken = signToken({
        id: 'b101a111-0001-4000-8000-000000000001',
        userCode: 'USR-01',
        fullName: 'Maria Clara Santos',
        email: 'maria.santos@patient.chc.ph',
        role: 'patient',
        department: 'Patient Portal',
      });

      // Split and tamper middle payload to claim 'admin' role
      const parts = legitToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      payload.role = 'admin';
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tamperedToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
      assert.match(res.body.detail, /invalid signature/i);
    });
  });

  // ==========================================================================
  // 2. STATUTORY CLINICAL PRIVACY & SECTION 5 RBAC BARRIERS (RA 10173)
  // ==========================================================================
  describe('Section 5 RBAC & RA 10173 Clinical Privacy Barriers', () => {
    const adminToken = signToken({
      id: 'usr-admin-1',
      userCode: 'USR-05',
      fullName: 'Carlos Dizon',
      email: 'admin@sanroque-chc.gov.ph',
      role: 'admin',
      department: 'Health Information Systems',
    });

    const staffToken = signToken({
      id: 'usr-staff-1',
      userCode: 'USR-02',
      fullName: 'Elena Villanueva',
      email: 'e.villanueva@sanroque-chc.gov.ph',
      role: 'staff',
      department: 'Front Desk & Records',
    });

    it('2.1 Administrator is strictly blocked (403) from GET /api/v1/vitals', async () => {
      const res = await request(app)
        .get('/api/v1/vitals')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(res.body.detail, /Republic Act No\. 10173/);
    });

    it('2.2 Administrator is strictly blocked (403) from POST /api/v1/vitals', async () => {
      const res = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 120,
          diastolic: 80,
          temperatureC: 36.6,
          heartRateBpm: 75,
          respiratoryRate: 18,
          weightKg: 65,
          heightCm: 165,
          nursingNotes: 'Routine triage notes',
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    it('2.3 Administrator is strictly blocked (403) from GET and POST /api/v1/consultations', async () => {
      const resGet = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(resGet.status, 403);
      assert.equal(resGet.body.code, 'RA10173_PRIVACY_RESTRICTION');

      const resPost = await request(app)
        .post('/api/v1/consultations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          chiefComplaint: 'Headache',
          medicalHistory: 'None',
          clinicalFindings: 'Normal',
          diagnosis: 'Tension Headache',
          icdCode: 'G44.2',
          treatmentPlan: 'Rest',
          prescriptionDetails: 'Paracetamol 500mg',
        });
      assert.equal(resPost.status, 403);
      assert.equal(resPost.body.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    it('2.4 Staff is strictly blocked (403) from GET and POST /api/v1/consultations', async () => {
      const resGet = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(resGet.status, 403);
      assert.equal(resGet.body.code, 'RA10173_PRIVACY_RESTRICTION');

      const resPost = await request(app)
        .post('/api/v1/consultations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          chiefComplaint: 'Cough',
          medicalHistory: 'None',
          clinicalFindings: 'Normal',
          diagnosis: 'URI',
          icdCode: 'J06.9',
          treatmentPlan: 'Hydration',
          prescriptionDetails: 'None',
        });
      assert.equal(resPost.status, 403);
      assert.equal(resPost.body.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    it('2.5 Staff is blocked (403) from accessing vitals (GET and POST /api/v1/vitals) per RA 10173', async () => {
      const resGet = await request(app)
        .get('/api/v1/vitals')
        .set('Authorization', `Bearer ${staffToken}`);
      assert.equal(resGet.status, 403);
      assert.equal(resGet.body.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(resGet.body.detail, /Republic Act No\. 10173/);

      const resPost = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 120,
          diastolic: 80,
          temperatureC: 36.6,
          heartRateBpm: 72,
          respiratoryRate: 18,
          weightKg: 60,
          heightCm: 160,
          nursingNotes: 'Unauthorized staff attempt to log vitals',
        });

      assert.equal(resPost.status, 403);
      assert.equal(resPost.body.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(resPost.body.detail, /Republic Act No\. 10173/);
    });

    it('2.6 Patient is blocked (403) from viewing another patient’s clinical records', async () => {
      const patient1Token = signToken({
        id: 'usr-p1',
        userCode: 'USR-01',
        fullName: 'Maria Clara Santos',
        email: 'maria.santos@patient.chc.ph',
        role: 'patient',
        department: 'Patient Portal',
        patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', // Maria Clara Santos
      });

      // Target vitals record belongs to Roberto Dela Cruz (patient e3b0c442-98fc-1c14-9afb-4c8996fb9242)
      const resVitals = await request(app)
        .get('/api/v1/vitals/e101a111-0002-4000-8000-000000000002')
        .set('Authorization', `Bearer ${patient1Token}`);

      assert.equal(resVitals.status, 403);
      assert.match(resVitals.body.detail, /only authorized to view your own clinical vital signs/i);
    });
  });

  // ==========================================================================
  // 3. APPOINTMENT SCHEDULING CONFLICTS & CAPACITY BOUNDARIES (FR-015)
  // ==========================================================================
  describe('Appointment Scheduling Conflict & Slot Capacity Boundaries (FR-015)', () => {
    const staffToken = signToken({
      id: 'usr-staff-1',
      userCode: 'USR-02',
      fullName: 'Elena Villanueva',
      email: 'e.villanueva@sanroque-chc.gov.ph',
      role: 'staff',
      department: 'Front Desk',
    });

    const serviceId = '7c9e6679-7425-40de-944b-e07fc1f90ae1'; // General Medical Consultation
    const patientA = 'e3b0c442-98fc-1c14-9afb-4c8996fb9241';
    const patientB = 'e3b0c442-98fc-1c14-9afb-4c8996fb9242';
    const patientC = 'e3b0c442-98fc-1c14-9afb-4c8996fb9243';

    it('3.1 Rejects patient double-booking for same slot across any service', async () => {
      // Patient A already has an active appointment on 2026-11-02 at 08:00 AM (seeded)
      const resSameService = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patientA,
          serviceId: serviceId,
          scheduledDate: '2026-11-02',
          timeSlot: '08:00 AM',
          reason: 'Duplicate slot test',
        });

      assert.equal(resSameService.status, 409);
      assert.equal(resSameService.body.code, 'SLOT_CONFLICT');
      assert.match(resSameService.body.detail, /already has an active appointment/i);

      // Even for a different service on the same date/time
      const otherServiceId = '7c9e6679-7425-40de-944b-e07fc1f90ae4'; // Dental Care
      const resDiffService = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patientA,
          serviceId: otherServiceId,
          scheduledDate: '2026-11-02',
          timeSlot: '08:00 AM',
          reason: 'Double booking different service test',
        });

      assert.equal(resDiffService.status, 409);
      assert.equal(resDiffService.body.code, 'SLOT_CONFLICT');
    });

    it('3.2 Enforces slot capacity limit (>= 2 active bookings for the same service and slot)', async () => {
      const testDate = '2026-11-20';
      const testSlot = '10:00 AM';

      // 1. First booking for Patient A -> should succeed (count = 1)
      const res1 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patientA,
          serviceId: serviceId,
          scheduledDate: testDate,
          timeSlot: testSlot,
          reason: 'Capacity booking 1',
        });
      assert.equal(res1.status, 201);

      // 2. Second booking for Patient B -> should succeed (count = 2)
      const res2 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patientB,
          serviceId: serviceId,
          scheduledDate: testDate,
          timeSlot: testSlot,
          reason: 'Capacity booking 2',
        });
      assert.equal(res2.status, 201);

      // 3. Third booking for Patient C -> MUST be rejected (count would exceed 2)
      const res3 = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patientC,
          serviceId: serviceId,
          scheduledDate: testDate,
          timeSlot: testSlot,
          reason: 'Capacity booking 3 - should fail',
        });
      assert.equal(res3.status, 409);
      assert.equal(res3.body.code, 'SLOT_CONFLICT');
      assert.match(res3.body.detail, /reached maximum booking capacity/i);

      // 4. Verify check-conflict endpoint also returns hasConflict: true
      const resCheck = await request(app)
        .post('/api/v1/appointments/check-conflict')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: patientC,
          serviceId: serviceId,
          scheduledDate: testDate,
          timeSlot: testSlot,
        });
      assert.equal(resCheck.status, 200);
      assert.equal(resCheck.body.data.hasConflict, true);
      assert.match(resCheck.body.data.reason, /maximum booking capacity/i);
    });
  });

  // ==========================================================================
  // 4. PATIENT REGISTRATION & NORMALIZED DUPLICATE DETECTION (FR-010)
  // ==========================================================================
  describe('Patient Duplicate Detection & Normalization Engine (FR-010)', () => {
    const staffToken = signToken({
      id: 'usr-staff-1',
      userCode: 'USR-02',
      fullName: 'Elena Villanueva',
      email: 'e.villanueva@sanroque-chc.gov.ph',
      role: 'staff',
      department: 'Front Desk',
    });

    it('4.1 Detects exact name and birthdate collision with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Maria Clara Santos',
          dateOfBirth: '1988-04-12',
          sex: 'Female',
          civilStatus: 'Married',
          contactNumber: '0917-555-0999',
          address: 'Barangay San Roque',
          barangay: 'San Roque',
          emergencyContactName: 'Antonio Santos',
          emergencyContactNumber: '0917-555-0199',
          allowDuplicateOverride: false,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PATIENT_DUPLICATE_CANDIDATE');
      assert.match(res.body.detail, /exact match on full name and birth date/i);
    });

    it('4.2 Detects normalized name collision (case variation and irregular whitespace)', async () => {
      // "  mArIa    cLArA   SaNtOs  " with DOB 1988-04-12
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: '   mArIa    cLArA   SaNtOs   ',
          dateOfBirth: '1988-04-12',
          sex: 'Female',
          civilStatus: 'Married',
          contactNumber: '0917-555-0999',
          address: 'Barangay San Roque',
          barangay: 'San Roque',
          emergencyContactName: 'Antonio Santos',
          emergencyContactNumber: '0917-555-0199',
          allowDuplicateOverride: false,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PATIENT_DUPLICATE_CANDIDATE');
      assert.match(res.body.detail, /exact match on full name and birth date/i);
    });

    it('4.3 Flags candidate when full name matches regardless of DOB', async () => {
      // Same full name but different DOB
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Maria Clara Santos',
          dateOfBirth: '1995-12-01',
          sex: 'Female',
          civilStatus: 'Single',
          contactNumber: '0917-555-0999',
          address: 'Barangay San Roque',
          barangay: 'San Roque',
          emergencyContactName: 'Antonio Santos',
          emergencyContactNumber: '0917-555-0199',
          allowDuplicateOverride: false,
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'PATIENT_DUPLICATE_CANDIDATE');
      assert.match(res.body.detail, /matching patient full name already registered/i);
    });

    it('4.4 Bypasses duplicate warning when allowDuplicateOverride: true is explicitly provided', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          fullName: 'Maria Clara Santos',
          dateOfBirth: '1995-12-01',
          sex: 'Female',
          civilStatus: 'Single',
          contactNumber: '0917-555-0999',
          address: 'Barangay San Roque',
          barangay: 'San Roque',
          emergencyContactName: 'Antonio Santos',
          emergencyContactNumber: '0917-555-0199',
          allowDuplicateOverride: true,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.match(res.body.data.patientCode, /^CHC-2026-/);
    });
  });

  // ==========================================================================
  // 5. CONSULTATION IMMUTABILITY & AUDITABLE AMENDMENT LOG (FR-028)
  // ==========================================================================
  describe('Consultation Immutability & Auditable Amendments Engine (FR-028)', () => {
    const docToken = signToken({
      id: 'b101a111-0004-4000-8000-000000000004',
      userCode: 'USR-04',
      fullName: 'Dr. Rafael Mendoza, MD',
      email: 'r.mendoza@sanroque-chc.gov.ph',
      role: 'doctor',
      department: 'Primary Care',
    });

    it('5.1 Preserves historical diagnoses and treatment plans across multiple amendments', async () => {
      const consultationId = 'f101a111-0001-4000-8000-000000000001';

      // 1. Fetch initial state
      const initialRes = await request(app)
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${docToken}`);

      assert.equal(initialRes.status, 200);
      const originalDiagnosis = initialRes.body.data.diagnosis;
      const originalTreatmentPlan = initialRes.body.data.treatmentPlan;
      const initialAmendmentsCount = (initialRes.body.data.amendments || []).length;
      assert.ok(originalDiagnosis);
      assert.ok(originalTreatmentPlan);

      // 2. Submit Amendment #1
      const amd1Reason = 'Laboratory results indicate secondary bacterial infection';
      const amd1NewDiagnosis = 'Bronchopneumonia, secondary to URI';
      const amd1NewTreatment = 'Amoxicillin-Clavulanic acid 625mg TID x 7 days; rest and hydration';

      const amd1Res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/amendments`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          reason: amd1Reason,
          newDiagnosis: amd1NewDiagnosis,
          newTreatmentPlan: amd1NewTreatment,
          newPrescription: 'Amoxicillin-Clavulanic acid 625mg TID #21',
        });

      assert.equal(amd1Res.status, 200);
      assert.equal(amd1Res.body.data.diagnosis, amd1NewDiagnosis);
      assert.equal(amd1Res.body.data.treatmentPlan, amd1NewTreatment);
      assert.equal(amd1Res.body.data.amendments.length, initialAmendmentsCount + 1);
      assert.equal(amd1Res.body.data.amendments[0].previousDiagnosis, originalDiagnosis);
      assert.equal(amd1Res.body.data.amendments[0].previousTreatmentPlan, originalTreatmentPlan);
      assert.equal(amd1Res.body.data.amendments[0].reason, amd1Reason);

      // 3. Submit Amendment #2 to verify chained chronological immutability
      const amd2Reason = 'Patient reports severe nausea; switched antibiotic';
      const amd2NewDiagnosis = 'Bronchopneumonia, resolving';
      const amd2NewTreatment = 'Azithromycin 500mg OD x 3 days with food';

      const amd2Res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/amendments`)
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          reason: amd2Reason,
          newDiagnosis: amd2NewDiagnosis,
          newTreatmentPlan: amd2NewTreatment,
          newPrescription: 'Azithromycin 500mg OD #3',
        });

      assert.equal(amd2Res.status, 200);
      assert.equal(amd2Res.body.data.diagnosis, amd2NewDiagnosis);
      assert.equal(amd2Res.body.data.treatmentPlan, amd2NewTreatment);
      assert.equal(amd2Res.body.data.amendments.length, initialAmendmentsCount + 2);

      // Verify the amendment stack:
      // Index 0 (latest amendment): previous was amd1NewDiagnosis
      assert.equal(amd2Res.body.data.amendments[0].previousDiagnosis, amd1NewDiagnosis);
      assert.equal(amd2Res.body.data.amendments[0].reason, amd2Reason);

      // Index 1 (first amendment): original preserved intact
      assert.equal(amd2Res.body.data.amendments[1].previousDiagnosis, originalDiagnosis);
      assert.equal(amd2Res.body.data.amendments[1].previousTreatmentPlan, originalTreatmentPlan);

      // 4. Verify audit trail in audit logs
      const adminToken = signToken({
        id: 'usr-admin-1',
        userCode: 'USR-05',
        fullName: 'Carlos Dizon',
        email: 'admin@sanroque-chc.gov.ph',
        role: 'admin',
        department: 'Health Information Systems',
      });

      const auditRes = await request(app)
        .get('/api/v1/audit-logs?module=Consultations')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(auditRes.status, 200);
      const auditEntries = auditRes.body.data.filter(
        (log: any) => log.module === 'Consultations' && log.actionType === 'Clinical Amendment'
      );
      assert.ok(auditEntries.length >= 2, 'Audit trail must contain entries for both clinical amendments');
    });
  });

  // ==========================================================================
  // 6. PHASE 3 & 4 ITERATION 2 REMEDIATION INTEGRITY & SECURITY SUITE
  // ==========================================================================
  describe('6. Phase 3 & 4 Iteration 2 Remediation Verification', () => {
    it('6.1 Authentic bcrypt login succeeds with Password123! and fails with wrong password', async () => {
      const resSuccess = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@sanroque-chc.gov.ph',
          password: 'Password123!',
        });
      assert.equal(resSuccess.status, 200);
      assert.equal(resSuccess.body.success, true);
      assert.ok(resSuccess.body.data.token);

      const resFail = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@sanroque-chc.gov.ph',
          password: 'IncorrectPassword999!',
        });
      assert.equal(resFail.status, 401);
      assert.equal(resFail.body.code, 'UNAUTHORIZED');
    });

    it('6.2 Developer mock tokens are rejected with 401 in production mode', async () => {
      const origEnv = config.nodeEnv;
      const origIsDev = config.isDev;

      try {
        config.nodeEnv = 'production';
        config.isDev = false;

        const res = await request(app)
          .get('/api/v1/patients')
          .set('Authorization', 'Bearer mock-token-admin');

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'UNAUTHORIZED');
        assert.match(res.body.detail, /disabled in production/i);
      } finally {
        config.nodeEnv = origEnv;
        config.isDev = origIsDev;
      }
    });

    it('6.3 Mutation audit logging captures user mutations, appointments, dispensing, billing, and lab results', async () => {
      const adminToken = signToken({
        id: 'usr-admin-1',
        userCode: 'USR-05',
        fullName: 'Carlos Dizon',
        email: 'admin@sanroque-chc.gov.ph',
        role: 'admin',
        department: 'Health Information Systems',
      });

      const nurseToken = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      const doctorToken = signToken({
        id: 'usr-doc-1',
        userCode: 'USR-04',
        fullName: 'Dr. Rafael Mendoza, MD',
        email: 'r.mendoza@sanroque-chc.gov.ph',
        role: 'doctor',
        department: 'Primary Care & Internal Medicine',
      });

      // 1. User Creation Mutation Audit
      const userRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Dr. Josefa Rizal, MD',
          email: 'j.rizal@sanroque-chc.gov.ph',
          role: 'doctor',
          department: 'Pediatrics',
          password: 'Password123!',
        });
      assert.equal(userRes.status, 201);

      // 2. User Status Mutation Audit
      const statusRes = await request(app)
        .patch(`/api/v1/users/${userRes.body.data.userCode}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Inactive' });
      assert.equal(statusRes.status, 200);

      // 3. Appointment Booking Mutation Audit
      const apptRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9245',
          serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae4',
          scheduledDate: '2026-11-20',
          timeSlot: '08:00 AM',
          reason: 'Blood pressure routine surveillance',
        });
      assert.equal(apptRes.status, 201);

      // 4. Pharmacy Dispensing Mutation Audit
      const dispenseRes = await request(app)
        .post('/api/v1/prescriptions/RX-2026-001/dispense')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ notes: 'Dispensed full 30-day supply' });
      assert.equal(dispenseRes.status, 200);

      // 5. Billing Settlement Mutation Audit
      const settleRes = await request(app)
        .post('/api/v1/billing/invoices/INV-2026-901/settle')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentStatus: 'Paid',
          officialReceiptNumber: 'OR-2026-88899',
        });
      assert.equal(settleRes.status, 200);

      // 6. Lab Result Recording Mutation Audit
      const labRes = await request(app)
        .post('/api/v1/lab-requests/LAB-2026-101/results')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          results: [
            {
              parameterName: 'Hemoglobin',
              resultValue: '13.5',
              unit: 'g/dL',
              referenceRange: '12.0 - 16.0',
              isAbnormal: false,
            },
          ],
          notes: 'Normal findings',
        });
      assert.equal(labRes.status, 200);

      // Verify audit logs table contains all these recorded actions
      const logsRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(logsRes.status, 200);
      const logs = logsRes.body.data;

      const userLog = logs.find((l: any) => l.module === 'Users' && l.targetEntityId === userRes.body.data.userCode);
      assert.ok(userLog, 'Must have audit log for user creation');

      const apptLog = logs.find((l: any) => l.module === 'Appointments' && l.targetEntityId === apptRes.body.data.appointmentCode);
      assert.ok(apptLog, 'Must have audit log for appointment creation');

      const rxLog = logs.find((l: any) => l.module === 'Prescriptions' && l.targetEntityId === 'RX-2026-001');
      assert.ok(rxLog, 'Must have audit log for prescription dispense');

      const billLog = logs.find((l: any) => l.module === 'Billing' && l.targetEntityId === 'INV-2026-901');
      assert.ok(billLog, 'Must have audit log for billing settlement');

      const labLog = logs.find((l: any) => l.module === 'Laboratory' && l.targetEntityId === 'LAB-2026-101');
      assert.ok(labLog, 'Must have audit log for lab result recording');
    });

    it('6.4 Hypertensive vitals automatically coerce followUpRequired to true per PhilPEN', async () => {
      const nurseToken = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      const res = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 150,
          diastolic: 95,
          temperatureC: 36.8,
          heartRateBpm: 82,
          respiratoryRate: 18,
          weightKg: 68,
          heightCm: 162,
          nursingNotes: 'Stage 2 hypertension flagged per PhilPEN',
          followUpRequired: false,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.followUpRequired, true, 'Backend MUST coerce followUpRequired to true for elevated BP');
    });
  });
});
