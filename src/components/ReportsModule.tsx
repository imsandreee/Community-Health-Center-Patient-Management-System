import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import {
  Appointment,
  CommunityHealthActivity,
  ConsultationRecord,
  Patient,
  UserAccount,
  VitalSignRecord,
} from '../types/health';
import { recordsToCSV } from '../utils/healthLogic';

interface ReportsModuleProps {
  currentUser: UserAccount;
  patients: Patient[];
  appointments: Appointment[];
  consultations: ConsultationRecord[];
  vitals: VitalSignRecord[];
  activities: CommunityHealthActivity[];
}

type ReportCategory =
  | 'patient_registry'
  | 'appointments'
  | 'consultations'
  | 'vitals_summary'
  | 'community_monitoring';

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  currentUser,
  patients,
  appointments,
  consultations,
  vitals,
  activities,
}) => {
  const [reportType, setReportType] = useState<ReportCategory>('patient_registry');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const inRange = (dateStr: string) => {
    const clean = dateStr.slice(0, 10);
    return clean >= startDate && clean <= endDate;
  };

  const filteredPatients = patients.filter((p) => inRange(p.registrationDate));
  const filteredAppointments = appointments.filter((a) => inRange(a.date));
  const filteredConsultations = consultations.filter((c) => inRange(c.consultationDate));
  const filteredVitals = vitals.filter((v) => inRange(v.recordedAt));
  const filteredActivities = activities.filter((a) => inRange(a.date));

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === 'patient_registry') {
      headers = ['Patient ID', 'Full Name', 'DOB', 'Age', 'Sex', 'Barangay', 'Contact', 'Registration Date', 'Status'];
      rows = filteredPatients.map((p) => [
        p.id,
        p.fullName,
        p.dateOfBirth,
        p.age,
        p.sex,
        p.barangay,
        p.contactNumber,
        p.registrationDate,
        p.status,
      ]);
    } else if (reportType === 'appointments') {
      headers = ['Appointment ID', 'Date', 'Time', 'Patient ID', 'Patient Name', 'Service', 'Personnel', 'Status'];
      rows = filteredAppointments.map((a) => [
        a.id,
        a.date,
        a.timeSlot,
        a.patientId,
        a.patientName,
        a.serviceName,
        a.assignedPersonnel,
        a.status,
      ]);
    } else if (reportType === 'consultations') {
      headers = ['Consultation ID', 'Date', 'Patient ID', 'Patient Name', 'Doctor', 'Diagnosis', 'ICD-10', 'Treatment Plan'];
      rows = filteredConsultations.map((c) => [
        c.id,
        c.consultationDate,
        c.patientId,
        c.patientName,
        c.attendingDoctor,
        c.diagnosis,
        c.icdCode,
        c.treatmentPlan,
      ]);
    } else if (reportType === 'vitals_summary') {
      headers = ['Record ID', 'Recorded At', 'Patient Name', 'BP (mmHg)', 'Temp (C)', 'HR (bpm)', 'BMI', 'Category'];
      rows = filteredVitals.map((v) => [
        v.id,
        v.recordedAt,
        v.patientName,
        `${v.systolic}/${v.diastolic}`,
        v.temperatureC,
        v.heartRateBpm,
        v.bmi,
        v.bmiCategory,
      ]);
    } else {
      headers = ['Activity ID', 'Date', 'Title', 'Category', 'Barangay', 'Coordinator', 'Participants', 'Target', 'Status'];
      rows = filteredActivities.map((a) => [
        a.id,
        a.date,
        a.title,
        a.category,
        a.barangay,
        a.coordinator,
        a.participantsCount,
        a.targetCount,
        a.status,
      ]);
    }

    const csvContent = recordsToCSV(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chc_${reportType}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportMessage(
      `Exported ${rows.length} record(s) to CSV file chc_${reportType}_${startDate}_to_${endDate}.csv.`
    );
  };

  const handlePrintReport = () => {
    setExportMessage('Prepared printable report layout. Invoking browser print / PDF view...');
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Operational & Community Health Reports
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Generate date-filtered operational summaries, printable official sheets, and CSV data exports (FR-041 – FR-044).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between text-xs font-medium no-print"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{exportMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setExportMessage(null)}
            className="text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Report Configuration & Date-Range Controls (FR-042) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'patient_registry', label: 'Patient Registration' },
              { id: 'appointments', label: 'Appointment Schedule' },
              { id: 'consultations', label: 'Daily Consultations' },
              { id: 'vitals_summary', label: 'Vital Signs Summary' },
              { id: 'community_monitoring', label: 'Community Programs' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                reportType === tab.id
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="rep-start" className="block text-[11px] font-medium text-slate-500 mb-1">
              From Date
            </label>
            <input
              id="rep-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="rep-end" className="block text-[11px] font-medium text-slate-500 mb-1">
              To Date
            </label>
            <input
              id="rep-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md font-mono-tabular"
            />
          </div>
        </div>
      </div>

      {/* Report Sheet Output */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">
              Republic of the Philippines · San Roque Community Health Center
            </p>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              {reportType === 'patient_registry' && 'Official Patient Registration & Demographic Report'}
              {reportType === 'appointments' && 'Appointment Utilization & Status Report'}
              {reportType === 'consultations' && 'Clinical Consultation & Morbidity Summary Report'}
              {reportType === 'vitals_summary' && 'Patient Vital Signs & BMI Assessment Summary'}
              {reportType === 'community_monitoring' && 'Community Health Outreach & Field Activity Report'}
            </h2>
          </div>
          <div className="text-right text-xs font-mono-tabular text-slate-500">
            <div>Period: {startDate} to {endDate}</div>
            <div>Generated by: {currentUser.name}</div>
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          {reportType === 'patient_registry' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-3">Patient ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Age / Sex</th>
                  <th className="py-2.5 px-3">Barangay</th>
                  <th className="py-2.5 px-3">Registration Date</th>
                  <th className="py-2.5 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPatients.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-3 font-mono-tabular font-semibold">{p.id}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{p.fullName}</td>
                    <td className="py-2.5 px-3 font-mono-tabular">{p.age} yrs · {p.sex}</td>
                    <td className="py-2.5 px-3">{p.barangay}</td>
                    <td className="py-2.5 px-3 font-mono-tabular">{p.registrationDate}</td>
                    <td className="py-2.5 pl-3 text-right">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'appointments' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-3">Ref ID</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAppointments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 pr-3 font-mono-tabular font-semibold">{a.id}</td>
                    <td className="py-2.5 px-3 font-mono-tabular">{a.date} · {a.timeSlot}</td>
                    <td className="py-2.5 px-3 font-medium">{a.patientName}</td>
                    <td className="py-2.5 px-3">{a.serviceName}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'consultations' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-3">Consultation ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Diagnosis (ICD-10)</th>
                  <th className="py-2.5 pl-3">Physician</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredConsultations.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3 font-mono-tabular font-semibold">{c.id}</td>
                    <td className="py-2.5 px-3 font-mono-tabular">{c.consultationDate}</td>
                    <td className="py-2.5 px-3 font-medium">{c.patientName}</td>
                    <td className="py-2.5 px-3 font-semibold text-teal-800">
                      {c.diagnosis} ({c.icdCode})
                    </td>
                    <td className="py-2.5 pl-3">{c.attendingDoctor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'vitals_summary' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-3">Recorded At</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">BP (mmHg)</th>
                  <th className="py-2.5 px-3">BMI</th>
                  <th className="py-2.5 pl-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVitals.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 pr-3 font-mono-tabular">{v.recordedAt}</td>
                    <td className="py-2.5 px-3 font-medium">{v.patientName}</td>
                    <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                      {v.systolic}/{v.diastolic}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular">{v.bmi}</td>
                    <td className="py-2.5 pl-3">{v.bmiCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'community_monitoring' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-3">Date</th>
                  <th className="py-2.5 px-3">Program Title</th>
                  <th className="py-2.5 px-3">Barangay</th>
                  <th className="py-2.5 px-3">Participants / Target</th>
                  <th className="py-2.5 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredActivities.map((act) => (
                  <tr key={act.id}>
                    <td className="py-2.5 pr-3 font-mono-tabular">{act.date}</td>
                    <td className="py-2.5 px-3 font-medium">{act.title}</td>
                    <td className="py-2.5 px-3">{act.barangay}</td>
                    <td className="py-2.5 px-3 font-mono-tabular">
                      {act.participantsCount} / {act.targetCount}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-semibold">{act.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
