import React, { useState } from 'react';
import { CalendarPlus, Check, X, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  HealthcareService,
  Patient,
  UserAccount,
} from '../types/health';
import { checkAppointmentConflict, getRolePermission } from '../utils/healthLogic';

interface AppointmentModuleProps {
  currentUser: UserAccount;
  appointments: Appointment[];
  patients: Patient[];
  services: HealthcareService[];
  onCreateAppointment: (apt: Appointment) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus, newDate?: string, newTime?: string) => void;
  onCheckInToQueue: (apt: Appointment) => void;
}

const TIME_SLOTS = [
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
];

export const AppointmentModule: React.FC<AppointmentModuleProps> = ({
  currentUser,
  appointments,
  patients,
  services,
  onCreateAppointment,
  onUpdateStatus,
  onCheckInToQueue,
}) => {
  const permission = getRolePermission(currentUser.role, 'appointments');
  const canManage = permission === 'manage';
  const isPatient = currentUser.role === 'patient';

  const [scheduleRange, setScheduleRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Monthly');
  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking Form State
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentUser.patientId || patients[0]?.id || ''
  );
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState('2026-11-02');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:30 AM');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeServices = services.filter((s) => s.status === 'Active');

  const visibleAppointments = appointments.filter((a) => {
    if (isPatient && a.patientId !== (currentUser.patientId || 'CHC-2026-0101')) {
      return false;
    }
    if (statusFilter !== 'All' && a.status !== statusFilter) {
      return false;
    }
    if (scheduleRange === 'Daily') {
      return a.date === '2026-11-02';
    }
    if (scheduleRange === 'Weekly') {
      return a.date >= '2026-11-01' && a.date <= '2026-11-08';
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetPatientId = isPatient
      ? currentUser.patientId || 'CHC-2026-0101'
      : selectedPatientId;

    const patientObj = patients.find((p) => p.id === targetPatientId);
    const serviceObj = services.find((s) => s.id === selectedServiceId);

    if (!patientObj || !serviceObj || !selectedDate || !selectedTimeSlot || !reason.trim()) {
      setFormError('Please select a patient, healthcare service, date, time slot, and visit reason.');
      return;
    }

    const conflict = checkAppointmentConflict(
      {
        patientId: patientObj.id,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        serviceId: serviceObj.id,
      },
      appointments
    );

    if (conflict.hasConflict) {
      setFormError(`Scheduling Conflict (FR-015): ${conflict.reason}`);
      return;
    }

    const newAppointment: Appointment = {
      id: `APT-2026-${800 + appointments.length + 1}`,
      patientId: patientObj.id,
      patientName: patientObj.fullName,
      serviceId: serviceObj.id,
      serviceName: serviceObj.name,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      assignedPersonnel: serviceObj.assignedPersonnel,
      status: isPatient ? 'Pending' : 'Confirmed',
      reason: reason.trim(),
      createdAt: '2026-11-02',
    };

    onCreateAppointment(newAppointment);
    setShowBookingModal(false);
    setReason('');
    setFeedback(
      isPatient
        ? `Appointment request ${newAppointment.id} submitted for staff approval.`
        : `Appointment ${newAppointment.id} scheduled and confirmed for ${patientObj.fullName}.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Appointment Scheduling & Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Organize patient appointment requests, prevent scheduling conflicts, and track daily/weekly/monthly schedules (FR-012 – FR-017).
          </p>
        </div>
        {(canManage || isPatient) && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowBookingModal(true);
            }}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>{isPatient ? 'Request Appointment' : 'Schedule Appointment'}</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-medium"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Booking Form Panel */}
      {showBookingModal && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isPatient ? 'Request Healthcare Appointment' : 'Schedule Patient Appointment'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic conflict validation ensures no double-booked time slots.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {!isPatient && (
                <div>
                  <label htmlFor="apt-patient" className="block text-xs font-medium text-slate-700 mb-1">
                    Select Patient *
                  </label>
                  <select
                    id="apt-patient"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="apt-service" className="block text-xs font-medium text-slate-700 mb-1">
                  Healthcare Service *
                </label>
                <select
                  id="apt-service"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="apt-date" className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Date *
                </label>
                <input
                  id="apt-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="apt-time" className="block text-xs font-medium text-slate-700 mb-1">
                  Time Slot *
                </label>
                <select
                  id="apt-time"
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="apt-reason" className="block text-xs font-medium text-slate-700 mb-1">
                Chief Reason for Visit / Notes *
              </label>
              <input
                id="apt-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe symptoms, checkup purpose, or follow-up requirement..."
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                {isPatient ? 'Submit Appointment Request' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule View Mode & Status Filters (FR-016) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md w-fit">
          {(['Daily', 'Weekly', 'Monthly'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScheduleRange(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                scheduleRange === mode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode} Schedule
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            ['All', 'Pending', 'Approved', 'Confirmed', 'Completed', 'Cancelled'] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Ref ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Healthcare Service</th>
                <th className="py-3 px-4">Assigned Personnel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {visibleAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No appointments match the selected schedule range and filter.
                  </td>
                </tr>
              ) : (
                visibleAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-800">
                      {apt.id}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-700">
                      <div>{apt.date}</div>
                      <div className="text-slate-500">{apt.timeSlot}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{apt.patientName}</div>
                      <div className="text-slate-500 font-mono-tabular">{apt.patientId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{apt.serviceName}</div>
                      <div className="text-slate-500 truncate max-w-xs">{apt.reason}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{apt.assignedPersonnel}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {apt.status}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {canManage && apt.status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(apt.id, 'Approved');
                              setFeedback(`Approved appointment ${apt.id} for ${apt.patientName}.`);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(apt.id, 'Rejected');
                              setFeedback(`Rejected appointment ${apt.id}.`);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {canManage && (apt.status === 'Approved' || apt.status === 'Confirmed') && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onCheckInToQueue(apt);
                              setFeedback(
                                `Added ${apt.patientName} to today's active queue and marked appointment Confirmed.`
                              );
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded"
                          >
                            Queue Check-In
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(apt.id, 'Completed');
                              setFeedback(`Marked appointment ${apt.id} as Completed.`);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded"
                          >
                            Complete
                          </button>
                        </>
                      )}

                      {(canManage || isPatient) &&
                        (apt.status === 'Pending' || apt.status === 'Approved') && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateStatus(apt.id, 'Cancelled');
                              setFeedback(`Cancelled appointment ${apt.id}.`);
                            }}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
