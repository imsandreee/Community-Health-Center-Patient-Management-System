/**
 * api.ts — Centralized API client for San Roque CHC Patient Management System
 *
 * Responsibilities:
 *  - Base URL injection from Vite env
 *  - JWT Bearer token injection on every request
 *  - Unified error normalization (ApiError)
 *  - Typed response wrappers for every backend endpoint
 *
 * NEVER import this file's token helpers on the server. Frontend only.
 */

import type {
  Patient,
  UserAccount,
  Appointment,
  AppointmentStatus,
  QueueEntry,
  QueueStatus,
  VitalSignRecord,
  ConsultationRecord,
  HealthcareService,
  CommunityHealthActivity,
  NotificationItem,
  AuditLogEntry,
} from '../types/health';

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
  'http://localhost:5000/api/v1';

// ──────────────────────────────────────────────────────────────────────────────
// Token helpers (memory-only; never persisted to sessionStorage raw)
// ──────────────────────────────────────────────────────────────────────────────

let _token: string | null = null;

export function setAuthToken(token: string | null): void {
  _token = token;
  if (typeof sessionStorage !== 'undefined') {
    if (token) {
      sessionStorage.setItem('chc_token', token);
    } else {
      sessionStorage.removeItem('chc_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (_token) return _token;
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem('chc_token');
    if (stored) {
      _token = stored;
      return _token;
    }
  }
  return null;
}

export function clearAuthToken(): void {
  _token = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('chc_token');
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Typed API error
// ──────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  code?: string;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
  type?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    title?: string,
    detail?: string,
    errors?: Record<string, string[]>,
    type?: string
  ) {
    super(detail || message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail || message;
    this.errors = errors;
    this.type = type;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ──────────────────────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Skip auth header injection (e.g. login) */
  noAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, noAuth = false } = options;

  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!noAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(`Server returned non-JSON response (${response.status})`, response.status);
  }

  if (!response.ok) {
    const errJson = json as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
      error?: string;
      code?: string;
      errors?: Record<string, string[]>;
    };
    const detail = errJson?.detail || errJson?.message || errJson?.error;
    const title = errJson?.title || `Request failed (${response.status})`;
    const message = detail || title;
    throw new ApiError(
      message,
      response.status,
      errJson?.code,
      title,
      detail,
      errJson?.errors,
      errJson?.type
    );
  }

  const resObj = json as {
    data?: T;
    meta?: PaginatedMeta;
    success?: boolean;
    message?: string;
  };

  if (resObj && typeof resObj === 'object') {
    if ('data' in resObj && resObj.data !== undefined) {
      if (Array.isArray(resObj.data) && resObj.meta) {
        (resObj.data as unknown as { meta?: PaginatedMeta }).meta = resObj.meta;
      }
      return resObj.data as T;
    }
  }

  return json as T;
}

// ──────────────────────────────────────────────────────────────────────────────
// Response adapter helpers
// Maps backend entity shapes → frontend type shapes
// ──────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptPatient(p: any): Patient {
  return {
    id: p.patientCode ?? p.id,
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth,
    age: p.age,
    sex: p.sex,
    civilStatus: p.civilStatus ?? 'Single',
    contactNumber: p.contactNumber,
    address: p.address,
    barangay: p.barangay,
    emergencyContactName: p.emergencyContactName ?? 'On file',
    emergencyContactNumber: p.emergencyContactNumber ?? p.contactNumber,
    registrationDate: p.registrationDate ?? p.createdAt?.split('T')[0] ?? '',
    status: p.status,
    bloodType: p.bloodType,
    allergies: p.allergies,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptAppointment(a: any): Appointment {
  return {
    id: a.appointmentCode ?? a.id,
    patientId: a.patientId,
    patientName: a.patientName ?? '',
    serviceId: a.serviceId ?? '',
    serviceName: a.serviceName ?? '',
    date: a.scheduledDate ?? a.date ?? '',
    timeSlot: a.timeSlot,
    assignedPersonnel: a.assignedPersonnel ?? '',
    status: a.status,
    reason: a.reason ?? '',
    createdAt: a.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptQueueEntry(q: any): QueueEntry {
  return {
    id: q.id,
    queueNumber: q.queueNumber,
    patientId: q.patientId,
    patientName: q.patientName ?? '',
    serviceName: q.serviceName ?? '',
    priority: q.priority,
    status: q.status,
    arrivalTime: q.arrivalTime ?? '',
    source: q.source ?? 'Walk-in',
    assignedRoom: q.assignedRoom ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptVital(v: any): VitalSignRecord {
  return {
    id: v.vitalCode ?? v.id,
    patientId: v.patientId,
    patientName: v.patientName ?? '',
    recordedAt: v.recordedAt,
    recordedBy: v.recordedByName ?? v.recordedBy ?? '',
    systolic: v.systolic,
    diastolic: v.diastolic,
    temperatureC: v.temperatureC,
    heartRateBpm: v.heartRateBpm,
    respiratoryRate: v.respiratoryRate,
    weightKg: v.weightKg,
    heightCm: v.heightCm,
    bmi: v.bmi,
    bmiCategory: v.bmiCategory,
    nursingNotes: v.nursingNotes ?? '',
    followUpRequired: v.followUpRequired ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptConsultation(c: any): ConsultationRecord {
  return {
    id: c.consultationCode ?? c.id,
    patientId: c.patientId,
    patientName: c.patientName ?? '',
    attendingDoctor: c.attendingDoctorName ?? c.attendingDoctor ?? '',
    consultationDate: c.consultationDate,
    chiefComplaint: c.chiefComplaint ?? '',
    medicalHistory: c.medicalHistory ?? '',
    clinicalFindings: c.clinicalFindings ?? '',
    diagnosis: c.diagnosis,
    icdCode: c.icdCode ?? '',
    treatmentPlan: c.treatmentPlan ?? '',
    prescriptionDetails: c.prescriptionDetails ?? c.prescriptions ?? '',
    followUpDate: c.followUpDate ?? '',
    consultationNotes: c.consultationNotes ?? c.notes ?? '',
    vitalSignId: c.vitalSignId,
    amendments: (c.amendments ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (am: any) => ({
        amendedAt: am.amendedAt,
        amendedBy: am.amendedBy ?? am.amendedByName ?? '',
        reason: am.reason ?? '',
        previousDiagnosis: am.previousDiagnosis ?? '',
        previousTreatmentPlan: am.previousTreatmentPlan ?? '',
      })
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptService(s: any): HealthcareService {
  return {
    id: s.serviceCode ?? s.id,
    name: s.name,
    category: s.category,
    description: s.description ?? '',
    schedule: s.schedule ?? '',
    assignedPersonnel: s.assignedPersonnel ?? '',
    status: s.status,
    dailyCapacity: s.dailyCapacity ?? 30,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptActivity(a: any): CommunityHealthActivity {
  return {
    id: a.activityCode ?? a.id,
    title: a.title,
    category: a.category,
    barangay: a.barangay,
    date: a.activityDate ?? a.date ?? a.scheduledDate ?? '',
    coordinator: a.coordinatorName ?? a.coordinator ?? '',
    participantsCount: a.participantsCount ?? 0,
    targetCount: a.targetCount ?? 0,
    status: a.status,
    summaryNotes: a.summaryNotes ?? a.notes ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptNotification(n: any): NotificationItem {
  return {
    id: n.notificationCode ?? n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    targetRole: n.targetRole ?? 'all',
    targetPatientId: n.targetPatientId,
    createdAt: n.createdAt,
    read: n.isRead ?? n.read ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptAuditLog(l: any): AuditLogEntry {
  return {
    id: l.logCode ?? l.id,
    timestamp: l.timestamp ?? l.createdAt ?? '',
    actorName: l.actorName ?? '',
    actorRole: l.actorRole,
    actionType: l.actionType,
    module: l.module ?? '',
    targetEntityId: l.targetEntityId ?? '',
    details: l.details ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptUser(u: any): UserAccount {
  return {
    id: u.userCode ?? u.id,
    name: u.fullName ?? u.name ?? '',
    email: u.email,
    role: u.role,
    department: u.department ?? '',
    status: u.status,
    patientId: u.patientId,
    lastLogin: u.lastLoginAt ?? u.lastLogin ?? '',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Pagination meta
// ──────────────────────────────────────────────────────────────────────────────

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// AUTH API
// ──────────────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: UserAccount;
}

export const authApi = {
  /** POST /auth/login */
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await request<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      noAuth: true,
    });
    const user = adaptUser(data.user);
    setAuthToken(data.token);
    return { token: data.token, user };
  },

  /** POST /auth/register-patient */
  async registerPatient(payload: {
    fullName: string;
    email: string;
    dateOfBirth: string;
    sex: 'Female' | 'Male';
    civilStatus?: string;
    contactNumber: string;
    address: string;
    barangay: string;
    password: string;
    consentAccepted: boolean;
  }): Promise<LoginResponse> {
    const data = await request<{ token: string; user: Record<string, unknown>; patientId: string }>(
      '/auth/register-patient',
      { method: 'POST', body: payload, noAuth: true }
    );
    const user = adaptUser(data.user);
    setAuthToken(data.token);
    return { token: data.token, user };
  },

  /** GET /auth/me */
  async me(): Promise<UserAccount> {
    const data = await request<{ user: Record<string, unknown> }>('/auth/me');
    return adaptUser(data.user);
  },

  /** POST /auth/password-recovery */
  async passwordRecovery(identifier: string): Promise<void> {
    await request('/auth/password-recovery', {
      method: 'POST',
      body: { identifier },
      noAuth: true,
    });
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// PATIENTS API
// ──────────────────────────────────────────────────────────────────────────────

export interface PatientListParams {
  search?: string;
  barangay?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const patientsApi = {
  /** GET /patients */
  async list(params?: PatientListParams): Promise<{ data: Patient[]; meta: PaginatedMeta }> {
    const raw = await request<{ data?: unknown[]; meta?: PaginatedMeta } | unknown[]>(
      '/patients',
      { params: params as Record<string, string | number | boolean | undefined | null> }
    );
    // Handle both paged and flat responses
    if (Array.isArray(raw)) {
      return {
        data: raw.map(adaptPatient),
        meta: { page: 1, limit: raw.length, total: raw.length },
      };
    }
    const paged = raw as { data?: unknown[]; meta?: PaginatedMeta };
    return {
      data: (paged.data ?? []).map(adaptPatient),
      meta: paged.meta ?? { page: 1, limit: 20, total: 0 },
    };
  },

  /** GET /patients/:id */
  async get(id: string): Promise<Patient> {
    const raw = await request<unknown>(`/patients/${id}`);
    return adaptPatient(raw);
  },

  /** POST /patients */
  async create(payload: Omit<Patient, 'id' | 'age'>): Promise<Patient> {
    const raw = await request<unknown>('/patients', { method: 'POST', body: payload });
    return adaptPatient(raw);
  },

  /** PUT /patients/:id */
  async update(id: string, payload: Partial<Patient>): Promise<Patient> {
    // id is a patientCode like CHC-2026-0101 — the server accepts both id and patientCode
    const raw = await request<unknown>(`/patients/${id}`, { method: 'PUT', body: payload });
    return adaptPatient(raw);
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS API
// ──────────────────────────────────────────────────────────────────────────────

export const appointmentsApi = {
  /** GET /appointments */
  async list(params?: {
    status?: string;
    patientId?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Appointment[]; meta: PaginatedMeta }> {
    const raw = await request<{ data?: unknown[]; meta?: PaginatedMeta } | unknown[]>(
      '/appointments',
      { params: params as Record<string, string | number | boolean | undefined | null> }
    );
    if (Array.isArray(raw)) {
      return {
        data: raw.map(adaptAppointment),
        meta: { page: 1, limit: raw.length, total: raw.length },
      };
    }
    const paged = raw as { data?: unknown[]; meta?: PaginatedMeta };
    return {
      data: (paged.data ?? []).map(adaptAppointment),
      meta: paged.meta ?? { page: 1, limit: 20, total: 0 },
    };
  },

  /** POST /appointments */
  async create(payload: {
    patientId: string;
    serviceId: string;
    scheduledDate: string;
    timeSlot: string;
    assignedPersonnel: string;
    reason: string;
  }): Promise<Appointment> {
    const raw = await request<unknown>('/appointments', { method: 'POST', body: payload });
    return adaptAppointment(raw);
  },

  /** PATCH /appointments/:id/status */
  async updateStatus(id: string, status: AppointmentStatus, reason?: string): Promise<Appointment> {
    const raw = await request<unknown>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status, cancellationReason: reason },
    });
    return adaptAppointment(raw);
  },

  /** POST /appointments/:id/check-in — check in appointment to queue */
  async checkIn(
    id: string
  ): Promise<{ appointment: Appointment; queueEntry: QueueEntry }> {
    const raw = await request<{ appointment: unknown; queueEntry: unknown }>(
      `/appointments/${id}/check-in`,
      { method: 'POST' }
    );
    return {
      appointment: adaptAppointment(raw.appointment),
      queueEntry: adaptQueueEntry(raw.queueEntry),
    };
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// QUEUE API
// ──────────────────────────────────────────────────────────────────────────────

export const queueApi = {
  /** GET /queue */
  async list(params?: { status?: string }): Promise<QueueEntry[]> {
    const raw = await request<unknown[]>('/queue', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
    return Array.isArray(raw) ? raw.map(adaptQueueEntry) : [];
  },

  /** POST /queue */
  async add(payload: {
    patientId: string;
    serviceName: string;
    priority: string;
    assignedRoom?: string;
  }): Promise<QueueEntry> {
    const raw = await request<unknown>('/queue', { method: 'POST', body: payload });
    return adaptQueueEntry(raw);
  },

  /** PATCH /queue/:id/status */
  async updateStatus(id: string, status: QueueStatus): Promise<QueueEntry> {
    const raw = await request<unknown>(`/queue/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
    return adaptQueueEntry(raw);
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// VITALS API
// ──────────────────────────────────────────────────────────────────────────────

export const vitalsApi = {
  /** GET /vitals */
  async list(params?: {
    patientId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: VitalSignRecord[]; meta: PaginatedMeta }> {
    const raw = await request<{ data?: unknown[]; meta?: PaginatedMeta } | unknown[]>('/vitals', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
    if (Array.isArray(raw)) {
      return {
        data: raw.map(adaptVital),
        meta: { page: 1, limit: raw.length, total: raw.length },
      };
    }
    const paged = raw as { data?: unknown[]; meta?: PaginatedMeta };
    return {
      data: (paged.data ?? []).map(adaptVital),
      meta: paged.meta ?? { page: 1, limit: 20, total: 0 },
    };
  },

  /** POST /vitals */
  async create(payload: Omit<VitalSignRecord, 'id'>): Promise<VitalSignRecord> {
    const raw = await request<unknown>('/vitals', { method: 'POST', body: payload });
    return adaptVital(raw);
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// CONSULTATIONS API
// ──────────────────────────────────────────────────────────────────────────────

export const consultationsApi = {
  /** GET /consultations */
  async list(params?: {
    patientId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ConsultationRecord[]; meta: PaginatedMeta }> {
    const raw = await request<{ data?: unknown[]; meta?: PaginatedMeta } | unknown[]>(
      '/consultations',
      { params: params as Record<string, string | number | boolean | undefined | null> }
    );
    if (Array.isArray(raw)) {
      return {
        data: raw.map(adaptConsultation),
        meta: { page: 1, limit: raw.length, total: raw.length },
      };
    }
    const paged = raw as { data?: unknown[]; meta?: PaginatedMeta };
    return {
      data: (paged.data ?? []).map(adaptConsultation),
      meta: paged.meta ?? { page: 1, limit: 20, total: 0 },
    };
  },

  /** POST /consultations */
  async create(payload: Omit<ConsultationRecord, 'id' | 'amendments'>): Promise<ConsultationRecord> {
    const raw = await request<unknown>('/consultations', { method: 'POST', body: payload });
    return adaptConsultation(raw);
  },

  /** POST /consultations/:id/amendments */
  async amend(
    id: string,
    payload: {
      reason: string;
      newDiagnosis?: string;
      newTreatmentPlan?: string;
      newPrescription?: string | null;
      diagnosis?: string;
      treatmentPlan?: string;
    }
  ): Promise<ConsultationRecord> {
    const body = {
      reason: payload.reason,
      newDiagnosis: payload.newDiagnosis ?? payload.diagnosis ?? '',
      newTreatmentPlan: payload.newTreatmentPlan ?? payload.treatmentPlan ?? '',
      newPrescription: payload.newPrescription ?? null,
    };
    const raw = await request<unknown>(`/consultations/${id}/amendments`, {
      method: 'POST',
      body,
    });
    return adaptConsultation(raw);
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// PRESCRIPTIONS API
// ──────────────────────────────────────────────────────────────────────────────

export interface PrescriptionItem {
  id?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantityPrescribed: number;
  quantityDispensed?: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  prescriptionCode: string;
  consultationId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  status: 'Pending' | 'Dispensed' | 'Cancelled';
  dispensedAt?: string;
  dispensedById?: string;
  notes?: string;
  items?: PrescriptionItem[];
  createdAt: string;
}

export const prescriptionsApi = {
  /** GET /prescriptions */
  async list(params?: { patientId?: string; status?: string }): Promise<Prescription[]> {
    const raw = await request<Prescription[]>('/prescriptions', {
      params: params as Record<string, string | number | boolean | undefined | null>,
    });
    return Array.isArray(raw) ? raw : [];
  },

  /** POST /prescriptions/:id/dispense */
  async dispense(
    id: string,
    payload?: { notes?: string }
  ): Promise<{ status: string; dispensedAt: string; prescription: Prescription }> {
    return request<{ status: string; dispensedAt: string; prescription: Prescription }>(
      `/prescriptions/${id}/dispense`,
      { method: 'POST', body: payload }
    );
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// LAB REQUESTS API
// ──────────────────────────────────────────────────────────────────────────────

export interface LabTestResult {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  interpretation?: 'Normal' | 'Abnormal' | 'Critical';
}

export interface LabRequest {
  id: string;
  requestCode: string;
  consultationId?: string | null;
  patientId: string;
  patientName: string;
  doctorId: string;
  testCategory: string;
  testName: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  status: 'Requested' | 'Completed' | 'Cancelled';
  results?: LabTestResult[];
  notes?: string;
  createdAt: string;
}

export const labRequestsApi = {
  /** GET /lab-requests */
  async list(): Promise<LabRequest[]> {
    const raw = await request<LabRequest[]>('/lab-requests');
    return Array.isArray(raw) ? raw : [];
  },

  /** POST /lab-requests */
  async create(payload: {
    patientId: string;
    consultationId?: string | null;
    testName: string;
    testCategory:
    | 'Hematology'
    | 'Clinical Microscopy'
    | 'Blood Chemistry'
    | 'Serology & Immunology'
    | 'Microbiology';
    priority?: 'Routine' | 'Urgent' | 'Emergency';
  }): Promise<LabRequest> {
    return request<LabRequest>('/lab-requests', {
      method: 'POST',
      body: payload,
    });
  },

  /** POST /lab-requests/:id/results */
  async submitResults(
    id: string,
    payload: { results: LabTestResult[]; notes?: string }
  ): Promise<LabRequest> {
    return request<LabRequest>(`/lab-requests/${id}/results`, {
      method: 'POST',
      body: payload,
    });
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// BILLING API
// ──────────────────────────────────────────────────────────────────────────────

export interface BillingInvoiceItem {
  description: string;
  amount: number;
  category: string;
}

export interface BillingInvoice {
  id: string;
  invoiceCode: string;
  patientId: string;
  patientName?: string;
  consultationId?: string;
  items: BillingInvoiceItem[];
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Waived' | 'PhilHealth Claimed';
  officialReceiptNumber?: string;
  philhealthClaimNumber?: string;
  cashierId?: string;
  paidAt?: string;
  createdAt: string;
}

export const billingApi = {
  /** GET /billing/invoices */
  async listInvoices(): Promise<BillingInvoice[]> {
    const raw = await request<BillingInvoice[]>('/billing/invoices');
    return Array.isArray(raw) ? raw : [];
  },

  /** POST /billing/invoices/:id/settle */
  async settleInvoice(
    id: string,
    payload?: {
      paymentStatus?: string;
      officialReceiptNumber?: string;
      philhealthClaimNumber?: string;
    }
  ): Promise<BillingInvoice> {
    return request<BillingInvoice>(`/billing/invoices/${id}/settle`, {
      method: 'POST',
      body: payload,
    });
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// SERVICES API
// ──────────────────────────────────────────────────────────────────────────────

export const servicesApi = {
  /** GET /services */
  async list(): Promise<HealthcareService[]> {
    const raw = await request<unknown[]>('/services');
    return Array.isArray(raw) ? raw.map(adaptService) : [];
  },

  /** POST /services */
  async create(payload: Omit<HealthcareService, 'id'>): Promise<HealthcareService> {
    const raw = await request<unknown>('/services', { method: 'POST', body: payload });
    return adaptService(raw);
  },

  /** PATCH /services/:id/status */
  async updateStatus(id: string, status: 'Active' | 'Inactive'): Promise<HealthcareService> {
    const raw = await request<unknown>(`/services/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
    return adaptService(raw);
  },

  /** PATCH /services/:id/status — helper for toggling */
  async toggleStatus(id: string, status?: 'Active' | 'Inactive'): Promise<HealthcareService> {
    return this.updateStatus(id, status || 'Active');
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// COMMUNITY ACTIVITIES API
// ──────────────────────────────────────────────────────────────────────────────

export const communityApi = {
  /** GET /community/activities */
  async list(): Promise<CommunityHealthActivity[]> {
    const raw = await request<unknown[]>('/community/activities');
    return Array.isArray(raw) ? raw.map(adaptActivity) : [];
  },

  /** POST /community/activities */
  async create(payload: Omit<CommunityHealthActivity, 'id'>): Promise<CommunityHealthActivity> {
    const body = {
      ...payload,
      activityDate: (payload as { activityDate?: string; date?: string }).activityDate || payload.date,
    };
    const raw = await request<unknown>('/community/activities', { method: 'POST', body });
    return adaptActivity(raw);
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS API
// ──────────────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  /** GET /notifications */
  async list(): Promise<NotificationItem[]> {
    const raw = await request<unknown[]>('/notifications');
    return Array.isArray(raw) ? raw.map(adaptNotification) : [];
  },

  /** POST /notifications */
  async create(payload: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>): Promise<NotificationItem> {
    const raw = await request<unknown>('/notifications', { method: 'POST', body: payload });
    return adaptNotification(raw);
  },

  /** PATCH /notifications/:id/read */
  async markRead(id: string): Promise<void> {
    await request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  /** PATCH /notifications/mark-all-read */
  async markAllRead(): Promise<void> {
    await request('/notifications/mark-all-read', { method: 'PATCH' });
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS API
// ──────────────────────────────────────────────────────────────────────────────

export const auditLogsApi = {
  /** GET /audit-logs */
  async list(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLogEntry[]; meta: PaginatedMeta }> {
    const raw = await request<{ data?: unknown[]; meta?: PaginatedMeta } | unknown[]>(
      '/audit-logs',
      { params: params as Record<string, string | number | boolean | undefined | null> }
    );
    if (Array.isArray(raw)) {
      return {
        data: raw.map(adaptAuditLog),
        meta: { page: 1, limit: raw.length, total: raw.length },
      };
    }
    const paged = raw as { data?: unknown[]; meta?: PaginatedMeta };
    return {
      data: (paged.data ?? []).map(adaptAuditLog),
      meta: paged.meta ?? { page: 1, limit: 50, total: 0 },
    };
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// USERS (Admin) API
// ──────────────────────────────────────────────────────────────────────────────

export const usersApi = {
  /** GET /users */
  async list(): Promise<UserAccount[]> {
    const raw = await request<unknown[]>('/users');
    return Array.isArray(raw) ? raw.map(adaptUser) : [];
  },

  /** POST /users */
  async create(payload: {
    fullName: string;
    email: string;
    role: string;
    department: string;
    password: string;
  }): Promise<UserAccount> {
    const raw = await request<unknown>('/users', { method: 'POST', body: payload });
    return adaptUser(raw);
  },

  /** PATCH /users/:id/status */
  async updateStatus(
    id: string,
    status: 'Active' | 'Inactive' | 'Suspended'
  ): Promise<UserAccount> {
    const raw = await request<unknown>(`/users/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
    return adaptUser(raw);
  },

  /** PATCH /users/:id/status — helper for toggling */
  async toggleStatus(
    id: string,
    status?: 'Active' | 'Inactive' | 'Suspended'
  ): Promise<UserAccount> {
    return this.updateStatus(id, status || 'Active');
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// REPORTS / DASHBOARD API
// ──────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  pendingAppointments: number;
  totalConsultations: number;
  totalVitals: number;
  elevatedBpVitals: number;
}

export const reportsApi = {
  /** GET /reports — dashboard summary */
  async dashboard(): Promise<DashboardStats> {
    return request<DashboardStats>('/reports');
  },

  /** GET /reports/export/csv */
  async exportCsv(category = 'patient_registry'): Promise<string> {
    const token = getAuthToken();
    const url = new URL(`${BASE_URL}/reports/export/csv`);
    url.searchParams.set('category', category);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      throw new ApiError(`Failed to export CSV (${res.status})`, res.status);
    }
    return res.text();
  },
};

