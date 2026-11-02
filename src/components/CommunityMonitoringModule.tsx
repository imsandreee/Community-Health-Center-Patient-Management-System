import React, { useState } from 'react';
import { BarChart3, Plus, CheckCircle2 } from 'lucide-react';
import {
  CommunityHealthActivity,
  ConsultationRecord,
  Patient,
  UserAccount,
  VitalSignRecord,
} from '../types/health';
import { computeCommunityStats } from '../utils/healthLogic';

interface CommunityMonitoringModuleProps {
  currentUser: UserAccount;
  patients: Patient[];
  consultations: ConsultationRecord[];
  vitals: VitalSignRecord[];
  activities: CommunityHealthActivity[];
  onAddActivity: (activity: CommunityHealthActivity) => void;
}

export const CommunityMonitoringModule: React.FC<CommunityMonitoringModuleProps> = ({
  currentUser,
  patients,
  consultations,
  vitals,
  activities,
  onAddActivity,
}) => {
  const canRecordActivity =
    currentUser.role === 'nurse' ||
    currentUser.role === 'doctor' ||
    currentUser.role === 'admin';

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] =
    useState<CommunityHealthActivity['category']>('Immunization');
  const [barangay, setBarangay] = useState('Barangay San Roque');
  const [date, setDate] = useState('2026-11-05');
  const [participantsCount, setParticipantsCount] = useState('35');
  const [targetCount, setTargetCount] = useState('40');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const stats = computeCommunityStats(patients, consultations, vitals);

  const barangayCounts: Record<string, number> = {};
  for (const p of patients) {
    barangayCounts[p.barangay] = (barangayCounts[p.barangay] || 0) + 1;
  }

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summaryNotes.trim()) return;

    const newAct: CommunityHealthActivity = {
      id: `ACT-2026-0${activities.length + 1}`,
      title: title.trim(),
      category,
      barangay,
      date,
      coordinator: currentUser.name,
      participantsCount: parseInt(participantsCount, 10) || 25,
      targetCount: parseInt(targetCount, 10) || 30,
      status: 'Scheduled',
      summaryNotes: summaryNotes.trim(),
    };

    onAddActivity(newAct);
    setShowModal(false);
    setTitle('');
    setSummaryNotes('');
    setFeedback(`Recorded community health activity "${newAct.title}".`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Community Health Monitoring & Public Health Indicators
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Aggregated population health statistics, age group distributions, barangay outreach programs, and disease surveillance (FR-036 – FR-040).
          </p>
        </div>
        {canRecordActivity && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Community Health Activity</span>
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

      {showModal && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Log Community Health Activity (FR-039)
            </h2>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleCreateActivity} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="act-title" className="block text-xs font-medium text-slate-700 mb-1">
                  Program / Activity Title *
                </label>
                <input
                  id="act-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Barangay Nutrition & Deworming Outreach"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="act-cat" className="block text-xs font-medium text-slate-700 mb-1">
                  Public Health Category
                </label>
                <select
                  id="act-cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as CommunityHealthActivity['category'])
                  }
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="Immunization">Immunization</option>
                  <option value="Maternal & Child">Maternal & Child</option>
                  <option value="Nutrition & Screening">Nutrition & Screening</option>
                  <option value="Disease Surveillance">Disease Surveillance</option>
                </select>
              </div>

              <div>
                <label htmlFor="act-brgy" className="block text-xs font-medium text-slate-700 mb-1">
                  Target Barangay
                </label>
                <select
                  id="act-brgy"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="Barangay San Roque">Barangay San Roque</option>
                  <option value="Barangay San Isidro">Barangay San Isidro</option>
                  <option value="Barangay Santa Cruz">Barangay Santa Cruz</option>
                  <option value="Barangay Maligaya">Barangay Maligaya</option>
                </select>
              </div>

              <div>
                <label htmlFor="act-date" className="block text-xs font-medium text-slate-700 mb-1">
                  Activity Date
                </label>
                <input
                  id="act-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="act-part" className="block text-xs font-medium text-slate-700 mb-1">
                    Participants
                  </label>
                  <input
                    id="act-part"
                    type="number"
                    value={participantsCount}
                    onChange={(e) => setParticipantsCount(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label htmlFor="act-targ" className="block text-xs font-medium text-slate-700 mb-1">
                    Target Goal
                  </label>
                  <input
                    id="act-targ"
                    type="number"
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="act-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Field Summary & Indicator Outcomes *
              </label>
              <input
                id="act-notes"
                type="text"
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
                placeholder="Describe vaccines administered, households reached, or maternal referrals..."
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Save Activity Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Demographic & Morbidity Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Group Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200">
            Age Group Distribution (FR-037)
          </h2>
          <div className="space-y-3 mt-4">
            {Object.entries(stats.ageGroups).map(([group, count]) => {
              const pct =
                stats.totalActivePatients > 0
                  ? Math.round((count / stats.totalActivePatients) * 100)
                  : 0;
              return (
                <div key={group}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{group}</span>
                    <span className="font-mono-tabular text-slate-900 font-semibold">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-teal-700"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Barangay Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200">
            Catchment Population by Barangay
          </h2>
          <div className="space-y-3 mt-4">
            {Object.entries(barangayCounts).map(([brgy, count]) => {
              const pct =
                patients.length > 0 ? Math.round((count / patients.length) * 100) : 0;
              return (
                <div key={brgy}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{brgy}</span>
                    <span className="font-mono-tabular text-slate-900 font-semibold">
                      {count} patients ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-slate-700"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commonly Recorded Diagnoses & Public Health Indicators */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-200">
            Morbidity & Public Health Indicators
          </h2>
          <div className="divide-y divide-slate-200 mt-2 text-xs">
            {stats.topDiagnoses.map((item) => (
              <div key={item.diagnosis} className="py-2.5 flex items-center justify-between">
                <span className="text-slate-800 font-medium">{item.diagnosis}</span>
                <span className="font-mono-tabular font-bold text-teal-800">
                  {item.count} case(s)
                </span>
              </div>
            ))}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-800 font-medium">
                Elevated Blood Pressure Flagged (≥140/90)
              </span>
              <span className="font-mono-tabular font-bold text-amber-700">
                {stats.elevatedBpCount} reading(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Health Programs Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Community Health Activities & Field Programs
            </h2>
            <p className="text-xs text-slate-500">
              Immunization drives, maternal congresses, hypertension screening, and dengue surveillance
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Activity & Summary</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Barangay</th>
                <th className="py-3 px-4">Coordinator</th>
                <th className="py-3 px-4">Reach / Target</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono-tabular text-slate-700">{act.date}</td>
                  <td className="py-3.5 px-4 max-w-md">
                    <div className="font-bold text-slate-900">{act.title}</div>
                    <div className="text-slate-600 mt-0.5">{act.summaryNotes}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{act.category}</td>
                  <td className="py-3.5 px-4 text-slate-700">{act.barangay}</td>
                  <td className="py-3.5 px-4 text-slate-700">{act.coordinator}</td>
                  <td className="py-3.5 px-4 font-mono-tabular font-semibold text-teal-800">
                    {act.participantsCount} / {act.targetCount}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">{act.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
