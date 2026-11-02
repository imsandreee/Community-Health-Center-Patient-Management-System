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
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusBadge,
} from './ui';

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
      <div className="bg-white border border-stone-200 rounded-none-none p-8 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 rounded-none-none bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-stone-900">
          Clinical Medical Record Access Restricted (Section 5 RBAC)
        </h1>
        <p className="text-xs text-stone-600 mt-2 leading-relaxed">
          Per Section 5 Role-Based Access Control rules, <strong>{currentUser.name} ({currentUser.role.toUpperCase()})</strong> is restricted from viewing or modifying confidential clinical diagnoses, physician consultation notes, and treatment prescriptions.
        </p>
        <p className="text-xs text-stone-500 mt-3">
          Switch to <strong>Doctor · Dr. Rafael Mendoza</strong> in the sidebar role selector to document diagnoses, prescriptions, and auditable clinical amendments.
        </p>
      </div>
    );
  }

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleAmendSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      <div className="bg-white border border-stone-200 rounded-none-none p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            {isPatient
              ? 'My Permitted Medical Records & Consultations'
              : 'Clinical Consultations, Diagnoses & Electronic Medical Records'}
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Chronological consultation documentation, diagnoses, treatment plans, prescriptions, and auditable amendments (FR-023 – FR-028).
          </p>
        </div>
        {isDoctor && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setFormError(null);
              setShowNewForm(true);
            }}
          >
            Create Consultation Record
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

      {/* New Consultation Modal (Doctor Only) */}
      <Modal
        isOpen={showNewForm && isDoctor}
        onClose={() => setShowNewForm(false)}
        title="New Clinical Consultation & Prescription Record"
        description={`Attending Physician: ${currentUser.name}`}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              form="new-consultation-form"
              onClick={handleCreateSubmit}
            >
              Save Consultation Record
            </Button>
          </div>
        }
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-none-none text-xs text-red-800 font-medium"
          >
            {formError}
          </div>
        )}

        <form id="new-consultation-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              id="con-patient"
              label="Patient"
              required
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.fullName} (${p.id})`,
              }))}
            />

            <Input
              id="con-diagnosis"
              label="Primary Diagnosis"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g., Essential Hypertension / Acute Bronchitis"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="con-icd"
                label="ICD-10 Code"
                value={icdCode}
                onChange={(e) => setIcdCode(e.target.value)}
                className="font-mono-tabular"
              />
              <Input
                id="con-followup"
                label="Follow-Up Date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="con-complaint"
              label="Chief Complaint"
              required
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Patient's primary symptoms and duration..."
            />

            <Input
              id="con-findings"
              label="Clinical Findings & Physical Exam"
              value={clinicalFindings}
              onChange={(e) => setClinicalFindings(e.target.value)}
              placeholder="Auscultation, HEENT, cardiovascular or abdominal findings..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="con-treatment" className="block text-xs font-semibold text-stone-700">
                Treatment Plan <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <textarea
                id="con-treatment"
                rows={2}
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                placeholder="Clinical management plan, diet/lifestyle instructions..."
                className="w-full p-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="con-rx" className="block text-xs font-semibold text-stone-700">
                Prescription Details (Rx) <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <textarea
                id="con-rx"
                rows={2}
                value={prescriptionDetails}
                onChange={(e) => setPrescriptionDetails(e.target.value)}
                placeholder="Generic name, dosage strength, frequency, duration, and quantity..."
                className="w-full p-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Auditable Amendment Modal (FR-028) */}
      <Modal
        isOpen={!!amendingRecord && isDoctor}
        onClose={() => setAmendingRecord(null)}
        title={`Auditable Medical Record Amendment · ${amendingRecord?.id || ''} (FR-028)`}
        description="Original diagnosis and treatment plan are permanently preserved in the consultation amendment trail."
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmendingRecord(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              form="amend-consultation-form"
              onClick={handleAmendSubmit}
            >
              Record Auditable Amendment
            </Button>
          </div>
        }
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-none-none text-xs text-red-800 font-medium"
          >
            {formError}
          </div>
        )}

        <form id="amend-consultation-form" onSubmit={handleAmendSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="amend-diag"
              label="Amended Diagnosis"
              required
              value={amendDiagnosis}
              onChange={(e) => setAmendDiagnosis(e.target.value)}
            />

            <Input
              id="amend-reason"
              label="Clinical Reason for Amendment"
              required
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              placeholder="e.g., Updated after diagnostic lab confirmation"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="amend-plan" className="block text-xs font-semibold text-stone-700">
                Amended Treatment Plan <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <textarea
                id="amend-plan"
                rows={2}
                value={amendTreatment}
                onChange={(e) => setAmendTreatment(e.target.value)}
                className="w-full p-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="amend-rx" className="block text-xs font-semibold text-stone-700">
                Updated Prescription Details
              </label>
              <textarea
                id="amend-rx"
                rows={2}
                value={amendPrescription}
                onChange={(e) => setAmendPrescription(e.target.value)}
                className="w-full p-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Filter Bar */}
      {!isPatient && (
        <div className="bg-white border border-stone-200 rounded-none-none p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="con-filter-patient" className="text-xs font-medium text-stone-700">
              Patient Medical History Filter:
            </label>
            <select
              id="con-filter-patient"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
            >
              <option value="All">All Consultations ({consultations.length})</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id})
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-stone-500">
            Chronological Electronic Medical Record (FR-026)
          </span>
        </div>
      )}

      {/* Chronological Consultation Cards */}
      {visibleConsultations.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="w-8 h-8 text-indigo-700" />}
          title="No Consultation Records Found"
          description={
            isPatient
              ? 'No clinical consultations have been recorded for your account yet.'
              : 'No consultation records match the selected patient filter criteria.'
          }
        />
      ) : (
        <div className="space-y-4">
          {visibleConsultations.map((con) => (
            <div key={con.id} className="bg-white border border-stone-200 rounded-none-none p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-stone-200 gap-2">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-mono-tabular font-semibold text-indigo-700">
                      {con.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{con.consultationDate}</span>
                    <span aria-hidden="true">·</span>
                    <span>{con.attendingDoctor}</span>
                    <span aria-hidden="true">·</span>
                    <StatusBadge
                      status={con.amendments.length > 0 ? 'Pending' : 'Completed'}
                      label={con.amendments.length > 0 ? 'Amended' : 'Signed'}
                    />
                  </div>
                  <h2 className="text-base font-bold text-stone-900 mt-1">
                    {con.patientName}{' '}
                    <span className="text-xs font-mono-tabular font-normal text-stone-500">
                      ({con.patientId})
                    </span>
                  </h2>
                </div>

                {isDoctor && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                    onClick={() => openAmendmentModal(con)}
                    className="self-start md:self-auto text-indigo-700 border-teal-200 hover:bg-teal-50"
                  >
                    Amend Record (FR-028)
                  </Button>
                )}
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4 text-xs">
              <div>
                <p className="font-semibold text-stone-500">Chief Complaint</p>
                <p className="text-stone-900 mt-1 leading-relaxed">{con.chiefComplaint}</p>
              </div>
              <div>
                <p className="font-semibold text-stone-500">Clinical Findings & History</p>
                <p className="text-stone-900 mt-1 leading-relaxed">{con.clinicalFindings}</p>
                <p className="text-stone-500 mt-1">History: {con.medicalHistory}</p>
              </div>
              <div>
                <p className="font-semibold text-stone-500">Diagnosis & ICD-10</p>
                <p className="text-sm font-bold text-indigo-700 mt-1">
                  {con.diagnosis} ({con.icdCode})
                </p>
                <p className="text-stone-500 mt-1 font-mono-tabular">
                  Follow-up Date: {con.followUpDate || 'As needed'}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="font-semibold text-stone-500">Treatment Plan & Prescription (Rx)</p>
                <p className="text-stone-900 mt-1">{con.treatmentPlan}</p>
                <p className="font-mono-tabular text-stone-800 bg-stone-50 border border-stone-200 rounded-none p-2.5 mt-2">
                  Rx: {con.prescriptionDetails}
                </p>
              </div>
              <div>
                <p className="font-semibold text-stone-500">Consultation Notes</p>
                <p className="text-stone-700 mt-1 leading-relaxed">{con.consultationNotes}</p>
              </div>
            </div>

            {/* Preserved Original History on Amendments (FR-028) */}
            {con.amendments.length > 0 && (
              <div className="mt-5 pt-4 border-t border-stone-200 bg-stone-50 -mx-6 -mb-6 p-5 rounded-none-b-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 mb-2">
                  <History className="w-4 h-4 text-indigo-700" />
                  <span>Auditable Amendment History (Original Record Preserved)</span>
                </div>
                <div className="space-y-2">
                  {con.amendments.map((am, idx) => (
                    <div key={idx} className="text-xs text-stone-600 border-b border-stone-200 pb-2 last:border-none last:pb-0">
                      <div className="font-mono-tabular text-stone-500">
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
    )}
  </div>
);
};
