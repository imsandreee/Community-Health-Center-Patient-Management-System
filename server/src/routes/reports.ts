import { Router, Response } from 'express';
import { mockRepository } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { enforceSection5RBAC } from '../middleware/rbac.js';
import { AuthenticatedRequest } from '../types/index.js';
import { recordsToCSV } from '../utils/healthLogic.js';

const router = Router();

/**
 * Summary reports endpoint
 */
router.get(
  '/',
  authMiddleware,
  enforceSection5RBAC('reports', 'read'),
  (_req: AuthenticatedRequest, res: Response) => {
    const store = mockRepository.getStore();

    res.status(200).json({
      success: true,
      data: {
        totalPatients: store.patients.length,
        activePatients: store.patients.filter((p) => p.status === 'Active').length,
        totalAppointments: store.appointments.length,
        pendingAppointments: store.appointments.filter((a) => a.status === 'Pending').length,
        totalConsultations: store.consultations.length,
        totalVitals: store.vitals.length,
        elevatedBpVitals: store.vitals.filter((v) => v.systolic >= 140 || v.diastolic >= 90).length,
      },
    });
  }
);

/**
 * 35. GET /api/v1/reports/export/csv (and alias /export)
 */
const handleExportCsv = (req: AuthenticatedRequest, res: Response) => {
  const { category = 'patient_registry' } = req.query as Record<string, string>;
  const store = mockRepository.getStore();

  let csvContent = '';
  let filename = `${category}_report_${new Date().toISOString().split('T')[0]}.csv`;

  switch (category) {
    case 'patient_registry':
    case 'patients': {
      const headers = ['Patient Code', 'Full Name', 'Birth Date', 'Sex', 'Barangay', 'Contact Number', 'Status'];
      const rows = store.patients.map((p) => [
        p.patientCode,
        p.fullName,
        p.dateOfBirth,
        p.sex,
        p.barangay,
        p.contactNumber,
        p.status,
      ]);
      csvContent = recordsToCSV(headers, rows);
      filename = `patient_registry_${Date.now()}.csv`;
      break;
    }
    case 'appointments': {
      const headers = ['Code', 'Patient Name', 'Service', 'Date', 'Time Slot', 'Personnel', 'Status'];
      const rows = store.appointments.map((a) => [
        a.appointmentCode,
        a.patientName ?? '',
        a.serviceName ?? '',
        a.scheduledDate,
        a.timeSlot,
        a.assignedPersonnel,
        a.status,
      ]);
      csvContent = recordsToCSV(headers, rows);
      filename = `appointments_${Date.now()}.csv`;
      break;
    }
    case 'consultations': {
      const headers = ['Code', 'Patient Name', 'Doctor', 'Date', 'Diagnosis', 'ICD Code', 'Treatment'];
      const rows = store.consultations.map((c) => [
        c.consultationCode,
        c.patientName ?? '',
        c.attendingDoctorName,
        c.consultationDate,
        c.diagnosis,
        c.icdCode,
        c.treatmentPlan,
      ]);
      csvContent = recordsToCSV(headers, rows);
      filename = `consultations_${Date.now()}.csv`;
      break;
    }
    case 'vitals': {
      const headers = ['Code', 'Patient Name', 'Recorded At', 'BP', 'HR', 'RR', 'Temp', 'BMI', 'Category'];
      const rows = store.vitals.map((v) => [
        v.vitalCode,
        v.patientName ?? '',
        v.recordedAt,
        `${v.systolic}/${v.diastolic}`,
        v.heartRateBpm,
        v.respiratoryRate,
        v.temperatureC,
        v.bmi,
        v.bmiCategory,
      ]);
      csvContent = recordsToCSV(headers, rows);
      filename = `vitals_${Date.now()}.csv`;
      break;
    }
    default: {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Total Patients', store.patients.length],
        ['Active Patients', store.patients.filter((p) => p.status === 'Active').length],
        ['Appointments Today', store.appointments.length],
        ['Queue Tickets Today', store.queue.length],
      ];
      csvContent = recordsToCSV(headers, rows);
      filename = `operational_summary_${Date.now()}.csv`;
    }
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
};

router.get('/export/csv', authMiddleware, enforceSection5RBAC('reports', 'read'), handleExportCsv);
router.get('/export', authMiddleware, enforceSection5RBAC('reports', 'read'), handleExportCsv);

export default router;

