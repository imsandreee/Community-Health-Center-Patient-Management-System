import React, { useState } from 'react';
import { ListPlus, Play, CheckCircle2 } from 'lucide-react';
import {
  HealthcareService,
  Patient,
  QueueEntry,
  QueuePriority,
  QueueStatus,
  UserAccount,
} from '../types/health';
import {
  generateQueueNumber,
  getRolePermission,
  sortQueueByPriority,
} from '../utils/healthLogic';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Modal,
  PriorityChip,
  Select,
  StatusBadge,
} from './ui';

interface QueueModuleProps {
  currentUser: UserAccount;
  queue: QueueEntry[];
  patients: Patient[];
  services: HealthcareService[];
  onAddQueueEntry: (entry: QueueEntry) => void;
  onUpdateQueueStatus: (id: string, status: QueueStatus) => void;
}

export const QueueModule: React.FC<QueueModuleProps> = ({
  currentUser,
  queue,
  patients,
  services,
  onAddQueueEntry,
  onUpdateQueueStatus,
}) => {
  const permission = getRolePermission(currentUser.role, 'queue');
  const canManage = permission === 'manage';
  const isPatient = currentUser.role === 'patient';

  const [showForm, setShowForm] = useState(false);
  const [skippingEntry, setSkippingEntry] = useState<QueueEntry | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [selectedServiceName, setSelectedServiceName] = useState(
    services[0]?.name || 'General Consultation'
  );
  const [priority, setPriority] = useState<QueuePriority>('Regular');
  const [assignedRoom, setAssignedRoom] = useState('Consultation Room 1');
  const [statusFilter, setStatusFilter] = useState<'All' | QueueStatus>('All');

  const nowServing = queue.find((q) => q.status === 'In Consultation');
  const currentlyCalled = queue.find((q) => q.status === 'Called');
  const waitingEntries = sortQueueByPriority(
    queue.filter((q) => q.status === 'Waiting')
  );

  const handleAddWalkIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const patientObj = patients.find((p) => p.id === selectedPatientId);
    if (!patientObj) return;

    const qNum = generateQueueNumber(queue, priority);
    const newEntry: QueueEntry = {
      id: `QUE-${Date.now()}`,
      queueNumber: qNum,
      patientId: patientObj.id,
      patientName: patientObj.fullName,
      serviceName: selectedServiceName,
      priority,
      status: 'Waiting',
      arrivalTime: '09:25 AM',
      source: 'Walk-in',
      assignedRoom,
    };

    onAddQueueEntry(newEntry);
    setShowForm(false);
  };

  const displayedQueue = sortQueueByPriority(queue).filter((item) => {
    if (statusFilter === 'All') return true;
    return item.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-none-none p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Daily Patient Queue & Flow Management
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Live queue monitor, priority lane routing (Senior Citizen, PWD, Pregnant, Emergency), and consultation room status (FR-018 – FR-022).
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ListPlus className="w-4 h-4" />}
            onClick={() => setShowForm(true)}
          >
            Add Walk-In to Queue
          </Button>
        )}
      </div>

      {/* Live Now Serving Display Board (FR-021) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-teal-800 text-white rounded-none-none p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-teal-100">Now In Consultation</p>
            <p className="text-3xl font-bold font-mono-tabular mt-2">
              {nowServing ? nowServing.queueNumber : '—'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-teal-700 text-xs text-teal-100 flex items-center justify-between">
            <span>{nowServing ? nowServing.patientName : 'No active consultation'}</span>
            <span>{nowServing ? nowServing.assignedRoom : ''}</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-none-none p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500">Currently Called to Station</p>
            <p className="text-3xl font-bold text-amber-700 font-mono-tabular mt-2">
              {currentlyCalled ? currentlyCalled.queueNumber : '—'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-200 text-xs text-stone-600 flex items-center justify-between">
            <span>{currentlyCalled ? currentlyCalled.patientName : 'Waiting for next call'}</span>
            <span>{currentlyCalled ? currentlyCalled.assignedRoom : ''}</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-none-none p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500">Next Priority in Waiting Line</p>
            <p className="text-3xl font-bold text-stone-900 font-mono-tabular mt-2">
              {waitingEntries[0] ? waitingEntries[0].queueNumber : 'Empty'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-200 text-xs text-stone-600 flex items-center justify-between">
            <span>
              {waitingEntries[0]
                ? `${waitingEntries[0].patientName} (${waitingEntries[0].priority})`
                : 'No waiting patients'}
            </span>
            <span className="font-mono-tabular">{waitingEntries.length} waiting</span>
          </div>
        </div>
      </div>

      {/* Add Walk-in Queue Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Walk-In Patient Registration"
        description={`Add a registered patient to today's priority triage queue. Next Ticket: ${generateQueueNumber(
          queue,
          priority
        )}.`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleAddWalkIn()}>
              Issue Queue Ticket
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddWalkIn} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="q-patient"
              label="Registered Patient"
              required
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.fullName} (${p.id})`,
              }))}
            />

            <Select
              id="q-priority"
              label="Priority Classification"
              required
              value={priority}
              onChange={(e) => setPriority(e.target.value as QueuePriority)}
              options={[
                { value: 'Regular', label: 'Regular' },
                { value: 'Senior Citizen', label: 'Senior Citizen (RA 9994)' },
                { value: 'PWD', label: 'Person with Disability (PWD)' },
                { value: 'Pregnant', label: 'Pregnant / Maternal' },
                { value: 'Emergency', label: 'Urgent / Emergency' },
              ]}
            />

            <Select
              id="q-service"
              label="Healthcare Service"
              required
              value={selectedServiceName}
              onChange={(e) => setSelectedServiceName(e.target.value)}
              options={services.map((s) => ({
                value: s.name,
                label: s.name,
              }))}
            />

            <Select
              id="q-room"
              label="Assigned Room / Station"
              value={assignedRoom}
              onChange={(e) => setAssignedRoom(e.target.value)}
              options={[
                { value: 'Triage Station A', label: 'Triage Station A' },
                { value: 'Consultation Room 1', label: 'Consultation Room 1' },
                { value: 'Maternal Care Room 2', label: 'Maternal Care Room 2' },
                { value: 'Immunization Bay', label: 'Immunization Bay' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* Queue Status Filter Tabs */}
      <div className="bg-white border border-stone-200 rounded-none-none p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            ['All', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Skipped'] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-none-none transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:text-stone-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-500 font-mono-tabular">
          Showing {displayedQueue.length} of {queue.length} daily queue entries
        </span>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-stone-200 rounded-none-none overflow-hidden">
        {displayedQueue.length === 0 ? (
          <EmptyState
            title="No Queue Entries Found"
            description={
              statusFilter === 'All'
                ? "There are no patients currently registered in today's queue."
                : `No queue entries found with status "${statusFilter}".`
            }
            actionText={canManage ? 'Add Walk-In Patient' : undefined}
            onAction={canManage ? () => setShowForm(true) : undefined}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                  <th className="py-3 px-4">Queue #</th>
                  <th className="py-3 px-4">Arrival</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Priority Lane</th>
                  <th className="py-3 px-4">Service & Station</th>
                  <th className="py-3 px-4">Status</th>
                  {!isPatient && <th className="py-3 px-4 text-right">Queue Controls</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {displayedQueue.map((entry) => (
                  <tr key={entry.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono-tabular font-bold text-sm text-stone-900">
                      {entry.queueNumber}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-600">
                      <div>{entry.arrivalTime}</div>
                      <div className="text-stone-400">{entry.source}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{entry.patientName}</div>
                      <div className="text-stone-500 font-mono-tabular">{entry.patientId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <PriorityChip priority={entry.priority} showStatutoryCode />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{entry.serviceName}</div>
                      <div className="text-stone-500">{entry.assignedRoom}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={entry.status} />
                    </td>
                    {!isPatient && (
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {entry.status === 'Waiting' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateQueueStatus(entry.id, 'Called')}
                            className="text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100"
                          >
                            Call Patient
                          </Button>
                        )}
                        {(entry.status === 'Waiting' || entry.status === 'Called') && (
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<Play className="w-3 h-3" />}
                            onClick={() => onUpdateQueueStatus(entry.id, 'In Consultation')}
                          >
                            Start Consultation
                          </Button>
                        )}
                        {entry.status === 'In Consultation' && (
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => onUpdateQueueStatus(entry.id, 'Completed')}
                            className="bg-emerald-700 hover:bg-emerald-800 border-emerald-700"
                          >
                            Complete
                          </Button>
                        )}
                        {entry.status !== 'Completed' && entry.status !== 'Cancelled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSkippingEntry(entry)}
                            className="text-stone-500 hover:text-stone-900"
                            title="Mark Skipped"
                          >
                            Skip
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Skip Patient Dialog */}
      <ConfirmDialog
        isOpen={!!skippingEntry}
        onClose={() => setSkippingEntry(null)}
        title="Skip Patient in Queue"
        description={`Are you sure you want to mark ticket ${skippingEntry?.queueNumber} (${skippingEntry?.patientName}) as skipped? You can recall or reassign this patient later.`}
        confirmText="Skip Patient"
        variant="warning"
        onConfirm={() => {
          if (skippingEntry) {
            onUpdateQueueStatus(skippingEntry.id, 'Skipped');
            setSkippingEntry(null);
          }
        }}
      />
    </div>
  );
};
