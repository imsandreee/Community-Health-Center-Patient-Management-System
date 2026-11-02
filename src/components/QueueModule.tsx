import React, { useState } from 'react';
import { ListPlus, Play, CheckCircle2, SkipForward, XCircle } from 'lucide-react';
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

  const [showWalkInModal, setShowWalkInModal] = useState(false);
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

  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
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
    setShowWalkInModal(false);
  };

  const displayedQueue = sortQueueByPriority(queue).filter((item) => {
    if (statusFilter === 'All') return true;
    return item.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Daily Patient Queue & Flow Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Live queue monitor, priority lane routing (Senior Citizen, PWD, Pregnant, Emergency), and consultation room status (FR-018 – FR-022).
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowWalkInModal(true)}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <ListPlus className="w-4 h-4" />
            <span>Add Walk-In to Queue</span>
          </button>
        )}
      </div>

      {/* Live Now Serving Display Board (FR-021) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-teal-800 text-white rounded-lg p-5 flex flex-col justify-between">
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

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Currently Called to Station</p>
            <p className="text-3xl font-bold text-amber-700 font-mono-tabular mt-2">
              {currentlyCalled ? currentlyCalled.queueNumber : '—'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>{currentlyCalled ? currentlyCalled.patientName : 'Waiting for next call'}</span>
            <span>{currentlyCalled ? currentlyCalled.assignedRoom : ''}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Next Priority in Waiting Line</p>
            <p className="text-3xl font-bold text-slate-900 font-mono-tabular mt-2">
              {waitingEntries[0] ? waitingEntries[0].queueNumber : 'Empty'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
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
      {showWalkInModal && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Add Patient to Daily Queue (Next Ticket: {generateQueueNumber(queue, priority)})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Priority patients receive a P-series ticket and are automatically prioritized in waiting order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWalkInModal(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleAddWalkIn} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="q-patient" className="block text-xs font-medium text-slate-700 mb-1">
                  Registered Patient *
                </label>
                <select
                  id="q-patient"
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

              <div>
                <label htmlFor="q-priority" className="block text-xs font-medium text-slate-700 mb-1">
                  Priority Classification *
                </label>
                <select
                  id="q-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as QueuePriority)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="Regular">Regular</option>
                  <option value="Senior Citizen">Senior Citizen (RA 9994)</option>
                  <option value="PWD">Person with Disability (PWD)</option>
                  <option value="Pregnant">Pregnant / Maternal</option>
                  <option value="Emergency">Urgent / Emergency</option>
                </select>
              </div>

              <div>
                <label htmlFor="q-service" className="block text-xs font-medium text-slate-700 mb-1">
                  Healthcare Service *
                </label>
                <select
                  id="q-service"
                  value={selectedServiceName}
                  onChange={(e) => setSelectedServiceName(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="q-room" className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Room / Station
                </label>
                <select
                  id="q-room"
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="Triage Station A">Triage Station A</option>
                  <option value="Consultation Room 1">Consultation Room 1</option>
                  <option value="Maternal Care Room 2">Maternal Care Room 2</option>
                  <option value="Immunization Bay">Immunization Bay</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Issue Queue Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Queue Status Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            ['All', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Skipped'] as const
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono-tabular">
          Showing {displayedQueue.length} of {queue.length} daily queue entries
        </span>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Queue #</th>
                <th className="py-3 px-4">Arrival</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Priority Lane</th>
                <th className="py-3 px-4">Service & Station</th>
                <th className="py-3 px-4">Status</th>
                {!isPatient && <th className="py-3 px-4 text-right">Queue Controls</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {displayedQueue.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono-tabular font-bold text-sm text-slate-900">
                    {entry.queueNumber}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-600">
                    <div>{entry.arrivalTime}</div>
                    <div className="text-slate-400">{entry.source}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{entry.patientName}</div>
                    <div className="text-slate-500 font-mono-tabular">{entry.patientId}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{entry.priority}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{entry.serviceName}</div>
                    <div className="text-slate-500">{entry.assignedRoom}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-teal-800">{entry.status}</td>
                  {!isPatient && (
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {entry.status === 'Waiting' && (
                        <button
                          type="button"
                          onClick={() => onUpdateQueueStatus(entry.id, 'Called')}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded"
                        >
                          Call Patient
                        </button>
                      )}
                      {(entry.status === 'Waiting' || entry.status === 'Called') && (
                        <button
                          type="button"
                          onClick={() => onUpdateQueueStatus(entry.id, 'In Consultation')}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start Consultation</span>
                        </button>
                      )}
                      {entry.status === 'In Consultation' && (
                        <button
                          type="button"
                          onClick={() => onUpdateQueueStatus(entry.id, 'Completed')}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      )}
                      {entry.status !== 'Completed' && entry.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => onUpdateQueueStatus(entry.id, 'Skipped')}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900"
                          title="Mark Skipped"
                        >
                          Skip
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
