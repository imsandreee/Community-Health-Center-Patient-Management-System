import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { mockRepository } from '../db/index.js';
import { signToken } from '../middleware/auth.js';

describe('San Roque CHC REST API Integration Test Suite', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    mockRepository.reset();
    app = createApp();
  });

  // ==========================================================================
  // 1. HEALTH CHECK & RFC 7807 ERROR HANDLING
  // ==========================================================================
  describe('Health Check & RFC 7807 Global Error Standard', () => {
    it('GET /api/v1/health returns 200 OK with status UP', async () => {
      const res = await request(app).get('/api/v1/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'UP');
      assert.equal(res.body.version, '1.0.0');
      assert.ok(res.body.service);
    });

    it('GET /api/v1/nonexistent returns RFC 7807 Problem Details 404', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      assert.equal(res.status, 404);
      assert.ok(res.body.type);
      assert.equal(res.body.title, 'Resource Not Found');
      assert.equal(res.body.status, 404);
      assert.ok(res.body.timestamp);
    });
  });

  // ==========================================================================
  // 2. AUTHENTICATION & JWT SESSION MANAGEMENT
  // ==========================================================================
  describe('Authentication & JWT Session Management', () => {
    it('POST /api/v1/auth/login authenticates valid staff credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'e.villanueva@sanroque-chc.gov.ph',
          password: 'Password123!',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.role, 'staff');
      assert.equal(res.body.data.user.fullName, 'Elena Villanueva');
    });

    it('POST /api/v1/auth/login rejects invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'e.villanueva@sanroque-chc.gov.ph',
          password: 'WrongPassword!',
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('GET /api/v1/auth/me returns active session and resolved RBAC permissions', async () => {
      const token = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.role, 'nurse');
      assert.equal(res.body.data.permissions.vitals, 'manage');
      assert.equal(res.body.data.permissions.consultations, 'view');
    });
  });

  // ==========================================================================
  // 3. SECTION 5 RBAC SECURITY ENFORCEMENT & RA 10173 PRIVACY
  // ==========================================================================
  describe('Section 5 Role-Based Access Control (RBAC) & RA 10173 Clinical Privacy', () => {
    it('Administrator is REJECTED with 403 Forbidden when accessing /api/v1/vitals', async () => {
      const adminToken = signToken({
        id: 'usr-admin-1',
        userCode: 'USR-05',
        fullName: 'Carlos Dizon',
        email: 'admin@sanroque-chc.gov.ph',
        role: 'admin',
        department: 'Health Information Systems',
      });

      const res = await request(app)
        .get('/api/v1/vitals')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(res.body.detail, /Republic Act No\. 10173/);
    });

    it('Administrator is REJECTED with 403 Forbidden when accessing /api/v1/consultations', async () => {
      const adminToken = signToken({
        id: 'usr-admin-1',
        userCode: 'USR-05',
        fullName: 'Carlos Dizon',
        email: 'admin@sanroque-chc.gov.ph',
        role: 'admin',
        department: 'Health Information Systems',
      });

      const res = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    it('Front-Desk Staff is REJECTED with 403 Forbidden when accessing /api/v1/consultations', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk & Records',
      });

      const res = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'RA10173_PRIVACY_RESTRICTION');
    });

    it('Front-Desk Staff is REJECTED with 403 Forbidden when accessing /api/v1/vitals per RA 10173', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk & Records',
      });

      const res = await request(app)
        .get('/api/v1/vitals')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'RA10173_PRIVACY_RESTRICTION');
      assert.match(res.body.detail, /Republic Act No\. 10173/);
    });

    it('Medical Doctor CAN access /api/v1/consultations', async () => {
      const docToken = signToken({
        id: 'usr-doc-1',
        userCode: 'USR-04',
        fullName: 'Dr. Rafael Mendoza, MD',
        email: 'r.mendoza@sanroque-chc.gov.ph',
        role: 'doctor',
        department: 'Primary Care & Internal Medicine',
      });

      const res = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${docToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });

    it('Nurse CAN access /api/v1/vitals and /api/v1/consultations', async () => {
      const nurseToken = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      const resVitals = await request(app)
        .get('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`);
      assert.equal(resVitals.status, 200);

      const resConsultations = await request(app)
        .get('/api/v1/consultations')
        .set('Authorization', `Bearer ${nurseToken}`);
      assert.equal(resConsultations.status, 200);
    });
  });

  // ==========================================================================
  // 4. APPOINTMENT SCHEDULING & CONFLICT PREVENTION (FR-015)
  // ==========================================================================
  describe('Appointment Scheduling & Conflict Prevention (FR-015)', () => {
    it('Rejects patient double-booking for active slot with 409 Conflict', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

      // Patient Maria Clara Santos already has appointment on 2026-11-02 at 08:00 AM
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
          scheduledDate: '2026-11-02',
          timeSlot: '08:00 AM',
          reason: 'Secondary consultation request',
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.code, 'SLOT_CONFLICT');
      assert.match(res.body.detail, /already has an active appointment/i);
    });

    it('Allows scheduling when no conflict exists', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9246', // Daniela Soriano
          serviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
          scheduledDate: '2026-11-10',
          timeSlot: '01:00 PM',
          reason: 'Routine medical exam',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'Confirmed');
      assert.match(res.body.data.appointmentCode, /^APT-2026-/);
    });
  });

  // ==========================================================================
  // 5. PATIENT REGISTRATION & DUPLICATE DETECTION (FR-010)
  // ==========================================================================
  describe('Patient Registration & Duplicate Detection (FR-010)', () => {
    it('Blocks exact duplicate candidate with 409 Conflict', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

      // Existing: Maria Clara Santos, 1988-04-12
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
    });

    it('Allows registration when allowDuplicateOverride: true', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

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
          allowDuplicateOverride: true,
        });

      assert.equal(res.status, 201);
      assert.match(res.body.data.patientCode, /^CHC-2026-/);
    });
  });

  // ==========================================================================
  // 6. NURSING TRIAGE & AUTOMATIC BMI CALCULATION (FR-029 - FR-032)
  // ==========================================================================
  describe('Nursing Triage & Vital Signs BMI Engine (FR-029 - FR-032)', () => {
    it('Records vital signs and computes BMI classification accurately', async () => {
      const nurseToken = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      // Weight 70kg, Height 160cm -> BMI = 70 / (1.6 * 1.6) = 27.3 (Overweight)
      const res = await request(app)
        .post('/api/v1/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          systolic: 145,
          diastolic: 95,
          temperatureC: 37.1,
          heartRateBpm: 80,
          respiratoryRate: 18,
          weightKg: 70.0,
          heightCm: 160.0,
          nursingNotes: 'Elevated blood pressure on triage intake.',
          followUpRequired: true,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.bmi, 27.3);
      assert.equal(res.body.data.bmiCategory, 'Overweight');
      assert.equal(res.body.data.systolic, 145);
      assert.equal(res.body.data.diastolic, 95);
    });
  });

  // ==========================================================================
  // 7. CONSULTATION AMENDMENT AUDIT TRAIL (FR-028)
  // ==========================================================================
  describe('Physician Consultation & Auditable Amendments (FR-028)', () => {
    it('Applies auditable amendment preserving original consultation data', async () => {
      const docToken = signToken({
        id: 'usr-doc-1',
        userCode: 'USR-04',
        fullName: 'Dr. Rafael Mendoza, MD',
        email: 'r.mendoza@sanroque-chc.gov.ph',
        role: 'doctor',
        department: 'Primary Care & Internal Medicine',
      });

      const initialRes = await request(app)
        .get('/api/v1/consultations/f101a111-0001-4000-8000-000000000001')
        .set('Authorization', `Bearer ${docToken}`);

      assert.equal(initialRes.status, 200);
      const originalDiagnosis = initialRes.body.data.diagnosis;

      const amendRes = await request(app)
        .post('/api/v1/consultations/f101a111-0001-4000-8000-000000000001/amendments')
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          reason: 'Repeat lipid profile indicates dyslipidemia; adjusted therapy.',
          newDiagnosis: 'Essential (Primary) Hypertension with Secondary Dyslipidemia',
          newTreatmentPlan: 'Add Atorvastatin 20mg once daily; continue Losartan 50mg.',
          newPrescription: 'Atorvastatin 20mg tab OD HS x 30 days; Losartan 50mg tab OD AM x 30 days',
        });

      assert.equal(amendRes.status, 200);
      assert.equal(
        amendRes.body.data.diagnosis,
        'Essential (Primary) Hypertension with Secondary Dyslipidemia'
      );
      assert.ok(amendRes.body.data.amendments.length >= 2);
      assert.equal(
        amendRes.body.data.amendments[0].previousDiagnosis,
        originalDiagnosis
      );
    });
  });

  // ==========================================================================
  // 8. PRIORITY QUEUE SORTING (FR-019 & FR-020)
  // ==========================================================================
  describe('Priority Queue Dynamic Ordering (FR-019 & FR-020)', () => {
    it('Orders queue tickets by statutory priority tiers (Emergency > Pregnant > Senior > PWD > Regular)', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

      const res = await request(app)
        .get('/api/v1/queue')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 200);
      const queue = res.body.data;
      assert.ok(queue.length > 0);

      // Verify weights are monotonically non-decreasing
      for (let i = 1; i < queue.length; i++) {
        assert.ok(queue[i].priorityWeight >= queue[i - 1].priorityWeight);
      }
    });

    it('GET /api/v1/queue/live-board provides public feed without auth', async () => {
      const res = await request(app).get('/api/v1/queue/live-board');
      assert.equal(res.status, 200);
      assert.ok('nowInConsultation' in res.body.data);
      assert.ok('currentlyCalled' in res.body.data);
      assert.ok('nextPriority' in res.body.data);
    });
  });

  // ==========================================================================
  // 9. PUBLIC HEALTH SURVEILLANCE & CSV REPORT EXPORT (FR-036 - FR-044)
  // ==========================================================================
  describe('Community Surveillance & RFC 4180 CSV Export', () => {
    it('GET /api/v1/community/stats returns aggregated demographics and morbidity', async () => {
      const nurseToken = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      const res = await request(app)
        .get('/api/v1/community/stats')
        .set('Authorization', `Bearer ${nurseToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.totalActivePatients > 0);
      assert.ok(res.body.data.ageGroups);
      assert.ok(Array.isArray(res.body.data.topDiagnoses));
    });

    it('GET /api/v1/reports/export/csv streams RFC 4180 CSV export', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

      const res = await request(app)
        .get('/api/v1/reports/export/csv?category=patient_registry')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(res.status, 200);
      assert.match(res.headers['content-type'], /text\/csv/);
      assert.match(res.text, /Patient Code,Full Name/);
    });
  });

  // ==========================================================================
  // 10. PHARMACY PRESCRIPTIONS & DISPENSING
  // ==========================================================================
  describe('Pharmacy Prescriptions & Dispensing', () => {
    it('Nurse can record medication dispensing for active prescription', async () => {
      const nurseToken = signToken({
        id: 'usr-nurse-1',
        userCode: 'USR-03',
        fullName: 'Nurse Joy Bautista, RN',
        email: 'j.bautista@sanroque-chc.gov.ph',
        role: 'nurse',
        department: 'Triage & Community Nursing',
      });

      const res = await request(app)
        .post('/api/v1/prescriptions/a201a111-0001-4000-8000-000000000001/dispense')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ notes: 'Dispensed 30 tablets Losartan' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'Dispensed');
      assert.ok(res.body.data.dispensedAt);
    });
  });

  // ==========================================================================
  // 11. LABORATORY DIAGNOSTIC ORDERS & RESULTS
  // ==========================================================================
  describe('Laboratory Diagnostics Workflow', () => {
    it('Doctor orders diagnostic lab test and nurse/doctor completes results', async () => {
      const docToken = signToken({
        id: 'usr-doc-1',
        userCode: 'USR-04',
        fullName: 'Dr. Rafael Mendoza, MD',
        email: 'r.mendoza@sanroque-chc.gov.ph',
        role: 'doctor',
        department: 'Primary Care',
      });

      // 1. Order test
      const orderRes = await request(app)
        .post('/api/v1/lab-requests')
        .set('Authorization', `Bearer ${docToken}`)
        .send({
          patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
          testName: 'Complete Blood Count (CBC)',
          testCategory: 'Hematology',
          priority: 'Routine',
        });

      assert.equal(orderRes.status, 201);
      assert.equal(orderRes.body.data.status, 'Requested');
      const labId = orderRes.body.data.id;

      // 2. Submit results
      const resultRes = await request(app)
        .post(`/api/v1/lab-requests/${labId}/results`)
        .set('Authorization', `Bearer ${docToken}`)
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
          notes: 'Normal indices.',
        });

      assert.equal(resultRes.status, 200);
      assert.equal(resultRes.body.data.status, 'Completed');
      assert.equal(resultRes.body.data.results.length, 1);
    });
  });

  // ==========================================================================
  // 12. BILLING INVOICES & SUBSIDY CLEARANCE
  // ==========================================================================
  describe('Billing Invoices & Subsidies', () => {
    it('Staff queries invoices and records settlement', async () => {
      const staffToken = signToken({
        id: 'usr-staff-1',
        userCode: 'USR-02',
        fullName: 'Elena Villanueva',
        email: 'e.villanueva@sanroque-chc.gov.ph',
        role: 'staff',
        department: 'Front Desk',
      });

      const listRes = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${staffToken}`);

      assert.equal(listRes.status, 200);
      assert.ok(Array.isArray(listRes.body.data));

      const settleRes = await request(app)
        .post('/api/v1/billing/invoices/a601a111-0001-4000-8000-000000000001/settle')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          paymentStatus: 'Paid',
          officialReceiptNumber: 'OR-2026-9011',
        });

      assert.equal(settleRes.status, 200);
      assert.equal(settleRes.body.data.paymentStatus, 'Paid');
      assert.equal(settleRes.body.data.officialReceiptNumber, 'OR-2026-9011');
    });
  });

  // ==========================================================================
  // 13. HEALTHCARE SERVICES DIRECTORY
  // ==========================================================================
  describe('Healthcare Services Management', () => {
    it('Public users can list services and admin can update status', async () => {
      const listRes = await request(app).get('/api/v1/services');
      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.data.length >= 7);

      const adminToken = signToken({
        id: 'usr-admin-1',
        userCode: 'USR-05',
        fullName: 'Carlos Dizon',
        email: 'admin@sanroque-chc.gov.ph',
        role: 'admin',
        department: 'Health Information Systems',
      });

      const patchRes = await request(app)
        .patch('/api/v1/services/7c9e6679-7425-40de-944b-e07fc1f90ae1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Inactive' });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.data.status, 'Inactive');
    });
  });

  // ==========================================================================
  // 14. NOTIFICATIONS & ALERTS
  // ==========================================================================
  describe('Notifications & System Announcements', () => {
    it('Patient views notifications and marks notification as read', async () => {
      const patientToken = signToken({
        id: 'usr-pat-1',
        userCode: 'USR-01',
        fullName: 'Maria Clara Santos',
        email: 'maria.santos@patient.chc.ph',
        role: 'patient',
        department: 'Patient Portal',
        patientId: 'e3b0c442-98fc-1c14-9afb-4c8996fb9241',
      });

      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.data.length > 0);

      const notifId = listRes.body.data[0].id;
      const readRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${patientToken}`);

      assert.equal(readRes.status, 200);
      assert.equal(readRes.body.data.isRead, true);
    });
  });

  // ==========================================================================
  // 15. USER ADMINISTRATION & AUDIT LOGS
  // ==========================================================================
  describe('User Administration & Security Audit Trail', () => {
    it('Admin can list user accounts and inspect immutable audit logs', async () => {
      const adminToken = signToken({
        id: 'usr-admin-1',
        userCode: 'USR-05',
        fullName: 'Carlos Dizon',
        email: 'admin@sanroque-chc.gov.ph',
        role: 'admin',
        department: 'Health Information Systems',
      });

      const usersRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(usersRes.status, 200);
      assert.ok(usersRes.body.data.length >= 6);

      const auditRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(auditRes.status, 200);
      assert.ok(auditRes.body.data.length > 0);
      assert.ok(auditRes.body.data[0].logCode);
    });
  });
});
