import React, { useState } from 'react';
import { BriefcaseMedical, Plus, CheckCircle2 } from 'lucide-react';
import { HealthcareService, UserAccount } from '../types/health';
import { getRolePermission } from '../utils/healthLogic';

interface ServicesModuleProps {
  currentUser: UserAccount;
  services: HealthcareService[];
  onAddService: (service: HealthcareService) => void;
  onToggleServiceStatus: (id: string) => void;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({
  currentUser,
  services,
  onAddService,
  onToggleServiceStatus,
}) => {
  const permission = getRolePermission(currentUser.role, 'services');
  const canManage = permission === 'manage'; // Admin role

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<HealthcareService['category']>('Primary Care');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('Mon – Fri · 08:00 AM – 04:00 PM');
  const [assignedPersonnel, setAssignedPersonnel] = useState('Dr. Rafael Mendoza, MD');
  const [dailyCapacity, setDailyCapacity] = useState('20');
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleServices = services.filter((s) => {
    if (currentUser.role === 'patient' && s.status !== 'Active') return false;
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    return true;
  });

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    const newSrv: HealthcareService = {
      id: `SRV-0${services.length + 1}`,
      name: name.trim(),
      category,
      description: description.trim(),
      schedule: schedule.trim(),
      assignedPersonnel: assignedPersonnel.trim(),
      status: 'Active',
      dailyCapacity: parseInt(dailyCapacity, 10) || 20,
    };

    onAddService(newSrv);
    setShowAddModal(false);
    setName('');
    setDescription('');
    setFeedback(`Added healthcare service "${newSrv.name}".`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Healthcare Services Directory & Schedules
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Community health center programs, assigned medical personnel, operating schedules, and service availability (FR-033 – FR-035).
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register Healthcare Service</span>
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

      {showAddModal && canManage && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Register New Community Healthcare Service
            </h2>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleCreateService} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="srv-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Service Name *
                </label>
                <input
                  id="srv-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Adolescent Health Screening"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="srv-cat" className="block text-xs font-medium text-slate-700 mb-1">
                  Service Category *
                </label>
                <select
                  id="srv-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HealthcareService['category'])}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="Primary Care">Primary Care</option>
                  <option value="Maternal & Child">Maternal & Child</option>
                  <option value="Preventive & Immunization">Preventive & Immunization</option>
                  <option value="Administrative & Screening">Administrative & Screening</option>
                </select>
              </div>

              <div>
                <label htmlFor="srv-staff" className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Healthcare Personnel
                </label>
                <input
                  id="srv-staff"
                  type="text"
                  value={assignedPersonnel}
                  onChange={(e) => setAssignedPersonnel(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="srv-sched" className="block text-xs font-medium text-slate-700 mb-1">
                  Operating Schedule
                </label>
                <input
                  id="srv-sched"
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="srv-cap" className="block text-xs font-medium text-slate-700 mb-1">
                  Daily Slot Capacity
                </label>
                <input
                  id="srv-cap"
                  type="number"
                  value={dailyCapacity}
                  onChange={(e) => setDailyCapacity(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="srv-desc" className="block text-xs font-medium text-slate-700 mb-1">
                Service Description *
              </label>
              <input
                id="srv-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe clinical scope and patient eligibility..."
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Save Service
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-1.5">
        {(
          [
            'All',
            'Primary Care',
            'Maternal & Child',
            'Preventive & Immunization',
            'Administrative & Screening',
          ] as const
        ).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              categoryFilter === cat
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Service Name & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Assigned Personnel</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                {canManage && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {visibleServices.map((srv) => (
                <tr key={srv.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono-tabular font-semibold text-teal-800">
                    {srv.id}
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    <div className="font-bold text-slate-900 text-sm">{srv.name}</div>
                    <div className="text-slate-600 mt-0.5 leading-relaxed">{srv.description}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{srv.category}</td>
                  <td className="py-3.5 px-4 font-mono-tabular text-slate-600">{srv.schedule}</td>
                  <td className="py-3.5 px-4 text-slate-700">{srv.assignedPersonnel}</td>
                  <td className="py-3.5 px-4 font-mono-tabular text-slate-700">
                    {srv.dailyCapacity} / day
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{srv.status}</td>
                  {canManage && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleServiceStatus(srv.id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        {srv.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
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
