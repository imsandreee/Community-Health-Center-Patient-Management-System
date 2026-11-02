import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  UserPlus,
  LogIn,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Users,
  Stethoscope,
  Activity,
  Heart,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Patient, UserAccount, UserRole } from '../types/health';
import { calculateAge, generatePatientId } from '../utils/healthLogic';

export interface AuthPageProps {
  users: UserAccount[];
  patients: Patient[];
  onSignInAsRole: (role: UserRole) => void;
  onPatientSelfRegister: (newPatient: Patient, newAccount: UserAccount) => void;
  /** Optional: real API login handler */
  onLogin?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onBackToLanding?: () => void;
}

interface RolePresetConfig {
  role: UserRole;
  label: string;
  person: string;
  email: string;
  department: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

export const WORKSPACE_ROLE_PRESETS: RolePresetConfig[] = [
  {
    role: 'staff',
    label: 'Health Center Staff',
    person: 'Elena Villanueva',
    email: 'e.villanueva@sanroque-chc.gov.ph',
    department: 'Front Desk & Patient Records',
    summary: 'Register patients, approve appointment slots, and manage statutory priority queue tickets.',
    icon: Users,
    tag: 'Front Desk & Triage',
  },
  {
    role: 'nurse',
    label: 'Community Nurse',
    person: 'Nurse Joy Bautista, RN',
    email: 'j.bautista@sanroque-chc.gov.ph',
    department: 'Triage & Nursing Assessment',
    summary: 'Record vital signs, screen blood pressure & BMI against PhilPEN protocols, and log community outreach.',
    icon: Activity,
    tag: 'PhilPEN Vitals & Care',
  },
  {
    role: 'doctor',
    label: 'Medical Officer (Doctor)',
    person: 'Dr. Rafael Mendoza, MD',
    email: 'r.mendoza@sanroque-chc.gov.ph',
    department: 'Clinical Consultations & EMR',
    summary: 'Document medical consultations, encode ICD-10 diagnoses, issue e-prescriptions, and submit clinical amendments.',
    icon: Stethoscope,
    tag: 'Consultations & Rx',
  },
  {
    role: 'patient',
    label: 'Patient Portal',
    person: 'Maria Clara Santos',
    email: 'maria.santos@patient.chc.ph',
    department: 'Citizen Health Portal',
    summary: 'Request healthcare appointments, check real-time queue numbers, and access permitted medical visit summaries.',
    icon: Heart,
    tag: 'Citizen Health Access',
  },
  {
    role: 'admin',
    label: 'System Administrator',
    person: 'Carlos Dizon',
    email: 'admin@sanroque-chc.gov.ph',
    department: 'Health Governance & IT',
    summary: 'Provision personnel accounts, configure clinic service schedules, and inspect immutable RA 10173 audit logs.',
    icon: ShieldCheck,
    tag: 'Governance & Security',
  },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  users,
  patients,
  onSignInAsRole,
  onPatientSelfRegister,
  onLogin,
  onBackToLanding,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [emailInput, setEmailInput] = useState('e.villanueva@sanroque-chc.gov.ph');
  const [passwordInput, setPasswordInput] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
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

  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [quickLoginRole, setQuickLoginRole] = useState<UserRole | null>(null);

  const handleSelectPreset = (preset: RolePresetConfig) => {
    setSelectedRole(preset.role);
    setEmailInput(preset.email);
    setPasswordInput('Password123!');
    setLoginError(null);
    setMode('login');
  };

  const handleQuickSignIn = async (preset: RolePresetConfig, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLoginError(null);
    setSelectedRole(preset.role);
    setEmailInput(preset.email);
    setPasswordInput('Password123!');
    setQuickLoginRole(preset.role);

    if (onLogin) {
      setLoginSubmitting(true);
      const res = await onLogin(preset.email, 'Password123!');
      setLoginSubmitting(false);
      setQuickLoginRole(null);
      if (!res.success) {
        setLoginError(res.error || `Unable to authenticate as ${preset.label}.`);
      }
    } else {
      onSignInAsRole(preset.role);
      setQuickLoginRole(null);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!emailInput.trim() || !passwordInput.trim()) {
      setLoginError('Please enter your account email address and password to sign in.');
      return;
    }

    if (onLogin) {
      setLoginSubmitting(true);
      const result = await onLogin(emailInput.trim(), passwordInput.trim());
      setLoginSubmitting(false);
      if (!result.success) {
        setLoginError(result.error ?? 'Login failed. Please check your credentials.');
      }
    } else {
      onSignInAsRole(selectedRole);
    }
  };

  const [regSubmitting, setRegSubmitting] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
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
      registrationDate: new Date().toISOString().split('T')[0],
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
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setRegSubmitting(true);
    try {
      await onPatientSelfRegister(newPatient, newAccount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setRegError(msg);
    } finally {
      setRegSubmitting(false);
    }
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

  const activePreset = WORKSPACE_ROLE_PRESETS.find((p) => p.role === selectedRole) || WORKSPACE_ROLE_PRESETS[0];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Institutional Navigation Bar */}
      <header className="bg-white border-b-2 border-stone-900 px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Civic Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block font-display font-bold text-sm text-stone-900 tracking-tight truncate">
                SAN ROQUE COMMUNITY HEALTH CENTER
              </span>
              <span className="block text-xs text-stone-500 truncate">
                Digital Patient Management & Clinical Operations Platform
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-stone-600 font-medium px-2.5 py-1 bg-stone-100 border border-stone-300">
              <Lock className="w-3.5 h-3.5 text-indigo-700" />
              <span>RA 10173 Clinical Privacy</span>
            </div>

            {onBackToLanding && (
              <button
                type="button"
                onClick={onBackToLanding}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-display font-bold text-stone-900 bg-white border-2 border-stone-900 hover:bg-stone-100 transition-colors whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Homepage</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Authentication Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Section Intro */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-mono-tabular font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            <span>Workspace Authentication & Role Presets</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
            Sign In to Health Center Workspace
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Select a verified role preset below for 1-click workspace testing, or enter your official credentials to authenticate.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Workspace Role Presets */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900 text-white p-5 border-2 border-stone-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-bold text-indigo-300 uppercase tracking-wider">
                  Preset Access Profiles
                </span>
                <span className="text-[11px] font-mono-tabular text-stone-400">
                  5 Roles Available
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                Click any profile to pre-fill credentials, or use <strong>Quick Sign In</strong> for instant authenticated session.
              </p>
            </div>

            {/* Role Preset Cards */}
            <div className="space-y-2.5" role="list" aria-label="Workspace Role Presets">
              {WORKSPACE_ROLE_PRESETS.map((preset) => {
                const isSelected = selectedRole === preset.role && mode === 'login';
                const Icon = preset.icon;
                const isQuickLoading = quickLoginRole === preset.role;

                return (
                  <div
                    key={preset.role}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectPreset(preset)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectPreset(preset);
                      }
                    }}
                    className={`w-full text-left p-4 transition-all border-2 cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-white border-indigo-700 shadow-md ring-1 ring-indigo-700'
                        : 'bg-white border-stone-300 hover:border-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-indigo-700 text-white border-indigo-700'
                              : 'bg-stone-100 text-stone-700 border-stone-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-xs text-stone-900">
                              {preset.label}
                            </span>
                            <span
                              className={`text-[10px] font-mono-tabular font-semibold uppercase px-1.5 py-0.2 border ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-stone-100 text-stone-600 border-stone-200'
                              }`}
                            >
                              {preset.role}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-stone-700 mt-0.5 truncate">
                            {preset.person}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-stone-500 truncate">
                            {preset.email}
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Quick Sign In Action */}
                      <button
                        type="button"
                        disabled={loginSubmitting}
                        onClick={(e) => handleQuickSignIn(preset, e)}
                        title={`1-Click Sign In as ${preset.label}`}
                        className={`px-3 py-1.5 text-xs font-display font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                            : 'bg-stone-900 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isQuickLoading ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin status-indicator-dot" />
                        ) : (
                          <LogIn className="w-3.5 h-3.5" />
                        )}
                        <span>Quick Login</span>
                      </button>
                    </div>

                    <p className="text-xs text-stone-600 leading-snug pt-1 border-t border-stone-100">
                      {preset.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive Sign In / Registration Canvas */}
          <div className="lg:col-span-7 bg-white border-2 border-stone-900 p-6 sm:p-8 shadow-xs">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 bg-stone-100 p-1 border-2 border-stone-900 gap-1 mb-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`py-2.5 px-3 text-xs font-display font-bold transition-colors whitespace-nowrap text-center cursor-pointer ${
                  mode === 'login'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                1. Account Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-2.5 px-3 text-xs font-display font-bold transition-colors whitespace-nowrap text-center cursor-pointer ${
                  mode === 'register'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                2. Patient Registration
              </button>
              <button
                type="button"
                onClick={() => setMode('recovery')}
                className={`py-2.5 px-3 text-xs font-display font-bold transition-colors whitespace-nowrap text-center cursor-pointer ${
                  mode === 'recovery'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                3. Password Recovery
              </button>
            </div>

            {/* TAB 1: ACCOUNT SIGN IN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">
                    Sign In with Credentials
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Authenticate to unlock your assigned role permissions under RA 10173.
                  </p>
                </div>

                {/* Selected Preset Feedback Strip */}
                <div className="p-3.5 bg-stone-50 border-2 border-stone-300 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <span className="block text-[11px] font-display font-bold text-stone-500 uppercase tracking-wider">
                      Selected Role Preset
                    </span>
                    <span className="text-xs font-display font-bold text-stone-900">
                      {activePreset.label} · {activePreset.person}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-tabular font-bold text-indigo-700 uppercase px-2 py-0.5 bg-indigo-50 border border-indigo-200">
                    {activePreset.role}
                  </span>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-50 border-2 border-red-700 text-xs font-medium text-red-900 flex items-start gap-2"
                  >
                    <span className="font-bold">Error:</span>
                    <span>{loginError}</span>
                  </div>
                )}

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
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g., e.villanueva@sanroque-chc.gov.ph"
                      className="w-full h-11 px-3.5 text-sm bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none font-mono-tabular transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-login-password"
                      className="block text-xs font-display font-bold text-stone-800 mb-1.5"
                    >
                      Account Password *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="auth-login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-11 pl-3.5 pr-11 text-sm bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 text-stone-400 hover:text-stone-700 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('recovery')}
                    className="text-xs font-display font-semibold text-indigo-700 hover:underline text-left cursor-pointer"
                  >
                    Forgot password or need account recovery?
                  </button>

                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {loginSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin status-indicator-dot" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PATIENT SELF-REGISTRATION */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">
                    New Patient Account Registration
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Create your personal patient portal account to receive a unique San Roque CHC Patient ID.
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
                      required
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
                      required
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
                      required
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
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none cursor-pointer"
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
                      required
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
                      className="w-full h-10 px-3 text-xs bg-white border-2 border-stone-300 focus:border-indigo-700 focus:outline-none cursor-pointer"
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
                      required
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
                      required
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
                    disabled={regSubmitting}
                    className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {regSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin status-indicator-dot" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>Complete Registration & Enter Portal</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: PASSWORD RECOVERY */}
            {mode === 'recovery' && (
              <form onSubmit={handleRecoverySubmit} className="space-y-5">
                <div>
                  <h2 className="text-xl font-display font-bold text-stone-900">
                    Account Password Recovery
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Enter your registered email address or Patient ID to request a credential reset.
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
                    required
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
                    className="text-xs font-display font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-display font-bold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Send Recovery Instructions</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 px-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>San Roque Community Health Center · Municipal Health Office</span>
          <span className="font-mono-tabular">Philippine Data Privacy Act of 2012 (RA 10173)</span>
        </div>
      </footer>
    </div>
  );
};
