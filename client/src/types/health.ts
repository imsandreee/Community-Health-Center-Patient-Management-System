export type UserRole = 'patient' | 'staff' | 'nurse' | 'doctor' | 'admin';

export type ModuleId =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'queue'
  | 'vitals'
  | 'consultations'
  | 'services'
  | 'monitoring'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'audit';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Inactive';
  patientId?: string;
  lastLogin: string;
}

export interface Patient {
  id: string; // e.g., CHC-2026-0101
  fullName: string;
  dateOfBirth: string;
  age: number;
  sex: 'Female' | 'Male';
  civilStatus: 'Single' | 'Married' | 'Widowed' | 'Separated';
  contactNumber: string;
  address: string;
  barangay: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  registrationDate: string;
  status: 'Active' | 'Archived';
  bloodType?: string;
  allergies?: string;
}

export type AppointmentStatus =
  | 'Pending'
  | 'Approved'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'
  | 'No-show';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  assignedPersonnel: string;
  status: AppointmentStatus;
  reason: string;
  createdAt: string;
}

export type QueueStatus =
  | 'Waiting'
  | 'Called'
  | 'In Consultation'
  | 'Completed'
  | 'Skipped'
  | 'Cancelled';

export type QueuePriority = 'Regular' | 'Senior Citizen' | 'PWD' | 'Pregnant' | 'Emergency';

export interface QueueEntry {
  id: string;
  queueNumber: string; // e.g., Q-001, P-001
  patientId: string;
  patientName: string;
  serviceName: string;
  priority: QueuePriority;
  status: QueueStatus;
  arrivalTime: string;
  source: 'Walk-in' | 'Appointment';
  assignedRoom: string;
}

export interface VitalSignRecord {
  id: string;
  patientId: string;
  patientName: string;
  recordedAt: string;
  recordedBy: string;
  systolic: number;
  diastolic: number;
  temperatureC: number;
  heartRateBpm: number;
  respiratoryRate: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
  bmiCategory: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  nursingNotes: string;
  followUpRequired: boolean;
}

export interface ConsultationAmendment {
  amendedAt: string;
  amendedBy: string;
  reason: string;
  previousDiagnosis: string;
  previousTreatmentPlan: string;
}

export interface ConsultationRecord {
  id: string;
  patientId: string;
  patientName: string;
  attendingDoctor: string;
  consultationDate: string;
  chiefComplaint: string;
  medicalHistory: string;
  clinicalFindings: string;
  diagnosis: string;
  icdCode: string;
  treatmentPlan: string;
  prescriptionDetails: string;
  followUpDate: string;
  consultationNotes: string;
  vitalSignId?: string;
  amendments: ConsultationAmendment[];
}

export interface HealthcareService {
  id: string;
  name: string;
  category: 'Primary Care' | 'Maternal & Child' | 'Preventive & Immunization' | 'Administrative & Screening';
  description: string;
  schedule: string;
  assignedPersonnel: string;
  status: 'Active' | 'Inactive';
  dailyCapacity: number;
}

export interface CommunityHealthActivity {
  id: string;
  title: string;
  category: 'Immunization' | 'Maternal & Child' | 'Nutrition & Screening' | 'Disease Surveillance';
  barangay: string;
  date: string;
  coordinator: string;
  participantsCount: number;
  targetCount: number;
  status: 'Scheduled' | 'Completed' | 'Ongoing';
  summaryNotes: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'Appointment' | 'Follow-up' | 'Announcement' | 'System';
  targetRole: UserRole | 'all';
  targetPatientId?: string;
  createdAt: string;
  read: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  actionType: 'Authentication' | 'Patient Record' | 'Clinical Amendment' | 'Appointment' | 'System Config' | 'Access Control';
  module: string;
  targetEntityId: string;
  details: string;
}
