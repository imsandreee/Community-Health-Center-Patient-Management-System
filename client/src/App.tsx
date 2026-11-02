/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App.tsx — Root application shell
 *
 * Phase 5 integration: All data now fetched from Express backend via
 * centralized API service layer (client/src/services/api.ts).
 * Mock data (INITIAL_*) retained only as an offline fallback.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Search, LogIn, X, ArrowRight, Wifi, WifiOff, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  AuditLogEntry,
  CommunityHealthActivity,
  ConsultationRecord,
  HealthcareService,
  ModuleId,
  NotificationItem,
  Patient,
  QueueEntry,
  QueueStatus,
  UserAccount,
  UserRole,
  VitalSignRecord,
} from './types/health';
import { getRolePermission } from './utils/healthLogic';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PatientModule } from './components/PatientModule';
import { AppointmentModule } from './components/AppointmentModule';
import { QueueModule } from './components/QueueModule';
import { VitalSignsModule } from './components/VitalSignsModule';
import { ConsultationModule } from './components/ConsultationModule';
import { ServicesModule } from './components/ServicesModule';
import { CommunityMonitoringModule } from './components/CommunityMonitoringModule';
import { ReportsModule } from './components/ReportsModule';
import { NotificationsModule } from './components/NotificationsModule';
import { UserAdminModule } from './components/UserAdminModule';
import { AuditLogsModule } from './components/AuditLogsModule';
import { LandingPage } from './components/LandingPage';
import {
  authApi,
  patientsApi,
  appointmentsApi,
  queueApi,
  vitalsApi,
  consultationsApi,
  servicesApi,
  communityApi,
  notificationsApi,
  auditLogsApi,
  usersApi,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  ApiError,
} from './services/api';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Patient' | 'Appointment' | 'Queue' | 'Service' | 'Module';
  targetModule: ModuleId;
}

// ──────────────────────────────────────────────────────────────────────────────
// App Component
// ──────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Online/offline indicator ────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);

  // ── Global search ───────────────────────────────────────────────────────────
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Domain data state (live from API) ──────────────────────────────────────
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<HealthcareService[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [vitals, setVitals] = useState<VitalSignRecord[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [activities, setActivities] = useState<CommunityHealthActivity[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);

  // ── Loading & Notification states ──────────────────────────────────────────
  const [isDataLoading, setIsDataLoading] = useState(false);

  // ── Global RFC 7807 Toast Alerts ──────────────────────────────────────────
  interface ToastAlert {
    id: string;
    type: 'error' | 'success' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
  }
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const addToast = useCallback(
    (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
      const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setToasts((prev) => [
        ...prev,
        { id, type, title, message, timestamp: new Date().toLocaleTimeString('en-PH') },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    []
  );

  const handleMutationError = useCallback(
    (err: unknown, fallbackTitle: string) => {
      if (err instanceof ApiError) {
        const errorDetails = err.errors
          ? Object.entries(err.errors)
              .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
              .join(' | ')
          : '';
        const detailMsg = err.detail || err.message;
        const fullMessage = errorDetails ? `${detailMsg} (${errorDetails})` : detailMsg;
        addToast('error', err.title || fallbackTitle, fullMessage);
      } else if (err instanceof Error) {
        addToast('error', fallbackTitle, err.message);
      } else {
        addToast('error', fallbackTitle, 'An unexpected error occurred during operation.');
      }
    },
    [addToast]
  );

  // ── API health flag ─────────────────────────────────────────────────────────
  const [apiAvailable, setApiAvailable] = useState(true);

  // ──────────────────────────────────────────────────────────────────────────
  // On mount: restore session from stored token
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    authApi
      .me()
      .then((user) => {
        setCurrentUser(user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        clearAuthToken();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Load all domain data after authentication
  // ──────────────────────────────────────────────────────────────────────────

  const loadAllData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [
        patientsRes,
        aptsRes,
        queueData,
        vitalsRes,
        consRes,
        svcData,
        actData,
        notifData,
        auditRes,
        usersData,
      ] = await Promise.allSettled([
        patientsApi.list({ limit: 100 }),
        appointmentsApi.list({ limit: 100 }),
        queueApi.list(),
        vitalsApi.list({ limit: 100 }),
        consultationsApi.list({ limit: 100 }),
        servicesApi.list(),
        communityApi.list(),
        notificationsApi.list(),
        auditLogsApi.list({ limit: 100 }),
        usersApi.list(),
      ]);

      if (patientsRes.status === 'fulfilled') setPatients(patientsRes.value.data);
      if (aptsRes.status === 'fulfilled') setAppointments(aptsRes.value.data);
      if (queueData.status === 'fulfilled') setQueue(queueData.value);
      if (vitalsRes.status === 'fulfilled') setVitals(vitalsRes.value.data);
      if (consRes.status === 'fulfilled') setConsultations(consRes.value.data);
      if (svcData.status === 'fulfilled') setServices(svcData.value);
      if (actData.status === 'fulfilled') setActivities(actData.value);
      if (notifData.status === 'fulfilled') setNotifications(notifData.value);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.data);
      if (usersData.status === 'fulfilled') setUsers(usersData.value);

      setApiAvailable(true);
      setIsOnline(true);
    } catch {
      setApiAvailable(false);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  // ──────────────────────────────────────────────────────────────────────────
  // Online/Offline detection
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Auth handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleLogin = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { user } = await authApi.login(email, password);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setActiveModule('dashboard');
        return { success: true };
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
        return { success: false, error: msg };
      }
    },
    []
  );

  const handlePatientSelfRegister = useCallback(
    async (payload: {
      fullName: string;
      email: string;
      dateOfBirth: string;
      sex: 'Female' | 'Male';
      contactNumber: string;
      address: string;
      barangay: string;
      password: string;
      consentAccepted: boolean;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const { user } = await authApi.registerPatient(payload);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setActiveModule('dashboard');
        return { success: true };
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
        return { success: false, error: msg };
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    clearAuthToken();
    sessionStorage.clear();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveModule('dashboard');
    setPatients([]);
    setAppointments([]);
    setQueue([]);
    setVitals([]);
    setConsultations([]);
    setServices([]);
    setActivities([]);
    setNotifications([]);
    setAuditLogs([]);
    setUsers([]);
    setToasts([]);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Role switch (authenticates against backend with Password123! and live JWT)
  // ──────────────────────────────────────────────────────────────────────────

  const handleSwitchRole = useCallback(
    async (role: UserRole) => {
      // Map role → preset credentials authenticated against backend bcrypt store
      const DEMO_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
        staff: { email: 'e.villanueva@sanroque-chc.gov.ph', password: 'Password123!' },
        nurse: { email: 'j.bautista@sanroque-chc.gov.ph', password: 'Password123!' },
        doctor: { email: 'r.mendoza@sanroque-chc.gov.ph', password: 'Password123!' },
        patient: { email: 'maria.santos@patient.chc.ph', password: 'Password123!' },
        admin: { email: 'admin@sanroque-chc.gov.ph', password: 'Password123!' },
      };
      const creds = DEMO_CREDENTIALS[role];
      if (!creds) return;
      try {
        const { token } = await authApi.login(creds.email, creds.password);
        setAuthToken(token);
        const meUser = await authApi.me();
        setCurrentUser(meUser);
        setIsAuthenticated(true);
        const perm = getRolePermission(role, activeModule);
        if (perm === 'none') setActiveModule('dashboard');
        addToast('info', 'Role Switched', `Active session authenticated as ${meUser.name} (${role.toUpperCase()}).`);
      } catch (err) {
        handleMutationError(err, 'Role Switch Error');
      }
    },
    [activeModule, addToast, handleMutationError]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Patient Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleRegisterPatient = useCallback(async (newPatient: Patient) => {
    try {
      const created = await patientsApi.create({
        fullName: newPatient.fullName,
        dateOfBirth: newPatient.dateOfBirth,
        sex: newPatient.sex,
        civilStatus: newPatient.civilStatus,
        contactNumber: newPatient.contactNumber,
        address: newPatient.address,
        barangay: newPatient.barangay,
        emergencyContactName: newPatient.emergencyContactName,
        emergencyContactNumber: newPatient.emergencyContactNumber,
        registrationDate: newPatient.registrationDate,
        status: newPatient.status,
        bloodType: newPatient.bloodType,
        allergies: newPatient.allergies,
      });
      setPatients((prev) => [created, ...prev]);
      addToast('success', 'Patient Registered', `Patient ${created.fullName} (${created.id}) registered successfully.`);
    } catch (err) {
      handleMutationError(err, 'Registration Error');
      // Fall back to optimistic update for dev/offline resilience
      setPatients((prev) => [newPatient, ...prev]);
    }
  }, [addToast, handleMutationError]);

  const handleUpdatePatient = useCallback(async (updated: Patient) => {
    // Optimistic update
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      const fromServer = await patientsApi.update(updated.id, updated);
      setPatients((prev) => prev.map((p) => (p.id === fromServer.id ? fromServer : p)));
      addToast('success', 'Patient Updated', `Record for ${fromServer.fullName} saved.`);
    } catch (err) {
      handleMutationError(err, 'Patient Update Error');
    }
  }, [addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Appointment Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreateAppointment = useCallback(async (apt: Appointment) => {
    try {
      const created = await appointmentsApi.create({
        patientId: apt.patientId,
        serviceId: apt.serviceId,
        scheduledDate: apt.date,
        timeSlot: apt.timeSlot,
        assignedPersonnel: apt.assignedPersonnel,
        reason: apt.reason,
      });
      setAppointments((prev) => [created, ...prev]);
      addToast('success', 'Appointment Scheduled', `Appointment ${created.id} booked for ${created.patientName}.`);
    } catch (err) {
      handleMutationError(err, 'Appointment Error');
      setAppointments((prev) => [apt, ...prev]);
    }
  }, [addToast, handleMutationError]);

  const handleUpdateAppointmentStatus = useCallback(
    async (id: string, status: AppointmentStatus) => {
      // Optimistic update
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      try {
        const updated = await appointmentsApi.updateStatus(id, status);
        setAppointments((prev) =>
          prev.map((a) => (a.id === updated.id || a.id === id ? updated : a))
        );
        addToast('info', 'Appointment Status Updated', `Appointment ${id} marked as ${status}.`);
        // Create system notification
        const target = appointments.find((a) => a.id === id);
        if (target) {
          const notif: NotificationItem = {
            id: `NOT-${Date.now()}`,
            title: `Appointment ${status}: ${target.serviceName}`,
            message: `Your appointment (${target.id}) on ${target.date} at ${target.timeSlot} has been marked as ${status}.`,
            type: 'Appointment',
            targetRole: 'patient',
            targetPatientId: target.patientId,
            createdAt: new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      } catch (err) {
        handleMutationError(err, 'Appointment Status Error');
      }
    },
    [appointments, addToast, handleMutationError]
  );

  const handleCheckInAppointmentToQueue = useCallback(
    async (apt: Appointment) => {
      // Optimistic: mark appointment as Confirmed
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, status: 'Confirmed' } : a))
      );
      try {
        const result = await appointmentsApi.checkIn(apt.id);
        const queueEntry = 'queueEntry' in result ? result.queueEntry : (result as unknown as QueueEntry);
        const updatedApt = 'appointment' in result ? result.appointment : null;
        if (updatedApt) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === apt.id ? updatedApt : a))
          );
        }
        setQueue((prev) => [...prev.filter((q) => q.id !== queueEntry.id), queueEntry]);
        addToast('success', 'Queue Check-In', `Patient ${queueEntry.patientName} queued as Ticket ${queueEntry.queueNumber}.`);
      } catch (err) {
        handleMutationError(err, 'Check-In Error');
        // Fall back to local queue entry
        const patientObj = patients.find((p) => p.id === apt.patientId);
        const priority = patientObj && patientObj.age >= 60 ? 'Senior Citizen' : 'Regular';
        const fallbackEntry: QueueEntry = {
          id: `QUE-${Date.now()}`,
          queueNumber: `Q-${String(queue.length + 1).padStart(3, '0')}`,
          patientId: apt.patientId,
          patientName: apt.patientName,
          serviceName: apt.serviceName,
          priority,
          status: 'Waiting',
          arrivalTime: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
          source: 'Appointment',
          assignedRoom: 'Consultation Room 1',
        };
        setQueue((prev) => [...prev, fallbackEntry]);
      }
    },
    [appointments, patients, queue, addToast, handleMutationError]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Queue Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleAddQueueEntry = useCallback(async (entry: QueueEntry) => {
    // Optimistic
    setQueue((prev) => [...prev, entry]);
    try {
      const created = await queueApi.add({
        patientId: entry.patientId,
        serviceName: entry.serviceName,
        priority: entry.priority,
        assignedRoom: entry.assignedRoom,
      });
      setQueue((prev) =>
        prev.map((q) => (q.id === entry.id || q.queueNumber === entry.queueNumber ? created : q))
      );
      addToast('success', 'Queue Ticket Issued', `Ticket ${created.queueNumber} issued.`);
    } catch (err) {
      handleMutationError(err, 'Queue Ticket Error');
    }
  }, [addToast, handleMutationError]);

  const handleUpdateQueueStatus = useCallback(async (id: string, status: QueueStatus) => {
    // Optimistic
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    try {
      const updated = await queueApi.updateStatus(id, status);
      setQueue((prev) => prev.map((q) => (q.id === updated.id || q.id === id ? updated : q)));
      addToast('info', 'Queue Status Updated', `Ticket marked as ${status}.`);
    } catch (err) {
      handleMutationError(err, 'Queue Update Error');
    }
  }, [addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Vitals Handler
  // ──────────────────────────────────────────────────────────────────────────

  const handleRecordVitals = useCallback(async (record: VitalSignRecord) => {
    // Optimistic
    setVitals((prev) => [record, ...prev]);
    try {
      const created = await vitalsApi.create({
        patientId: record.patientId,
        patientName: record.patientName,
        recordedAt: record.recordedAt,
        recordedBy: record.recordedBy,
        systolic: record.systolic,
        diastolic: record.diastolic,
        temperatureC: record.temperatureC,
        heartRateBpm: record.heartRateBpm,
        respiratoryRate: record.respiratoryRate,
        weightKg: record.weightKg,
        heightCm: record.heightCm,
        bmi: record.bmi,
        bmiCategory: record.bmiCategory,
        nursingNotes: record.nursingNotes,
        followUpRequired: record.followUpRequired,
      });
      setVitals((prev) => prev.map((v) => (v.id === record.id ? created : v)));
      addToast('success', 'Vitals Saved', `Vitals recorded for ${record.patientName} (BMI: ${created.bmi} ${created.bmiCategory}).`);
    } catch (err) {
      handleMutationError(err, 'Vitals Error');
    }
  }, [addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Consultation Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreateConsultation = useCallback(async (record: ConsultationRecord) => {
    setConsultations((prev) => [record, ...prev]);
    try {
      const created = await consultationsApi.create({
        patientId: record.patientId,
        patientName: record.patientName,
        attendingDoctor: record.attendingDoctor,
        consultationDate: record.consultationDate,
        chiefComplaint: record.chiefComplaint,
        medicalHistory: record.medicalHistory,
        clinicalFindings: record.clinicalFindings,
        diagnosis: record.diagnosis,
        icdCode: record.icdCode,
        treatmentPlan: record.treatmentPlan,
        prescriptionDetails: record.prescriptionDetails,
        followUpDate: record.followUpDate,
        consultationNotes: record.consultationNotes,
        vitalSignId: record.vitalSignId,
      });
      setConsultations((prev) => prev.map((c) => (c.id === record.id ? created : c)));
      addToast('success', 'Consultation Saved', `Consultation record ${created.id} saved.`);
    } catch (err) {
      handleMutationError(err, 'Consultation Error');
    }
  }, [addToast, handleMutationError]);

  const handleAmendConsultation = useCallback(async (updated: ConsultationRecord) => {
    setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    try {
      const lastAmendment = updated.amendments[updated.amendments.length - 1];
      if (lastAmendment) {
        const fromServer = await consultationsApi.amend(updated.id, {
          reason: lastAmendment.reason,
          newDiagnosis: updated.diagnosis,
          newTreatmentPlan: updated.treatmentPlan,
          newPrescription: updated.prescriptionDetails,
        });
        setConsultations((prev) => prev.map((c) => (c.id === fromServer.id ? fromServer : c)));
        addToast('success', 'Amendment Documented', `Amendment successfully attached to consultation ${fromServer.id}.`);
      }
    } catch (err) {
      handleMutationError(err, 'Amendment Error');
    }
  }, [addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Services Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleAddService = useCallback(async (service: HealthcareService) => {
    setServices((prev) => [...prev, service]);
    try {
      const created = await servicesApi.create({
        name: service.name,
        category: service.category,
        description: service.description,
        schedule: service.schedule,
        assignedPersonnel: service.assignedPersonnel,
        status: service.status,
        dailyCapacity: service.dailyCapacity,
      });
      setServices((prev) => prev.map((s) => (s.id === service.id ? created : s)));
      addToast('success', 'Service Created', `Healthcare service ${created.name} registered.`);
    } catch (err) {
      handleMutationError(err, 'Service Error');
    }
  }, [addToast, handleMutationError]);

  const handleToggleServiceStatus = useCallback(async (id: string) => {
    const target = services.find((s) => s.id === id);
    const nextStatus: 'Active' | 'Inactive' = target?.status === 'Active' ? 'Inactive' : 'Active';
    // Optimistic toggle
    setServices((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: nextStatus } : s
      )
    );
    try {
      const updated = await servicesApi.updateStatus(id, nextStatus);
      setServices((prev) => prev.map((s) => (s.id === updated.id || s.id === id ? updated : s)));
      addToast('info', 'Service Status Updated', `${updated.name} status is now ${updated.status}.`);
    } catch (err) {
      handleMutationError(err, 'Service Status Error');
    }
  }, [services, addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Community Activity Handler
  // ──────────────────────────────────────────────────────────────────────────

  const handleAddActivity = useCallback(async (act: CommunityHealthActivity) => {
    setActivities((prev) => [act, ...prev]);
    try {
      const created = await communityApi.create({
        title: act.title,
        category: act.category,
        barangay: act.barangay,
        date: act.date,
        coordinator: act.coordinator,
        participantsCount: act.participantsCount,
        targetCount: act.targetCount,
        status: act.status,
        summaryNotes: act.summaryNotes,
      });
      setActivities((prev) => prev.map((a) => (a.id === act.id ? created : a)));
      addToast('success', 'Activity Scheduled', `Community activity ${created.title} created.`);
    } catch (err) {
      handleMutationError(err, 'Community Activity Error');
    }
  }, [addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Notifications Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handlePublishAnnouncement = useCallback(async (item: NotificationItem) => {
    setNotifications((prev) => [item, ...prev]);
    try {
      const created = await notificationsApi.create({
        title: item.title,
        message: item.message,
        type: item.type,
        targetRole: item.targetRole,
        targetPatientId: item.targetPatientId,
      });
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? created : n)));
      addToast('success', 'Announcement Published', `Notification broadcast to ${item.targetRole}.`);
    } catch (err) {
      handleMutationError(err, 'Notification Error');
    }
  }, [addToast, handleMutationError]);

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsApi.markRead(id);
    } catch (err) {
      handleMutationError(err, 'Notification Error');
    }
  }, [handleMutationError]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
      addToast('info', 'Notifications Marked Read', 'All notifications marked as read.');
    } catch (err) {
      handleMutationError(err, 'Notification Error');
    }
  }, [addToast, handleMutationError]);

  // ──────────────────────────────────────────────────────────────────────────
  // User Admin Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleAddUser = useCallback(async (newUser: UserAccount) => {
    setUsers((prev) => [...prev, newUser]);
    try {
      const created = await usersApi.create({
        fullName: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        password: 'Password123!', // Preset password matching backend bcrypt store
      });
      setUsers((prev) => prev.map((u) => (u.id === newUser.id ? created : u)));
      addToast('success', 'User Created', `User account created for ${created.name} (${created.role}).`);
    } catch (err) {
      handleMutationError(err, 'User Creation Error');
    }
  }, [addToast, handleMutationError]);

  const handleToggleUserStatus = useCallback(async (id: string) => {
    const target = users.find((u) => u.id === id);
    const nextStatus: 'Active' | 'Inactive' = target?.status === 'Active' ? 'Inactive' : 'Active';
    // Optimistic
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: nextStatus } : u
      )
    );
    try {
      const updated = await usersApi.updateStatus(id, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id || u.id === id ? updated : u)));
      addToast('info', 'User Status Updated', `${updated.name} account is now ${updated.status}.`);
    } catch (err) {
      handleMutationError(err, 'User Status Error');
    }
  }, [users, addToast, handleMutationError]);

  const handleUpdatePassword = useCallback((_userId: string) => {
    // Password update handled via authApi.updatePassword — UI triggers modal
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Loading state while restoring session
  // ──────────────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-display font-medium text-stone-600">
            Restoring session…
          </p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Public Landing Page (pre-auth) or Authentication Page
  // ──────────────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <LandingPage
        users={users}
        patients={patients}
        onSignInAsRole={handleSwitchRole}
        onPatientSelfRegister={async (newPatient, newAccount) => {
          await handlePatientSelfRegister({
            fullName: newPatient.fullName,
            email: (newAccount as UserAccount & { email?: string }).email ?? '',
            dateOfBirth: newPatient.dateOfBirth,
            sex: newPatient.sex,
            contactNumber: newPatient.contactNumber,
            address: newPatient.address,
            barangay: newPatient.barangay,
            password: 'Password123!',
            consentAccepted: true,
          });
        }}
        onLogin={handleLogin}
      />
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Compute Global Search Results
  // ──────────────────────────────────────────────────────────────────────────

  const searchResults: SearchResultItem[] = [];
  const q = globalSearchQuery.trim().toLowerCase();
  if (q.length > 0) {
    for (const p of patients) {
      if (
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.barangay.toLowerCase().includes(q)
      ) {
        searchResults.push({
          id: `sr-pat-${p.id}`,
          title: `${p.fullName} (${p.id})`,
          subtitle: `${p.age} yrs · ${p.sex} · ${p.barangay}`,
          category: 'Patient',
          targetModule: 'patients',
        });
      }
    }

    for (const apt of appointments) {
      if (
        apt.patientName.toLowerCase().includes(q) ||
        apt.id.toLowerCase().includes(q) ||
        apt.serviceName.toLowerCase().includes(q)
      ) {
        searchResults.push({
          id: `sr-apt-${apt.id}`,
          title: `${apt.id} · ${apt.patientName}`,
          subtitle: `${apt.serviceName} · ${apt.date} ${apt.timeSlot} (${apt.status})`,
          category: 'Appointment',
          targetModule: 'appointments',
        });
      }
    }

    for (const item of queue) {
      if (
        item.queueNumber.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q)
      ) {
        searchResults.push({
          id: `sr-que-${item.id}`,
          title: `Queue ${item.queueNumber} · ${item.patientName}`,
          subtitle: `${item.priority} · ${item.serviceName} (${item.status})`,
          category: 'Queue',
          targetModule: 'queue',
        });
      }
    }

    for (const srv of services) {
      if (srv.name.toLowerCase().includes(q) || srv.category.toLowerCase().includes(q)) {
        searchResults.push({
          id: `sr-srv-${srv.id}`,
          title: srv.name,
          subtitle: `${srv.category} · ${srv.schedule}`,
          category: 'Service',
          targetModule: 'services',
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Derived badge counts
  // ──────────────────────────────────────────────────────────────────────────

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const waitingQueueCount = queue.filter(
    (item) => item.status === 'Waiting' || item.status === 'Called'
  ).length;
  const pendingAppointmentsCount = appointments.filter((a) => a.status === 'Pending').length;

  const safeUser = currentUser!;

  // ──────────────────────────────────────────────────────────────────────────
  // Main Layout
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900">
      {/* Left Workspace Navigation Sidebar */}
      <Sidebar
        currentUser={safeUser}
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
        unreadNotificationsCount={unreadNotificationsCount}
        waitingQueueCount={waitingQueueCount}
        pendingAppointmentsCount={pendingAppointmentsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Search Bar Top Header */}
        <header className="h-16 bg-white border-b-2 border-stone-900 px-4 sm:px-6 flex items-center justify-between gap-4 no-print relative z-20">
          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="md:hidden px-3 py-2 text-xs font-display font-bold text-stone-900 bg-stone-100 border border-stone-300 shrink-0"
          >
            Menu
          </button>

          {/* Global Command Search Bar */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Global search for patients, appointments, queue tickets, or services"
              value={globalSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search patients (CHC-2026-...), appointments, queue numbers (Q-002), or healthcare services..."
              className="w-full h-10 pl-10 pr-9 text-xs font-display font-medium text-stone-900 bg-stone-100 border-2 border-stone-300 focus:bg-white focus:border-indigo-700 focus:outline-none transition-colors"
            />
            {globalSearchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setGlobalSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Instant Search Results Dropdown */}
            {searchFocused && q.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-stone-900 shadow-lg max-h-80 overflow-y-auto z-50">
                <div className="px-3.5 py-2 bg-stone-900 text-white text-[11px] font-display font-bold flex items-center justify-between">
                  <span>Search Results ({searchResults.length})</span>
                  <button
                    type="button"
                    onClick={() => setSearchFocused(false)}
                    className="text-stone-300 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-xs text-stone-500 text-center">
                    No matching patients, appointments, queue tickets, or services found for &ldquo;{globalSearchQuery}&rdquo;.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200">
                    {searchResults.slice(0, 8).map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          setActiveModule(res.targetModule);
                          setSearchFocused(false);
                          setGlobalSearchQuery('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-stone-100 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-display font-bold text-stone-900 truncate">
                            {res.title}
                          </div>
                          <div className="text-xs text-stone-500 truncate">{res.subtitle}</div>
                        </div>
                        <span className="text-[11px] font-mono-tabular font-semibold text-indigo-700 shrink-0 flex items-center gap-1">
                          <span>{res.category}</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Header Right: API status indicator + Auth Portal */}
          <div className="flex items-center gap-3 shrink-0">
            {/* API connectivity badge */}
            <span
              title={apiAvailable ? 'Connected to backend API' : 'Backend API unavailable — using local state'}
              className={`hidden sm:flex items-center gap-1.5 text-[11px] font-display font-semibold px-2 py-1 border ${
                apiAvailable && isOnline
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-red-700 bg-red-50 border-red-200'
              }`}
            >
              {apiAvailable && isOnline ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {apiAvailable && isOnline ? 'Live' : 'Offline'}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 text-xs font-display font-bold text-white bg-stone-900 hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Viewport Canvas */}
        <main
          onClick={() => {
            if (searchFocused) setSearchFocused(false);
          }}
          className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto"
        >
          {isDataLoading && (
            <div
              role="status"
              className="mb-4 p-3 bg-indigo-50 border-2 border-indigo-700 rounded-none flex items-center justify-between text-xs text-indigo-900"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-medium font-display">Synchronizing health center records with backend database...</span>
              </div>
              <span className="text-[11px] font-mono-tabular text-indigo-600 font-semibold">Live Data Fetch</span>
            </div>
          )}
          {activeModule === 'dashboard' && (
            <DashboardView
              currentUser={safeUser}
              patients={patients}
              appointments={appointments}
              queue={queue}
              vitals={vitals}
              consultations={consultations}
              services={services}
              notifications={notifications}
              auditLogs={auditLogs}
              onNavigate={setActiveModule}
            />
          )}

          {activeModule === 'patients' && (
            <PatientModule
              currentUser={safeUser}
              patients={patients}
              onRegisterPatient={handleRegisterPatient}
              onUpdatePatient={handleUpdatePatient}
            />
          )}

          {activeModule === 'appointments' && (
            <AppointmentModule
              currentUser={safeUser}
              appointments={appointments}
              patients={patients}
              services={services}
              onCreateAppointment={handleCreateAppointment}
              onUpdateStatus={handleUpdateAppointmentStatus}
              onCheckInToQueue={handleCheckInAppointmentToQueue}
            />
          )}

          {activeModule === 'queue' && (
            <QueueModule
              currentUser={safeUser}
              queue={queue}
              patients={patients}
              services={services}
              onAddQueueEntry={handleAddQueueEntry}
              onUpdateQueueStatus={handleUpdateQueueStatus}
            />
          )}

          {activeModule === 'vitals' && (
            <VitalSignsModule
              currentUser={safeUser}
              vitals={vitals}
              patients={patients}
              onRecordVitals={handleRecordVitals}
            />
          )}

          {activeModule === 'consultations' && (
            <ConsultationModule
              currentUser={safeUser}
              consultations={consultations}
              patients={patients}
              vitals={vitals}
              onCreateConsultation={handleCreateConsultation}
              onAmendConsultation={handleAmendConsultation}
            />
          )}

          {activeModule === 'services' && (
            <ServicesModule
              currentUser={safeUser}
              services={services}
              onAddService={handleAddService}
              onToggleServiceStatus={handleToggleServiceStatus}
            />
          )}

          {activeModule === 'monitoring' && (
            <CommunityMonitoringModule
              currentUser={safeUser}
              patients={patients}
              consultations={consultations}
              vitals={vitals}
              activities={activities}
              onAddActivity={handleAddActivity}
            />
          )}

          {activeModule === 'reports' && (
            <ReportsModule
              currentUser={safeUser}
              patients={patients}
              appointments={appointments}
              consultations={consultations}
              vitals={vitals}
              activities={activities}
            />
          )}

          {activeModule === 'notifications' && (
            <NotificationsModule
              currentUser={safeUser}
              notifications={notifications}
              onPublishAnnouncement={handlePublishAnnouncement}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          )}

          {activeModule === 'users' && (
            <UserAdminModule
              currentUser={safeUser}
              users={users}
              onAddUser={handleAddUser}
              onToggleUserStatus={handleToggleUserStatus}
              onUpdatePassword={handleUpdatePassword}
            />
          )}

          {activeModule === 'audit' && <AuditLogsModule logs={auditLogs} />}
        </main>

        {/* Quiet Institutional Footer */}
        <footer className="px-6 py-4 border-t border-stone-300 bg-white text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2 no-print">
          <span>San Roque Community Health Center · Patient Management System</span>
          <span>Compliant with the Philippine Data Privacy Act of 2012 (RA 10173)</span>
        </footer>
      </div>
      {/* Visible Feedback Toasts (RFC 7807 problem details) */}
      <aside aria-label="Notifications" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto shadow-xl rounded-none p-3.5 border-2 border-stone-900 flex items-start gap-3 transition-all ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : toast.type === 'info'
                ? 'bg-sky-50 border-sky-300 text-sky-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-display font-bold">{toast.title}</div>
              <div className="text-xs mt-0.5 leading-relaxed break-words">{toast.message}</div>
            </div>
            <button
              type="button"
              aria-label="Close notification"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-stone-400 hover:text-stone-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </aside>
    </div>
  );
}
