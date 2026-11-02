import React, { useState } from 'react';
import { Stethoscope, Plus, FileEdit, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import {
  ConsultationRecord,
  Patient,
  UserAccount,
  VitalSignRecord,
} from '../types/health';
import {
  applyConsultationAmendment,
  getRolePermission,
} from '../utils/healthLogic';

interface ConsultationModuleProps {
  currentUser: UserAccount;
  consultations: ConsultationRecord[];
  patients: Patient[];
  vitals: VitalSignRecord[];
  onCreateConsultation: (record: ConsultationRecord) => void;
  onAmendConsultation: (updated: ConsultationRecord) => void;
}

export const ConsultationModule: React.FC<ConsultationModuleProps> = ({
  currentUser,
  consultations,
  patients,
  vitals,
  onCreateConsultation,
  onAmendConsultation,
}) => {
  const permission = getRolePermission(currentUser.role, 'consultations');
  const isDoctor = currentUser.role === 'doctor';
  const isPatient = currentUser.role === 'patient';

  const [showNewForm, setShowNewForm] = useState(false);
  const [amendingRecord, setAmendingRecord] = useState<ConsultationRecord | null>(null);
  const [patientFilter, setPatientFilter] = useState('All');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Consultation State
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('J06.9');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [prescriptionDetails, setPrescriptionDetails] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-11-16');
  const [consultationNotes, setConsultationNotes] = useState('');

  // Amendment State (FR-028)
  const [amendDiagnosis, setAmendDiagnosis] = useState('');
  const [amendTreatment, setAmendTreatment] = useState('');
  const [amendPrescription, setAmendPrescription] = useState('');
  const [amendReason, setAmendReason] = useState('');

  // Section 5 RBAC Enforcement: System Admin and Front-Desk Staff do not receive unrestricted clinical diagnosis/treatment access
  if (permission === 'restricted') {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          Clinical Medical Record Access Restricted (Section 5 RBAC)
        </h1>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Per Section 5 Role-Based Access Control rules, <strong>{currentUser.name} ({currentUser.role.toUpperCase()})</strong> is restricted from viewing or modifying confidential clinical diagnoses, physician consultation notes, and treatment prescriptions.
        </p>
        <p className="text-xs text-slate-500 mt-3">
          Switch to <strong>Doctor · Dr. Rafael Mendoza</strong> in the sidebar role selector to document diagnoses, prescriptions, and auditable clinical amendments.
        </p>
      </div>
    );
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const patientObj = patients.find((p) => p.id === selectedPatientId);
    if (
      !patientObj ||
      !chiefComplaint.trim() ||
      !diagnosis.trim() ||
      !treatmentPlan.trim() ||
      !prescriptionDetails.trim()
    ) {
      setFormError(
        'Please complete Chief Complaint, Diagnosis, Treatment Plan, and Prescription Details.'
      );
      return;
    }

    const latestVital = vitals.find((v) => v.patientId === patientObj.id);

    const newRecord: ConsultationRecord = {
      id: `CON-2026-${300 + consultations.length + 1}`,
      patientId: patientObj.id,
      patientName: patientObj.fullName,
      attendingDoctor: currentUser.name,
      consultationDate: '2026-11-02',
      chiefComplaint: chiefComplaint.trim(),
      medicalHistory: medicalHistory.trim() || 'Reviewed existing patient history.',
      clinicalFindings: clinicalFindings.trim() || 'Physical examination completed.',
      diagnosis: diagnosis.trim(),
      icdCode: icdCode.trim() || 'Z00.0',
      treatmentPlan: treatmentPlan.trim(),
      prescriptionDetails: prescriptionDetails.trim(),
      followUpDate,
      consultationNotes: consultationNotes.trim() || 'Advised follow-up visit if symptoms persist.',
      vitalSignId: latestVital?.id,
      amendments: [],
    };

    onCreateConsultation(newRecord);
    setShowNewForm(false);
    setChiefComplaint('');
    setDiagnosis('');
    setTreatmentPlan('');
    setPrescriptionDetails('');
    setFeedback(
      `Saved consultation record ${newRecord.id} for ${patientObj.fullName}.`
    );
  };

  const openAmendmentModal = (record: ConsultationRecord) => {
    setAmendingRecord(record);
    setAmendDiagnosis(record.diagnosis);
    setAmendTreatment(record.treatmentPlan);
    setAmendPrescription(record.prescriptionDetails);
    setAmendReason('');
    setFormError(null);
  };

  const handleAmendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendingRecord) return;
    if (!amendReason.trim() || !amendDiagnosis.trim() || !amendTreatment.trim()) {
      setFormError('Amendment reason, updated diagnosis, and treatment plan are required (FR-028).');
      return;
    }

    const updated = applyConsultationAmendment(amendingRecord, {
      newDiagnosis: amendDiagnosis,
      newTreatmentPlan: amendTreatment,
      newPrescription: amendPrescription,
      reason: amendReason,
      amendedBy: currentUser.name,
      amendedAt: '2026-11-02 10:15',
    });

    onAmendConsultation(updated);
    setAmendingRecord(null);
    setFeedback(
      `Recorded auditable amendment on consultation ${updated.id}. Original consultation history preserved.`
    );
  };

  const visibleConsultations = consultations.filter((c) => {
    if (isPatient) {
      return c.patientId === (currentUser.patientId || 'CHC-2026-0101');
    }
    if (patientFilter !== 'All') {
      return c.patientId === patientFilter;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isPatient
              ? 'My Permitted Medical Records & Consultations'
              : 'Clinical Consultations, Diagnoses & Electronic Medical Records'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Chronological consultation documentation, diagnoses, treatment plans, prescriptions, and auditable amendments (FR-023 – FR-028).
          </p>
        </div>
        {isDoctor && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowNewForm(true);
            }}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Consultation Record</span>
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

      {/* New Consultation Form (Doctor Only) */}
      {showNewForm && isDoctor && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Clinical Consultation & Prescription Record
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Attending Physician: {currentUser.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
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

          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="con-patient" className="block text-xs font-medium text-slate-700 mb-1">
                  Patient *
                </label>
                <select
                  id="con-patient"
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
                <label htmlFor="con-diagnosis" className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Diagnosis *
                </label>
                <input
                  id="con-diagnosis"
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g., Essential Hypertension / Acute Bronchitis"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="con-icd" className="block text-xs font-medium text-slate-700 mb-1">
                    ICD-10 Code
                  </label>
                  <input
                    id="con-icd"
                    type="text"
                    value={icdCode}
                    onChange={(e) => setIcdCode(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label htmlFor="con-followup" className="block text-xs font-medium text-slate-700 mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    id="con-followup"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="con-complaint" className="block text-xs font-medium text-slate-700 mb-1">
                  Chief Complaint *
                </label>
                <input
                  id="con-complaint"
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Patient's primary symptoms and duration..."
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="con-findings" className="block text-xs font-medium text-slate-700 mb-1">
                  Clinical Findings & Physical Exam
                </label>
                <input
                  id="con-findings"
                  type="text"
                  value={clinicalFindings}
                  onChange={(e) => setClinicalFindings(e.target.value)}
                  placeholder="Auscultation, HEENT, cardiovascular or abdominal findings..."
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="con-treatment" className="block text-xs font-medium text-slate-700 mb-1">
                  Treatment Plan *
                </label>
                <textarea
                  id="con-treatment"
                  rows={2}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Clinical management plan, diet/lifestyle instructions..."
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="con-rx" className="block text-xs font-medium text-slate-700 mb-1">
                  Prescription Details (Rx) *
                </label>
                <textarea
                  id="con-rx"
                  rows={2}
                  value={prescriptionDetails}
                  onChange={(e) => setPrescriptionDetails(e.target.value)}
                  placeholder="Generic name, dosage strength, frequency, duration, and quantity..."
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Save Consultation Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Auditable Amendment Modal (FR-028) */}
      {amendingRecord && isDoctor && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Auditable Medical Record Amendment · {amendingRecord.id} (FR-028)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Original diagnosis and treatment plan are permanently preserved in the consultation amendment trail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAmendingRecord(null)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleAmendSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amend-diag" className="block text-xs font-medium text-slate-700 mb-1">
                  Amended Diagnosis *
                </label>
                <input
                  id="amend-diag"
                  type="text"
                  value={amendDiagnosis}
                  onChange={(e) => setAmendDiagnosis(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="amend-reason" className="block text-xs font-medium text-slate-700 mb-1">
                  Clinical Reason for Amendment *
                </label>
                <input
                  id="amend-reason"
                  type="text"
                  value={amendReason}
                  onChange={(e) => setAmendReason(e.target.value)}
                  placeholder="e.g., Updated after diagnostic lab confirmation"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amend-plan" className="block text-xs font-medium text-slate-700 mb-1">
                  Amended Treatment Plan *
                </label>
                <textarea
                  id="amend-plan"
                  rows={2}
                  value={amendTreatment}
                  onChange={(e) => setAmendTreatment(e.target.value)}
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="amend-rx" className="block text-xs font-medium text-slate-700 mb-1">
                  Updated Prescription Details
                </label>
                <textarea
                  id="amend-rx"
                  rows={2}
                  value={amendPrescription}
                  onChange={(e) => setAmendPrescription(e.target.value)}
                  className="w-full p-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAmendingRecord(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Record Auditable Amendment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      {!isPatient && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="con-filter-patient" className="text-xs font-medium text-slate-700">
              Patient Medical History Filter:
            </label>
            <select
              id="con-filter-patient"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="All">All Consultations ({consultations.length})</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-500">
            Chronological Electronic Medical Record (FR-026)
          </span>
        </div>
      )}

      {/* Chronological Consultation Cards */}
      <div className="space-y-4">
        {visibleConsultations.map((con) => (
          <div key={con.id} className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono-tabular font-semibold text-teal-800">
                    {con.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{con.consultationDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>{con.attendingDoctor}</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {con.patientName}{' '}
                  <span className="text-xs font-mono-tabular font-normal text-slate-500">
                    ({con.patientId})
                  </span>
                </h2>
              </div>

              {isDoctor && (
                <button
                  type="button"
                  onClick={() => openAmendmentModal(con)}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md inline-flex items-center gap-1.5 self-start md:self-auto"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Amend Record (FR-028)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4 text-xs">
              <div>
                <p className="font-semibold text-slate-500">Chief Complaint</p>
                <p className="text-slate-900 mt-1 leading-relaxed">{con.chiefComplaint}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Clinical Findings & History</p>
                <p className="text-slate-900 mt-1 leading-relaxed">{con.clinicalFindings}</p>
                <p className="text-slate-500 mt-1">History: {con.medicalHistory}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Diagnosis & ICD-10</p>
                <p className="text-sm font-bold text-teal-800 mt-1">
                  {con.diagnosis} ({con.icdCode})
                </p>
                <p className="text-slate-500 mt-1 font-mono-tabular">
                  Follow-up Date: {con.followUpDate || 'As needed'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-slate-500">Treatment Plan & Prescription (Rx)</p>
                <p className="text-slate-900 mt-1">{con.treatmentPlan}</p>
                <p className="font-mono-tabular text-slate-800 bg-slate-50 border border-slate-200 rounded p-2.5 mt-2">
                  Rx: {con.prescriptionDetails}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Consultation Notes</p>
                <p className="text-slate-700 mt-1 leading-relaxed">{con.consultationNotes}</p>
              </div>
            </div>

            {/* Preserved Original History on Amendments (FR-028) */}
            {con.amendments.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 p-5 rounded-b-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                  <History className="w-4 h-4 text-teal-700" />
                  <span>Auditable Amendment History (Original Record Preserved)</span>
                </div>
                <div className="space-y-2">
                  {con.amendments.map((am, idx) => (
                    <div key={idx} className="text-xs text-slate-600 border-b border-slate-200 pb-2 last:border-none last:pb-0">
                      <div className="font-mono-tabular text-slate-500">
                        Amended {am.amendedAt} by {am.amendedBy} · Reason: {am.reason}
                      </div>
                      <div className="mt-0.5">
                        Previous Diagnosis: <strong>{am.previousDiagnosis}</strong> | Previous Plan:{' '}
                        <span>{am.previousTreatmentPlan}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
