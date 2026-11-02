import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBMI,
  calculateAge,
  generatePatientId,
  detectDuplicatePatient,
  checkAppointmentConflict,
  generateQueueNumber,
  sortQueueByPriority,
  getRolePermission,
  canAccessClinicalContent,
  applyConsultationAmendment,
  recordsToCSV,
  computeCommunityStats,
} from './healthLogic';
import { Appointment, ConsultationRecord, Patient, QueueEntry, VitalSignRecord } from '../types/health';

test('STRESS: calculateBMI boundary conditions at 18.5, 25.0, 30.0 and edge inputs', () => {
  // Height 100cm (1.0m) makes rawBmi = weightKg exactly
  // Underweight boundary: < 18.5
  assert.deepEqual(calculateBMI(18.4, 100), { bmi: 18.4, category: 'Underweight' });
  assert.deepEqual(calculateBMI(18.44, 100), { bmi: 18.4, category: 'Underweight' });
  
  // Exactly 18.5 -> Normal
  assert.deepEqual(calculateBMI(18.5, 100), { bmi: 18.5, category: 'Normal' });
  assert.deepEqual(calculateBMI(18.54, 100), { bmi: 18.5, category: 'Normal' });

  // Normal / Overweight boundary: 24.9 is Normal, 25.0 is Overweight
  assert.deepEqual(calculateBMI(24.9, 100), { bmi: 24.9, category: 'Normal' });
  assert.deepEqual(calculateBMI(25.0, 100), { bmi: 25.0, category: 'Overweight' });
  assert.deepEqual(calculateBMI(25.04, 100), { bmi: 25.0, category: 'Overweight' });

  // Overweight / Obese boundary: 29.9 is Overweight, 30.0 is Obese
  assert.deepEqual(calculateBMI(29.9, 100), { bmi: 29.9, category: 'Overweight' });
  assert.deepEqual(calculateBMI(30.0, 100), { bmi: 30.0, category: 'Obese' });
  assert.deepEqual(calculateBMI(30.04, 100), { bmi: 30.0, category: 'Obese' });

  // Edge and invalid cases:
  // Zero values
  assert.deepEqual(calculateBMI(0, 160), { bmi: 0, category: 'Normal' });
  assert.deepEqual(calculateBMI(60, 0), { bmi: 0, category: 'Normal' });
  assert.deepEqual(calculateBMI(0, 0), { bmi: 0, category: 'Normal' });

  // Negative values
  assert.deepEqual(calculateBMI(-50, 160), { bmi: 0, category: 'Normal' });
  assert.deepEqual(calculateBMI(50, -160), { bmi: 0, category: 'Normal' });
  assert.deepEqual(calculateBMI(-50, -160), { bmi: 0, category: 'Normal' });

  // High values (severe obesity)
  const high = calculateBMI(180, 160); // 180 / 2.56 = 70.3
  assert.equal(high.bmi, 70.3);
  assert.equal(high.category, 'Obese');
});

test('STRESS: checkAppointmentConflict slot capacity = 2, status filtering, and self-exclusion', () => {
  const existing: Appointment[] = [
    {
      id: 'APT-1',
      patientId: 'CHC-2026-0001',
      patientName: 'Patient One',
      serviceId: 'SRV-01',
      serviceName: 'General Consultation',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      assignedPersonnel: 'Dr. Rafael Mendoza',
      status: 'Confirmed',
      reason: 'Checkup',
      createdAt: '2026-11-01',
    },
    {
      id: 'APT-2',
      patientId: 'CHC-2026-0002',
      patientName: 'Patient Two',
      serviceId: 'SRV-01',
      serviceName: 'General Consultation',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      assignedPersonnel: 'Dr. Rafael Mendoza',
      status: 'Approved',
      reason: 'Checkup 2',
      createdAt: '2026-11-01',
    },
    {
      id: 'APT-3-CANCELLED',
      patientId: 'CHC-2026-0003',
      patientName: 'Patient Three',
      serviceId: 'SRV-01',
      serviceName: 'General Consultation',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      assignedPersonnel: 'Dr. Rafael Mendoza',
      status: 'Cancelled',
      reason: 'Cancelled visit',
      createdAt: '2026-11-01',
    },
    {
      id: 'APT-4-REJECTED',
      patientId: 'CHC-2026-0004',
      patientName: 'Patient Four',
      serviceId: 'SRV-01',
      serviceName: 'General Consultation',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      assignedPersonnel: 'Dr. Rafael Mendoza',
      status: 'Rejected',
      reason: 'Rejected visit',
      createdAt: '2026-11-01',
    },
    {
      id: 'APT-5-COMPLETED',
      patientId: 'CHC-2026-0005',
      patientName: 'Patient Five',
      serviceId: 'SRV-01',
      serviceName: 'General Consultation',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      assignedPersonnel: 'Dr. Rafael Mendoza',
      status: 'Completed',
      reason: 'Past visit',
      createdAt: '2026-11-01',
    },
  ];

  // 1. Capacity limit test: Slot already has 2 active bookings (APT-1 Confirmed, APT-2 Approved)
  // A 3rd patient attempting to book the same slot must be rejected due to capacity limit
  const thirdPatient = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0099',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      serviceId: 'SRV-01',
    },
    existing
  );
  assert.equal(thirdPatient.hasConflict, true);
  assert.match(thirdPatient.reason ?? '', /maximum booking capacity/i);

  // 2. Same slot, but DIFFERENT service (SRV-02): Should succeed because SRV-02 has 0 bookings
  const differentService = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0099',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      serviceId: 'SRV-02',
    },
    existing
  );
  assert.equal(differentService.hasConflict, false);

  // 3. Same slot, same service, but self-exclusion during update of APT-2
  // When editing APT-2, excluding 'APT-2' drops active count to 1, allowing the update
  const editingSelf = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0002',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      serviceId: 'SRV-01',
    },
    existing,
    'APT-2'
  );
  assert.equal(editingSelf.hasConflict, false);

  // 4. Same patient double booking across different service at the exact same time slot
  // Patient One already has APT-1 at 09:00 AM. Trying to book SRV-02 at 09:00 AM should conflict!
  const patientDoubleBooking = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0001',
      date: '2026-11-05',
      timeSlot: '09:00 AM',
      serviceId: 'SRV-02',
    },
    existing
  );
  assert.equal(patientDoubleBooking.hasConflict, true);
  assert.match(patientDoubleBooking.reason ?? '', /already has an active appointment/i);

  // 5. Inactive status immunity: Patient Three (whose earlier booking was Cancelled) can book again
  // for the 10:00 AM slot without being blocked by their past cancelled record
  const rebookCancelledPatient = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0003',
      date: '2026-11-05',
      timeSlot: '10:00 AM',
      serviceId: 'SRV-01',
    },
    existing
  );
  assert.equal(rebookCancelledPatient.hasConflict, false);
});

test('STRESS: detectDuplicatePatient name normalization, whitespace, and case sensitivity', () => {
  const existing = [
    { id: 'CHC-2026-0101', fullName: 'Juan Dela Cruz', dateOfBirth: '1985-06-15' },
    { id: 'CHC-2026-0102', fullName: 'Maria Santos', dateOfBirth: '1992-09-20' },
  ];

  // Variations of Juan Dela Cruz
  const excessiveWhitespace = detectDuplicatePatient(
    { fullName: '   Juan    Dela     Cruz   ', dateOfBirth: '1985-06-15' },
    existing
  );
  assert.equal(excessiveWhitespace.isDuplicate, true);
  assert.equal(excessiveWhitespace.matchedPatient?.id, 'CHC-2026-0101');
  assert.match(excessiveWhitespace.reason ?? '', /exact match on full name and birth date/i);

  // All caps
  const allCaps = detectDuplicatePatient(
    { fullName: 'JUAN DELA CRUZ', dateOfBirth: '1985-06-15' },
    existing
  );
  assert.equal(allCaps.isDuplicate, true);

  // Same name, different DOB -> flagged by name
  const sameNameDifferentDOB = detectDuplicatePatient(
    { fullName: 'Juan Dela Cruz', dateOfBirth: '2000-01-01' },
    existing
  );
  assert.equal(sameNameDifferentDOB.isDuplicate, true);
  assert.match(sameNameDifferentDOB.reason ?? '', /matching patient full name already registered/i);

  // Different name, same DOB -> NOT duplicate
  const differentNameSameDOB = detectDuplicatePatient(
    { fullName: 'Pedro Penduko', dateOfBirth: '1985-06-15' },
    existing
  );
  assert.equal(differentNameSameDOB.isDuplicate, false);

  // Empty string or whitespace-only name
  assert.equal(detectDuplicatePatient({ fullName: '   ', dateOfBirth: '1985-06-15' }, existing).isDuplicate, false);
  assert.equal(detectDuplicatePatient({ fullName: '', dateOfBirth: '1985-06-15' }, existing).isDuplicate, false);

  // Exclude current patient ID during edit
  const excludeSelf = detectDuplicatePatient(
    { fullName: 'Juan Dela Cruz', dateOfBirth: '1985-06-15' },
    existing,
    'CHC-2026-0101'
  );
  assert.equal(excludeSelf.isDuplicate, false);
});

test('STRESS: generatePatientId handling empty lists, numerical gaps, and malformed strings', () => {
  // Empty existing array -> CHC-2026-0101
  assert.equal(generatePatientId([], 2026), 'CHC-2026-0101');

  // Sequential IDs with gaps: 101, 199 -> next is 200
  const gaps = [{ id: 'CHC-2026-0101' }, { id: 'CHC-2026-0199' }];
  assert.equal(generatePatientId(gaps, 2026), 'CHC-2026-0200');

  // Malformed IDs or other schemas: should ignore non-matching
  const malformed = [{ id: 'INVALID-ID' }, { id: 'CHC-2025-0500' }, { id: 'CHC-2026-0050' }];
  // 50 < 100, so maxSeq remains 100 or updates to 500 from the 2025 match?
  // Pattern is /CHC-\d{4}-(\d+)/, so CHC-2025-0500 matches 500!
  assert.equal(generatePatientId(malformed, 2026), 'CHC-2026-0501');
});

test('STRESS: sortQueueByPriority full multi-tier priority ordering and arrival times', () => {
  const entries: QueueEntry[] = [
    {
      id: 'Q5',
      queueNumber: 'Q-005',
      patientId: 'P5',
      patientName: 'Regular 2',
      serviceName: 'Consultation',
      priority: 'Regular',
      status: 'Waiting',
      arrivalTime: '08:30 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 1',
    },
    {
      id: 'Q1',
      queueNumber: 'P-001',
      patientId: 'P1',
      patientName: 'Senior 1',
      serviceName: 'Consultation',
      priority: 'Senior Citizen',
      status: 'Waiting',
      arrivalTime: '08:45 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 1',
    },
    {
      id: 'Q4',
      queueNumber: 'Q-004',
      patientId: 'P4',
      patientName: 'Regular 1',
      serviceName: 'Consultation',
      priority: 'Regular',
      status: 'Waiting',
      arrivalTime: '08:00 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 1',
    },
    {
      id: 'Q0',
      queueNumber: 'P-000',
      patientId: 'P0',
      patientName: 'Emergency Case',
      serviceName: 'Emergency Triage',
      priority: 'Emergency',
      status: 'Waiting',
      arrivalTime: '08:50 AM',
      source: 'Walk-in',
      assignedRoom: 'ER',
    },
    {
      id: 'Q2',
      queueNumber: 'P-002',
      patientId: 'P2',
      patientName: 'Pregnant Woman',
      serviceName: 'Prenatal Care',
      priority: 'Pregnant',
      status: 'Waiting',
      arrivalTime: '08:20 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 2',
    },
    {
      id: 'Q3',
      queueNumber: 'P-003',
      patientId: 'P3',
      patientName: 'PWD Patient',
      serviceName: 'Consultation',
      priority: 'PWD',
      status: 'Waiting',
      arrivalTime: '08:10 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 1',
    },
  ];

  const sorted = sortQueueByPriority(entries);
  // Expected Priority Order: Emergency > Pregnant > Senior Citizen > PWD > Regular (08:00 before 08:30)
  assert.equal(sorted[0].patientName, 'Emergency Case');
  assert.equal(sorted[1].patientName, 'Pregnant Woman');
  assert.equal(sorted[2].patientName, 'Senior 1');
  assert.equal(sorted[3].patientName, 'PWD Patient');
  assert.equal(sorted[4].patientName, 'Regular 1');
  assert.equal(sorted[5].patientName, 'Regular 2');
});

test('STRESS: applyConsultationAmendment multi-level immutable stack', () => {
  const initial: ConsultationRecord = {
    id: 'CON-01',
    patientId: 'CHC-2026-0101',
    patientName: 'Test Patient',
    attendingDoctor: 'Dr. Mendoza',
    consultationDate: '2026-11-02',
    chiefComplaint: 'Fever',
    medicalHistory: 'None',
    clinicalFindings: 'Normal',
    diagnosis: 'Viral Infection',
    icdCode: 'A00',
    treatmentPlan: 'Hydration',
    prescriptionDetails: 'Paracetamol',
    followUpDate: '2026-11-09',
    consultationNotes: 'Note 1',
    amendments: [],
  };

  // Amendment 1
  const amend1 = applyConsultationAmendment(initial, {
    newDiagnosis: 'Dengue Fever Suspect',
    newTreatmentPlan: 'Complete blood count, hydration, close observation',
    newPrescription: 'Paracetamol 500mg only (avoid NSAIDs)',
    reason: 'Platelet count dropping',
    amendedBy: 'Dr. Mendoza',
    amendedAt: '2026-11-02 12:00',
  });

  assert.equal(amend1.diagnosis, 'Dengue Fever Suspect');
  assert.equal(amend1.amendments.length, 1);
  assert.equal(amend1.amendments[0].previousDiagnosis, 'Viral Infection');

  // Amendment 2
  const amend2 = applyConsultationAmendment(amend1, {
    newDiagnosis: 'Confirmed Dengue with Warning Signs',
    newTreatmentPlan: 'Urgent hospital admission',
    reason: 'Epistaxis observed',
    amendedBy: 'Dr. Mendoza',
    amendedAt: '2026-11-02 16:00',
  });

  assert.equal(amend2.diagnosis, 'Confirmed Dengue with Warning Signs');
  assert.equal(amend2.amendments.length, 2);
  assert.equal(amend2.amendments[0].previousDiagnosis, 'Dengue Fever Suspect');
  assert.equal(amend2.amendments[1].previousDiagnosis, 'Viral Infection');
});

test('STRESS: recordsToCSV escaping commas, double quotes, and multi-line strings', () => {
  const headers = ['ID', 'Name', 'Notes', 'Amount'];
  const rows = [
    ['P1', 'Santos, Maria', 'No "known" allergies', 150],
    ['P2', 'Normal Name', 'Simple note', 0],
    ['P3', 'Quote "Master"', 'Line 1\nLine 2', 99.5],
  ];

  const csv = recordsToCSV(headers, rows);
  const lines = csv.split('\n');

  assert.equal(lines[0], 'ID,Name,Notes,Amount');
  // Row 1: name has comma, notes has quotes
  assert.equal(lines[1], 'P1,"Santos, Maria","No ""known"" allergies",150');
  // Row 2: simple
  assert.equal(lines[2], 'P2,Normal Name,Simple note,0');
  // Row 3: name has quotes, notes has newline
  assert.ok(csv.includes('"Quote ""Master"""'));
  assert.ok(csv.includes('"Line 1\nLine 2"'));
});
