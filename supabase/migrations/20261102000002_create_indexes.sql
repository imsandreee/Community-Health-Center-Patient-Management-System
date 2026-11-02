-- ============================================================================
-- SAN ROQUE COMMUNITY HEALTH CENTER - INDEX DEFINITIONS & SEARCH OPTIMIZATION
-- Migration: 20261102000002_create_indexes.sql
-- ============================================================================

-- Partial Unique Index to prevent patient double-booking for active slots (FR-015)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_patient_slot 
ON appointments(patient_id, scheduled_date, time_slot) 
WHERE status IN ('Pending', 'Approved', 'Confirmed');

-- Indexes for patient searches and candidate duplicate detection (FR-006, FR-010)
CREATE INDEX IF NOT EXISTS idx_patients_name_dob ON patients (LOWER(TRIM(full_name)), date_of_birth);
CREATE INDEX IF NOT EXISTS idx_patients_barangay ON patients (barangay);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients (patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients (status);

-- Indexes for appointment scheduling, conflict prevention and daily rosters (FR-012, FR-015)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_slot ON appointments (patient_id, scheduled_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_appointments_service_slot ON appointments (service_id, scheduled_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments (scheduled_date, status);

-- Indexes for daily queue operations and priority lane sorting (FR-018, FR-020)
CREATE INDEX IF NOT EXISTS idx_queue_date_status ON queue_entries (queue_date, status);
CREATE INDEX IF NOT EXISTS idx_queue_priority_order ON queue_entries (queue_date, priority_weight ASC, arrival_time ASC);

-- Indexes for clinical vitals and physician EMR searches
CREATE INDEX IF NOT EXISTS idx_vitals_patient_date ON vital_signs (patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations (patient_id, consultation_date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_icd ON consultations (icd_code);

-- Indexes for pharmacy prescriptions and lab requests
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions (patient_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient ON lab_requests (patient_id, status);

-- Indexes for billing statements and subsidies
CREATE INDEX IF NOT EXISTS idx_billing_invoices_patient ON billing_invoices (patient_id, payment_status);

-- Indexes for security audit log search (FR-051)
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_name, action_type);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs (target_entity_id);

