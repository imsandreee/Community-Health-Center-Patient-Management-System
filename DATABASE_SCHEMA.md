# Database Schema & Relational Architecture Specification
**Database Engine**: PostgreSQL 15+ (Local Supabase CLI / Standalone PostgreSQL)  
**Normalization Level**: Third Normal Form (3NF)  
**Compliance Standards**: Republic Act No. 10173 (Data Privacy Act of 2012), RA 9994, BP 344  
**Document Revision**: 1.0.0  
**Effective Date**: November 2, 2026  

---

## 1. Schema Overview & Entity-Relationship Model

The San Roque Community Health Center database model is designed to support high-throughput outpatient operations, deterministic conflict checking, statutory priority queue routing, nursing triage measurements, ICD-10 medical records, immutable clinical amendments, pharmacy dispensing, laboratory diagnostics, PhilHealth billing clearances, public health monitoring, and security audit trails.

```
                           +----------------------+
                           |    user_accounts     |
                           +----------------------+
                                      |
         +----------------------------+---------------------------+
         | (attending_doctor_id)      | (recorded_by_id)          | (assigned_personnel)
         v                            v                           v
+------------------+         +------------------+        +---------------------+
|  consultations   |         |   vital_signs    |        | healthcare_services |
+------------------+         +------------------+        +---------------------+
  |              |             ^                          |              |
  |              | (vital_id)  |                          |              |
  |              +-------------+                          |              |
  |                                                       v              v
  |            +------------------------------------+  +--------------+ +---------------+
  |            |              patients              |  | appointments | | queue_entries |
  |            +------------------------------------+  +--------------+ +---------------+
  |              |        |            |         |            ^                ^
  |              +--------|------------|---------|------------+                |
  |                       |            |         +-----------------------------+
  | (consultation_id)     |            |
  v                       v            v
+------------------------+ +-------------------+  +----------------------+
|consultation_amendments | |   prescriptions   |  |     lab_requests     |
+------------------------+ +-------------------+  +----------------------+
                                  |                          |
                                  v                          v
                           +-------------------+  +----------------------+
                           |prescription_items |  |     lab_results      |
                           +-------------------+  +----------------------+

+----------------------+   +-------------------+  +----------------------+
|   billing_invoices   |   |notifications      |  |community_activities  |
+----------------------+   +-------------------+  +----------------------+
         |
         v
+----------------------+   +-------------------+
|    billing_items     |   |    audit_logs     |
+----------------------+   +-------------------+
```

---

## 2. Complete SQL DDL Definitions (14 Tables)

```sql
-- ============================================================================
-- SAN ROQUE COMMUNITY HEALTH CENTER - PRODUCTION DATABASE SCHEMA (3NF)
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USER ACCOUNTS & RBAC MANAGEMENT
-- ============================================================================
CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'USR-01'
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'staff', 'nurse', 'doctor', 'admin')),
    department VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    patient_id UUID NULL, -- Linked demographic record if role == 'patient'
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. MASTER PATIENT REGISTRY & DEMOGRAPHICS (RA 10173 SENSITIVE DATA)
-- ============================================================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'CHC-2026-0101'
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('Female', 'Male')),
    civil_status VARCHAR(20) NOT NULL CHECK (civil_status IN ('Single', 'Married', 'Widowed', 'Separated')),
    contact_number VARCHAR(30) NOT NULL,
    email VARCHAR(120) NULL,
    address TEXT NOT NULL,
    barangay VARCHAR(100) NOT NULL CHECK (barangay IN (
        'San Roque', 
        'Santa Elena', 
        'Santo Domingo', 
        'San Jose', 
        'San Andres'
    )),
    emergency_contact_name VARCHAR(150) NOT NULL DEFAULT 'Not specified',
    emergency_contact_number VARCHAR(30) NOT NULL DEFAULT 'Not specified',
    blood_type VARCHAR(10) NULL DEFAULT 'Unknown',
    allergies TEXT NULL DEFAULT 'None known',
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived')),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Establish foreign key between user_accounts and patients
ALTER TABLE user_accounts 
    ADD CONSTRAINT fk_user_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. HEALTHCARE SERVICES & CLINICAL DIRECTORY
-- ============================================================================
CREATE TABLE healthcare_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'SRV-01'
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'Primary Care', 
        'Maternal & Child', 
        'Preventive & Immunization', 
        'Administrative & Screening'
    )),
    description TEXT NOT NULL,
    schedule VARCHAR(100) NOT NULL, -- e.g., 'Mon - Fri (08:00 AM - 05:00 PM)'
    assigned_personnel_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    assigned_personnel_name VARCHAR(120) NOT NULL,
    daily_capacity INT NOT NULL DEFAULT 30 CHECK (daily_capacity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. APPOINTMENT RESERVATIONS & SLOT SCHEDULING
-- ============================================================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'APT-2026-801'
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES healthcare_services(id) ON DELETE RESTRICT,
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL CHECK (time_slot IN (
        '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
        '01:00 PM', '02:00 PM', '03:00 PM'
    )),
    assigned_personnel VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN (
        'Pending', 
        'Approved', 
        'Confirmed', 
        'Completed', 
        'Cancelled', 
        'Rejected', 
        'No-show'
    )),
    reason TEXT NOT NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- Rule FR-015: Partial unique index idx_appointments_active_patient_slot prevents double-booking while permitting re-booking of Cancelled/Rejected slots
);

-- ============================================================================
-- 5. DAILY OUTPATIENT QUEUE & PRIORITY ROUTING (RA 9994 & BP 344)
-- ============================================================================
CREATE TABLE queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_number VARCHAR(20) NOT NULL, -- e.g., 'P-001' or 'Q-002'
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    service_id UUID NULL REFERENCES healthcare_services(id) ON DELETE SET NULL,
    service_name VARCHAR(150) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN (
        'Regular', 
        'Senior Citizen', 
        'PWD', 
        'Pregnant', 
        'Emergency'
    )),
    priority_weight INT NOT NULL DEFAULT 5 CHECK (priority_weight BETWEEN 1 AND 5),
    -- Weight 1: Emergency, 2: Pregnant, 3: Senior Citizen, 4: PWD, 5: Regular
    status VARCHAR(25) NOT NULL DEFAULT 'Waiting' CHECK (status IN (
        'Waiting', 
        'Called', 
        'In Consultation', 
        'Completed', 
        'Skipped', 
        'Cancelled'
    )),
    source VARCHAR(20) NOT NULL DEFAULT 'Walk-in' CHECK (source IN ('Walk-in', 'Appointment')),
    assigned_room VARCHAR(80) NOT NULL DEFAULT 'Consultation Room 1',
    arrival_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. NURSING TRIAGE & VITAL SIGNS EVALUATION (PhilPEN PROTOCOLS)
-- ============================================================================
CREATE TABLE vital_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vital_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'VIT-2026-501'
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    recorded_by_name VARCHAR(120) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    systolic INT NOT NULL CHECK (systolic BETWEEN 50 AND 300),
    diastolic INT NOT NULL CHECK (diastolic BETWEEN 30 AND 200),
    temperature_c NUMERIC(4, 1) NOT NULL CHECK (temperature_c BETWEEN 30.0 AND 45.0),
    heart_rate_bpm INT NOT NULL CHECK (heart_rate_bpm BETWEEN 30 AND 250),
    respiratory_rate INT NOT NULL CHECK (respiratory_rate BETWEEN 8 AND 80),
    weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
    height_cm NUMERIC(5, 2) NOT NULL CHECK (height_cm > 0 AND height_cm < 300),
    bmi NUMERIC(4, 1) NOT NULL,
    bmi_category VARCHAR(20) NOT NULL CHECK (bmi_category IN ('Underweight', 'Normal', 'Overweight', 'Obese')),
    nursing_notes TEXT NOT NULL,
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. PHYSICIAN CONSULTATIONS & ELECTRONIC MEDICAL RECORDS (EMR)
-- ============================================================================
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'CON-2026-301'
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    attending_doctor_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    attending_doctor_name VARCHAR(120) NOT NULL,
    vital_sign_id UUID NULL REFERENCES vital_signs(id) ON DELETE SET NULL,
    consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    chief_complaint TEXT NOT NULL,
    medical_history TEXT NOT NULL,
    clinical_findings TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    icd_code VARCHAR(20) NOT NULL, -- e.g., 'J06.9', 'I10', 'Z34.8'
    treatment_plan TEXT NOT NULL,
    prescription_details TEXT NOT NULL,
    follow_up_date DATE NULL,
    consultation_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. AUDITABLE CONSULTATION AMENDMENTS (FR-028 RA 10173 AUDIT TRAIL)
-- ============================================================================
CREATE TABLE consultation_amendments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    amended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amended_by_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    amended_by_name VARCHAR(120) NOT NULL,
    reason TEXT NOT NULL,
    previous_diagnosis TEXT NOT NULL,
    previous_treatment_plan TEXT NOT NULL,
    previous_prescription TEXT NULL,
    new_diagnosis TEXT NOT NULL,
    new_treatment_plan TEXT NOT NULL,
    new_prescription TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. PHARMACY PRESCRIPTIONS & DISPENSING
-- ============================================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'RX-2026-001'
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    doctor_name VARCHAR(120) NOT NULL,
    prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(25) NOT NULL DEFAULT 'Pending' CHECK (status IN (
        'Pending', 
        'Partially Dispensed', 
        'Dispensed', 
        'Cancelled'
    )),
    dispensed_by_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    dispensed_at TIMESTAMPTZ NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150) NOT NULL,
    dosage_form VARCHAR(50) NOT NULL CHECK (dosage_form IN ('Tablet', 'Capsule', 'Syrup', 'Suspension', 'Nebule', 'Ointment')),
    strength VARCHAR(50) NOT NULL,     -- e.g., '500 mg', '5 mg/5 mL'
    instructions TEXT NOT NULL,       -- e.g., 'Take 1 tablet every 8 hours after meals'
    quantity_prescribed INT NOT NULL CHECK (quantity_prescribed > 0),
    quantity_dispensed INT NOT NULL DEFAULT 0 CHECK (quantity_dispensed >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. LABORATORY ORDERS & DIAGNOSTIC RESULTS
-- ============================================================================
CREATE TABLE lab_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'LAB-2026-101'
    consultation_id UUID NULL REFERENCES consultations(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    test_category VARCHAR(50) NOT NULL CHECK (test_category IN (
        'Hematology', 
        'Clinical Microscopy', 
        'Blood Chemistry', 
        'Serology & Immunology', 
        'Microbiology'
    )),
    test_name VARCHAR(150) NOT NULL,     -- e.g., 'Complete Blood Count (CBC)', 'Urinalysis', 'Fasting Blood Sugar'
    priority VARCHAR(20) NOT NULL DEFAULT 'Routine' CHECK (priority IN ('Routine', 'Urgent', 'Emergency')),
    status VARCHAR(25) NOT NULL DEFAULT 'Requested' CHECK (status IN (
        'Requested', 
        'Sample Collected', 
        'In Progress', 
        'Completed', 
        'Cancelled'
    )),
    specimen_collected_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    medical_technologist_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    technologist_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_request_id UUID NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL, -- e.g., 'Hemoglobin', 'WBC Count', 'Platelet Count'
    result_value VARCHAR(50) NOT NULL,
    unit VARCHAR(30) NOT NULL,           -- e.g., 'g/dL', 'x10^9/L', 'mg/dL'
    reference_range VARCHAR(50) NOT NULL,-- e.g., '12.0 - 16.0 g/dL'
    is_abnormal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. BILLING, SUBSIDIES & CLEARANCE INVOICES
-- ============================================================================
CREATE TABLE billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'INV-2026-901'
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    consultation_id UUID NULL REFERENCES consultations(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    lgu_subsidy_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (lgu_subsidy_amount >= 0),
    philhealth_coverage_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (philhealth_coverage_amount >= 0),
    net_payable NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (net_payable >= 0),
    payment_status VARCHAR(25) NOT NULL DEFAULT 'Free/Subsidized' CHECK (payment_status IN (
        'Free/Subsidized', 
        'Pending', 
        'Paid', 
        'PhilHealth Covered', 
        'Cancelled'
    )),
    official_receipt_number VARCHAR(50) NULL,
    philhealth_claim_number VARCHAR(50) NULL,
    cashier_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
    item_description VARCHAR(150) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('Consultation', 'Laboratory', 'Medication', 'Certification', 'Procedure')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    is_covered_by_subsidy BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. COMMUNITY HEALTH OUTREACH & SURVEILLANCE
-- ============================================================================
CREATE TABLE community_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'ACT-2026-01'
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'Immunization', 
        'Maternal & Child', 
        'Nutrition & Screening', 
        'Disease Surveillance'
    )),
    barangay VARCHAR(100) NOT NULL CHECK (barangay IN (
        'San Roque', 
        'Santa Elena', 
        'Santo Domingo', 
        'San Jose', 
        'San Andres'
    )),
    activity_date DATE NOT NULL,
    coordinator_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    coordinator_name VARCHAR(120) NOT NULL,
    participants_count INT NOT NULL DEFAULT 0 CHECK (participants_count >= 0),
    target_count INT NOT NULL DEFAULT 0 CHECK (target_count >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Ongoing', 'Completed', 'Cancelled')),
    summary_notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. NOTIFICATIONS & BROADCAST ALERTS
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'NOT-2026-01'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('Appointment', 'Follow-up', 'Announcement', 'System')),
    target_role VARCHAR(20) NOT NULL CHECK (target_role IN ('all', 'patient', 'staff', 'nurse', 'doctor', 'admin')),
    target_patient_id UUID NULL REFERENCES patients(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 14. IMMUTABLE SECURITY & ADMINISTRATIVE AUDIT LOGS (FR-048 – FR-051)
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_code VARCHAR(30) UNIQUE NOT NULL, -- e.g., 'AUD-9001'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID NULL REFERENCES user_accounts(id) ON DELETE SET NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('patient', 'staff', 'nurse', 'doctor', 'admin')),
    action_type VARCHAR(40) NOT NULL CHECK (action_type IN (
        'Authentication', 
        'Patient Record', 
        'Clinical Amendment', 
        'Appointment', 
        'System Config', 
        'Access Control'
    )),
    module VARCHAR(80) NOT NULL,
    target_entity_id VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Performance B-Tree Indexes

```sql
-- Indexes for patient searches and candidate duplicate detection (FR-006, FR-010)
CREATE INDEX idx_patients_name_dob ON patients (LOWER(TRIM(full_name)), date_of_birth);
CREATE INDEX idx_patients_barangay ON patients (barangay);
CREATE INDEX idx_patients_code ON patients (patient_code);
CREATE INDEX idx_patients_status ON patients (status);

-- Indexes for appointment scheduling, conflict prevention and daily rosters (FR-012, FR-015)
CREATE INDEX idx_appointments_patient_slot ON appointments (patient_id, scheduled_date, time_slot);
CREATE INDEX idx_appointments_service_slot ON appointments (service_id, scheduled_date, time_slot);
CREATE INDEX idx_appointments_date_status ON appointments (scheduled_date, status);

-- Indexes for daily queue operations and priority lane sorting (FR-018, FR-020)
CREATE INDEX idx_queue_date_status ON queue_entries (queue_date, status);
CREATE INDEX idx_queue_priority_order ON queue_entries (queue_date, priority_weight ASC, arrival_time ASC);

-- Indexes for clinical vitals and physician EMR searches
CREATE INDEX idx_vitals_patient_date ON vital_signs (patient_id, recorded_at DESC);
CREATE INDEX idx_consultations_patient ON consultations (patient_id, consultation_date DESC);
CREATE INDEX idx_consultations_icd ON consultations (icd_code);

-- Indexes for pharmacy prescriptions and lab requests
CREATE INDEX idx_prescriptions_patient ON prescriptions (patient_id, status);
CREATE INDEX idx_lab_requests_patient ON lab_requests (patient_id, status);

-- Indexes for security audit log search (FR-051)
CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_name, action_type);
CREATE INDEX idx_audit_target ON audit_logs (target_entity_id);
```

---

## 4. Supabase Row Level Security (RLS) Policy Specifications

To guarantee compliance with Republic Act No. 10173 and Section 5 Role-Based Access Control, Row Level Security is enforced directly in PostgreSQL:

```sql
-- Enable RLS across all sensitive tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- JWT Helper functions
CREATE OR REPLACE FUNCTION auth.get_user_role() RETURNS text AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'patient');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.get_patient_id() RETURNS uuid AS $$
    SELECT nullif(current_setting('request.jwt.claim.patient_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- RLS: PATIENTS
CREATE POLICY rls_patients_admin_staff ON patients
    FOR ALL TO authenticated
    USING (auth.get_user_role() IN ('staff', 'admin'));

CREATE POLICY rls_patients_clinical_view ON patients
    FOR SELECT TO authenticated
    USING (auth.get_user_role() IN ('doctor', 'nurse'));

CREATE POLICY rls_patients_own_select ON patients
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'patient' AND id = auth.get_patient_id());

-- RLS: VITAL SIGNS (Section 5 Clinical Privacy Policy)
-- System Administrators and Front-Desk Staff have 0 access (DENIED by lack of policy)
CREATE POLICY rls_vitals_nurse_manage ON vital_signs
    FOR ALL TO authenticated
    USING (auth.get_user_role() = 'nurse');

CREATE POLICY rls_vitals_doctor_view ON vital_signs
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'doctor');

CREATE POLICY rls_vitals_patient_own ON vital_signs
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'patient' AND patient_id = auth.get_patient_id());

-- RLS: CONSULTATIONS & EMR (Section 5 Clinical Privacy Policy)
-- Administrators and Staff have 0 access (DENIED by lack of policy)
CREATE POLICY rls_consultations_doctor_manage ON consultations
    FOR ALL TO authenticated
    USING (auth.get_user_role() = 'doctor');

CREATE POLICY rls_consultations_nurse_view ON consultations
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'nurse');

CREATE POLICY rls_consultations_patient_own ON consultations
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'patient' AND patient_id = auth.get_patient_id());

-- RLS: CONSULTATION AMENDMENTS (FR-028)
CREATE POLICY rls_amendments_doctor_insert ON consultation_amendments
    FOR INSERT TO authenticated
    WITH CHECK (auth.get_user_role() = 'doctor');

CREATE POLICY rls_amendments_clinical_select ON consultation_amendments
    FOR SELECT TO authenticated
    USING (auth.get_user_role() IN ('doctor', 'nurse'));

-- RLS: AUDIT LOGS (Immutable Security)
CREATE POLICY rls_audit_admin_select ON audit_logs
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'admin');

CREATE POLICY rls_audit_insert_all ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
```
