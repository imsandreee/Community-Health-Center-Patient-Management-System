-- ============================================================================
-- SAN ROQUE COMMUNITY HEALTH CENTER - PRODUCTION DATABASE SCHEMA (3NF)
-- Migration: 20261102000001_create_tables.sql
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USER ACCOUNTS & RBAC MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_accounts (
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
CREATE TABLE IF NOT EXISTS patients (
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
    DROP CONSTRAINT IF EXISTS fk_user_patient;
ALTER TABLE user_accounts 
    ADD CONSTRAINT fk_user_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. HEALTHCARE SERVICES & CLINICAL DIRECTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS healthcare_services (
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
CREATE TABLE IF NOT EXISTS appointments (
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
);

-- ============================================================================
-- 5. DAILY OUTPATIENT QUEUE & PRIORITY ROUTING (RA 9994 & BP 344)
-- ============================================================================
CREATE TABLE IF NOT EXISTS queue_entries (
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
CREATE TABLE IF NOT EXISTS vital_signs (
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
CREATE TABLE IF NOT EXISTS consultations (
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
CREATE TABLE IF NOT EXISTS consultation_amendments (
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
CREATE TABLE IF NOT EXISTS prescriptions (
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

CREATE TABLE IF NOT EXISTS prescription_items (
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
CREATE TABLE IF NOT EXISTS lab_requests (
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

CREATE TABLE IF NOT EXISTS lab_results (
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
CREATE TABLE IF NOT EXISTS billing_invoices (
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

CREATE TABLE IF NOT EXISTS billing_items (
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
CREATE TABLE IF NOT EXISTS community_activities (
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
CREATE TABLE IF NOT EXISTS notifications (
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
CREATE TABLE IF NOT EXISTS audit_logs (
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

