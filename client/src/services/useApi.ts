/**
 * useApi.ts — Lightweight data-fetching hooks for CHC modules
 *
 * Each hook encapsulates: loading, error, data, and a refetch trigger.
 * Mutations return a result so callers can optimistically update or
 * show success/error toasts without full re-renders.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
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
  reportsApi,
  ApiError,
  type DashboardStats,
  type PaginatedMeta,
} from './api';
import type {
  Patient,
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
  UserAccount,
} from '../types/health';

// ──────────────────────────────────────────────────────────────────────────────
// Generic async state helper
// ──────────────────────────────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function useAsync<T>(initialData: T) {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: true,
    error: null,
  });

  const setData = useCallback((data: T) => setState({ data, loading: false, error: null }), []);
  const setError = useCallback(
    (msg: string) => setState((s) => ({ ...s, loading: false, error: msg })),
    []
  );
  const setLoading = useCallback(() => setState((s) => ({ ...s, loading: true, error: null })), []);

  return { state, setData, setError, setLoading };
}

// ──────────────────────────────────────────────────────────────────────────────
// usePatients
// ──────────────────────────────────────────────────────────────────────────────

export function usePatients(params?: {
  search?: string;
  barangay?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { state, setData, setError, setLoading } = useAsync<{
    patients: Patient[];
    meta: PaginatedMeta;
  }>({ patients: [], meta: { page: 1, limit: 20, total: 0 } });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    patientsApi
      .list(params)
      .then((res) => {
        if (!cancelled) setData({ patients: res.data, meta: res.meta });
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.search, params?.barangay, params?.status, params?.page]);

  const registerPatient = useCallback(async (payload: Omit<Patient, 'id' | 'age'>) => {
    const created = await patientsApi.create(payload);
    refetch();
    return created;
  }, [refetch]);

  const updatePatient = useCallback(async (id: string, payload: Partial<Patient>) => {
    const updated = await patientsApi.update(id, payload);
    refetch();
    return updated;
  }, [refetch]);

  return {
    patients: state.data.patients,
    meta: state.data.meta,
    loading: state.loading,
    error: state.error,
    refetch,
    registerPatient,
    updatePatient,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useAppointments
// ──────────────────────────────────────────────────────────────────────────────

export function useAppointments(params?: {
  status?: string;
  patientId?: string;
  date?: string;
  page?: number;
}) {
  const { state, setData, setError, setLoading } = useAsync<{
    appointments: Appointment[];
    meta: PaginatedMeta;
  }>({ appointments: [], meta: { page: 1, limit: 20, total: 0 } });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    appointmentsApi
      .list(params)
      .then((res) => {
        if (!cancelled) setData({ appointments: res.data, meta: res.meta });
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.status, params?.patientId, params?.page]);

  const createAppointment = useCallback(
    async (payload: {
      patientId: string;
      serviceId: string;
      scheduledDate: string;
      timeSlot: string;
      assignedPersonnel: string;
      reason: string;
    }) => {
      const created = await appointmentsApi.create(payload);
      refetch();
      return created;
    },
    [refetch]
  );

  const updateStatus = useCallback(
    async (id: string, status: AppointmentStatus, reason?: string) => {
      const updated = await appointmentsApi.updateStatus(id, status, reason);
      refetch();
      return updated;
    },
    [refetch]
  );

  const checkInToQueue = useCallback(
    async (id: string) => {
      const entry = await appointmentsApi.checkIn(id);
      refetch();
      return entry;
    },
    [refetch]
  );

  return {
    appointments: state.data.appointments,
    meta: state.data.meta,
    loading: state.loading,
    error: state.error,
    refetch,
    createAppointment,
    updateStatus,
    checkInToQueue,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useQueue
// ──────────────────────────────────────────────────────────────────────────────

export function useQueue(params?: { status?: string }) {
  const { state, setData, setError, setLoading } = useAsync<QueueEntry[]>([]);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    queueApi
      .list(params)
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.status]);

  const addEntry = useCallback(
    async (payload: {
      patientId: string;
      serviceName: string;
      priority: string;
      assignedRoom?: string;
    }) => {
      const entry = await queueApi.add(payload);
      refetch();
      return entry;
    },
    [refetch]
  );

  const updateStatus = useCallback(
    async (id: string, status: QueueStatus) => {
      const entry = await queueApi.updateStatus(id, status);
      refetch();
      return entry;
    },
    [refetch]
  );

  return {
    queue: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    addEntry,
    updateStatus,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useVitals
// ──────────────────────────────────────────────────────────────────────────────

export function useVitals(params?: { patientId?: string; page?: number }) {
  const { state, setData, setError, setLoading } = useAsync<{
    vitals: VitalSignRecord[];
    meta: PaginatedMeta;
  }>({ vitals: [], meta: { page: 1, limit: 20, total: 0 } });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    vitalsApi
      .list(params)
      .then((res) => {
        if (!cancelled) setData({ vitals: res.data, meta: res.meta });
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.patientId, params?.page]);

  const recordVitals = useCallback(
    async (payload: Omit<VitalSignRecord, 'id'>) => {
      const record = await vitalsApi.create(payload);
      refetch();
      return record;
    },
    [refetch]
  );

  return {
    vitals: state.data.vitals,
    meta: state.data.meta,
    loading: state.loading,
    error: state.error,
    refetch,
    recordVitals,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useConsultations
// ──────────────────────────────────────────────────────────────────────────────

export function useConsultations(params?: { patientId?: string; page?: number }) {
  const { state, setData, setError, setLoading } = useAsync<{
    consultations: ConsultationRecord[];
    meta: PaginatedMeta;
  }>({ consultations: [], meta: { page: 1, limit: 20, total: 0 } });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    consultationsApi
      .list(params)
      .then((res) => {
        if (!cancelled) setData({ consultations: res.data, meta: res.meta });
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.patientId, params?.page]);

  const createConsultation = useCallback(
    async (payload: Omit<ConsultationRecord, 'id' | 'amendments'>) => {
      const record = await consultationsApi.create(payload);
      refetch();
      return record;
    },
    [refetch]
  );

  const amendConsultation = useCallback(
    async (
      id: string,
      payload: { reason: string; diagnosis: string; treatmentPlan: string }
    ) => {
      const record = await consultationsApi.amend(id, payload);
      refetch();
      return record;
    },
    [refetch]
  );

  return {
    consultations: state.data.consultations,
    meta: state.data.meta,
    loading: state.loading,
    error: state.error,
    refetch,
    createConsultation,
    amendConsultation,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useServices
// ──────────────────────────────────────────────────────────────────────────────

export function useServices() {
  const { state, setData, setError, setLoading } = useAsync<HealthcareService[]>([]);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    servicesApi
      .list()
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const addService = useCallback(
    async (payload: Omit<HealthcareService, 'id'>) => {
      const svc = await servicesApi.create(payload);
      refetch();
      return svc;
    },
    [refetch]
  );

  const toggleStatus = useCallback(
    async (id: string) => {
      const svc = await servicesApi.toggleStatus(id);
      refetch();
      return svc;
    },
    [refetch]
  );

  return {
    services: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    addService,
    toggleStatus,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useCommunity
// ──────────────────────────────────────────────────────────────────────────────

export function useCommunity() {
  const { state, setData, setError, setLoading } = useAsync<CommunityHealthActivity[]>([]);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    communityApi
      .list()
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const addActivity = useCallback(
    async (payload: Omit<CommunityHealthActivity, 'id'>) => {
      const act = await communityApi.create(payload);
      refetch();
      return act;
    },
    [refetch]
  );

  return {
    activities: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    addActivity,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useNotifications
// ──────────────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const { state, setData, setError, setLoading } = useAsync<NotificationItem[]>([]);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    notificationsApi
      .list()
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const publishAnnouncement = useCallback(
    async (payload: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
      const notif = await notificationsApi.create(payload);
      refetch();
      return notif;
    },
    [refetch]
  );

  const markRead = useCallback(
    async (id: string) => {
      await notificationsApi.markRead(id);
      refetch();
    },
    [refetch]
  );

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    refetch();
  }, [refetch]);

  return {
    notifications: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    publishAnnouncement,
    markRead,
    markAllRead,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useAuditLogs
// ──────────────────────────────────────────────────────────────────────────────

export function useAuditLogs(params?: { page?: number; limit?: number }) {
  const { state, setData, setError, setLoading } = useAsync<{
    logs: AuditLogEntry[];
    meta: PaginatedMeta;
  }>({ logs: [], meta: { page: 1, limit: 50, total: 0 } });

  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    auditLogsApi
      .list(params)
      .then((res) => {
        if (!cancelled) setData({ logs: res.data, meta: res.meta });
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, params?.page]);

  return {
    logs: state.data.logs,
    meta: state.data.meta,
    loading: state.loading,
    error: state.error,
    refetch,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useUsers
// ──────────────────────────────────────────────────────────────────────────────

export function useUsers() {
  const { state, setData, setError, setLoading } = useAsync<UserAccount[]>([]);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    usersApi
      .list()
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const addUser = useCallback(
    async (payload: {
      fullName: string;
      email: string;
      role: string;
      department: string;
      password: string;
    }) => {
      const user = await usersApi.create(payload);
      refetch();
      return user;
    },
    [refetch]
  );

  const toggleStatus = useCallback(
    async (id: string) => {
      const user = await usersApi.toggleStatus(id);
      refetch();
      return user;
    },
    [refetch]
  );

  return {
    users: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
    addUser,
    toggleStatus,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// useDashboard
// ──────────────────────────────────────────────────────────────────────────────

export function useDashboard() {
  const { state, setData, setError, setLoading } = useAsync<DashboardStats | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // Auto-refresh dashboard every 30 seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading();
    reportsApi
      .dashboard()
      .then((data) => {
        if (!cancelled) setData(data);
      })
      .catch((err: ApiError | Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    stats: state.data,
    loading: state.loading,
    error: state.error,
    refetch,
  };
}

