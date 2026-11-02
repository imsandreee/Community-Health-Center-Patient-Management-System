-- ============================================================================
-- SAN ROQUE COMMUNITY HEALTH CENTER - ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261102000003_create_rls_policies.sql
-- Compliance: Republic Act No. 10173 (Data Privacy Act of 2012) & Section 5 RBAC
-- ============================================================================

-- Ensure auth schema exists for helper functions
-- auth schema managed by Supabase

-- JWT Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'patient');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_patient_id() RETURNS uuid AS $$
    SELECT nullif(current_setting('request.jwt.claim.patient_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_user_id() RETURNS uuid AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Enable Row Level Security across all 14 entities and child tables
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_services ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE community_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. USER ACCOUNTS RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS rls_user_accounts_admin_manage ON user_accounts;
CREATE POLICY rls_user_accounts_admin_manage ON user_accounts
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS rls_user_accounts_own_select ON user_accounts;
CREATE POLICY rls_user_accounts_own_select ON user_accounts
    FOR SELECT TO authenticated
    USING (
        id = public.get_user_id() 
        OR (patient_id IS NOT NULL AND patient_id = public.get_patient_id())
    );

DROP POLICY IF EXISTS rls_user_accounts_own_update ON user_accounts;
CREATE POLICY rls_user_accounts_own_update ON user_accounts
    FOR UPDATE TO authenticated
    USING (id = public.get_user_id());

-- ============================================================================
-- 2. PATIENTS RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS rls_patients_admin_staff ON patients;
CREATE POLICY rls_patients_admin_staff ON patients
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS rls_patients_clinical_view ON patients;
CREATE POLICY rls_patients_clinical_view ON patients
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('doctor', 'nurse'));

DROP POLICY IF EXISTS rls_patients_own_select ON patients;
CREATE POLICY rls_patients_own_select ON patients
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND id = public.get_patient_id());

-- ============================================================================
-- 3. HEALTHCARE SERVICES RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS rls_services_public_select ON healthcare_services;
CREATE POLICY rls_services_public_select ON healthcare_services
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS rls_services_admin_manage ON healthcare_services;
CREATE POLICY rls_services_admin_manage ON healthcare_services
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'admin');

-- ============================================================================
-- 4. APPOINTMENTS RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS rls_appointments_staff_admin ON appointments;
CREATE POLICY rls_appointments_staff_admin ON appointments
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS rls_appointments_clinical_view ON appointments;
CREATE POLICY rls_appointments_clinical_view ON appointments
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('doctor', 'nurse'));

DROP POLICY IF EXISTS rls_appointments_patient_own ON appointments;
CREATE POLICY rls_appointments_patient_own ON appointments
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- ============================================================================
-- 5. QUEUE ENTRIES RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS rls_queue_staff_nurse_doctor ON queue_entries;
CREATE POLICY rls_queue_staff_nurse_doctor ON queue_entries
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'nurse', 'doctor', 'admin'));

DROP POLICY IF EXISTS rls_queue_patient_own ON queue_entries;
CREATE POLICY rls_queue_patient_own ON queue_entries
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- ============================================================================
-- 6. VITAL SIGNS RLS POLICIES (Clinical Privacy - Admin & Staff Forbidden)
-- ============================================================================
-- Administrators and Staff have NO policy, guaranteeing 0 access per statutory RA 10173.
-- Explicitly drop any legacy staff view policy
DROP POLICY IF EXISTS rls_vitals_staff_view ON vital_signs;

DROP POLICY IF EXISTS rls_vitals_nurse_manage ON vital_signs;
CREATE POLICY rls_vitals_nurse_manage ON vital_signs
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'nurse');

DROP POLICY IF EXISTS rls_vitals_doctor_view ON vital_signs;
CREATE POLICY rls_vitals_doctor_view ON vital_signs
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_vitals_patient_own ON vital_signs;
CREATE POLICY rls_vitals_patient_own ON vital_signs
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- ============================================================================
-- 7. CONSULTATIONS & EMR (Clinical Privacy - Admin & Staff Forbidden)
-- ============================================================================
-- Administrators and Staff have NO policy, guaranteeing 0 access per RA 10173.
DROP POLICY IF EXISTS rls_consultations_doctor_manage ON consultations;
CREATE POLICY rls_consultations_doctor_manage ON consultations
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_consultations_nurse_view ON consultations;
CREATE POLICY rls_consultations_nurse_view ON consultations
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'nurse');

DROP POLICY IF EXISTS rls_consultations_patient_own ON consultations;
CREATE POLICY rls_consultations_patient_own ON consultations
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- ============================================================================
-- 8. CONSULTATION AMENDMENTS (Immutable Clinical Audit)
-- ============================================================================
DROP POLICY IF EXISTS rls_amendments_doctor_insert ON consultation_amendments;
CREATE POLICY rls_amendments_doctor_insert ON consultation_amendments
    FOR INSERT TO authenticated
    WITH CHECK (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_amendments_clinical_select ON consultation_amendments;
CREATE POLICY rls_amendments_clinical_select ON consultation_amendments
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('doctor', 'nurse'));

DROP POLICY IF EXISTS rls_amendments_patient_own ON consultation_amendments;
CREATE POLICY rls_amendments_patient_own ON consultation_amendments
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND consultation_id IN (
        SELECT id FROM consultations WHERE patient_id = public.get_patient_id()
    ));

-- ============================================================================
-- 9. PHARMACY PRESCRIPTIONS & DISPENSING
-- ============================================================================
DROP POLICY IF EXISTS rls_prescriptions_doctor_manage ON prescriptions;
CREATE POLICY rls_prescriptions_doctor_manage ON prescriptions
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_prescriptions_nurse_view ON prescriptions;
CREATE POLICY rls_prescriptions_nurse_view ON prescriptions
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('nurse', 'staff'));

DROP POLICY IF EXISTS rls_prescriptions_nurse_dispense ON prescriptions;
CREATE POLICY rls_prescriptions_nurse_dispense ON prescriptions
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('nurse', 'staff'));

DROP POLICY IF EXISTS rls_prescriptions_patient_own ON prescriptions;
CREATE POLICY rls_prescriptions_patient_own ON prescriptions
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- Prescription Items Child Table
DROP POLICY IF EXISTS rls_prescription_items_doctor_manage ON prescription_items;
CREATE POLICY rls_prescription_items_doctor_manage ON prescription_items
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_prescription_items_nurse_view ON prescription_items;
CREATE POLICY rls_prescription_items_nurse_view ON prescription_items
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('nurse', 'staff'));

DROP POLICY IF EXISTS rls_prescription_items_nurse_dispense ON prescription_items;
CREATE POLICY rls_prescription_items_nurse_dispense ON prescription_items
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('nurse', 'staff'));

DROP POLICY IF EXISTS rls_prescription_items_patient_own ON prescription_items;
CREATE POLICY rls_prescription_items_patient_own ON prescription_items
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND prescription_id IN (
        SELECT id FROM prescriptions WHERE patient_id = public.get_patient_id()
    ));

-- ============================================================================
-- 10. LABORATORY REQUESTS & RESULTS
-- ============================================================================
DROP POLICY IF EXISTS rls_lab_requests_doctor_manage ON lab_requests;
CREATE POLICY rls_lab_requests_doctor_manage ON lab_requests
    FOR ALL TO authenticated
    USING (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_lab_requests_clinical_view ON lab_requests;
CREATE POLICY rls_lab_requests_clinical_view ON lab_requests
    FOR SELECT TO authenticated
    USING (public.get_user_role() IN ('doctor', 'nurse'));

DROP POLICY IF EXISTS rls_lab_requests_nurse_update ON lab_requests;
CREATE POLICY rls_lab_requests_nurse_update ON lab_requests
    FOR UPDATE TO authenticated
    USING (public.get_user_role() = 'nurse');

DROP POLICY IF EXISTS rls_lab_requests_patient_own ON lab_requests;
CREATE POLICY rls_lab_requests_patient_own ON lab_requests
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- Lab Results Child Table
DROP POLICY IF EXISTS rls_lab_results_doctor_view ON lab_results;
CREATE POLICY rls_lab_results_doctor_view ON lab_results
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'doctor');

DROP POLICY IF EXISTS rls_lab_results_clinical_manage ON lab_results;
CREATE POLICY rls_lab_results_clinical_manage ON lab_results
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('doctor', 'nurse'));

DROP POLICY IF EXISTS rls_lab_results_patient_own ON lab_results;
CREATE POLICY rls_lab_results_patient_own ON lab_results
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND lab_request_id IN (
        SELECT id FROM lab_requests WHERE patient_id = public.get_patient_id()
    ));

-- ============================================================================
-- 11. BILLING INVOICES & SUBSIDIES
-- ============================================================================
DROP POLICY IF EXISTS rls_billing_staff_admin_manage ON billing_invoices;
CREATE POLICY rls_billing_staff_admin_manage ON billing_invoices
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS rls_billing_patient_own ON billing_invoices;
CREATE POLICY rls_billing_patient_own ON billing_invoices
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND patient_id = public.get_patient_id());

-- Billing Items Child Table
DROP POLICY IF EXISTS rls_billing_items_staff_admin_manage ON billing_items;
CREATE POLICY rls_billing_items_staff_admin_manage ON billing_items
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS rls_billing_items_patient_own ON billing_items;
CREATE POLICY rls_billing_items_patient_own ON billing_items
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'patient' AND invoice_id IN (
        SELECT id FROM billing_invoices WHERE patient_id = public.get_patient_id()
    ));

-- ============================================================================
-- 12. COMMUNITY ACTIVITIES & OUTREACH
-- ============================================================================
DROP POLICY IF EXISTS rls_community_activities_select_all ON community_activities;
CREATE POLICY rls_community_activities_select_all ON community_activities
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS rls_community_activities_staff_nurse_manage ON community_activities;
CREATE POLICY rls_community_activities_staff_nurse_manage ON community_activities
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'nurse', 'admin'));

-- ============================================================================
-- 13. NOTIFICATIONS & BROADCAST ALERTS
-- ============================================================================
DROP POLICY IF EXISTS rls_notifications_staff_admin_manage ON notifications;
CREATE POLICY rls_notifications_staff_admin_manage ON notifications
    FOR ALL TO authenticated
    USING (public.get_user_role() IN ('staff', 'admin'));

DROP POLICY IF EXISTS rls_notifications_user_select ON notifications;
CREATE POLICY rls_notifications_user_select ON notifications
    FOR SELECT TO authenticated
    USING (
        target_role = 'all' 
        OR target_role = public.get_user_role() 
        OR (target_patient_id IS NOT NULL AND target_patient_id = public.get_patient_id())
    );

DROP POLICY IF EXISTS rls_notifications_user_update ON notifications;
CREATE POLICY rls_notifications_user_update ON notifications
    FOR UPDATE TO authenticated
    USING (
        target_role = public.get_user_role() 
        OR target_patient_id = public.get_patient_id()
    );

-- ============================================================================
-- 14. AUDIT LOGS (Immutable Administrative Trail)
-- ============================================================================
DROP POLICY IF EXISTS rls_audit_admin_select ON audit_logs;
CREATE POLICY rls_audit_admin_select ON audit_logs
    FOR SELECT TO authenticated
    USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS rls_audit_insert_all ON audit_logs;
CREATE POLICY rls_audit_insert_all ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
