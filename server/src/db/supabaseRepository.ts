/**
 * supabaseRepository.ts — Live Production Repository for Supabase (PostgreSQL 17)
 *
 * Responsibilities:
 *  - Load initial state from live Supabase database on server startup
 *  - Provide instant read-through cached DataStore
 *  - Asynchronously persist all creates, updates, and deletes directly into Supabase tables
 *  - Fall back gracefully to in-memory state if remote connection is temporarily unavailable
 */

import crypto from 'crypto';
import { pool, isDbConnected } from './index.js';

function ensureUuid(id?: string | null): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}
import type { DataStore } from './mockStore.js';
import { createInitialDataStore } from './mockStore.js';
import type {
  PatientEntity,
  AppointmentEntity,
  QueueEntryEntity,
  VitalSignEntity,
  ConsultationEntity,
  HealthcareServiceEntity,
  CommunityActivityEntity,
  NotificationEntity,
  AuditLogEntity,
  UserAccountEntity,
} from '../types/index.js';

export class SupabaseDataRepository {
  private store: DataStore;
  private isLoadedFromDb = false;

  constructor() {
    this.store = createInitialDataStore();
  }

  public getStore(): DataStore {
    return this.store;
  }

  public isLiveDb(): boolean {
    return this.isLoadedFromDb && isDbConnected();
  }

  /**
   * Load all tables from Supabase into active DataStore
   */
  public async loadFromSupabase(): Promise<boolean> {
    let client;
    try {
      console.log('[Supabase Repository] Hydrating state from live Supabase tables...');
      client = await pool.connect();

      const patientsRes = await client.query('SELECT * FROM patients ORDER BY registration_date DESC, created_at DESC');
      const usersRes = await client.query('SELECT * FROM user_accounts ORDER BY user_code ASC');
      const servicesRes = await client.query('SELECT * FROM healthcare_services ORDER BY service_code ASC');
      const aptsRes = await client.query('SELECT * FROM appointments ORDER BY scheduled_date DESC, created_at DESC');
      const queueRes = await client.query('SELECT * FROM queue_entries ORDER BY priority_weight ASC, arrival_time ASC');
      const vitalsRes = await client.query('SELECT * FROM vital_signs ORDER BY recorded_at DESC');
      const consultationsRes = await client.query('SELECT * FROM consultations ORDER BY consultation_date DESC, created_at DESC');
      const amendmentsRes = await client.query('SELECT * FROM consultation_amendments ORDER BY amended_at ASC');
      const activitiesRes = await client.query('SELECT * FROM community_activities ORDER BY activity_date DESC');
      const notifsRes = await client.query('SELECT * FROM notifications ORDER BY created_at DESC');
      const auditsRes = await client.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');

      // 1. Map Patients
      if (patientsRes.rows.length > 0) {
        this.store.patients = patientsRes.rows.map((r) => ({
          id: r.id,
          patientCode: r.patient_code,
          fullName: r.full_name,
          dateOfBirth: typeof r.date_of_birth === 'string' ? r.date_of_birth : r.date_of_birth.toISOString().split('T')[0],
          age: Math.max(0, new Date().getFullYear() - new Date(r.date_of_birth).getFullYear()),
          sex: r.sex,
          civilStatus: r.civil_status,
          contactNumber: r.contact_number,
          email: r.email,
          address: r.address,
          barangay: r.barangay,
          emergencyContactName: r.emergency_contact_name,
          emergencyContactNumber: r.emergency_contact_number,
          bloodType: r.blood_type,
          allergies: r.allergies,
          status: r.status,
          registrationDate: typeof r.registration_date === 'string' ? r.registration_date : r.registration_date.toISOString().split('T')[0],
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }));
      }

      // 2. Map Users
      if (usersRes.rows.length > 0) {
        this.store.users = usersRes.rows.map((r) => ({
          id: r.id,
          userCode: r.user_code,
          fullName: r.full_name,
          email: r.email,
          passwordHash: r.password_hash,
          role: r.role,
          department: r.department,
          status: r.status,
          patientId: r.patient_id,
          lastLoginAt: r.last_login_at ? (typeof r.last_login_at === 'string' ? r.last_login_at : r.last_login_at.toISOString()) : null,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }));
      }

      // 3. Map Services
      if (servicesRes.rows.length > 0) {
        this.store.services = servicesRes.rows.map((r) => ({
          id: r.id,
          serviceCode: r.service_code,
          name: r.name,
          category: r.category,
          description: r.description,
          schedule: r.schedule,
          assignedPersonnelId: r.assigned_personnel_id,
          assignedPersonnelName: r.assigned_personnel_name,
          dailyCapacity: r.daily_capacity,
          status: r.status,
          createdAt: r.created_at?.toISOString() || new Date().toISOString(),
          updatedAt: r.updated_at?.toISOString() || new Date().toISOString(),
        }));
      }

      // 4. Map Appointments
      if (aptsRes.rows.length > 0) {
        this.store.appointments = aptsRes.rows.map((r) => {
          const patient = this.store.patients.find((p) => p.id === r.patient_id);
          const service = this.store.services.find((s) => s.id === r.service_id);
          return {
            id: r.id,
            appointmentCode: r.appointment_code,
            patientId: r.patient_id,
            patientName: patient?.fullName || 'Registered Patient',
            serviceId: r.service_id,
            serviceName: service?.name || 'Primary Care Service',
            scheduledDate: typeof r.scheduled_date === 'string' ? r.scheduled_date : r.scheduled_date.toISOString().split('T')[0],
            timeSlot: r.time_slot,
            assignedPersonnel: r.assigned_personnel,
            status: r.status,
            reason: r.reason,
            cancellationReason: r.cancellation_reason,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };
        });
      }

      // 5. Map Queue
      if (queueRes.rows.length > 0) {
        this.store.queue = queueRes.rows.map((r) => {
          const patient = this.store.patients.find((p) => p.id === r.patient_id);
          return {
            id: r.id,
            queueNumber: r.queue_number,
            queueDate: typeof r.queue_date === 'string' ? r.queue_date : r.queue_date.toISOString().split('T')[0],
            patientId: r.patient_id,
            patientName: patient?.fullName || 'Queue Patient',
            serviceId: r.service_id,
            serviceName: r.service_name,
            priority: r.priority,
            priorityWeight: r.priority_weight,
            status: r.status,
            source: r.source,
            assignedRoom: r.assigned_room,
            arrivalTime: r.arrival_time,
            calledAt: r.called_at ? (typeof r.called_at === 'string' ? r.called_at : r.called_at.toISOString()) : null,
            completedAt: r.completed_at ? (typeof r.completed_at === 'string' ? r.completed_at : r.completed_at.toISOString()) : null,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };
        });
      }

      // 6. Map Vitals
      if (vitalsRes.rows.length > 0) {
        this.store.vitals = vitalsRes.rows.map((r) => {
          const patient = this.store.patients.find((p) => p.id === r.patient_id);
          return {
            id: r.id,
            vitalCode: r.vital_code,
            patientId: r.patient_id,
            patientName: patient?.fullName || 'Patient',
            recordedById: r.recorded_by_id,
            recordedByName: r.recorded_by_name,
            recordedAt: typeof r.recorded_at === 'string' ? r.recorded_at : r.recorded_at.toISOString(),
            systolic: r.systolic,
            diastolic: r.diastolic,
            temperatureC: parseFloat(r.temperature_c),
            heartRateBpm: r.heart_rate_bpm,
            respiratoryRate: r.respiratory_rate,
            weightKg: parseFloat(r.weight_kg),
            heightCm: parseFloat(r.height_cm),
            bmi: parseFloat(r.bmi),
            bmiCategory: r.bmi_category,
            nursingNotes: r.nursing_notes,
            followUpRequired: r.follow_up_required,
            createdAt: r.created_at.toISOString(),
          };
        });
      }

      // 7. Map Consultations & Amendments
      if (consultationsRes.rows.length > 0) {
        const amendmentsMap: Record<string, ConsultationEntity['amendments']> = {};
        amendmentsRes.rows.forEach((a) => {
          if (!amendmentsMap[a.consultation_id]) amendmentsMap[a.consultation_id] = [];
          const list = amendmentsMap[a.consultation_id]!;
          list.push({
            id: a.id,
            consultationId: a.consultation_id,
            amendedAt: typeof a.amended_at === 'string' ? a.amended_at : a.amended_at.toISOString(),
            amendedById: a.amended_by_id,
            amendedByName: a.amended_by_name,
            reason: a.reason,
            previousDiagnosis: a.previous_diagnosis,
            previousTreatmentPlan: a.previous_treatment_plan,
            previousPrescription: a.previous_prescription,
            newDiagnosis: a.new_diagnosis,
            newTreatmentPlan: a.new_treatment_plan,
            newPrescription: a.new_prescription,
            createdAt: a.created_at.toISOString(),
          });
        });

        this.store.consultations = consultationsRes.rows.map((r) => {
          const patient = this.store.patients.find((p) => p.id === r.patient_id);
          return {
            id: r.id,
            consultationCode: r.consultation_code,
            patientId: r.patient_id,
            patientName: patient?.fullName || 'Patient',
            attendingDoctorId: r.attending_doctor_id,
            attendingDoctorName: r.attending_doctor_name,
            vitalSignId: r.vital_sign_id,
            consultationDate: typeof r.consultation_date === 'string' ? r.consultation_date : r.consultation_date.toISOString().split('T')[0],
            chiefComplaint: r.chief_complaint,
            medicalHistory: r.medical_history,
            clinicalFindings: r.clinical_findings,
            diagnosis: r.diagnosis,
            icdCode: r.icd_code,
            treatmentPlan: r.treatment_plan,
            prescriptionDetails: r.prescription_details,
            followUpDate: r.follow_up_date ? (typeof r.follow_up_date === 'string' ? r.follow_up_date : r.follow_up_date.toISOString().split('T')[0]) : null,
            consultationNotes: r.consultation_notes,
            amendments: amendmentsMap[r.id] || [],
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };
        });
      }

      // 8. Map Community Activities
      if (activitiesRes.rows.length > 0) {
        this.store.communityActivities = activitiesRes.rows.map((r) => ({
          id: r.id,
          activityCode: r.activity_code,
          title: r.title,
          category: r.category,
          barangay: r.barangay,
          activityDate: typeof r.activity_date === 'string' ? r.activity_date : r.activity_date.toISOString().split('T')[0],
          coordinatorId: r.coordinator_id,
          coordinatorName: r.coordinator_name,
          participantsCount: r.participants_count,
          targetCount: r.target_count,
          status: r.status,
          summaryNotes: r.summary_notes,
          createdAt: r.created_at.toISOString(),
          updatedAt: r.updated_at.toISOString(),
        }));
      }

      // 9. Map Notifications
      if (notifsRes.rows.length > 0) {
        this.store.notifications = notifsRes.rows.map((r) => ({
          id: r.id,
          notificationCode: r.notification_code,
          title: r.title,
          message: r.message,
          type: r.type,
          targetRole: r.target_role,
          targetPatientId: r.target_patient_id,
          isRead: r.is_read,
          createdAt: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
        }));
      }

      // 10. Map Audit Logs
      if (auditsRes.rows.length > 0) {
        this.store.auditLogs = auditsRes.rows.map((r) => ({
          id: r.id,
          logCode: r.log_code,
          timestamp: typeof r.timestamp === 'string' ? r.timestamp : r.timestamp.toISOString(),
          actorId: r.actor_id,
          actorName: r.actor_name,
          actorRole: r.actor_role,
          actionType: r.action_type,
          module: r.module,
          targetEntityId: r.target_entity_id,
          details: r.details,
          ipAddress: r.ip_address,
          createdAt: r.created_at.toISOString(),
        }));
      }

      this.isLoadedFromDb = true;
      console.log(`[Supabase Repository] ✓ Successfully synchronized from Supabase:`);
      console.log(`  - Patients: ${this.store.patients.length}`);
      console.log(`  - User Accounts: ${this.store.users.length}`);
      console.log(`  - Healthcare Services: ${this.store.services.length}`);
      console.log(`  - Appointments: ${this.store.appointments.length}`);
      console.log(`  - Queue Entries: ${this.store.queue.length}`);
      console.log(`  - Vital Signs: ${this.store.vitals.length}`);
      console.log(`  - Consultations: ${this.store.consultations.length}`);
      return true;
    } catch (err) {
      console.warn('[Supabase Repository] Hydration warning (%s). Falling back to cached state.', err instanceof Error ? err.message : err);
      return false;
    } finally {
      if (client) client.release();
    }
  }

  /**
   * Persist a patient into Supabase
   */
  public async persistPatient(p: PatientEntity): Promise<void> {
    if (!isDbConnected()) return;
    p.id = ensureUuid(p.id);
    try {
      await pool.query(
        `INSERT INTO patients (
          id, patient_code, full_name, date_of_birth, sex, civil_status,
          contact_number, email, address, barangay, emergency_contact_name,
          emergency_contact_number, blood_type, allergies, status, registration_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (patient_code) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          contact_number = EXCLUDED.contact_number,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          barangay = EXCLUDED.barangay,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          p.id,
          p.patientCode,
          p.fullName,
          p.dateOfBirth,
          p.sex,
          p.civilStatus,
          p.contactNumber,
          p.email || null,
          p.address,
          p.barangay,
          p.emergencyContactName,
          p.emergencyContactNumber,
          p.bloodType || 'Unknown',
          p.allergies || 'None known',
          p.status,
          p.registrationDate,
        ]
      );
      console.log(`[Supabase DB] Persisted patient ${p.patientCode} (${p.fullName})`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Patients]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist an appointment into Supabase
   */
  public async persistAppointment(a: AppointmentEntity): Promise<void> {
    if (!isDbConnected()) return;
    a.id = ensureUuid(a.id);
    const patient = this.store.patients.find((p) => p.id === a.patientId || p.patientCode === a.patientId);
    const patId = patient ? ensureUuid(patient.id) : ensureUuid(a.patientId);
    const service = this.store.services.find((s) => s.id === a.serviceId || s.serviceCode === a.serviceId);
    const svcId = service ? ensureUuid(service.id) : ensureUuid(a.serviceId);

    try {
      await pool.query(
        `INSERT INTO appointments (
          id, appointment_code, patient_id, service_id, scheduled_date,
          time_slot, assigned_personnel, status, reason, cancellation_reason
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (appointment_code) DO UPDATE SET
          status = EXCLUDED.status,
          cancellation_reason = EXCLUDED.cancellation_reason,
          updated_at = NOW()`,
        [
          a.id,
          a.appointmentCode,
          patId,
          svcId,
          a.scheduledDate,
          a.timeSlot,
          a.assignedPersonnel,
          a.status,
          a.reason,
          a.cancellationReason || null,
        ]
      );
      console.log(`[Supabase DB] Persisted appointment ${a.appointmentCode}`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Appointments]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist a queue entry into Supabase
   */
  public async persistQueueEntry(q: QueueEntryEntity): Promise<void> {
    if (!isDbConnected()) return;
    q.id = ensureUuid(q.id);
    const patient = this.store.patients.find((p) => p.id === q.patientId || p.patientCode === q.patientId);
    const patId = patient ? ensureUuid(patient.id) : ensureUuid(q.patientId);
    const svcId = q.serviceId ? ensureUuid(q.serviceId) : null;

    try {
      await pool.query(
        `INSERT INTO queue_entries (
          id, queue_number, queue_date, patient_id, service_id,
          service_name, priority, priority_weight, status, source,
          assigned_room, arrival_time
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          called_at = NOW(),
          updated_at = NOW()`,
        [
          q.id,
          q.queueNumber,
          q.queueDate,
          patId,
          svcId,
          q.serviceName,
          q.priority,
          q.priorityWeight,
          q.status,
          q.source,
          q.assignedRoom,
          q.arrivalTime,
        ]
      );
      console.log(`[Supabase DB] Persisted queue ticket ${q.queueNumber}`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Queue]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist a vital sign record into Supabase
   */
  public async persistVitalSign(v: VitalSignEntity): Promise<void> {
    if (!isDbConnected()) return;
    v.id = ensureUuid(v.id);
    const patient = this.store.patients.find((p) => p.id === v.patientId || p.patientCode === v.patientId);
    const patId = patient ? ensureUuid(patient.id) : ensureUuid(v.patientId);

    try {
      await pool.query(
        `INSERT INTO vital_signs (
          id, vital_code, patient_id, recorded_by_id, recorded_by_name,
          recorded_at, systolic, diastolic, temperature_c, heart_rate_bpm,
          respiratory_rate, weight_kg, height_cm, bmi, bmi_category,
          nursing_notes, follow_up_required
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (vital_code) DO NOTHING`,
        [
          v.id,
          v.vitalCode,
          patId,
          v.recordedById ? ensureUuid(v.recordedById) : null,
          v.recordedByName,
          v.recordedAt,
          v.systolic,
          v.diastolic,
          v.temperatureC,
          v.heartRateBpm,
          v.respiratoryRate,
          v.weightKg,
          v.heightCm,
          v.bmi,
          v.bmiCategory,
          v.nursingNotes,
          v.followUpRequired,
        ]
      );
      console.log(`[Supabase DB] Persisted vitals ${v.vitalCode}`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Vital Signs]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist a consultation record into Supabase
   */
  public async persistConsultation(c: ConsultationEntity): Promise<void> {
    if (!isDbConnected()) return;
    c.id = ensureUuid(c.id);
    const patient = this.store.patients.find((p) => p.id === c.patientId || p.patientCode === c.patientId);
    const patId = patient ? ensureUuid(patient.id) : ensureUuid(c.patientId);

    try {
      await pool.query(
        `INSERT INTO consultations (
          id, consultation_code, patient_id, attending_doctor_id,
          attending_doctor_name, vital_sign_id, consultation_date,
          chief_complaint, medical_history, clinical_findings,
          diagnosis, icd_code, treatment_plan, prescription_details,
          follow_up_date, consultation_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (consultation_code) DO UPDATE SET
          diagnosis = EXCLUDED.diagnosis,
          treatment_plan = EXCLUDED.treatment_plan,
          updated_at = NOW()`,
        [
          c.id,
          c.consultationCode,
          patId,
          c.attendingDoctorId ? ensureUuid(c.attendingDoctorId) : null,
          c.attendingDoctorName,
          c.vitalSignId ? ensureUuid(c.vitalSignId) : null,
          c.consultationDate,
          c.chiefComplaint,
          c.medicalHistory,
          c.clinicalFindings,
          c.diagnosis,
          c.icdCode,
          c.treatmentPlan,
          c.prescriptionDetails || null,
          c.followUpDate || null,
          c.consultationNotes,
        ]
      );
      console.log(`[Supabase DB] Persisted consultation ${c.consultationCode}`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Consultations]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist a user account into Supabase
   */
  public async persistUserAccount(u: UserAccountEntity): Promise<void> {
    if (!isDbConnected()) return;
    u.id = ensureUuid(u.id);
    const patId = u.patientId ? ensureUuid(u.patientId) : null;

    try {
      await pool.query(
        `INSERT INTO user_accounts (
          id, user_code, full_name, email, password_hash, role,
          department, status, patient_id, last_login_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          status = EXCLUDED.status,
          last_login_at = EXCLUDED.last_login_at,
          updated_at = NOW()`,
        [
          u.id,
          u.userCode,
          u.fullName,
          u.email,
          u.passwordHash,
          u.role,
          u.department,
          u.status,
          patId,
          u.lastLoginAt ? new Date(u.lastLoginAt) : null,
        ]
      );
      console.log(`[Supabase DB] Persisted user ${u.userCode} (${u.email})`);
    } catch (err) {
      console.warn('[Supabase Persist Error - User Accounts]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist a community activity into Supabase
   */
  public async persistCommunityActivity(act: CommunityActivityEntity): Promise<void> {
    if (!isDbConnected()) return;
    act.id = ensureUuid(act.id);
    const coordId = act.coordinatorId ? ensureUuid(act.coordinatorId) : null;

    try {
      await pool.query(
        `INSERT INTO community_activities (
          id, activity_code, title, category, barangay, activity_date,
          coordinator_id, coordinator_name, participants_count, target_count,
          status, summary_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (activity_code) DO UPDATE SET
          participants_count = EXCLUDED.participants_count,
          target_count = EXCLUDED.target_count,
          status = EXCLUDED.status,
          summary_notes = EXCLUDED.summary_notes,
          updated_at = NOW()`,
        [
          act.id,
          act.activityCode,
          act.title,
          act.category,
          act.barangay,
          act.activityDate,
          coordId,
          act.coordinatorName,
          act.participantsCount,
          act.targetCount,
          act.status,
          act.summaryNotes || null,
        ]
      );
      console.log(`[Supabase DB] Persisted community activity ${act.activityCode}`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Community Activities]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist a notification into Supabase
   */
  public async persistNotification(n: NotificationEntity): Promise<void> {
    if (!isDbConnected()) return;
    n.id = ensureUuid(n.id);
    const patId = n.targetPatientId ? ensureUuid(n.targetPatientId) : null;

    try {
      await pool.query(
        `INSERT INTO notifications (
          id, notification_code, title, message, type, target_role,
          target_patient_id, is_read
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (notification_code) DO UPDATE SET
          is_read = EXCLUDED.is_read`,
        [
          n.id,
          n.notificationCode,
          n.title,
          n.message,
          n.type,
          n.targetRole,
          patId,
          n.isRead,
        ]
      );
      console.log(`[Supabase DB] Persisted notification ${n.notificationCode}`);
    } catch (err) {
      console.warn('[Supabase Persist Error - Notifications]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Persist an audit log into Supabase
   */
  public async persistAuditLog(a: AuditLogEntity): Promise<void> {
    if (!isDbConnected()) return;
    a.id = ensureUuid(a.id);
    const actorId = a.actorId ? ensureUuid(a.actorId) : null;

    try {
      await pool.query(
        `INSERT INTO audit_logs (
          id, log_code, timestamp, actor_id, actor_name, actor_role,
          action_type, module, target_entity_id, details, ip_address
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (log_code) DO NOTHING`,
        [
          a.id,
          a.logCode,
          new Date(a.timestamp),
          actorId,
          a.actorName,
          a.actorRole,
          a.actionType,
          a.module,
          a.targetEntityId,
          a.details,
          a.ipAddress || null,
        ]
      );
    } catch (err) {
      console.warn('[Supabase Persist Error - Audit Logs]:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Reset store (used in testing)
   */
  public reset(): void {
    this.store = createInitialDataStore();
  }
}

export const supabaseRepository = new SupabaseDataRepository();
