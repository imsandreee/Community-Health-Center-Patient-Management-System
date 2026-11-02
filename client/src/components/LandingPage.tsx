import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Menu,
  X,
  ArrowRight,
  Mail,
  Phone,
  Calendar,
  Clock,
  Stethoscope,
  Heart,
  ShieldCheck,
  Users,
  UserPlus,
  Building2,
  CheckCircle2,
  Activity,
  LogIn,
} from 'lucide-react';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { PriorityChip } from './ui/PriorityChip';
import { AuthPage } from './AuthPage';
import { Patient, UserAccount, UserRole } from '../types/health';

interface LandingPageProps {
  users?: UserAccount[];
  patients?: Patient[];
  onSignInAsRole?: (role: UserRole) => void;
  onPatientSelfRegister?: (newPatient: Patient, newAccount: UserAccount) => void;
  onLogin?: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const links = [
  { name: 'Services', href: '#services' },
  { name: 'For Patients', href: '#for-patients' },
  { name: 'For Staff', href: '#for-staff' },
  { name: 'Pricing', href: '#pricing' },
];

const features = [
  {
    title: 'Patient Registration',
    description:
      'Digitally enroll barangay residents with PhilHealth-indigent validation, demographic capture, and consent management compliant with RA 10173.',
    icon: <UserPlus className="w-5 h-5" />,
    chip: <PriorityChip priority="Regular" size="sm" />,
  },
  {
    title: 'Appointment Booking',
    description:
      'Schedule consultations by service and time slot with automated confirmations, reminders, and waitlist management.',
    icon: <Calendar className="w-5 h-5" />,
    chip: <StatusBadge status="Scheduled" size="sm" showDot={false} />,
  },
  {
    title: 'Queue Management',
    description:
      'Statutory priority queuing for Senior Citizens (RA 9994), PWDs (BP 344), pregnant patients, and emergency cases with live ticket display.',
    icon: <Clock className="w-5 h-5" />,
    chip: <PriorityChip priority="Senior Citizen" size="sm" />,
  },
  {
    title: 'Vitals & Consultations',
    description:
      'Record blood pressure, temperature, BMI, and heart rate against PhilPEN clinical thresholds, with ICD-10 diagnoses and electronic prescriptions.',
    icon: <Stethoscope className="w-5 h-5" />,
    chip: <StatusBadge status="In Consultation" size="sm" showDot={false} />,
  },
  {
    title: 'Community Monitoring',
    description:
      'Track barangay health activities, outreach participation, and disease surveillance with aggregated reporting for LGU coordination.',
    icon: <Users className="w-5 h-5" />,
    chip: <StatusBadge status="Ongoing" size="sm" showDot={false} />,
  },
  {
    title: 'Audit & Compliance',
    description:
      'Immutable audit logs, role-based access control, and data privacy safeguards meeting WCAG 2.1 AA and the Philippine Data Privacy Act.',
    icon: <ShieldCheck className="w-5 h-5" />,
    chip: <StatusBadge status="Active" size="sm" showDot={false} />,
  },
];

const steps = [
  {
    step: '01',
    title: 'Register the patient',
    description:
      'Create a digital health record with demographics, PhilHealth status, and consent for data processing under RA 10173.',
  },
  {
    step: '02',
    title: 'Book a service',
    description:
      'Select a healthcare service, pick an available time slot, and receive a confirmed appointment with queue priority assignment.',
  },
  {
    step: '03',
    title: 'Consult & follow up',
    description:
      'Vitals are screened against PhilPEN thresholds, the doctor documents the consultation, and prescriptions are issued electronically.',
  },
];

const stats = [
  { label: 'Patients Registered', value: '12,840' },
  { label: 'Monthly Appointments', value: '3,420' },
  { label: 'Barangays Served', value: '14' },
  { label: 'Queue Wait Time (avg)', value: '< 12 min' },
];

const services = [
  { name: 'General Consultation', category: 'Primary Care', status: 'Active' as const, icon: <Stethoscope className="w-4 h-4" /> },
  { name: 'Immunization', category: 'Preventive Care', status: 'Active' as const, icon: <Heart className="w-4 h-4" /> },
  { name: 'Maternal Care', category: 'Reproductive Health', status: 'Active' as const, icon: <Users className="w-4 h-4" /> },
  { name: 'Senior Citizen Care', category: 'Geriatrics', status: 'Active' as const, icon: <Users className="w-4 h-4" /> },
  { name: 'Dental Services', category: 'Oral Health', status: 'Active' as const, icon: <Activity className="w-4 h-4" /> },
  { name: 'Medico-Legal', category: 'Documentation', status: 'Inactive' as const, icon: <ShieldCheck className="w-4 h-4" /> },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  users = [],
  patients = [],
  onSignInAsRole,
  onPatientSelfRegister,
  onLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [authView, setAuthView] = useState<'landing' | 'auth'>('landing');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const handleSignIn = () => setAuthView('auth');
  const handleBackToLanding = () => setAuthView('landing');

  if (authView === 'auth') {
    return (
      <AuthPage
        users={users}
        patients={patients}
        onSignInAsRole={onSignInAsRole!}
        onPatientSelfRegister={onPatientSelfRegister!}
        onLogin={onLogin}
        onBackToLanding={handleBackToLanding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-indigo-200 selection:text-indigo-900">
      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 border-b border-stone-200 bg-stone-50/80 backdrop-blur-sm"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && scrollTo('hero')}
              onClick={() => scrollTo('hero')}
            >
              <div className="w-8 h-8 rounded-md bg-indigo-700 flex items-center justify-center text-white shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-stone-900">
                San Roque<span className="text-indigo-700">CHC</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-xs font-display font-medium text-stone-600">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => scrollTo(link.href.slice(1))}
                  className="hover:text-indigo-700 transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <a href="#services" className="text-indigo-700 font-bold">
                Services
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => scrollTo('for-patients')}>
                For Patients
              </Button>
              <Button variant="primary" size="sm" onClick={() => scrollTo('cta')}>
                Get Started
              </Button>
              <button
                type="button"
                className="md:hidden p-2 text-stone-600 hover:text-stone-900"
                onClick={() => setMobileMenuOpen((p) => !p)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-stone-50 px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => scrollTo(link.href.slice(1))}
                className="block py-2 text-xs font-display font-medium text-stone-600 hover:text-indigo-700"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-3 border-t border-stone-200 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => scrollTo('for-patients')}>
                For Patients
              </Button>
              <Button variant="primary" size="sm" onClick={() => scrollTo('cta')}>
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section
        id="hero"
        className="relative pt-32 pb-20 sm:pt-48 sm:pb-32 overflow-hidden"
      >
        <div className="absolute inset-0 -z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/60 blur-[120px] pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/60 blur-[120px] pointer-events-none"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-6"
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-stone-300 text-xs font-display font-semibold text-stone-700 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Now accepting patient registration</span>
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-stone-900 leading-tight"
              >
                Community health,{' '}
                <span className="text-indigo-700">digitally managed.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-lg"
              >
                A flat, accessible, and WCAG 2.1 AA-compliant patient management system for barangay health centers.
                Register patients, manage queues, record vitals, and document consultations — all in one institutional
                platform.
              </motion.p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="primary" size="lg" leftIcon={<ArrowRight className="w-4 h-4" />} onClick={handleSignIn}>
                  Get Started
                </Button>
                <Button variant="secondary" size="lg" leftIcon={<LogIn className="w-4 h-4" />} onClick={handleSignIn}>
                  Sign in
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-stone-300 pt-6">
                {stats.slice(0, 3).map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="text-2xl font-display font-bold text-stone-900">{stat.value}</div>
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="relative h-[420px] flex items-end justify-center"
            >
              <div className="relative w-full max-w-sm">
                <div className="absolute inset-0 bg-stone-200/30 rounded-2xl blur-2xl -z-10" />
                <div className="bg-white border border-stone-300 rounded-2xl shadow-xl p-6 ring-1 ring-stone-900/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-indigo-700" />
                    <span className="font-display font-bold text-stone-900 text-sm">Queuing Dashboard</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500">Q-001 · Maria Santos</span>
                      <StatusBadge status="Called" size="sm" showDot={false} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500">Q-002 · Juan dela Cruz</span>
                      <StatusBadge status="Waiting" size="sm" showDot={false} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500">Q-003 · Rosa Reyes</span>
                      <StatusBadge status="Waiting" size="sm" showDot={false} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500">Q-004 · Pedro Lim</span>
                      <StatusBadge status="Scheduled" size="sm" showDot={false} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 text-xs font-display font-bold"
                    >
                      Q
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="services" className="py-24 border-y border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 tracking-tight">
              Built for barangay health operations
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              Every module follows the same civic institutional design language — high contrast, clear hierarchy, and
              statutory priority cues that staff can recognize at a glance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                whileHover={{ y: -4 }}
                className="p-6 rounded-xl border border-stone-200 bg-stone-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-stone-300 flex items-center justify-center text-indigo-700 mb-4 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-display font-bold text-stone-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-4">{feature.description}</p>
                <div className="flex items-center">{feature.chip}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="for-patients" className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 tracking-tight mb-4">
                Healthcare services for the community
              </h2>
              <p className="text-stone-600 leading-relaxed mb-8">
                Barangay health centers provide primary and preventive care close to home. Services are staffed by
                nurses, midwives, and medical officers, with statutory priority for seniors, PWDs, pregnant patients,
                and emergencies.
              </p>
              <div className="space-y-3">
                {['Same-day walk-in consultations', 'PhilHealth-indigent enrollment support', 'Vital signs screening (PhilPEN thresholds)', 'Electronic prescriptions & medical certificates', 'Community health outreach & surveillance'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="grid md:grid-cols-2 gap-4">
                {services.map((svc, idx) => (
                  <motion.div
                    key={svc.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.06 }}
                    className="p-4 rounded-lg border border-stone-200 bg-white flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-700">
                      {svc.icon}
                    </div>
                    <div>
                      <div className="text-sm font-display font-bold text-stone-900">{svc.name}</div>
                      <div className="text-[11px] text-stone-500 font-medium uppercase">{svc.category}</div>
                    </div>
                    <StatusBadge status={svc.status} size="sm" showDot={false} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="for-staff" className="py-24 border-y border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-900 tracking-tight">
              How care flows through the center
            </h2>
            <p className="mt-4 text-stone-600 leading-relaxed">
              From registration to consultation, every step is documented and prioritized according to statutory
              healthcare rules.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-8 rounded-2xl border border-stone-200 bg-stone-50 relative"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-white font-display font-bold text-lg mb-4 shadow-sm">
                  {step.step}
                </div>
                <h3 className="text-lg font-display font-bold text-stone-900 mb-2">{step.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{step.description}</p>
                <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold">
                  {idx + 1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-stone-300 bg-indigo-700 p-8 sm:p-12 text-center shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-900" />
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Ready to digitize your health center?
            </h2>
            <p className="text-indigo-100 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
              Join barangay health centers using a flat, accessible, WCAG 2.1 AA-compliant patient management system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg" leftIcon={<ArrowRight className="w-4 h-4" />}>
                Get Started
              </Button>
              <Button variant="ghost" size="lg" className="text-white border-white/20 hover:bg-white/10">
                Contact Us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-900 text-stone-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-indigo-700 flex items-center justify-center text-white">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-display font-bold text-lg text-stone-100">San Roque<span className="text-indigo-400">CHC</span></span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs">
                Patient Management System for community health centers. Designed with the Philippine institutional
                design system and WCAG 2.1 AA accessibility.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-display font-bold text-stone-100 uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2 text-xs text-stone-500">
                <li><a href="#services" className="hover:text-indigo-400 transition-colors">Services</a></li>
                <li><a href="#for-patients" className="hover:text-indigo-400 transition-colors">For Patients</a></li>
                <li><a href="#for-staff" className="hover:text-indigo-400 transition-colors">For Staff</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-display font-bold text-stone-100 uppercase tracking-wider mb-4">Compliance</h4>
              <ul className="space-y-2 text-xs text-stone-500">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">WCAG 2.1 AA</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">RA 10173 (Data Privacy)</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">BP 344 / RA 9994</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-display font-bold text-stone-100 uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-2 text-xs text-stone-500">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> sanroque-chc@barangay.gov.ph
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> +63 2 8XXX XXXX
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-stone-600">
            <span>San Roque Community Health Center · Patient Management System</span>
            <span>Compliant with the Philippine Data Privacy Act of 2012 (RA 10173)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
