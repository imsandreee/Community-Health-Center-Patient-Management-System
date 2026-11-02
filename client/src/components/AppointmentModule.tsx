import React, { useState } from 'react';
import { CalendarPlus, Check, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Appointment,
  AppointmentStatus,
  HealthcareService,
  Patient,
  UserAccount,
} from '../types/health';
import { checkAppointmentConflict, getRolePermission } from '../utils/healthLogic';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusBadge,
} from './ui';

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
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '01:00 PM',
  '02:00 PM',
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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [rejectingApt, setRejectingApt] = useState<Appointment | null>(null);

  // Booking Form State
  const [selectedPatientId, setSelectedPatientId] = useState(
    currentUser.patientId || patients[0]?.id || ''
  );
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState('2026-11-02');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00 AM');
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

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

    if (!TIME_SLOTS.includes(selectedTimeSlot)) {
      setFormError(`Invalid time slot selected. Only permitted hourly slots (${TIME_SLOTS.join(', ')}) can be scheduled.`);
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
    setShowBookingForm(false);
    setReason('');
    setFeedback(
      isPatient
        ? `Appointment request ${newAppointment.id} submitted for staff approval.`
        : `Appointment ${newAppointment.id} scheduled and confirmed for ${patientObj.fullName}.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-none-none p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Appointment Scheduling & Management
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Organize patient appointment requests, prevent scheduling conflicts, and track daily/weekly/monthly schedules (FR-012 – FR-017).
          </p>
        </div>
        {(canManage || isPatient) && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CalendarPlus className="w-4 h-4" />}
            onClick={() => {
              setFormError(null);
              setShowBookingForm(true);
            }}
          >
            {isPatient ? 'Request Appointment' : 'Schedule Appointment'}
          </Button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-none-none flex items-center justify-between text-xs font-medium"
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

      {/* Booking Form Modal */}
      <Modal
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        title="Schedule Healthcare Appointment"
        description={
          isPatient
            ? 'Request an appointment slot for review and approval by health center staff.'
            : 'Schedule a patient appointment with automatic double-booking conflict prevention.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBookingForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleCreateSubmit()}>
              {isPatient ? 'Submit Appointment Request' : 'Confirm Appointment'}
            </Button>
          </>
        }
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-none-none text-xs text-red-800 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isPatient && (
              <Select
                id="apt-patient"
                label="Select Patient"
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                options={patients.map((p) => ({
                  value: p.id,
                  label: `${p.fullName} (${p.id})`,
                }))}
              />
            )}

            <Select
              id="apt-service"
              label="Healthcare Service"
              required
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              options={activeServices.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
            />

            <Input
              id="apt-date"
              type="date"
              label="Preferred Date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-mono-tabular"
            />

            <Select
              id="apt-time"
              label="Time Slot"
              required
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              options={TIME_SLOTS.map((slot) => ({
                value: slot,
                label: slot,
              }))}
            />
          </div>

          <Input
            id="apt-reason"
            label="Chief Reason for Visit / Notes"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe symptoms, checkup purpose, or follow-up requirement..."
          />
        </form>
      </Modal>

      {/* Schedule View Mode & Status Filters (FR-016) */}
      <div className="bg-white border border-stone-200 rounded-none-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-none-none w-fit">
          {(['Daily', 'Weekly', 'Monthly'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScheduleRange(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-none transition-colors ${
                scheduleRange === mode
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
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
              className={`px-2.5 py-1.5 text-xs font-medium rounded-none-none transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white border border-stone-200 rounded-none-none overflow-hidden">
        {visibleAppointments.length === 0 ? (
          <EmptyState
            title="No Appointments Found"
            description={
              statusFilter === 'All'
                ? `No healthcare appointments scheduled in the ${scheduleRange.toLowerCase()} view.`
                : `No appointments found matching status "${statusFilter}" in ${scheduleRange.toLowerCase()} view.`
            }
            actionText={canManage || isPatient ? (isPatient ? 'Request Appointment' : 'Schedule Appointment') : undefined}
            onAction={canManage || isPatient ? () => setShowBookingForm(true) : undefined}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Healthcare Service</th>
                  <th className="py-3 px-4">Assigned Personnel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {visibleAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-stone-800">
                      {apt.id}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-700">
                      <div>{apt.date}</div>
                      <div className="text-stone-500">{apt.timeSlot}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{apt.patientName}</div>
                      <div className="text-stone-500 font-mono-tabular">{apt.patientId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{apt.serviceName}</div>
                      <div className="text-stone-500 truncate max-w-xs">{apt.reason}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-600">{apt.assignedPersonnel}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {canManage && apt.status === 'Pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            leftIcon={<Check className="w-3.5 h-3.5" />}
                            onClick={() => {
                              onUpdateStatus(apt.id, 'Approved');
                              setFeedback(`Approved appointment ${apt.id} for ${apt.patientName}.`);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-700 hover:bg-red-50"
                            leftIcon={<X className="w-3.5 h-3.5" />}
                            onClick={() => setRejectingApt(apt)}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {canManage && (apt.status === 'Approved' || apt.status === 'Confirmed') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-700 bg-teal-50 hover:bg-teal-100"
                            onClick={() => {
                              onCheckInToQueue(apt);
                              setFeedback(
                                `Added ${apt.patientName} to today's active queue and marked appointment Confirmed.`
                              );
                            }}
                          >
                            Queue Check-In
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-stone-700 hover:bg-stone-100"
                            onClick={() => {
                              onUpdateStatus(apt.id, 'Completed');
                              setFeedback(`Marked appointment ${apt.id} as Completed.`);
                            }}
                          >
                            Complete
                          </Button>
                        </>
                      )}

                      {(canManage || isPatient) &&
                        (apt.status === 'Pending' || apt.status === 'Approved') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-stone-500 hover:text-red-700"
                            onClick={() => setCancellingApt(apt)}
                          >
                            Cancel
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Cancellation Dialog */}
      <ConfirmDialog
        isOpen={!!cancellingApt}
        onClose={() => setCancellingApt(null)}
        title="Cancel Healthcare Appointment"
        description={`Are you sure you want to cancel appointment ${cancellingApt?.id} for ${cancellingApt?.patientName}? This action cannot be undone.`}
        variant="destructive"
        confirmText="Cancel Appointment"
        showReasonInput
        reasonLabel="Cancellation Reason (Optional)"
        reasonPlaceholder="e.g., Patient requested rescheduling, acute schedule conflict..."
        onConfirm={(cancelReason) => {
          if (cancellingApt) {
            onUpdateStatus(cancellingApt.id, 'Cancelled');
            setFeedback(
              `Cancelled appointment ${cancellingApt.id}${cancelReason ? ` (Reason: ${cancelReason})` : ''}.`
            );
            setCancellingApt(null);
          }
        }}
      />

      {/* Confirm Rejection Dialog */}
      <ConfirmDialog
        isOpen={!!rejectingApt}
        onClose={() => setRejectingApt(null)}
        title="Reject Appointment Request"
        description={`Are you sure you want to reject appointment request ${rejectingApt?.id} for ${rejectingApt?.patientName}?`}
        variant="destructive"
        confirmText="Reject Request"
        showReasonInput
        reasonLabel="Rejection Reason (Optional)"
        reasonPlaceholder="e.g., Slot capacity reached, referral to secondary hospital..."
        onConfirm={(rejectReason) => {
          if (rejectingApt) {
            onUpdateStatus(rejectingApt.id, 'Rejected');
            setFeedback(
              `Rejected appointment request ${rejectingApt.id}${rejectReason ? ` (Reason: ${rejectReason})` : ''}.`
            );
            setRejectingApt(null);
          }
        }}
      />
    </div>
  );
};
