import React from 'react';
import {
  Users,
  Calendar,
  ListOrdered,
  Stethoscope,
  Activity,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  UserAccount,
  Patient,
  Appointment,
  QueueEntry,
  VitalSignRecord,
  ConsultationRecord,
  HealthcareService,
  NotificationItem,
  AuditLogEntry,
  ModuleId,
} from '../types/health';

interface DashboardViewProps {
  currentUser: UserAccount;
  patients: Patient[];
  appointments: Appointment[];
  queue: QueueEntry[];
  vitals: VitalSignRecord[];
  consultations: ConsultationRecord[];
  services: HealthcareService[];
  notifications: NotificationItem[];
  auditLogs: AuditLogEntry[];
  onNavigate: (module: ModuleId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  patients,
  appointments,
  queue,
  vitals,
  consultations,
  services,
  notifications,
  auditLogs,
  onNavigate,
}) => {
  const role = currentUser.role;
  const todayDate = '2026-11-02';

  const todayAppointments = appointments.filter((a) => a.date === todayDate);
  const pendingAppointments = appointments.filter((a) => a.status === 'Pending');
  const activeQueue = queue.filter(
    (q) => q.status === 'Waiting' || q.status === 'Called' || q.status === 'In Consultation'
  );
  const nowServing = queue.find((q) => q.status === 'In Consultation' || q.status === 'Called');
  const completedConsultationsToday = consultations.filter(
    (c) => c.consultationDate === todayDate
  );

  // 1. PATIENT DASHBOARD (Section 10)
  if (role === 'patient') {
    const myPatientId = currentUser.patientId || 'CHC-2026-0101';
    const myProfile = patients.find((p) => p.id === myPatientId) || patients[0];
    const myAppointments = appointments.filter((a) => a.patientId === myPatientId);
    const myConsultations = consultations.filter((c) => c.patientId === myPatientId);
    const myVitals = vitals.filter((v) => v.patientId === myPatientId);
    const myNotifications = notifications.filter(
      (n) => n.targetRole === 'all' || n.targetPatientId === myPatientId
    );

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white border-2 border-stone-900 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Patient Portal</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular font-semibold text-indigo-700">{myProfile.id}</span>
              <span aria-hidden="true">·</span>
              <span>{myProfile.barangay}</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900">
              Good morning, {myProfile.fullName}
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              View your scheduled visits, permitted consultation records, and community health center announcements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Request Appointment</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('patients')}
              className="px-4 py-2.5 bg-white border-2 border-stone-900 hover:bg-stone-100 text-stone-900 text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0"
            >
              My Profile
            </button>
          </div>
        </div>

        {/* Key Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Upcoming Appointments</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {myAppointments.filter((a) => a.status === 'Confirmed' || a.status === 'Approved' || a.status === 'Pending').length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Next: Nov 2, 2026 · 09:00 AM</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Latest Blood Pressure</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {myVitals[0] ? `${myVitals[0].systolic}/${myVitals[0].diastolic}` : '—'}
              <span className="text-xs font-normal text-stone-500 ml-1">mmHg</span>
            </p>
            <p className="text-xs text-stone-500 mt-1">
              BMI {myVitals[0]?.bmi ?? '—'} · {myVitals[0]?.bmiCategory ?? 'Normal'}
            </p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Permitted Medical Records</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {myConsultations.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Chronological visit summaries</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Active Queue Ticket</p>
            <p className="text-2xl font-display font-bold text-indigo-700 font-mono-tabular mt-2">
              {queue.find((q) => q.patientId === myPatientId)?.queueNumber || 'None'}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {queue.find((q) => q.patientId === myPatientId)?.status || 'Not in today’s queue'}
            </p>
          </div>
        </div>

        {/* 2-Column Main Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 bg-white border border-stone-300 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <div>
                  <h2 className="text-base font-display font-bold text-stone-900">
                    My Appointments & Schedule
                  </h2>
                  <p className="text-xs text-stone-500">
                    Scheduled visits and past appointment statuses
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('appointments')}
                  className="text-xs font-display font-bold text-indigo-700 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-stone-200 mt-2">
                {myAppointments.map((apt) => (
                  <div key={apt.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-display font-bold text-stone-900">{apt.serviceName}</p>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span className="font-mono-tabular">{apt.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">{apt.timeSlot}</span>
                        <span aria-hidden="true">·</span>
                        <span>{apt.assignedPersonnel}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono-tabular font-bold text-stone-800">
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200">
              <h3 className="text-sm font-display font-bold text-stone-900 mb-2">
                Recent Permitted Medical Record Summary
              </h3>
              {myConsultations[0] ? (
                <div className="p-3.5 bg-stone-50 border border-stone-300">
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                    <span className="font-mono-tabular">{myConsultations[0].consultationDate}</span>
                    <span>{myConsultations[0].attendingDoctor}</span>
                  </div>
                  <p className="text-sm font-display font-bold text-stone-900">
                    Diagnosis: {myConsultations[0].diagnosis}
                  </p>
                  <p className="text-xs text-stone-600 mt-1">
                    Prescription: {myConsultations[0].prescriptionDetails}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-500">No consultation records found.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">
                Notifications & Announcements
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                All Alerts
              </button>
            </div>
            <div className="divide-y divide-stone-200 mt-2">
              {myNotifications.map((item) => (
                <div key={item.id} className="py-3.5">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-display font-bold text-indigo-700">{item.type}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{item.createdAt}</span>
                  </div>
                  <p className="text-sm font-display font-bold text-stone-900 mt-0.5">{item.title}</p>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. NURSE DASHBOARD (Section 10)
  if (role === 'nurse') {
    const followUpVitals = vitals.filter((v) => v.followUpRequired);

    return (
      <div className="space-y-6">
        <div className="bg-white border-2 border-stone-900 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Nursing & Triage Operations</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">Nov 2, 2026</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900">
              Nurse Assessment & Vital Signs Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Record patient vital signs, perform initial triage assessments, and track community health activities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('vitals')}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Activity className="w-4 h-4" />
              <span>Record Vital Signs</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('monitoring')}
              className="px-4 py-2.5 bg-white border-2 border-stone-900 hover:bg-stone-100 text-stone-900 text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0"
            >
              Community Health Log
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Awaiting Initial Assessment</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {queue.filter((q) => q.status === 'Waiting' || q.status === 'Called').length}
            </p>
            <p className="text-xs text-stone-500 mt-1">In active triage queue</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Vital Signs Recorded Today</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {vitals.filter((v) => v.recordedAt.startsWith(todayDate)).length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Automatic BMI calculated</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Follow-Up Monitoring Required</p>
            <p className="text-2xl font-display font-bold text-amber-700 font-mono-tabular mt-2">
              {followUpVitals.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Elevated BP or prenatal follow-up</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Assigned Nursing Services</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {services.filter((s) => s.assignedPersonnel.includes('Nurse')).length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Immunization, BP & Family Planning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">
                Patients Awaiting Triage & Vital Signs
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('queue')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                Manage Queue
              </button>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-300 text-xs font-display font-bold text-stone-500">
                    <th className="py-2.5 pr-3">Queue #</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-xs">
                  {activeQueue.map((q) => (
                    <tr key={q.id} className="hover:bg-stone-50">
                      <td className="py-3 pr-3 font-mono-tabular font-bold text-stone-900">
                        {q.queueNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-900">{q.patientName}</td>
                      <td className="py-3 px-3 text-stone-600">{q.priority}</td>
                      <td className="py-3 px-3 text-stone-600">{q.serviceName}</td>
                      <td className="py-3 pl-3 text-right font-display font-bold text-indigo-700">
                        {q.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">
                Recent Nursing Assessments
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('vitals')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                Open Vitals Module
              </button>
            </div>
            <div className="divide-y divide-stone-200 mt-2">
              {vitals.slice(0, 3).map((v) => (
                <div key={v.id} className="py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-bold text-stone-900">{v.patientName}</span>
                    <span className="text-xs font-mono-tabular text-stone-600">
                      BP {v.systolic}/{v.diastolic} · BMI {v.bmi}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{v.nursingNotes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. DOCTOR DASHBOARD (Section 10)
  if (role === 'doctor') {
    return (
      <div className="space-y-6">
        <div className="bg-white border-2 border-stone-900 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>Medical Consultation Workspace</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.name}</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900">
              Physician Consultation & Clinical Records Dashboard
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Review patient vital signs, document clinical findings, diagnoses, treatment plans, and prescriptions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('consultations')}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Stethoscope className="w-4 h-4" />
              <span>New Consultation Record</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('vitals')}
              className="px-4 py-2.5 bg-white border-2 border-stone-900 hover:bg-stone-100 text-stone-900 text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0"
            >
              Review Vital Signs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Today’s Consultation Schedule</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {todayAppointments.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Scheduled outpatient visits</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Patients Awaiting Consultation</p>
            <p className="text-2xl font-display font-bold text-indigo-700 font-mono-tabular mt-2">
              {activeQueue.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Now serving: {nowServing ? `${nowServing.queueNumber} (${nowServing.patientName})` : 'None'}
            </p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Consultations Documented</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {consultations.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Chronological EMR records</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Follow-Up Patients Scheduled</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {consultations.filter((c) => Boolean(c.followUpDate)).length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Active treatment monitoring</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">
                Recent Consultation & Diagnosis History
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('consultations')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                Open Consultations
              </button>
            </div>
            <div className="divide-y divide-stone-200 mt-2">
              {consultations.map((con) => (
                <div key={con.id} className="py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-bold text-stone-900">
                      {con.patientName}{' '}
                      <span className="text-xs font-mono-tabular text-stone-500">
                        ({con.patientId})
                      </span>
                    </span>
                    <span className="text-xs font-mono-tabular text-stone-500">
                      {con.consultationDate}
                    </span>
                  </div>
                  <p className="text-xs font-display font-bold text-indigo-700 mt-1">
                    {con.diagnosis} · ICD-10: {con.icdCode}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">{con.treatmentPlan}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">
                Today’s Triage Vital Signs
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('vitals')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                All Vitals
              </button>
            </div>
            <div className="divide-y divide-stone-200 mt-2">
              {vitals.slice(0, 3).map((v) => (
                <div key={v.id} className="py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-bold text-stone-900">{v.patientName}</span>
                    <span className="text-xs font-mono-tabular font-bold text-stone-900">
                      BP {v.systolic}/{v.diastolic} mmHg
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 font-mono-tabular">
                    <span>Temp {v.temperatureC}°C</span>
                    <span aria-hidden="true">·</span>
                    <span>HR {v.heartRateBpm} bpm</span>
                    <span aria-hidden="true">·</span>
                    <span>BMI {v.bmi} ({v.bmiCategory})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. ADMINISTRATOR DASHBOARD (Section 10)
  if (role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="bg-white border-2 border-stone-900 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span>System Administration & Governance</span>
              <span aria-hidden="true">·</span>
              <span>RA 10173 Data Privacy Compliant</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900">
              System Administrator Operations Overview
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Manage healthcare personnel accounts, role permissions, available health services, and audit logs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0"
            >
              Manage User Accounts
            </button>
            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className="px-4 py-2.5 bg-white border-2 border-stone-900 hover:bg-stone-100 text-stone-900 text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0"
            >
              Review Audit Logs
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Total Registered Patients</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {patients.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Centralized barangay registry</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Active Healthcare Services</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {services.filter((s) => s.status === 'Active').length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Configured service schedules</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Appointments & Consultations</p>
            <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
              {appointments.length} / {consultations.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Aggregate operational volume</p>
          </div>

          <div className="bg-white border border-stone-300 p-5">
            <p className="text-xs font-display font-semibold text-stone-500">Recorded Audit Events</p>
            <p className="text-2xl font-display font-bold text-indigo-700 font-mono-tabular mt-2">
              {auditLogs.length}
            </p>
            <p className="text-xs text-stone-500 mt-1">Clinical privacy boundary enforced</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">Recent System Activity & Audit Logs</h2>
              <button
                type="button"
                onClick={() => onNavigate('audit')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                Full Audit Trail
              </button>
            </div>
            <div className="divide-y divide-stone-200 mt-2">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-stone-900">
                      {log.actorName} ({log.actorRole})
                    </span>
                    <span className="font-mono-tabular text-stone-500">{log.timestamp}</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-stone-300 p-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 className="text-base font-display font-bold text-stone-900">Healthcare Services Summary</h2>
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="text-xs font-display font-bold text-indigo-700 hover:underline"
              >
                Configure Services
              </button>
            </div>
            <div className="divide-y divide-stone-200 mt-2">
              {services.slice(0, 4).map((srv) => (
                <div key={srv.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-display font-bold text-stone-900">{srv.name}</p>
                    <p className="text-xs text-stone-500">{srv.schedule}</p>
                  </div>
                  <span className="text-xs font-mono-tabular font-bold text-indigo-700">
                    {srv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. DEFAULT: HEALTH CENTER STAFF DASHBOARD (Section 10)
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-stone-900 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>Front Desk & Patient Operations</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Monday, Nov 2, 2026</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-stone-900">
            Health Center Staff Operations Dashboard
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage walk-in and new patient registration, daily appointment approvals, and live patient queue flow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('patients')}
            className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Patient Registration</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('queue')}
            className="px-4 py-2.5 bg-white border-2 border-stone-900 hover:bg-stone-100 text-stone-900 text-xs font-display font-bold transition-colors whitespace-nowrap shrink-0"
          >
            Manage Queue
          </button>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-300 p-5">
          <div className="flex items-center justify-between text-xs font-display font-semibold text-stone-500">
            <span>Total Registered Patients</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
            {patients.length}
          </p>
          <p className="text-xs text-stone-500 mt-1">Duplicate detection active</p>
        </div>

        <div className="bg-white border border-stone-300 p-5">
          <div className="flex items-center justify-between text-xs font-display font-semibold text-stone-500">
            <span>Today’s Appointments</span>
            <Calendar className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
            {todayAppointments.length}
          </p>
          <p className="text-xs text-amber-700 font-semibold mt-1">
            {pendingAppointments.length} pending requests awaiting review
          </p>
        </div>

        <div className="bg-white border border-stone-300 p-5">
          <div className="flex items-center justify-between text-xs font-display font-semibold text-stone-500">
            <span>Current Patient Queue</span>
            <ListOrdered className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-display font-bold text-indigo-700 font-mono-tabular mt-2">
            {activeQueue.length}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Now Serving: {nowServing ? nowServing.queueNumber : 'None'}
          </p>
        </div>

        <div className="bg-white border border-stone-300 p-5">
          <div className="flex items-center justify-between text-xs font-display font-semibold text-stone-500">
            <span>Completed Consultations</span>
            <CheckCircle2 className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-display font-bold text-stone-900 font-mono-tabular mt-2">
            {completedConsultationsToday.length}
          </p>
          <p className="text-xs text-stone-500 mt-1">Recorded today (Nov 2, 2026)</p>
        </div>
      </div>

      {/* Main 2-Column Split: Live Queue & Pending Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-stone-300 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div>
              <h2 className="text-base font-display font-bold text-stone-900">Active Patient Queue</h2>
              <p className="text-xs text-stone-500">
                Real-time patient flow across consultation and triage rooms
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('queue')}
              className="text-xs font-display font-bold text-indigo-700 hover:underline flex items-center gap-1"
            >
              <span>Open Queue Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-300 text-xs font-display font-bold text-stone-500">
                  <th className="py-2.5 pr-3">Queue #</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {queue.map((entry) => (
                  <tr key={entry.id} className="hover:bg-stone-50">
                    <td className="py-3 pr-3 font-mono-tabular font-bold text-stone-900">
                      {entry.queueNumber}
                    </td>
                    <td className="py-3 px-3 font-semibold text-stone-900">{entry.patientName}</td>
                    <td className="py-3 px-3 text-stone-600">{entry.priority}</td>
                    <td className="py-3 px-3 text-stone-600">{entry.serviceName}</td>
                    <td className="py-3 pl-3 text-right font-display font-bold text-stone-800">
                      {entry.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-stone-300 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div>
              <h2 className="text-base font-display font-bold text-stone-900">Pending Appointment Requests</h2>
              <p className="text-xs text-stone-500">Requires staff approval or scheduling review</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="text-xs font-display font-bold text-indigo-700 hover:underline"
            >
              Review All
            </button>
          </div>

          <div className="divide-y divide-stone-200 mt-2">
            {pendingAppointments.length === 0 ? (
              <p className="py-6 text-xs text-stone-500 text-center">
                All appointment requests have been processed.
              </p>
            ) : (
              pendingAppointments.map((apt) => (
                <div key={apt.id} className="py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-bold text-stone-900">{apt.patientName}</span>
                    <span className="text-xs font-mono-tabular text-amber-700 font-bold">
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 mt-0.5">{apt.serviceName}</p>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 font-mono-tabular">
                    <span>{apt.date}</span>
                    <span aria-hidden="true">·</span>
                    <span>{apt.timeSlot}</span>
                    <span aria-hidden="true">·</span>
                    <span>{apt.assignedPersonnel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
