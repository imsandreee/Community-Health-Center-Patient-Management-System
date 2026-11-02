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
} from './healthLogic';
import { Appointment, ConsultationRecord, QueueEntry } from '../types/health';

test('FR-030: calculateBMI computes accurate BMI and classification', () => {
  const normal = calculateBMI(62, 165);
  assert.equal(normal.bmi, 22.8);
  assert.equal(normal.category, 'Normal');

  const overweight = calculateBMI(78, 168);
  assert.equal(overweight.bmi, 27.6);
  assert.equal(overweight.category, 'Overweight');

  const underweight = calculateBMI(44, 162);
  assert.equal(underweight.bmi, 16.8);
  assert.equal(underweight.category, 'Underweight');
});

test('calculateAge computes age accurately against reference date', () => {
  assert.equal(calculateAge('1990-05-15', '2026-11-02'), 36);
  assert.equal(calculateAge('1961-12-20', '2026-11-02'), 64);
});

test('FR-007: generatePatientId increments sequential ID cleanly', () => {
  const existing = [{ id: 'CHC-2026-0101' }, { id: 'CHC-2026-0105' }];
  assert.equal(generatePatientId(existing, 2026), 'CHC-2026-0106');
});

test('FR-010: detectDuplicatePatient flags matching patient records', () => {
  const existing = [
    { id: 'CHC-2026-0101', fullName: 'Maria Clara Santos', dateOfBirth: '1988-04-12' },
    { id: 'CHC-2026-0102', fullName: 'Jose Protacio Rizal', dateOfBirth: '1961-06-19' },
  ];

  const dupExact = detectDuplicatePatient(
    { fullName: '  maria clara santos ', dateOfBirth: '1988-04-12' },
    existing
  );
  assert.equal(dupExact.isDuplicate, true);
  assert.equal(dupExact.matchedPatient?.id, 'CHC-2026-0101');

  const unique = detectDuplicatePatient(
    { fullName: 'Gabriela Silang', dateOfBirth: '1995-03-19' },
    existing
  );
  assert.equal(unique.isDuplicate, false);
});

test('FR-015: checkAppointmentConflict detects double-booking and slot capacity', () => {
  const existing: Appointment[] = [
    {
      id: 'APT-101',
      patientId: 'CHC-2026-0101',
      patientName: 'Maria Clara Santos',
      serviceId: 'SRV-01',
      serviceName: 'General Consultation',
      date: '2026-11-02',
      timeSlot: '09:00 AM',
      assignedPersonnel: 'Dr. Rafael Mendoza',
      status: 'Confirmed',
      reason: 'Persistent cough',
      createdAt: '2026-10-30',
    },
  ];

  const conflictSamePatient = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0101',
      date: '2026-11-02',
      timeSlot: '09:00 AM',
      serviceId: 'SRV-02',
    },
    existing
  );
  assert.equal(conflictSamePatient.hasConflict, true);

  const validSlot = checkAppointmentConflict(
    {
      patientId: 'CHC-2026-0102',
      date: '2026-11-02',
      timeSlot: '10:30 AM',
      serviceId: 'SRV-01',
    },
    existing
  );
  assert.equal(validSlot.hasConflict, false);
});

test('FR-019 & FR-022: queue generation and priority sorting', () => {
  const entries: QueueEntry[] = [
    {
      id: 'Q1',
      queueNumber: 'Q-001',
      patientId: 'CHC-2026-0101',
      patientName: 'Patient Regular',
      serviceName: 'General Consultation',
      priority: 'Regular',
      status: 'Waiting',
      arrivalTime: '08:00 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 1',
    },
    {
      id: 'Q2',
      queueNumber: 'P-002',
      patientId: 'CHC-2026-0102',
      patientName: 'Patient Senior',
      serviceName: 'Blood Pressure Monitoring',
      priority: 'Senior Citizen',
      status: 'Waiting',
      arrivalTime: '08:15 AM',
      source: 'Walk-in',
      assignedRoom: 'Room 2',
    },
  ];

  const sorted = sortQueueByPriority(entries);
  assert.equal(sorted[0].patientName, 'Patient Senior');
  assert.equal(generateQueueNumber(entries, 'Pregnant'), 'P-003');
});

test('Section 5 RBAC: System Administrator is restricted from clinical diagnosis and vitals', () => {
  assert.equal(getRolePermission('admin', 'vitals'), 'restricted');
  assert.equal(getRolePermission('admin', 'consultations'), 'restricted');
  assert.equal(canAccessClinicalContent('admin'), false);
  assert.equal(canAccessClinicalContent('doctor'), true);
  assert.equal(getRolePermission('admin', 'audit'), 'view');
  assert.equal(getRolePermission('staff', 'audit'), 'none');
});

test('FR-028: applyConsultationAmendment preserves original consultation history', () => {
  const initialRecord: ConsultationRecord = {
    id: 'CON-2026-01',
    patientId: 'CHC-2026-0101',
    patientName: 'Maria Clara Santos',
    attendingDoctor: 'Dr. Rafael Mendoza',
    consultationDate: '2026-11-02',
    chiefComplaint: 'Fever and productive cough for 3 days',
    medicalHistory: 'Mild intermittent asthma',
    clinicalFindings: 'Clear breath sounds bilaterally, pharyngeal erythema',
    diagnosis: 'Acute Upper Respiratory Tract Infection',
    icdCode: 'J06.9',
    treatmentPlan: 'Oral hydration, paracetamol 500mg PRN for fever',
    prescriptionDetails: 'Paracetamol 500mg tab #12, 1 tab q6h PRN',
    followUpDate: '2026-11-09',
    consultationNotes: 'Advised return if dyspnea develops.',
    amendments: [],
  };

  const amended = applyConsultationAmendment(initialRecord, {
    newDiagnosis: 'Acute Bronchitis, Mild',
    newTreatmentPlan: 'Add salbutamol nebules PRN and rest for 5 days',
    reason: 'Updated after reviewing afternoon sputum & auscultation re-check',
    amendedBy: 'Dr. Rafael Mendoza',
    amendedAt: '2026-11-02 14:20',
  });

  assert.equal(amended.diagnosis, 'Acute Bronchitis, Mild');
  assert.equal(amended.amendments.length, 1);
  assert.equal(amended.amendments[0].previousDiagnosis, 'Acute Upper Respiratory Tract Infection');
});
