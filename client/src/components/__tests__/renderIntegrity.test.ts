import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import App from '../../App';
import { LandingPage } from '../LandingPage';
import { AuthPage } from '../AuthPage';
import { DashboardView } from '../DashboardView';
import { PatientModule } from '../PatientModule';
import { AppointmentModule } from '../AppointmentModule';
import { QueueModule } from '../QueueModule';
import { VitalSignsModule } from '../VitalSignsModule';
import { ConsultationModule } from '../ConsultationModule';
import { ServicesModule } from '../ServicesModule';
import { CommunityModule } from '../CommunityModule';
import { ReportsModule } from '../ReportsModule';
import { UsersModule } from '../UsersModule';
import { AuditLogsModule } from '../AuditLogsModule';

test('App renders without crashing', () => {
  const html = ReactDOMServer.renderToString(React.createElement(App));
  assert.ok(html.length > 0, 'App should render HTML');
  console.log('App render output length:', html.length);
});

test('LandingPage renders without crashing', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(LandingPage, {
      users: [],
      patients: [],
      onSignInAsRole: () => {},
      onPatientSelfRegister: () => {},
      onLogin: async () => ({ success: true })
    })
  );
  assert.ok(html.length > 0, 'LandingPage should render HTML');
  console.log('LandingPage render output length:', html.length);
});

test('AuthPage renders without crashing', () => {
  const html = ReactDOMServer.renderToString(
    React.createElement(AuthPage, {
      users: [],
      patients: [],
      onSignInAsRole: () => {},
      onPatientSelfRegister: () => {},
      onLogin: async () => ({ success: true }),
      onBackToLanding: () => {}
    })
  );
  assert.ok(html.length > 0, 'AuthPage should render HTML');
  console.log('AuthPage render output length:', html.length);
});

test('DashboardView renders for each role without crashing', () => {
  const roles = ['staff', 'nurse', 'doctor', 'patient', 'admin'] as const;
  for (const role of roles) {
    const user = {
      id: 'USR-TEST',
      name: 'Test User',
      email: 'test@chc.ph',
      role,
      department: 'Clinical',
      status: 'Active' as const,
      patientId: 'CHC-2026-0101'
    };
    const html = ReactDOMServer.renderToString(
      React.createElement(DashboardView, {
        currentUser: user,
        patients: [],
        appointments: [],
        queue: [],
        vitals: [],
        consultations: [],
        services: [],
        notifications: [],
        auditLogs: [],
        onNavigate: () => {}
      })
    );
    assert.ok(html.length > 0, `DashboardView should render for role ${role}`);
  }
});

test('PatientModule renders for all roles without crashing', () => {
  const roles = ['staff', 'nurse', 'doctor', 'patient', 'admin'] as const;
  for (const role of roles) {
    const user = {
      id: 'USR-TEST',
      name: 'Test User',
      email: 'test@chc.ph',
      role,
      department: 'Clinical',
      status: 'Active' as const,
      patientId: 'CHC-2026-0101'
    };
    const html = ReactDOMServer.renderToString(
      React.createElement(PatientModule, {
        currentUser: user,
        patients: [],
        onRegisterPatient: () => {},
        onUpdatePatient: () => {},
        onArchivePatient: () => {}
      })
    );
    assert.ok(html.length > 0, `PatientModule should render for role ${role}`);
  }
});

test('AppointmentModule renders for all roles without crashing', () => {
  const roles = ['staff', 'nurse', 'doctor', 'patient', 'admin'] as const;
  for (const role of roles) {
    const user = {
      id: 'USR-TEST',
      name: 'Test User',
      email: 'test@chc.ph',
      role,
      department: 'Clinical',
      status: 'Active' as const,
      patientId: 'CHC-2026-0101'
    };
    const html = ReactDOMServer.renderToString(
      React.createElement(AppointmentModule, {
        currentUser: user,
        appointments: [],
        patients: [],
        services: [],
        onRequestAppointment: () => {},
        onStatusChange: () => {},
        onReschedule: () => {}
      })
    );
    assert.ok(html.length > 0, `AppointmentModule should render for role ${role}`);
  }
});

test('QueueModule renders for all roles without crashing', () => {
  const roles = ['staff', 'nurse', 'doctor', 'patient', 'admin'] as const;
  for (const role of roles) {
    const user = {
      id: 'USR-TEST',
      name: 'Test User',
      email: 'test@chc.ph',
      role,
      department: 'Clinical',
      status: 'Active' as const,
      patientId: 'CHC-2026-0101'
    };
    const html = ReactDOMServer.renderToString(
      React.createElement(QueueModule, {
        currentUser: user,
        queue: [],
        patients: [],
        services: [],
        onIssueTicket: () => {},
        onCallNext: () => {},
        onCompleteConsultation: () => {},
        onTransferService: () => {},
        onCancelTicket: () => {}
      })
    );
    assert.ok(html.length > 0, `QueueModule should render for role ${role}`);
  }
});

test('VitalSignsModule renders for all roles without crashing', () => {
  const roles = ['staff', 'nurse', 'doctor', 'patient', 'admin'] as const;
  for (const role of roles) {
    const user = {
      id: 'USR-TEST',
      name: 'Test User',
      email: 'test@chc.ph',
      role,
      department: 'Clinical',
      status: 'Active' as const,
      patientId: 'CHC-2026-0101'
    };
    const html = ReactDOMServer.renderToString(
      React.createElement(VitalSignsModule, {
        currentUser: user,
        vitals: [],
        patients: [],
        queue: [],
        onRecordVitals: () => {}
      })
    );
    assert.ok(html.length > 0, `VitalSignsModule should render for role ${role}`);
  }
});

test('ConsultationModule renders for all roles without crashing', () => {
  const roles = ['staff', 'nurse', 'doctor', 'patient', 'admin'] as const;
  for (const role of roles) {
    const user = {
      id: 'USR-TEST',
      name: 'Test User',
      email: 'test@chc.ph',
      role,
      department: 'Clinical',
      status: 'Active' as const,
      patientId: 'CHC-2026-0101'
    };
    const html = ReactDOMServer.renderToString(
      React.createElement(ConsultationModule, {
        currentUser: user,
        consultations: [],
        patients: [],
        queue: [],
        vitals: [],
        onSaveConsultation: () => {}
      })
    );
    assert.ok(html.length > 0, `ConsultationModule should render for role ${role}`);
  }
});
