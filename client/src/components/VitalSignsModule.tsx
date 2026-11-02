import React, { useState } from 'react';
import { Activity, Plus, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Patient, UserAccount, VitalSignRecord } from '../types/health';
import { calculateBMI, getRolePermission } from '../utils/healthLogic';
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusBadge,
} from './ui';

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
      <div className="bg-white border border-stone-200 rounded-none-none p-8 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 rounded-none-none bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-stone-900">
          Clinical Privacy Restriction (RBAC Policy · Section 5)
        </h1>
        <p className="text-xs text-stone-600 mt-2 leading-relaxed">
          In accordance with the Philippine Data Privacy Act of 2012 (RA 10173) and Section 5 Role-Based Access Control rules,
          <strong> System Administrators ({currentUser.name})</strong> do not automatically receive unrestricted access to individual patient vital signs or clinical assessments.
        </p>
        <p className="text-xs text-stone-500 mt-3">
          To record or review clinical vital signs, switch to the <strong>Community Nurse</strong> or <strong>Medical Officer (Doctor)</strong> workspace role in the left sidebar.
        </p>
      </div>
    );
  }

  const canRecord = permission === 'manage'; // Nurse role
  const isPatient = currentUser.role === 'patient';

  const liveBmi = calculateBMI(parseFloat(weightKg) || 0, parseFloat(heightCm) || 0);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      <div className="bg-white border border-stone-200 rounded-none-none p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Vital Signs & Initial Nursing Assessment
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Record blood pressure, temperature, heart rate, respiratory rate, automatic BMI calculation, and nursing triage notes (FR-029 – FR-032).
          </p>
        </div>
        {canRecord && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFormError(null);
              setShowRecordForm(true);
            }}
          >
            Record Patient Vital Signs
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

      {/* Vital Signs Entry Form Modal (Nurse Role) */}
      <Modal
        isOpen={showRecordForm && canRecord}
        onClose={() => setShowRecordForm(false)}
        title="Record Patient Vital Signs & Triage Assessment"
        description="Clinical assessment and PhilPEN cardiovascular risk screening. BMI is computed automatically."
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRecordForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleSubmit()}>
              Save Vital Sign Record
            </Button>
          </>
        }
      >
        {/* Prominent PhilPEN Alert in modal */}
        {(() => {
          const s = parseInt(systolic, 10);
          const d = parseInt(diastolic, 10);
          if (!isNaN(s) && !isNaN(d)) {
            if (s >= 180 || d >= 120) {
              return (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-none-none text-xs text-red-900 font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
                  <div>
                    <p className="font-bold">PhilPEN Emergency Protocol: Hypertensive Crisis (BP &gt;= 180/120 mmHg)</p>
                    <p className="font-normal text-[11px] mt-0.5">Critical cardiovascular triage flag. Immediate physician evaluation and stabilization required.</p>
                  </div>
                </div>
              );
            }
            if (s >= 140 || d >= 90) {
              return (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-none-none text-xs text-amber-900 font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <p className="font-bold">PhilPEN Warning: Elevated Blood Pressure (BP &gt;= 140/90 mmHg)</p>
                    <p className="font-normal text-[11px] mt-0.5">Stage 2 Hypertension detected. Recheck resting BP in 15 minutes and flag for clinical consult.</p>
                  </div>
                </div>
              );
            }
          }
          return null;
        })()}

        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-none-none text-xs text-red-800 font-medium"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Select
                id="vit-patient"
                label="Patient"
                required
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                options={patients.map((p) => ({
                  value: p.id,
                  label: `${p.fullName} (${p.id})`,
                }))}
              />
            </div>

            <Input
              id="vit-sys"
              type="number"
              label="Systolic BP (mmHg)"
              required
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              className="font-mono-tabular"
            />

            <Input
              id="vit-dia"
              type="number"
              label="Diastolic BP (mmHg)"
              required
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              className="font-mono-tabular"
            />

            <Input
              id="vit-temp"
              type="number"
              step="0.1"
              label="Body Temp (°C)"
              required
              value={temperatureC}
              onChange={(e) => setTemperatureC(e.target.value)}
              className="font-mono-tabular"
            />

            <Input
              id="vit-hr"
              type="number"
              label="Heart Rate (bpm)"
              required
              value={heartRateBpm}
              onChange={(e) => setHeartRateBpm(e.target.value)}
              className="font-mono-tabular"
            />

            <Input
              id="vit-rr"
              type="number"
              label="Respiratory Rate (cpm)"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              className="font-mono-tabular"
            />

            <Input
              id="vit-wt"
              type="number"
              step="0.1"
              label="Weight (kg)"
              required
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="font-mono-tabular"
            />

            <Input
              id="vit-ht"
              type="number"
              step="0.5"
              label="Height (cm)"
              required
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="font-mono-tabular"
            />

            <div className="md:col-span-2 bg-stone-50 border border-stone-200 rounded-none-none px-4 py-2 flex items-center justify-between">
              <div>
                <span className="block text-xs text-stone-500">
                  Calculated BMI (FR-030)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-stone-900 font-mono-tabular">
                    {liveBmi.bmi} kg/m²
                  </span>
                  <StatusBadge
                    status={liveBmi.category === 'Normal' ? 'Active' : liveBmi.category === 'Obese' ? 'Critical' : 'Pending'}
                    label={liveBmi.category}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                  className="rounded-none border-stone-300 text-indigo-700 focus:ring-indigo-700"
                />
                <span>Flag for Follow-Up</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="vit-notes" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Initial Assessment & Nursing Notes <span className="text-red-600">*</span>
            </label>
            <textarea
              id="vit-notes"
              rows={2}
              value={nursingNotes}
              onChange={(e) => setNursingNotes(e.target.value)}
              placeholder="Document baseline clinical observations, pain scale, oxygen saturation, or maternal/pediatric notes..."
              className="w-full p-3 text-xs bg-white border border-stone-300 rounded-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
            />
          </div>
        </form>
      </Modal>

      {/* Patient History Filter */}
      {!isPatient && (
        <div className="bg-white border border-stone-200 rounded-none-none p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="filter-vitals-patient" className="text-xs font-medium text-stone-700">
              Filter by Patient:
            </label>
            <select
              id="filter-vitals-patient"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
            >
              <option value="All">All Patients ({vitals.length} records)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-stone-500">
            Role Access: <strong className="text-stone-800">{canRecord ? 'Manage & Record (Nurse)' : 'View Only'}</strong>
          </span>
        </div>
      )}

      {/* Historical Vital Signs Table */}
      <div className="bg-white border border-stone-200 rounded-none-none overflow-hidden">
        {visibleVitals.length === 0 ? (
          <EmptyState
            title="No Vital Signs Records"
            description={
              patientFilter !== 'All'
                ? 'No vital sign triage records recorded for the selected patient.'
                : 'There are currently no vital signs or nursing assessment records on file.'
            }
            actionText={canRecord ? 'Record Vital Signs' : undefined}
            onAction={canRecord ? () => setShowRecordForm(true) : undefined}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                  <th className="py-3 px-4">Recorded At</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Blood Pressure (PhilPEN)</th>
                  <th className="py-3 px-4">Temp / HR / RR</th>
                  <th className="py-3 px-4">Weight / Height / BMI</th>
                  <th className="py-3 px-4">Nursing Assessment Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {visibleVitals.map((v) => {
                  const isCrisis = v.systolic >= 180 || v.diastolic >= 120;
                  const isElevated = v.systolic >= 140 || v.diastolic >= 90;
                  return (
                    <tr key={v.id} className="hover:bg-stone-50">
                      <td className="py-3.5 px-4 font-mono-tabular text-stone-600">
                        <div>{v.recordedAt}</div>
                        <div className="text-stone-400">{v.recordedBy}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{v.patientName}</div>
                        <div className="font-mono-tabular text-stone-500">{v.patientId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular">
                        <div
                          className={`font-bold text-sm ${
                            isCrisis
                              ? 'text-red-700'
                              : isElevated
                              ? 'text-amber-700'
                              : 'text-stone-900'
                          }`}
                        >
                          {v.systolic}/{v.diastolic} <span className="text-xs text-stone-500 font-normal">mmHg</span>
                        </div>
                        {isCrisis ? (
                          <div className="mt-1">
                            <StatusBadge
                              status="Critical"
                              label="PhilPEN: Hypertensive Crisis (>=180/120)"
                            />
                          </div>
                        ) : isElevated ? (
                          <div className="mt-1">
                            <StatusBadge
                              status="Pending"
                              label="PhilPEN: Elevated BP (>=140/90)"
                            />
                          </div>
                        ) : (
                          <div className="mt-1">
                            <StatusBadge status="Active" label="Normal BP" />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-stone-700">
                        {v.temperatureC}°C · {v.heartRateBpm} bpm · {v.respiratoryRate} cpm
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-stone-700">
                        <div>
                          {v.weightKg} kg · {v.heightCm} cm
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="font-semibold text-stone-900">BMI {v.bmi}</span>
                          <StatusBadge
                            status={v.bmiCategory === 'Normal' ? 'Active' : v.bmiCategory === 'Obese' ? 'Critical' : 'Pending'}
                            label={v.bmiCategory}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 max-w-sm">
                        <p>{v.nursingNotes}</p>
                        {v.followUpRequired && (
                          <div className="mt-1.5">
                            <StatusBadge status="Waiting" label="Follow-up Required" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
