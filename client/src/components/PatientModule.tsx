import React, { useState } from 'react';
import { Search, UserPlus, AlertCircle, CheckCircle2, Edit3, Eye } from 'lucide-react';
import { Patient, UserAccount } from '../types/health';
import {
  calculateAge,
  detectDuplicatePatient,
  generatePatientId,
  getRolePermission,
} from '../utils/healthLogic';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  StatusBadge,
} from './ui';

interface PatientModuleProps {
  currentUser: UserAccount;
  patients: Patient[];
  onRegisterPatient: (newPatient: Patient) => void;
  onUpdatePatient: (updated: Patient) => void;
}

const BARANGAY_OPTIONS = [
  'Barangay San Roque',
  'Barangay San Isidro',
  'Barangay Santa Cruz',
  'Barangay Maligaya',
  'Barangay Poblacion',
];

export const PatientModule: React.FC<PatientModuleProps> = ({
  currentUser,
  patients,
  onRegisterPatient,
  onUpdatePatient,
}) => {
  const permission = getRolePermission(currentUser.role, 'patients');
  const canManage = permission === 'manage';

  const [searchQuery, setSearchQuery] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Archived'>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [archivingPatient, setArchivingPatient] = useState<Patient | null>(null);

  // Registration / Edit Form State
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<'Female' | 'Male'>('Female');
  const [civilStatus, setCivilStatus] = useState<'Single' | 'Married' | 'Widowed' | 'Separated'>('Single');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [barangay, setBarangay] = useState('Barangay San Roque');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('None known');
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // If Patient role, only access their own permitted profile (FR-011)
  if (currentUser.role === 'patient') {
    const defaultProfile: Patient = {
      id: currentUser.patientId || 'CHC-2026-0101',
      fullName: currentUser.name || 'Maria Clara Santos',
      dateOfBirth: '1994-05-18',
      age: 32,
      sex: 'Female',
      civilStatus: 'Single',
      contactNumber: '0917-555-0821',
      address: '14 Mabini St.',
      barangay: 'San Roque',
      emergencyContactName: 'Family Contact',
      emergencyContactNumber: '0917-555-0821',
      bloodType: 'O+',
      allergies: 'None known',
      status: 'Active',
      registrationDate: '2026-01-15',
    };
    const myProfile =
      patients.find((p) => p.id === currentUser.patientId) ||
      patients[0] ||
      defaultProfile;

    return (
      <div className="space-y-6">
        <div className="bg-white border border-stone-200 rounded-none p-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div>
              <span className="text-xs font-mono-tabular text-indigo-700 font-semibold">
                {myProfile.id}
              </span>
              <h1 className="text-xl font-bold text-stone-900 mt-0.5">
                {myProfile.fullName}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                <span>Registered on {myProfile.registrationDate}</span>
                <span aria-hidden="true">·</span>
                <StatusBadge status={myProfile.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 text-sm">
            <div>
              <p className="text-xs text-stone-500">Date of Birth & Age</p>
              <p className="font-semibold text-stone-900 mt-1 font-mono-tabular">
                {myProfile.dateOfBirth} ({myProfile.age} yrs)
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Sex & Civil Status</p>
              <p className="font-semibold text-stone-900 mt-1">
                {myProfile.sex} · {myProfile.civilStatus}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Contact Number</p>
              <p className="font-semibold text-stone-900 mt-1 font-mono-tabular">
                {myProfile.contactNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Residential Address</p>
              <p className="font-semibold text-stone-900 mt-1">
                {myProfile.address}, {myProfile.barangay}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Emergency Contact</p>
              <p className="font-semibold text-stone-900 mt-1">
                {myProfile.emergencyContactName} ({myProfile.emergencyContactNumber})
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Blood Type & Allergies</p>
              <p className="font-semibold text-stone-900 mt-1">
                Blood {myProfile.bloodType || '—'} · Allergies: {myProfile.allergies || 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Real-time duplicate check while typing
  const duplicateCheck = detectDuplicatePatient(
    { fullName, dateOfBirth },
    patients,
    editingPatient?.id
  );

  const openNewForm = () => {
    setEditingPatient(null);
    setFullName('');
    setDateOfBirth('');
    setSex('Female');
    setCivilStatus('Single');
    setContactNumber('');
    setAddress('');
    setBarangay('Barangay San Roque');
    setEmergencyContactName('');
    setEmergencyContactNumber('');
    setBloodType('O+');
    setAllergies('None known');
    setAllowDuplicateOverride(false);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setFullName(patient.fullName);
    setDateOfBirth(patient.dateOfBirth);
    setSex(patient.sex);
    setCivilStatus(patient.civilStatus);
    setContactNumber(patient.contactNumber);
    setAddress(patient.address);
    setBarangay(patient.barangay);
    setEmergencyContactName(patient.emergencyContactName);
    setEmergencyContactNumber(patient.emergencyContactNumber);
    setBloodType(patient.bloodType || 'O+');
    setAllergies(patient.allergies || 'None known');
    setAllowDuplicateOverride(false);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !dateOfBirth || !contactNumber.trim() || !address.trim()) {
      setFormError('Please fill in all required patient demographic fields.');
      return;
    }

    if (duplicateCheck.isDuplicate && !allowDuplicateOverride) {
      setFormError(
        `Potential duplicate patient record detected: ${duplicateCheck.reason}. Verify existing profile or check override to proceed.`
      );
      return;
    }

    const computedAge = calculateAge(dateOfBirth);

    if (editingPatient) {
      const updated: Patient = {
        ...editingPatient,
        fullName: fullName.trim(),
        dateOfBirth,
        age: computedAge,
        sex,
        civilStatus,
        contactNumber: contactNumber.trim(),
        address: address.trim(),
        barangay,
        emergencyContactName: emergencyContactName.trim() || 'Not specified',
        emergencyContactNumber: emergencyContactNumber.trim() || 'Not specified',
        bloodType,
        allergies: allergies.trim() || 'None known',
      };
      onUpdatePatient(updated);
      setFeedbackBanner(`Updated patient record for ${updated.fullName} (${updated.id}).`);
    } else {
      const newId = generatePatientId(patients);
      const created: Patient = {
        id: newId,
        fullName: fullName.trim(),
        dateOfBirth,
        age: computedAge,
        sex,
        civilStatus,
        contactNumber: contactNumber.trim(),
        address: address.trim(),
        barangay,
        emergencyContactName: emergencyContactName.trim() || 'Not specified',
        emergencyContactNumber: emergencyContactNumber.trim() || 'Not specified',
        registrationDate: '2026-11-02',
        status: 'Active',
        bloodType,
        allergies: allergies.trim() || 'None known',
      };
      onRegisterPatient(created);
      setFeedbackBanner(`Registered new patient ${created.fullName} with ID ${created.id}.`);
    }

    setShowForm(false);
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter((p) => {
    const matchesQuery =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactNumber.includes(searchQuery);
    const matchesBrgy = barangayFilter === 'All' || p.barangay === barangayFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesQuery && matchesBrgy && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-stone-200 rounded-none-none p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Patient Registration & Profile Registry
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Centralized patient demographics, unique Patient ID generation, and duplicate detection (FR-006 – FR-011).
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={openNewForm}
          >
            Register New Patient
          </Button>
        )}
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-none-none flex items-center justify-between text-xs font-medium"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedbackBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Registration / Edit Modal Panel */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingPatient ? `Update Patient Profile · ${editingPatient.id}` : 'Register New Patient'}
        description={
          editingPatient
            ? 'Update patient demographic and emergency contact details.'
            : `Enter patient demographic and contact information. Next ID: ${generatePatientId(patients)}.`
        }
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => handleSubmit()}>
              {editingPatient ? 'Save Profile Changes' : 'Complete Patient Registration'}
            </Button>
          </>
        }
      >
        {duplicateCheck.isDuplicate && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-none-none text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Potential Duplicate Record Detected (FR-010)
                </p>
                <p className="mt-0.5">{duplicateCheck.reason}</p>
                <label className="mt-2 inline-flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDuplicateOverride}
                    onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                    className="rounded-none border-amber-400 text-indigo-700 focus:ring-indigo-700"
                  />
                  <span>I have verified this is a distinct individual and authorize registration</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-none-none text-xs text-red-800 font-medium"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="patient-fullname"
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Juan Dela Cruz"
            />

            <Input
              id="patient-dob"
              type="date"
              label={`Date of Birth${dateOfBirth ? ` (Age: ${calculateAge(dateOfBirth)} yrs)` : ''}`}
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="font-mono-tabular"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                id="patient-sex"
                label="Sex"
                required
                value={sex}
                onChange={(e) => setSex(e.target.value as 'Female' | 'Male')}
                options={[
                  { value: 'Female', label: 'Female' },
                  { value: 'Male', label: 'Male' },
                ]}
              />

              <Select
                id="patient-civil"
                label="Civil Status"
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value as Patient['civilStatus'])}
                options={[
                  { value: 'Single', label: 'Single' },
                  { value: 'Married', label: 'Married' },
                  { value: 'Widowed', label: 'Widowed' },
                  { value: 'Separated', label: 'Separated' },
                ]}
              />
            </div>

            <Input
              id="patient-contact"
              label="Contact Number"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="0917-555-0100"
              className="font-mono-tabular"
            />

            <Select
              id="patient-barangay"
              label="Barangay"
              required
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              options={BARANGAY_OPTIONS.map((b) => ({ value: b, label: b }))}
            />

            <Input
              id="patient-address"
              label="Street / Purok Address"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House No., Street, Purok"
            />

            <Input
              id="patient-emergency-name"
              label="Emergency Contact Person"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              placeholder="Name & Relationship"
            />

            <Input
              id="patient-emergency-num"
              label="Emergency Contact Number"
              value={emergencyContactNumber}
              onChange={(e) => setEmergencyContactNumber(e.target.value)}
              placeholder="0918-555-0199"
              className="font-mono-tabular"
            />

            <Input
              id="patient-allergies"
              label="Known Drug / Food Allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g., Penicillin, None known"
            />
          </div>
        </form>
      </Modal>

      {/* Search and Filter Bar */}
      <div className="bg-white border border-stone-200 rounded-none-none p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -transtone-y-1/2" />
          <input
            type="text"
            aria-label="Search patients by name, ID, or contact number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient ID (CHC-2026-...), full name, or contact number..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-stone-50 border border-stone-300 rounded-none-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by Barangay"
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-white border border-stone-300 rounded-none-none focus:outline-none focus:ring-2 focus:ring-indigo-700"
          >
            <option value="All">All Barangays</option>
            {BARANGAY_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-none-none">
            {(['All', 'Active', 'Archived'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-none transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Patient Data Table */}
      <div className="bg-white border border-stone-200 rounded-none-none overflow-hidden">
        {filteredPatients.length === 0 ? (
          <EmptyState
            title="No Patient Records Found"
            description={
              searchQuery || barangayFilter !== 'All' || statusFilter !== 'All'
                ? 'No patients match the specified search query or filters. Try adjusting your criteria.'
                : 'There are currently no patients registered in the community health system.'
            }
            actionText={canManage ? 'Register New Patient' : undefined}
            onAction={canManage ? openNewForm : undefined}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Age / Sex</th>
                  <th className="py-3 px-4">Barangay & Address</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-xs">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-indigo-700">
                      {patient.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      {patient.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-600">
                      {patient.age} yrs · {patient.sex}
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {patient.barangay} · {patient.address}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-600">
                      {patient.contactNumber}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={patient.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedPatient(patient)}
                      >
                        View
                      </Button>
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={() => openEditForm(patient)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-stone-600 hover:text-stone-900"
                            onClick={() => setArchivingPatient(patient)}
                          >
                            {patient.status === 'Active' ? 'Archive' : 'Activate'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Profile Drawer / Detail Card */}
      {selectedPatient && (
        <div className="bg-white border border-stone-300 rounded-none-none p-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-mono-tabular font-semibold text-indigo-700">
                  {selectedPatient.id}
                </span>
                <span aria-hidden="true">·</span>
                <span>Registered {selectedPatient.registrationDate}</span>
                <span aria-hidden="true">·</span>
                <StatusBadge status={selectedPatient.status} />
              </div>
              <h2 className="text-lg font-bold text-stone-900 mt-0.5">
                {selectedPatient.fullName}
              </h2>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedPatient(null)}
            >
              Close Profile
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
            <div>
              <p className="text-stone-500">Birth Date & Age</p>
              <p className="font-semibold text-stone-900 mt-0.5 font-mono-tabular">
                {selectedPatient.dateOfBirth} ({selectedPatient.age} yrs)
              </p>
            </div>
            <div>
              <p className="text-stone-500">Sex & Civil Status</p>
              <p className="font-semibold text-stone-900 mt-0.5">
                {selectedPatient.sex} · {selectedPatient.civilStatus}
              </p>
            </div>
            <div>
              <p className="text-stone-500">Emergency Contact</p>
              <p className="font-semibold text-stone-900 mt-0.5">
                {selectedPatient.emergencyContactName} ({selectedPatient.emergencyContactNumber})
              </p>
            </div>
            <div>
              <p className="text-stone-500">Allergies & Blood Type</p>
              <p className="font-semibold text-stone-900 mt-0.5">
                {selectedPatient.allergies || 'None'} · Blood {selectedPatient.bloodType || '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Archive / Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!archivingPatient}
        onClose={() => setArchivingPatient(null)}
        title={archivingPatient?.status === 'Active' ? 'Archive Patient Record' : 'Activate Patient Record'}
        description={`Are you sure you want to ${archivingPatient?.status === 'Active' ? 'archive' : 'activate'} the medical record for ${archivingPatient?.fullName} (${archivingPatient?.id})? In accordance with the Data Privacy Act of 2012 (RA 10173), archived records remain protected and auditable.`}
        variant={archivingPatient?.status === 'Active' ? 'destructive' : 'primary'}
        confirmText={archivingPatient?.status === 'Active' ? 'Archive Patient' : 'Activate Patient'}
        requiresReason
        reasonLabel="Auditable Justification (RA 10173)"
        reasonPlaceholder="e.g., Patient relocated, duplicate entry, medical records retention..."
        onConfirm={(reasonNote) => {
          if (archivingPatient) {
            onUpdatePatient({
              ...archivingPatient,
              status: archivingPatient.status === 'Active' ? 'Archived' : 'Active',
            });
            setFeedbackBanner(
              `${archivingPatient.status === 'Active' ? 'Archived' : 'Activated'} patient ${archivingPatient.fullName} (${archivingPatient.id})${reasonNote ? ` · Justification: ${reasonNote}` : ''}.`
            );
            setArchivingPatient(null);
          }
        }}
      />
    </div>
  );
};
