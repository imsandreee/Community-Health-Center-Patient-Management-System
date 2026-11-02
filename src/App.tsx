/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, LogIn, X, ArrowRight } from 'lucide-react';
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
import {
  INITIAL_APPOINTMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMMUNITY_ACTIVITIES,
  INITIAL_CONSULTATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PATIENTS,
  INITIAL_QUEUE,
  INITIAL_SERVICES,
  INITIAL_USERS,
  INITIAL_VITALS,
} from './data/mockHealthData';
import { generateQueueNumber, getRolePermission } from './utils/healthLogic';
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
import { AuthPage } from './components/AuthPage';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Patient' | 'Appointment' | 'Queue' | 'Service' | 'Module';
  targetModule: ModuleId;
}

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount>(INITIAL_USERS[1]); // Default to Health Center Staff (Elena Villanueva)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Top Search Bar State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [services, setServices] = useState<HealthcareService[]>(INITIAL_SERVICES);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [queue, setQueue] = useState<QueueEntry[]>(INITIAL_QUEUE);
  const [vitals, setVitals] = useState<VitalSignRecord[]>(INITIAL_VITALS);
  const [consultations, setConsultations] = useState<ConsultationRecord[]>(INITIAL_CONSULTATIONS);
  const [activities, setActivities] = useState<CommunityHealthActivity[]>(
    INITIAL_COMMUNITY_ACTIVITIES
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  const appendAudit = (
    actionType: AuditLogEntry['actionType'],
    module: string,
    targetEntityId: string,
    details: string,
    actor = currentUser
  ) => {
    const newEntry: AuditLogEntry = {
      id: `AUD-${9000 + auditLogs.length + 1}`,
      timestamp: '2026-11-02 09:42:10',
      actorName: actor.name,
      actorRole: actor.role,
      actionType,
      module,
      targetEntityId,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleSwitchRole = (role: UserRole) => {
    const targetUser = users.find((u) => u.role === role) || users[0];
    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    appendAudit(
      'Authentication',
      'Session Role Switch',
      targetUser.id,
      `Authenticated workspace session as ${targetUser.name} (${role.toUpperCase()}).`,
      targetUser
    );
    const perm = getRolePermission(role, activeModule);
    if (perm === 'none') {
      setActiveModule('dashboard');
    }
  };

  // Patient Handlers
  const handleRegisterPatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
    appendAudit(
      'Patient Record',
      'Patient Registration',
      newPatient.id,
      `Registered new patient ${newPatient.fullName} (${newPatient.barangay}).`
    );
  };

  const handleUpdatePatient = (updated: Patient) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    appendAudit(
      'Patient Record',
      'Patient Profile Update',
      updated.id,
      `Updated profile or status (${updated.status}) for patient ${updated.fullName}.`
    );
  };

  // Appointment Handlers
  const handleCreateAppointment = (apt: Appointment) => {
    setAppointments((prev) => [apt, ...prev]);
    appendAudit(
      'Appointment',
      'Appointment Scheduling',
      apt.id,
      `Created ${apt.status} appointment for ${apt.patientName} (${apt.serviceName} on ${apt.date} ${apt.timeSlot}).`
    );
  };

  const handleUpdateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    const target = appointments.find((a) => a.id === id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    if (target) {
      const notif: NotificationItem = {
        id: `NOT-0${notifications.length + 1}`,
        title: `Appointment ${status}: ${target.serviceName}`,
        message: `Your appointment (${target.id}) on ${target.date} at ${target.timeSlot} has been marked as ${status}.`,
        type: 'Appointment',
        targetRole: 'patient',
        targetPatientId: target.patientId,
        createdAt: '2026-11-02 09:40',
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
      appendAudit(
        'Appointment',
        'Appointment Status',
        id,
        `Updated appointment ${id} status to ${status} for ${target.patientName}.`
      );
    }
  };

  const handleCheckInAppointmentToQueue = (apt: Appointment) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === apt.id ? { ...a, status: 'Confirmed' } : a))
    );
    const patientObj = patients.find((p) => p.id === apt.patientId);
    const priority = patientObj && patientObj.age >= 60 ? 'Senior Citizen' : 'Regular';
    const qNumber = generateQueueNumber(queue, priority);
    const newEntry: QueueEntry = {
      id: `QUE-0${queue.length + 1}`,
      queueNumber: qNumber,
      patientId: apt.patientId,
      patientName: apt.patientName,
      serviceName: apt.serviceName,
      priority,
      status: 'Waiting',
      arrivalTime: '09:35 AM',
      source: 'Appointment',
      assignedRoom: 'Consultation Room 1',
    };
    setQueue((prev) => [...prev, newEntry]);
    appendAudit(
      'Appointment',
      'Queue Check-In',
      newEntry.queueNumber,
      `Checked in appointment ${apt.id} (${apt.patientName}) to daily queue as ${newEntry.queueNumber}.`
    );
  };

  // Queue Handlers
  const handleAddQueueEntry = (entry: QueueEntry) => {
    setQueue((prev) => [...prev, entry]);
    appendAudit(
      'Appointment',
      'Queue Management',
      entry.queueNumber,
      `Added walk-in patient ${entry.patientName} to queue (${entry.queueNumber}, ${entry.priority}).`
    );
  };

  const handleUpdateQueueStatus = (id: string, status: QueueStatus) => {
    const target = queue.find((q) => q.id === id);
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    if (target) {
      appendAudit(
        'Appointment',
        'Queue Status Update',
        target.queueNumber,
        `Updated queue ticket ${target.queueNumber} (${target.patientName}) to ${status}.`
      );
    }
  };

  // Vitals Handler
  const handleRecordVitals = (record: VitalSignRecord) => {
    setVitals((prev) => [record, ...prev]);
    appendAudit(
      'Patient Record',
      'Vital Signs',
      record.id,
      `Recorded vital signs for ${record.patientName} (BP ${record.systolic}/${record.diastolic}, BMI ${record.bmi}).`
    );
  };

  // Consultation Handlers
  const handleCreateConsultation = (record: ConsultationRecord) => {
    setConsultations((prev) => [record, ...prev]);
    appendAudit(
      'Patient Record',
      'Consultations',
      record.id,
      `Created clinical consultation record ${record.id} for ${record.patientName} (${record.diagnosis}).`
    );
  };

  const handleAmendConsultation = (updated: ConsultationRecord) => {
    setConsultations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    appendAudit(
      'Clinical Amendment',
      'Consultations',
      updated.id,
      `Amended consultation ${updated.id} for ${updated.patientName}. Original clinical history preserved.`
    );
  };

  // Services Handlers
  const handleAddService = (service: HealthcareService) => {
    setServices((prev) => [...prev, service]);
    appendAudit(
      'System Config',
      'Healthcare Services',
      service.id,
      `Registered new healthcare service: ${service.name}.`
    );
  };

  const handleToggleServiceStatus = (id: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' }
          : s
      )
    );
    appendAudit(
      'System Config',
      'Healthcare Services',
      id,
      `Toggled active availability status for service ${id}.`
    );
  };

  // Community Activity Handler
  const handleAddActivity = (act: CommunityHealthActivity) => {
    setActivities((prev) => [act, ...prev]);
    appendAudit(
      'Patient Record',
      'Community Monitoring',
      act.id,
      `Logged community health outreach activity: ${act.title} (${act.barangay}).`
    );
  };

  // Notifications Handlers
  const handlePublishAnnouncement = (item: NotificationItem) => {
    setNotifications((prev) => [item, ...prev]);
    appendAudit(
      'System Config',
      'Notifications',
      item.id,
      `Published announcement: ${item.title}.`
    );
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // User Admin Handlers
  const handleAddUser = (newUser: UserAccount) => {
    setUsers((prev) => [...prev, newUser]);
    appendAudit(
      'Access Control',
      'User Management',
      newUser.id,
      `Created staff user account ${newUser.name} with role ${newUser.role.toUpperCase()}.`
    );
  };

  const handleToggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' }
          : u
      )
    );
    appendAudit(
      'Access Control',
      'User Management',
      id,
      `Toggled account activation status for user ${id}.`
    );
  };

  const handleUpdatePassword = (userId: string) => {
    appendAudit(
      'Authentication',
      'Password Management',
      userId,
      `Updated password credentials for user account ${userId}.`
    );
  };

  const handlePatientSelfRegister = (newPatient: Patient, newAccount: UserAccount) => {
    setPatients((prev) => [newPatient, ...prev]);
    setUsers((prev) => [...prev, newAccount]);
    setCurrentUser(newAccount);
    setIsAuthenticated(true);
    setActiveModule('dashboard');
    appendAudit(
      'Authentication',
      'Patient Self-Registration',
      newPatient.id,
      `Patient ${newPatient.fullName} self-registered and signed in (${newPatient.id}).`,
      newAccount
    );
  };

  // Render Dedicated Full-Screen Authentication Page when signed out
  if (!isAuthenticated) {
    return (
      <AuthPage
        users={users}
        patients={patients}
        onSignInAsRole={handleSwitchRole}
        onPatientSelfRegister={handlePatientSelfRegister}
      />
    );
  }

  // Compute Global Search Results across Patients, Appointments, Queue, and Services
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
      if (
        srv.name.toLowerCase().includes(q) ||
        srv.category.toLowerCase().includes(q)
      ) {
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

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const waitingQueueCount = queue.filter(
    (item) => item.status === 'Waiting' || item.status === 'Called'
  ).length;
  const pendingAppointmentsCount = appointments.filter(
    (a) => a.status === 'Pending'
  ).length;

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900">
      {/* Left Workspace Navigation Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onSwitchRole={handleSwitchRole}
        onLogout={() => setIsAuthenticated(false)}
        unreadNotificationsCount={unreadNotificationsCount}
        waitingQueueCount={waitingQueueCount}
        pendingAppointmentsCount={pendingAppointmentsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Search Bar Top Header (Replaces Top Nav Links) */}
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
                    No matching patients, appointments, queue tickets, or services found for "{globalSearchQuery}".
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
                          <div className="text-xs text-stone-500 truncate">
                            {res.subtitle}
                          </div>
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

          {/* Primary Action: Open Dedicated Authentication Page */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsAuthenticated(false)}
              className="px-3.5 py-2 text-xs font-display font-bold text-white bg-stone-900 hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Auth Portal</span>
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
          {activeModule === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
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
              currentUser={currentUser}
              patients={patients}
              onRegisterPatient={handleRegisterPatient}
              onUpdatePatient={handleUpdatePatient}
            />
          )}

          {activeModule === 'appointments' && (
            <AppointmentModule
              currentUser={currentUser}
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
              currentUser={currentUser}
              queue={queue}
              patients={patients}
              services={services}
              onAddQueueEntry={handleAddQueueEntry}
              onUpdateQueueStatus={handleUpdateQueueStatus}
            />
          )}

          {activeModule === 'vitals' && (
            <VitalSignsModule
              currentUser={currentUser}
              vitals={vitals}
              patients={patients}
              onRecordVitals={handleRecordVitals}
            />
          )}

          {activeModule === 'consultations' && (
            <ConsultationModule
              currentUser={currentUser}
              consultations={consultations}
              patients={patients}
              vitals={vitals}
              onCreateConsultation={handleCreateConsultation}
              onAmendConsultation={handleAmendConsultation}
            />
          )}

          {activeModule === 'services' && (
            <ServicesModule
              currentUser={currentUser}
              services={services}
              onAddService={handleAddService}
              onToggleServiceStatus={handleToggleServiceStatus}
            />
          )}

          {activeModule === 'monitoring' && (
            <CommunityMonitoringModule
              currentUser={currentUser}
              patients={patients}
              consultations={consultations}
              vitals={vitals}
              activities={activities}
              onAddActivity={handleAddActivity}
            />
          )}

          {activeModule === 'reports' && (
            <ReportsModule
              currentUser={currentUser}
              patients={patients}
              appointments={appointments}
              consultations={consultations}
              vitals={vitals}
              activities={activities}
            />
          )}

          {activeModule === 'notifications' && (
            <NotificationsModule
              currentUser={currentUser}
              notifications={notifications}
              onPublishAnnouncement={handlePublishAnnouncement}
              onMarkRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          )}

          {activeModule === 'users' && (
            <UserAdminModule
              currentUser={currentUser}
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
          <span>
            San Roque Community Health Center · Patient Management System
          </span>
          <span>
            Compliant with the Philippine Data Privacy Act of 2012 (RA 10173)
          </span>
        </footer>
      </div>
    </div>
  );
}
