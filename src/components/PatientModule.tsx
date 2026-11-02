import React, { useState } from 'react';
import { Search, UserPlus, AlertCircle, CheckCircle2, Edit3, Eye, X } from 'lucide-react';
import { Patient, UserAccount } from '../types/health';
import {
  calculateAge,
  detectDuplicatePatient,
  generatePatientId,
  getRolePermission,
} from '../utils/healthLogic';

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
    const myProfile =
      patients.find((p) => p.id === currentUser.patientId) || patients[0];

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-mono-tabular text-teal-800 font-semibold">
                {myProfile.id}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {myProfile.fullName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered on {myProfile.registrationDate} · Status: {myProfile.status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 text-sm">
            <div>
              <p className="text-xs text-slate-500">Date of Birth & Age</p>
              <p className="font-semibold text-slate-900 mt-1 font-mono-tabular">
                {myProfile.dateOfBirth} ({myProfile.age} yrs)
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sex & Civil Status</p>
              <p className="font-semibold text-slate-900 mt-1">
                {myProfile.sex} · {myProfile.civilStatus}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Contact Number</p>
              <p className="font-semibold text-slate-900 mt-1 font-mono-tabular">
                {myProfile.contactNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Residential Address</p>
              <p className="font-semibold text-slate-900 mt-1">
                {myProfile.address}, {myProfile.barangay}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Emergency Contact</p>
              <p className="font-semibold text-slate-900 mt-1">
                {myProfile.emergencyContactName} ({myProfile.emergencyContactNumber})
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Blood Type & Allergies</p>
              <p className="font-semibold text-slate-900 mt-1">
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Patient Registration & Profile Registry
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Centralized patient demographics, unique Patient ID generation, and duplicate detection (FR-006 – FR-011).
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openNewForm}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        )}
      </div>

      {feedbackBanner && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-medium"
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
      {showForm && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingPatient
                  ? `Update Patient Profile · ${editingPatient.id}`
                  : `New Patient Registration · Next ID: ${generatePatientId(patients)}`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fields marked with * are required. System automatically checks for duplicate records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close registration form"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {duplicateCheck.isDuplicate && (
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900">
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
                      className="rounded border-amber-400 text-teal-700 focus:ring-teal-600"
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
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 font-medium"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="patient-fullname" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="patient-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Juan Dela Cruz"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="patient-dob" className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Birth * {dateOfBirth ? `(Calculated Age: ${calculateAge(dateOfBirth)} yrs)` : ''}
                </label>
                <input
                  id="patient-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="patient-sex" className="block text-xs font-medium text-slate-700 mb-1">
                    Sex *
                  </label>
                  <select
                    id="patient-sex"
                    value={sex}
                    onChange={(e) => setSex(e.target.value as 'Female' | 'Male')}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="patient-civil" className="block text-xs font-medium text-slate-700 mb-1">
                    Civil Status
                  </label>
                  <select
                    id="patient-civil"
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value as Patient['civilStatus'])}
                    className="w-full h-10 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="patient-contact" className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Number *
                </label>
                <input
                  id="patient-contact"
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="0917-555-0100"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="patient-barangay" className="block text-xs font-medium text-slate-700 mb-1">
                  Barangay *
                </label>
                <select
                  id="patient-barangay"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {BARANGAY_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="patient-address" className="block text-xs font-medium text-slate-700 mb-1">
                  Street / Purok Address *
                </label>
                <input
                  id="patient-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House No., Street, Purok"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="patient-emergency-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Emergency Contact Person
                </label>
                <input
                  id="patient-emergency-name"
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Name & Relationship"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="patient-emergency-num" className="block text-xs font-medium text-slate-700 mb-1">
                  Emergency Contact Number
                </label>
                <input
                  id="patient-emergency-num"
                  type="text"
                  value={emergencyContactNumber}
                  onChange={(e) => setEmergencyContactNumber(e.target.value)}
                  placeholder="0918-555-0199"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label htmlFor="patient-allergies" className="block text-xs font-medium text-slate-700 mb-1">
                  Known Drug / Food Allergies
                </label>
                <input
                  id="patient-allergies"
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g., Penicillin, None known"
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                {editingPatient ? 'Save Profile Changes' : 'Complete Patient Registration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search patients by name, ID, or contact number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient ID (CHC-2026-...), full name, or contact number..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by Barangay"
            value={barangayFilter}
            onChange={(e) => setBarangayFilter(e.target.value)}
            className="h-10 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <option value="All">All Barangays</option>
            {BARANGAY_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(['All', 'Active', 'Archived'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Age / Sex</th>
                <th className="py-3 px-4">Barangay & Address</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching patient records found. Try clearing filters or registering a new patient.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-teal-800">
                      {patient.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {patient.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600">
                      {patient.age} yrs · {patient.sex}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {patient.barangay} · {patient.address}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600">
                      {patient.contactNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {patient.status}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(patient)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditForm(patient)}
                            className="px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePatient({
                                ...patient,
                                status: patient.status === 'Active' ? 'Archived' : 'Active',
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                          >
                            {patient.status === 'Active' ? 'Archive' : 'Activate'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Profile Drawer / Detail Card */}
      {selectedPatient && (
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono-tabular font-semibold text-teal-800">
                  {selectedPatient.id}
                </span>
                <span aria-hidden="true">·</span>
                <span>Registered {selectedPatient.registrationDate}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {selectedPatient.fullName}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPatient(null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Close Profile
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
            <div>
              <p className="text-slate-500">Birth Date & Age</p>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono-tabular">
                {selectedPatient.dateOfBirth} ({selectedPatient.age} yrs)
              </p>
            </div>
            <div>
              <p className="text-slate-500">Sex & Civil Status</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {selectedPatient.sex} · {selectedPatient.civilStatus}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Emergency Contact</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {selectedPatient.emergencyContactName} ({selectedPatient.emergencyContactNumber})
              </p>
            </div>
            <div>
              <p className="text-slate-500">Allergies & Blood Type</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {selectedPatient.allergies || 'None'} · Blood {selectedPatient.bloodType || '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
