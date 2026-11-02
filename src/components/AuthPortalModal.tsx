import React, { useState } from 'react';
import { Building2, ShieldCheck, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { Patient, UserAccount, UserRole } from '../types/health';
import { calculateAge, generatePatientId } from '../utils/healthLogic';

interface AuthPortalModalProps {
  users: UserAccount[];
  patients: Patient[];
  onSignInAsRole: (role: UserRole) => void;
  onPatientSelfRegister: (newPatient: Patient, newAccount: UserAccount) => void;
  onClose: () => void;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  users,
  patients,
  onSignInAsRole,
  onPatientSelfRegister,
  onClose,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'recovery'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [emailInput, setEmailInput] = useState('e.villanueva@sanroque-chc.gov.ph');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');

  // Self-registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDob, setRegDob] = useState('1992-06-15');
  const [regSex, setRegSex] = useState<'Female' | 'Male'>('Female');
  const [regContact, setRegContact] = useState('');
  const [regBarangay, setRegBarangay] = useState('Barangay San Roque');
  const [regAddress, setRegAddress] = useState('');
  const [regConsent, setRegConsent] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);

  const handleRolePresetChange = (r: UserRole) => {
    setSelectedRole(r);
    const match = users.find((u) => u.role === r);
    if (match) setEmailInput(match.email);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignInAsRole(selectedRole);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (!regName.trim() || !regEmail.trim() || !regContact.trim() || !regAddress.trim()) {
      setRegError('Please fill in all required registration fields.');
      return;
    }
    if (!regConsent) {
      setRegError('Please accept the Philippine Data Privacy Act of 2012 (RA 10173) consent notice.');
      return;
    }

    const newPatientId = generatePatientId(patients);
    const newPatient: Patient = {
      id: newPatientId,
      fullName: regName.trim(),
      dateOfBirth: regDob,
      age: calculateAge(regDob),
      sex: regSex,
      civilStatus: 'Single',
      contactNumber: regContact.trim(),
      address: regAddress.trim(),
      barangay: regBarangay,
      emergencyContactName: 'On file',
      emergencyContactNumber: regContact.trim(),
      registrationDate: '2026-11-02',
      status: 'Active',
      bloodType: 'O+',
      allergies: 'None known',
    };

    const newAccount: UserAccount = {
      id: `USR-0${users.length + 1}`,
      name: regName.trim(),
      email: regEmail.trim(),
      role: 'patient',
      department: 'Patient Portal',
      status: 'Active',
      patientId: newPatientId,
      lastLogin: '2026-11-02 09:50',
    };

    onPatientSelfRegister(newPatient, newAccount);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-portal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="auth-portal-title" className="text-base font-bold text-slate-900">
                San Roque Community Health Center · Authentication Portal
              </h2>
              <p className="text-xs text-slate-500">
                Role-Based Access Control & Patient Self-Registration (FR-001 – FR-005)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Return to Workspace
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md mt-4">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
              tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Role Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
              tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Patient Account Registration
          </button>
          <button
            type="button"
            onClick={() => setTab('recovery')}
            className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
              tab === 'recovery' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Password Recovery
          </button>
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Select Role Credential Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(['patient', 'staff', 'nurse', 'doctor', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRolePresetChange(r)}
                    className={`py-2 px-2.5 text-xs font-semibold rounded-md border capitalize transition-colors ${
                      selectedRole === r
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Account Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                Session permissions and protected clinical modules will be configured for{' '}
                <strong className="uppercase text-slate-900">{selectedRole}</strong>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Authenticate & Enter Workspace</span>
              </button>
            </div>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
            {regError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                {regError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g., Clarissa Mendoza"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="clarissa@patient.chc.ph"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="reg-dob" className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  id="reg-dob"
                  type="date"
                  value={regDob}
                  onChange={(e) => setRegDob(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="reg-contact" className="block text-xs font-medium text-slate-700 mb-1">
                  Mobile Contact Number *
                </label>
                <input
                  id="reg-contact"
                  type="text"
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  placeholder="0917-555-0821"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular"
                />
              </div>
              <div>
                <label htmlFor="reg-brgy" className="block text-xs font-medium text-slate-700 mb-1">
                  Barangay *
                </label>
                <select
                  id="reg-brgy"
                  value={regBarangay}
                  onChange={(e) => setRegBarangay(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="Barangay San Roque">Barangay San Roque</option>
                  <option value="Barangay San Isidro">Barangay San Isidro</option>
                  <option value="Barangay Santa Cruz">Barangay Santa Cruz</option>
                  <option value="Barangay Maligaya">Barangay Maligaya</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-addr" className="block text-xs font-medium text-slate-700 mb-1">
                  House No. & Street *
                </label>
                <input
                  id="reg-addr"
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="14 Mabini St., Purok 1"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={regConsent}
                onChange={(e) => setRegConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <span>
                I consent to the collection and processing of my health and personal data by the Community Health Center in accordance with the Philippine Data Privacy Act of 2012 (RA 10173).
              </span>
            </label>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Patient Account & Sign In</span>
              </button>
            </div>
          </form>
        )}

        {tab === 'recovery' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-600">
              Enter your registered email address or Patient ID to receive password reset instructions from the Health Center system administrator.
            </p>
            <input
              type="email"
              placeholder="registered.email@sanroque-chc.gov.ph"
              className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md"
            />
            {recoverySent && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
                Password recovery instructions have been logged and dispatched to your registered contact.
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setRecoverySent(true)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Send Recovery Instructions</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
