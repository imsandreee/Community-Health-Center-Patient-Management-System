import React, { useState } from 'react';
import { Activity, Plus, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Patient, UserAccount, VitalSignRecord } from '../types/health';
import { calculateBMI, getRolePermission } from '../utils/healthLogic';

interface VitalSignsModuleProps {
  currentUser: UserAccount;
  vitals: VitalSignRecord[];
  patients: Patient[];
  onRecordVitals: (record: VitalSignRecord) => void;
}

export const VitalSignsModule: React.FC<VitalSignsModuleProps> = ({
  currentUser,
  vitals,
  patients,
  onRecordVitals,
}) => {
  const permission = getRolePermission(currentUser.role, 'vitals');

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [temperatureC, setTemperatureC] = useState('36.8');
  const [heartRateBpm, setHeartRateBpm] = useState('76');
  const [respiratoryRate, setRespiratoryRate] = useState('16');
  const [weightKg, setWeightKg] = useState('62');
  const [heightCm, setHeightCm] = useState('164');
  const [nursingNotes, setNursingNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [patientFilter, setPatientFilter] = useState('All');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Section 5 RBAC Enforcement: System Administrators have Restricted access to clinical measurements
  if (permission === 'restricted') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          Clinical Privacy Restriction (RBAC Policy · Section 5)
        </h1>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          In accordance with the Philippine Data Privacy Act of 2012 (RA 10173) and Section 5 Role-Based Access Control rules,
          <strong> System Administrators ({currentUser.name})</strong> do not automatically receive unrestricted access to individual patient vital signs or clinical assessments.
        </p>
        <p className="text-xs text-slate-500 mt-3">
          To record or review clinical vital signs, switch to the <strong>Community Nurse</strong> or <strong>Medical Officer (Doctor)</strong> workspace role in the left sidebar.
        </p>
      </div>
    );
  }

  const canRecord = permission === 'manage'; // Nurse role
  const isPatient = currentUser.role === 'patient';

  const liveBmi = calculateBMI(parseFloat(weightKg) || 0, parseFloat(heightCm) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const patientObj = patients.find((p) => p.id === selectedPatientId);
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    const temp = parseFloat(temperatureC);
    const hr = parseInt(heartRateBpm, 10);
    const rr = parseInt(respiratoryRate, 10);
    const wt = parseFloat(weightKg);
    const ht = parseFloat(heightCm);

    if (
      !patientObj ||
      Number.isNaN(sys) ||
      Number.isNaN(dia) ||
      Number.isNaN(temp) ||
      Number.isNaN(hr) ||
      Number.isNaN(wt) ||
      Number.isNaN(ht) ||
      !nursingNotes.trim()
    ) {
      setFormError('Please provide valid numeric measurements and initial nursing assessment notes.');
      return;
    }

    const bmiCalc = calculateBMI(wt, ht);

    const newRecord: VitalSignRecord = {
      id: `VIT-2026-${500 + vitals.length + 1}`,
      patientId: patientObj.id,
      patientName: patientObj.fullName,
      recordedAt: '2026-11-02 09:30',
      recordedBy: currentUser.name,
      systolic: sys,
      diastolic: dia,
      temperatureC: temp,
      heartRateBpm: hr,
      respiratoryRate: rr || 16,
      weightKg: wt,
      heightCm: ht,
      bmi: bmiCalc.bmi,
      bmiCategory: bmiCalc.category,
      nursingNotes: nursingNotes.trim(),
      followUpRequired,
    };

    onRecordVitals(newRecord);
    setShowRecordForm(false);
    setNursingNotes('');
    setFeedback(
      `Recorded vital signs for ${patientObj.fullName} (BP ${sys}/${dia} mmHg, BMI ${bmiCalc.bmi} ${bmiCalc.category}).`
    );
  };

  const visibleVitals = vitals.filter((v) => {
    if (isPatient) {
      return v.patientId === (currentUser.patientId || 'CHC-2026-0101');
    }
    if (patientFilter !== 'All') {
      return v.patientId === patientFilter;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Vital Signs & Initial Nursing Assessment
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Record blood pressure, temperature, heart rate, respiratory rate, automatic BMI calculation, and nursing triage notes (FR-029 – FR-032).
          </p>
        </div>
        {canRecord && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowRecordForm(true);
            }}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Patient Vital Signs</span>
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

      {/* Vital Signs Entry Form (Nurse Role) */}
      {showRecordForm && canRecord && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Record Patient Vital Signs & Triage Assessment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                BMI and classification are automatically calculated from weight (kg) and height (cm).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecordForm(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 font-medium"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="vit-patient" className="block text-xs font-medium text-slate-700 mb-1">
                  Patient *
                </label>
                <select
                  id="vit-patient"
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
                <label htmlFor="vit-sys" className="block text-xs font-medium text-slate-700 mb-1">
                  Systolic BP (mmHg) *
                </label>
                <input
                  id="vit-sys"
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="vit-dia" className="block text-xs font-medium text-slate-700 mb-1">
                  Diastolic BP (mmHg) *
                </label>
                <input
                  id="vit-dia"
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="vit-temp" className="block text-xs font-medium text-slate-700 mb-1">
                  Body Temp (°C) *
                </label>
                <input
                  id="vit-temp"
                  type="number"
                  step="0.1"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="vit-hr" className="block text-xs font-medium text-slate-700 mb-1">
                  Heart Rate (bpm) *
                </label>
                <input
                  id="vit-hr"
                  type="number"
                  value={heartRateBpm}
                  onChange={(e) => setHeartRateBpm(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="vit-rr" className="block text-xs font-medium text-slate-700 mb-1">
                  Respiratory Rate (cpm)
                </label>
                <input
                  id="vit-rr"
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="vit-wt" className="block text-xs font-medium text-slate-700 mb-1">
                  Weight (kg) *
                </label>
                <input
                  id="vit-wt"
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="vit-ht" className="block text-xs font-medium text-slate-700 mb-1">
                  Height (cm) *
                </label>
                <input
                  id="vit-ht"
                  type="number"
                  step="0.5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-md px-4 py-2 flex items-center justify-between">
                <div>
                  <span className="block text-xs text-slate-500">
                    Calculated BMI (FR-030)
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono-tabular">
                    {liveBmi.bmi} kg/m² · {liveBmi.category}
                  </span>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  <span>Flag for Follow-Up Monitoring</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="vit-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Initial Assessment & Nursing Notes *
              </label>
              <textarea
                id="vit-notes"
                rows={2}
                value={nursingNotes}
                onChange={(e) => setNursingNotes(e.target.value)}
                placeholder="Document baseline clinical observations, pain scale, oxygen saturation, or maternal/pediatric notes..."
                className="w-full p-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowRecordForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Save Vital Sign Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient History Filter */}
      {!isPatient && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="filter-vitals-patient" className="text-xs font-medium text-slate-700">
              Filter by Patient:
            </label>
            <select
              id="filter-vitals-patient"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Patients ({vitals.length} records)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500">
            Role Access: <strong className="text-slate-800">{canRecord ? 'Manage & Record (Nurse)' : 'View Only'}</strong>
          </span>
        </div>
      )}

      {/* Historical Vital Signs Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Recorded At</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Blood Pressure</th>
                <th className="py-3 px-4">Temp / HR / RR</th>
                <th className="py-3 px-4">Weight / Height / BMI</th>
                <th className="py-3 px-4">Nursing Assessment Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {visibleVitals.map((v) => {
                const isHighBp = v.systolic >= 140 || v.diastolic >= 90;
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono-tabular text-slate-600">
                      <div>{v.recordedAt}</div>
                      <div className="text-slate-400">{v.recordedBy}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{v.patientName}</div>
                      <div className="font-mono-tabular text-slate-500">{v.patientId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular">
                      <span
                        className={`font-bold ${
                          isHighBp ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {v.systolic}/{v.diastolic} mmHg
                      </span>
                      {isHighBp && (
                        <span className="block text-[11px] text-amber-700 font-sans">
                          Elevated BP
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-slate-700">
                      {v.temperatureC}°C · {v.heartRateBpm} bpm · {v.respiratoryRate} cpm
                    </td>
                    <td className="py-3.5 px-4 font-mono-tabular text-slate-700">
                      <div>
                        {v.weightKg} kg · {v.heightCm} cm
                      </div>
                      <div className="font-semibold text-teal-800">
                        BMI {v.bmi} ({v.bmiCategory})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-sm">
                      <p>{v.nursingNotes}</p>
                      {v.followUpRequired && (
                        <p className="text-[11px] font-semibold text-amber-800 mt-1">
                          Follow-up monitoring required
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
