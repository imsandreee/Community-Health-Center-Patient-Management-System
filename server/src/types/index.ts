import { Request } from 'express';

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

export type PermissionLevel = 'none' | 'own' | 'view' | 'manage' | 'restricted';

export interface AuthUser {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  patientId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  scopeToOwn?: boolean;
}

export interface PatientEntity {
  id: string; // e.g., UUID or CHC-2026-0101
  patientCode: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  sex: 'Female' | 'Male';
  civilStatus: 'Single' | 'Married' | 'Widowed' | 'Separated';
  contactNumber: string;
  email?: string | null;
  address: string;
  barangay: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  bloodType?: string;
  allergies?: string;
  status: 'Active' | 'Archived';
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | 'Pending'
  | 'Approved'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected'
  | 'No-show';

export interface AppointmentEntity {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName?: string;
  serviceId: string;
  serviceName?: string;
  scheduledDate: string; // YYYY-MM-DD
  timeSlot: string; // '08:00 AM' - '03:00 PM'
  assignedPersonnel: string;
  status: AppointmentStatus;
  reason: string;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QueueStatus =
  | 'Waiting'
  | 'Called'
  | 'In Consultation'
  | 'Completed'
  | 'Skipped'
  | 'Cancelled';

export type QueuePriority = 'Regular' | 'Senior Citizen' | 'PWD' | 'Pregnant' | 'Emergency';

export interface QueueEntryEntity {
  id: string;
  queueNumber: string;
  queueDate: string;
  patientId: string;
  patientName?: string;
  serviceId?: string | null;
  serviceName: string;
  priority: QueuePriority;
  priorityWeight: number;
  status: QueueStatus;
  source: 'Walk-in' | 'Appointment';
  assignedRoom: string;
  arrivalTime: string;
  calledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalSignEntity {
  id: string;
  vitalCode: string;
  patientId: string;
  patientName?: string;
  recordedById?: string | null;
  recordedByName: string;
  recordedAt: string;
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
  createdAt: string;
}

export interface ConsultationAmendmentEntity {
  id: string;
  consultationId: string;
  amendedAt: string;
  amendedById?: string | null;
  amendedByName: string;
  reason: string;
  previousDiagnosis: string;
  previousTreatmentPlan: string;
  previousPrescription?: string | null;
  newDiagnosis: string;
  newTreatmentPlan: string;
  newPrescription?: string | null;
  createdAt: string;
}

export interface ConsultationEntity {
  id: string;
  consultationCode: string;
  patientId: string;
  patientName?: string;
  attendingDoctorId?: string | null;
  attendingDoctorName: string;
  vitalSignId?: string | null;
  consultationDate: string;
  chiefComplaint: string;
  medicalHistory: string;
  clinicalFindings: string;
  diagnosis: string;
  icdCode: string;
  treatmentPlan: string;
  prescriptionDetails: string;
  followUpDate?: string | null;
  consultationNotes?: string | null;
  amendments?: ConsultationAmendmentEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItemEntity {
  id: string;
  prescriptionId: string;
  medicationName: string;
  genericName: string;
  dosageForm: 'Tablet' | 'Capsule' | 'Syrup' | 'Suspension' | 'Nebule' | 'Ointment';
  strength: string;
  instructions: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  createdAt: string;
}

export interface PrescriptionEntity {
  id: string;
  prescriptionCode: string;
  consultationId: string;
  patientId: string;
  patientName?: string;
  doctorId?: string | null;
  doctorName: string;
  prescribedDate: string;
  status: 'Pending' | 'Partially Dispensed' | 'Dispensed' | 'Cancelled';
  dispensedById?: string | null;
  dispensedAt?: string | null;
  notes?: string | null;
  items?: PrescriptionItemEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface LabResultEntity {
  id: string;
  labRequestId: string;
  parameterName: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
  createdAt: string;
}

export interface LabRequestEntity {
  id: string;
  requestCode: string;
  consultationId?: string | null;
  patientId: string;
  patientName?: string;
  doctorId?: string | null;
  testCategory: 'Hematology' | 'Clinical Microscopy' | 'Blood Chemistry' | 'Serology & Immunology' | 'Microbiology';
  testName: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  status: 'Requested' | 'Sample Collected' | 'In Progress' | 'Completed' | 'Cancelled';
  specimenCollectedAt?: string | null;
  completedAt?: string | null;
  technologistNotes?: string | null;
  results?: LabResultEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface BillingItemEntity {
  id: string;
  invoiceId: string;
  itemDescription: string;
  itemType: 'Consultation' | 'Laboratory' | 'Medication' | 'Certification' | 'Procedure';
  amount: number;
  isCoveredBySubsidy: boolean;
  createdAt: string;
}

export interface BillingInvoiceEntity {
  id: string;
  invoiceCode: string;
  patientId: string;
  patientName?: string;
  consultationId?: string | null;
  invoiceDate: string;
  totalAmount: number;
  lguSubsidyAmount: number;
  philhealthCoverageAmount: number;
  netPayable: number;
  paymentStatus: 'Free/Subsidized' | 'Pending' | 'Paid' | 'PhilHealth Covered' | 'Cancelled';
  officialReceiptNumber?: string | null;
  philhealthClaimNumber?: string | null;
  cashierId?: string | null;
  paidAt?: string | null;
  items?: BillingItemEntity[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthcareServiceEntity {
  id: string;
  serviceCode: string;
  name: string;
  category: 'Primary Care' | 'Maternal & Child' | 'Preventive & Immunization' | 'Administrative & Screening';
  description: string;
  schedule: string;
  assignedPersonnelId?: string | null;
  assignedPersonnelName: string;
  dailyCapacity: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityActivityEntity {
  id: string;
  activityCode: string;
  title: string;
  category: 'Immunization' | 'Maternal & Child' | 'Nutrition & Screening' | 'Disease Surveillance';
  barangay: string;
  activityDate: string;
  coordinatorId?: string | null;
  coordinatorName: string;
  participantsCount: number;
  targetCount: number;
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';
  summaryNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEntity {
  id: string;
  notificationCode: string;
  title: string;
  message: string;
  type: 'Appointment' | 'Follow-up' | 'Announcement' | 'System';
  targetRole: UserRole | 'all';
  targetPatientId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntity {
  id: string;
  logCode: string;
  timestamp: string;
  actorId?: string | null;
  actorName: string;
  actorRole: UserRole;
  actionType: 'Authentication' | 'Patient Record' | 'Clinical Amendment' | 'Appointment' | 'System Config' | 'Access Control';
  module: string;
  targetEntityId: string;
  details: string;
  ipAddress?: string | null;
  createdAt: string;
}

export interface UserAccountEntity {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  patientId?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code?: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

