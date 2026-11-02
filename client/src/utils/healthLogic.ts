import {
  Patient,
  Appointment,
  QueueEntry,
  QueuePriority,
  ModuleId,
  UserRole,
  ConsultationRecord,
  VitalSignRecord,
} from '../types/health';

/**
 * FR-030: Calculate BMI from recorded height (cm) and weight (kg)
 */
export function calculateBMI(weightKg: number, heightCm: number): {
  bmi: number;
  category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
} {
  if (weightKg <= 0 || heightCm <= 0) {
    return { bmi: 0, category: 'Normal' };
  }
  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const bmi = Math.round(rawBmi * 10) / 10;

  let category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese' = 'Normal';
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Normal';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obese';
  }

  return { bmi, category };
}

/**
 * Calculate age in years from YYYY-MM-DD date of birth
 */
export function calculateAge(dateOfBirth: string, referenceDate = '2026-11-02'): number {
  const dob = new Date(dateOfBirth);
  const ref = new Date(referenceDate);
  if (Number.isNaN(dob.getTime())) return 0;

  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * FR-007: Generate unique patient identification number (e.g., CHC-2026-0109)
 */
export function generatePatientId(existingPatients: Pick<Patient, 'id'>[], year = 2026): string {
  let maxSeq = 100;
  for (const p of existingPatients) {
    const match = p.id.match(/CHC-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `CHC-${year}-${nextSeq}`;
}

/**
 * FR-010: Prevent or flag potential duplicate patient records
 * Matches normalized full name + date of birth, or exact normalized full name
 */
export function detectDuplicatePatient(
  candidate: { fullName: string; dateOfBirth: string },
  existingPatients: Pick<Patient, 'id' | 'fullName' | 'dateOfBirth'>[],
  excludePatientId?: string
): { isDuplicate: boolean; matchedPatient?: Pick<Patient, 'id' | 'fullName' | 'dateOfBirth'>; reason?: string } {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const candidateName = normalize(candidate.fullName);
  if (!candidateName) return { isDuplicate: false };

  for (const existing of existingPatients) {
    if (excludePatientId && existing.id === excludePatientId) continue;
    const existingName = normalize(existing.fullName);
    if (existingName === candidateName && existing.dateOfBirth === candidate.dateOfBirth) {
      return {
        isDuplicate: true,
        matchedPatient: existing,
        reason: `Exact match on full name and birth date (${existing.id})`,
      };
    }
    if (existingName === candidateName) {
      return {
        isDuplicate: true,
        matchedPatient: existing,
        reason: `Matching patient full name already registered (${existing.id})`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * FR-015: Prevent conflicting appointments based on configured scheduling rules
 * Checks if same patient already has an active appointment at the same date & timeSlot,
 * or if the assigned healthcare personnel already has 3+ appointments in that exact slot.
 */
export function checkAppointmentConflict(
  candidate: { patientId: string; date: string; timeSlot: string; serviceId: string },
  existingAppointments: Appointment[],
  excludeAppointmentId?: string
): { hasConflict: boolean; reason?: string } {
  const activeStatuses = new Set(['Pending', 'Approved', 'Confirmed']);

  for (const appt of existingAppointments) {
    if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
    if (!activeStatuses.has(appt.status)) continue;

    if (appt.patientId === candidate.patientId && appt.date === candidate.date && appt.timeSlot === candidate.timeSlot) {
      return {
        hasConflict: true,
        reason: 'Patient already has an active appointment scheduled for this date and time slot.',
      };
    }
  }

  const slotBookings = existingAppointments.filter(
    (a) =>
      a.id !== excludeAppointmentId &&
      activeStatuses.has(a.status) &&
      a.date === candidate.date &&
      a.timeSlot === candidate.timeSlot &&
      a.serviceId === candidate.serviceId
  );

  if (slotBookings.length >= 2) {
    return {
      hasConflict: true,
      reason: 'Selected time slot for this healthcare service has reached maximum booking capacity.',
    };
  }

  return { hasConflict: false };
}

/**
 * FR-019 & FR-022: Generate queue numbers and sort priority
 */
export function generateQueueNumber(existingQueue: Pick<QueueEntry, 'queueNumber'>[], priority: QueuePriority): string {
  const prefix = priority === 'Regular' ? 'Q' : 'P';
  let maxNum = 0;
  for (const item of existingQueue) {
    const match = item.queueNumber.match(/^[QP]-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Sort queue entries so priority patients (Emergency > Pregnant/Senior/PWD > Regular) appear first among Waiting
 */
export function sortQueueByPriority(entries: QueueEntry[]): QueueEntry[] {
  const priorityWeight: Record<QueuePriority, number> = {
    Emergency: 1,
    Pregnant: 2,
    'Senior Citizen': 3,
    PWD: 4,
    Regular: 5,
  };

  return [...entries].sort((a, b) => {
    const wA = priorityWeight[a.priority] ?? 5;
    const wB = priorityWeight[b.priority] ?? 5;
    if (wA !== wB) return wA - wB;
    return a.arrivalTime.localeCompare(b.arrivalTime);
  });
}

/**
 * Section 5: Role-Based Access Control Matrix
 * Note: System administrators do NOT automatically receive unrestricted access to clinical content
 * (Vital signs, Consultation records, Diagnosis and treatment).
 */
export type PermissionLevel = 'none' | 'own' | 'view' | 'manage' | 'restricted';

const RBAC_MATRIX: Record<ModuleId, Record<UserRole, PermissionLevel>> = {
  dashboard: {
    patient: 'own',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'view',
  },
  patients: {
    patient: 'own',
    staff: 'manage',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  appointments: {
    patient: 'own',
    staff: 'manage',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  queue: {
    patient: 'own',
    staff: 'manage',
    nurse: 'manage',
    doctor: 'manage',
    admin: 'manage',
  },
  vitals: {
    patient: 'own',
    staff: 'view',
    nurse: 'manage',
    doctor: 'view',
    admin: 'restricted',
  },
  consultations: {
    patient: 'own',
    staff: 'restricted',
    nurse: 'view',
    doctor: 'manage',
    admin: 'restricted',
  },
  services: {
    patient: 'view',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  monitoring: {
    patient: 'none',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  reports: {
    patient: 'none',
    staff: 'view',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  notifications: {
    patient: 'own',
    staff: 'manage',
    nurse: 'view',
    doctor: 'view',
    admin: 'manage',
  },
  users: {
    patient: 'own',
    staff: 'none',
    nurse: 'none',
    doctor: 'none',
    admin: 'manage',
  },
  audit: {
    patient: 'none',
    staff: 'none',
    nurse: 'none',
    doctor: 'none',
    admin: 'view',
  },
};

export function getRolePermission(role: UserRole, module: ModuleId): PermissionLevel {
  return RBAC_MATRIX[module]?.[role] ?? 'none';
}

export function canAccessClinicalContent(role: UserRole): boolean {
  return role === 'doctor' || role === 'nurse' || role === 'patient';
}

/**
 * FR-028: Preserve original consultation history when corrections are made through an auditable amendment process
 */
export function applyConsultationAmendment(
  record: ConsultationRecord,
  update: {
    newDiagnosis: string;
    newTreatmentPlan: string;
    newPrescription?: string;
    reason: string;
    amendedBy: string;
    amendedAt: string;
  }
): ConsultationRecord {
  const amendment = {
    amendedAt: update.amendedAt,
    amendedBy: update.amendedBy,
    reason: update.reason.trim(),
    previousDiagnosis: record.diagnosis,
    previousTreatmentPlan: record.treatmentPlan,
  };

  return {
    ...record,
    diagnosis: update.newDiagnosis.trim(),
    treatmentPlan: update.newTreatmentPlan.trim(),
    prescriptionDetails: update.newPrescription !== undefined ? update.newPrescription.trim() : record.prescriptionDetails,
    amendments: [amendment, ...record.amendments],
  };
}

/**
 * FR-044: Convert records to CSV format for export
 */
export function recordsToCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerLine = headers.map(escapeCell).join(',');
  const dataLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Compute aggregated community health statistics (FR-036, FR-037, FR-038)
 */
export function computeCommunityStats(
  patients: Patient[],
  consultations: ConsultationRecord[],
  vitals: VitalSignRecord[]
) {
  const activePatients = patients.filter((p) => p.status === 'Active');

  const ageGroups = {
    '0-14 (Pediatric)': 0,
    '15-29 (Youth)': 0,
    '30-59 (Adult)': 0,
    '60+ (Senior Citizen)': 0,
  };

  for (const p of activePatients) {
    if (p.age <= 14) ageGroups['0-14 (Pediatric)']++;
    else if (p.age <= 29) ageGroups['15-29 (Youth)']++;
    else if (p.age <= 59) ageGroups['30-59 (Adult)']++;
    else ageGroups['60+ (Senior Citizen)']++;
  }

  const diagnosisCounts: Record<string, number> = {};
  for (const c of consultations) {
    const key = c.diagnosis || 'Unspecified';
    diagnosisCounts[key] = (diagnosisCounts[key] || 0) + 1;
  }

  const topDiagnoses = Object.entries(diagnosisCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count);

  const elevatedBpCount = vitals.filter((v) => v.systolic >= 140 || v.diastolic >= 90).length;

  return {
    totalActivePatients: activePatients.length,
    ageGroups,
    topDiagnoses,
    elevatedBpCount,
  };
}
