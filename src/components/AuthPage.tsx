import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  UserPlus,
  LogIn,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Patient, UserAccount, UserRole } from '../types/health';
import { calculateAge, generatePatientId } from '../utils/healthLogic';

interface AuthPageProps {
  users: UserAccount[];
  patients: Patient[];
  onSignInAsRole: (role: UserRole) => void;
  onPatientSelfRegister: (newPatient: Patient, newAccount: UserAccount) => void;
}

const ROLE_DESCRIPTIONS: Record<
  UserRole,
  { label: string; person: string; summary: string }
> = {
  staff: {
    label: 'Health Center Staff',
    person: 'Elena Villanueva',
    summary: 'Register patients, approve appointments, and manage daily patient queues.',
  },
  nurse: {
    label: 'Community Nurse',
    person: 'Nurse Joy Bautista, RN',
    summary: 'Record vital signs, calculate BMI, and log community health outreach.',
  },
  doctor: {
    label: 'Medical Officer',
    person: 'Dr. Rafael Mendoza, MD',
    summary: 'Document consultations, ICD-10 diagnoses, prescriptions, and clinical amendments.',
  },
  patient: {
    label: 'Patient Portal',
    person: 'Maria Clara Santos',
    summary: 'Request appointments, track queue tickets, and view permitted medical records.',
  },
  admin: {
    label: 'System Administrator',
    person: 'Carlos Dizon',
    summary: 'Manage staff accounts, healthcare services, and review immutable audit logs.',
  },
};

export const AuthPage: React.FC<AuthPageProps> = ({
  users,
  patients,
  onSignInAsRole,
  onPatientSelfRegister,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [emailInput, setEmailInput] = useState('e.villanueva@sanroque-chc.gov.ph');
  const [passwordInput, setPasswordInput] = useState('sanroque2026');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Patient Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDob, setRegDob] = useState('1994-05-18');
  const [regSex, setRegSex] = useState<'Female' | 'Male'>('Female');
  const [regContact, setRegContact] = useState('');
  const [regBarangay, setRegBarangay] = useState('Barangay San Roque');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConsent, setRegConsent] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);

  // Password Recovery State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setLoginError(null);
    const matchingUser = users.find((u) => u.role === role);
    if (matchingUser) {
      setEmailInput(matchingUser.email);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!emailInput.trim() || !passwordInput.trim()) {
      setLoginError('Please enter your account email address and password to sign in.');
      return;
    }
    onSignInAsRole(selectedRole);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !regContact.trim() ||
      !regAddress.trim() ||
      !regPassword.trim()
    ) {
      setRegError('Please fill in all required patient registration fields.');
      return;
    }
    if (!regConsent) {
      setRegError(
        'Please accept the Philippine Data Privacy Act of 2012 (RA 10173) consent notice.'
      );
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
      lastLogin: '2026-11-02 10:00',
    };

    onPatientSelfRegister(newPatient, newAccount);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!recoveryEmail.trim()) {
      setRecoveryError('Please enter your registered email address or Patient ID.');
      return;
    }
    setRecoverySent(true);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col justify-between">
      {/* Top Institutional Bar */}
      <header className="bg-white border-b-2 border-stone-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-700 text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block font-display font-bold text-sm text-stone-900 tracking-tight">
              SAN ROQUE COMMUNITY HEALTH CENTER
            </span>
            <span className="block text-xs text-stone-500">
              Digital Patient Management & Clinical Operations Platform
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-600 font-medium">
          <Lock className="w-3.5 h-3.5 text-indigo-700" />
          <span>RA 10173 Data Privacy Compliant · Role-Based Access</span>
        </div>
      </header>

      {/* Main Split Authentication Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Civic Health Center Overview & Role Selector */}
        <section className="lg:col-span-5 bg-stone-900 text-white p-8 flex flex-col justify-between border-2 border-stone-900">
          <div>
            <div className="text-xs font-display font-semibold text-indigo-300">
              Unified Barangay Healthcare Platform
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold mt-2 leading-tight">
              Organized Patient Care & Community Health Monitoring
            </h1>
            <p className="text-sm text-stone-300 mt-3 leading-relaxed">
              Digitizing patient registration, appointment scheduling, priority queue management, vital signs triage, and electronic medical records for San Roque Community Health Center.
            </p>

            <div className="mt-8 pt-6 border-t border-stone-700 space-y-4">
              <div className="text-xs font-display font-semibold text-stone-300">
                Select Role Workspace Preset to Sign In:
              </div>
              <div className="space-y-2">
                {(['staff', 'nurse', 'doctor', 'patient', 'admin'] as UserRole[]).map(
                  (roleKey) => {
                    const info = ROLE_DESCRIPTIONS[roleKey];
                    const isSelected = selectedRole === roleKey && mode === 'login';
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => {
                          setMode('login');
                          handleSelectRole(roleKey);
                        }}
                        className={`w-full text-left p-3 transition-colors border ${
                          isSelected
                            ? 'bg-indigo-700 border-indigo-400 text-white'
                            : 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-display font-bold">
                          <span>{info.label}</span>
                          <span className="font-mono-tabular text-[11px] opacity-90">
                            {info.person}
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 mt-1 leading-snug">
                          {info.summary}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-700 flex items-center justify-between text-xs text-stone-400">
            <span>Catchment: 5 Barangays</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Strict Clinical RBAC</span>
          </div>
        </section>

        {/* Right Column: Interactive Sign In / Patient Registration / Password Recovery Form */}
        <section className="lg:col-span-7 bg-white border-2 border-stone-900 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 border-2 border-stone-900 bg-stone-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`py-2.5 px-3 text-xs font-display font-bold transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                1. Account Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-2.5 px-3 text-xs font-display font-bold transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                2. Patient Registration
              </button>
              <button
                type="button"
                onClick={() => setMode('recovery')}
                className={`py-2.5 px-3 text-xs font-display font-bold transition-colors whitespace-nowrap ${
                  mode === 'recovery'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                3. Password Recovery
              </button>
            </div>

            {/* TAB 1: ACCOUNT SIGN IN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-5">
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">
                    Sign In to Health Center Workspace
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Authenticate with your assigned role credentials (FR-001 – FR-003).
                  </p>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border-2 border-red-700 text-xs font-medium text-red-900"
                  >
                    {loginError}
                  </div>
                )}

                <div className="p-4 bg-stone-50 border border-stone-300">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-stone-800">
                      Selected Role Profile: {ROLE_DESCRIPTIONS[selectedRole].label}
                    </span>
                    <span className="font-mono-tabular text-indigo-700 font-semibold uppercase">
                      Role: {selectedRole}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    {ROLE_DESCRIPTIONS[selectedRole].summary}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-login-email"
                      className="block text-xs font-display font-bold text-stone-800 mb-1.5"
                    >
                      Official Email Address or Username *
                    </label>
                    <input
                      id="auth-login-email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-login-password"
                      className="block text-xs font-display font-bold text-stone-800 mb-1.5"
                    >
                      Account Password *
                    </label>
                    <input
                      id="auth-login-password"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('recovery')}
                    className="text-xs font-display font-semibold text-indigo-700 hover:underline text-left"
                  >
                    Forgot password or need account recovery?
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In as {ROLE_DESCRIPTIONS[selectedRole].label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PATIENT SELF-REGISTRATION */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">
                    New Patient Account Registration
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Create your personal patient portal account and receive a unique San Roque CHC Patient ID (FR-006 – FR-007).
                  </p>
                </div>

                {regError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border-2 border-red-700 text-xs font-medium text-red-900"
                  >
                    {regError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="auth-reg-name"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Full Name *
                    </label>
                    <input
                      id="auth-reg-name"
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g., Clarissa Mendoza"
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-email"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Email Address *
                    </label>
                    <input
                      id="auth-reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="clarissa@patient.chc.ph"
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-dob"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Date of Birth * ({calculateAge(regDob)} yrs)
                    </label>
                    <input
                      id="auth-reg-dob"
                      type="date"
                      value={regDob}
                      onChange={(e) => setRegDob(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-sex"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Sex *
                    </label>
                    <select
                      id="auth-reg-sex"
                      value={regSex}
                      onChange={(e) => setRegSex(e.target.value as 'Female' | 'Male')}
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-contact"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Contact Number *
                    </label>
                    <input
                      id="auth-reg-contact"
                      type="text"
                      value={regContact}
                      onChange={(e) => setRegContact(e.target.value)}
                      placeholder="0917-555-0821"
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none font-mono-tabular"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-brgy"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Barangay *
                    </label>
                    <select
                      id="auth-reg-brgy"
                      value={regBarangay}
                      onChange={(e) => setRegBarangay(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none"
                    >
                      <option value="Barangay San Roque">Barangay San Roque</option>
                      <option value="Barangay San Isidro">Barangay San Isidro</option>
                      <option value="Barangay Santa Cruz">Barangay Santa Cruz</option>
                      <option value="Barangay Maligaya">Barangay Maligaya</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-addr"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Street / Purok Address *
                    </label>
                    <input
                      id="auth-reg-addr"
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="14 Mabini St., Purok 1"
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-reg-pwd"
                      className="block text-xs font-display font-bold text-stone-800 mb-1"
                    >
                      Create Password *
                    </label>
                    <input
                      id="auth-reg-pwd"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-0.5 border-stone-400 text-indigo-700"
                  />
                  <span>
                    I consent to the collection and processing of my personal and health data in accordance with the Philippine Data Privacy Act of 2012 (RA 10173).
                  </span>
                </label>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Complete Registration & Enter Portal</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: PASSWORD RECOVERY */}
            {mode === 'recovery' && (
              <form onSubmit={handleRecoverySubmit} className="mt-6 space-y-5">
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">
                    Account Password Recovery
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Enter your registered email address or Patient ID to request a credential reset from the Health Center system administrator.
                  </p>
                </div>

                {recoveryError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border-2 border-red-700 text-xs font-medium text-red-900"
                  >
                    {recoveryError}
                  </div>
                )}

                {recoverySent && (
                  <div
                    role="status"
                    className="p-4 bg-emerald-50 border-2 border-emerald-700 text-xs text-emerald-900 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-bold">
                        Password Reset Instructions Dispatched
                      </p>
                      <p className="mt-0.5">
                        A verification link and temporary access instructions have been logged for{' '}
                        <span className="font-mono-tabular font-semibold">{recoveryEmail}</span>.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-recovery-input"
                    className="block text-xs font-display font-bold text-stone-800 mb-1.5"
                  >
                    Registered Email or Patient ID (CHC-2026-XXXX) *
                  </label>
                  <input
                    id="auth-recovery-input"
                    type="text"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="e.g., maria.santos@patient.chc.ph or CHC-2026-0101"
                    className="w-full h-11 px-3.5 text-sm bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none font-mono-tabular"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs font-display font-semibold text-stone-600 hover:text-stone-900"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Send Recovery Instructions</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
            <span>Protected by Role-Based Access Control (FR-001 – FR-005)</span>
            <span className="font-mono-tabular">Session Security Active</span>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-stone-300 px-6 py-4 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>San Roque Community Health Center · Municipal Health Office</span>
        <span>Philippine Data Privacy Act of 2012 (RA 10173)</span>
      </footer>
    </div>
  );
};
