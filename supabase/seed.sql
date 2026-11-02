-- ============================================================================
-- SAN ROQUE COMMUNITY HEALTH CENTER - SEED DATA
-- Database Seeding Script (PostgreSQL / Supabase)
-- Populates comprehensive, realistic data matching mockHealthData across 5 roles
-- ============================================================================

-- Generate standard bcrypt hash for password "Password123!"
-- Hash: $2a$10$wRixb91WZle2ONlhcpe3s.6LNYyrgQNMROvk1Eccx1JB.nqsK9O6a (standard representation)

-- 1. SEED PATIENTS
INSERT INTO patients (
    id, patient_code, full_name, date_of_birth, sex, civil_status,
    contact_number, email, address, barangay, emergency_contact_name,
    emergency_contact_number, blood_type, allergies, status, registration_date
) VALUES
('e3b0c442-98fc-1c14-9afb-4c8996fb9241', 'CHC-2026-0101', 'Maria Clara Santos', '1988-04-12', 'Female', 'Married', '0917-555-0142', 'maria.santos@patient.chc.ph', '42 Mabini St., Purok 2', 'San Roque', 'Antonio Santos (Spouse)', '0917-555-0199', 'O+', 'Penicillin', 'Active', '2026-01-15'),
('e3b0c442-98fc-1c14-9afb-4c8996fb9242', 'CHC-2026-0102', 'Roberto Dela Cruz', '1958-09-22', 'Male', 'Widowed', '0918-410-2281', 'roberto.dc@email.ph', '18 Rizal Ave., Purok 1', 'San Jose', 'Marites Dela Cruz (Daughter)', '0918-410-9912', 'A+', 'None known', 'Active', '2026-02-04'),
('e3b0c442-98fc-1c14-9afb-4c8996fb9243', 'CHC-2026-0103', 'Angela Mae Reyes', '1999-07-08', 'Female', 'Married', '0920-883-4102', 'angela.reyes@email.ph', '105 Bonifacio Ext., Purok 4', 'Santa Elena', 'Mark Reyes (Spouse)', '0920-883-4190', 'B+', 'Sulfa drugs', 'Active', '2026-03-19'),
('e3b0c442-98fc-1c14-9afb-4c8996fb9244', 'CHC-2026-0104', 'Lucas Miguel Tolentino', '2021-02-14', 'Male', 'Single', '0919-602-7731', NULL, '11 Del Pilar St., Purok 3', 'San Roque', 'Grace Tolentino (Mother)', '0919-602-7731', 'O+', 'None known', 'Active', '2026-04-10'),
('e3b0c442-98fc-1c14-9afb-4c8996fb9245', 'CHC-2026-0105', 'Evelyn Mercado', '1963-11-30', 'Female', 'Married', '0915-309-8841', 'evelyn.m@email.ph', '77 Luna St., Purok 5', 'Santo Domingo', 'Nestor Mercado (Spouse)', '0915-309-8845', 'AB+', 'Aspirin', 'Active', '2026-05-22'),
('e3b0c442-98fc-1c14-9afb-4c8996fb9246', 'CHC-2026-0106', 'Daniela Soriano', '1994-12-03', 'Female', 'Single', '0927-449-1029', 'daniela.s@email.ph', '29 Burgos St., Purok 2', 'San Andres', 'Rosa Soriano (Mother)', '0927-449-1030', 'A+', 'None known', 'Active', '2026-08-14')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED USERS ACROSS 5 ROLES
INSERT INTO user_accounts (
    id, user_code, full_name, email, password_hash, role, department, status, patient_id, last_login_at
) VALUES
('b101a111-0001-4000-8000-000000000001', 'USR-01', 'Maria Clara Santos', 'maria.santos@patient.chc.ph', '$2a$10$LU7UnSQYYyA2yrAHQMn/lefHc069bihYdXLXKAeQGyT4jzzjehNdu', 'patient', 'Citizen Health Portal', 'Active', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', '2026-11-02 07:45:00+08'),
('b101a111-0002-4000-8000-000000000002', 'USR-02', 'Elena Villanueva', 'e.villanueva@sanroque-chc.gov.ph', '$2a$10$LU7UnSQYYyA2yrAHQMn/lefHc069bihYdXLXKAeQGyT4jzzjehNdu', 'staff', 'Front Desk & Patient Records', 'Active', NULL, '2026-11-02 07:30:00+08'),
('b101a111-0003-4000-8000-000000000003', 'USR-03', 'Nurse Joy Bautista, RN', 'j.bautista@sanroque-chc.gov.ph', '$2a$10$LU7UnSQYYyA2yrAHQMn/lefHc069bihYdXLXKAeQGyT4jzzjehNdu', 'nurse', 'Triage & Nursing Assessment', 'Active', NULL, '2026-11-02 07:50:00+08'),
('b101a111-0004-4000-8000-000000000004', 'USR-04', 'Dr. Rafael Mendoza, MD', 'r.mendoza@sanroque-chc.gov.ph', '$2a$10$LU7UnSQYYyA2yrAHQMn/lefHc069bihYdXLXKAeQGyT4jzzjehNdu', 'doctor', 'Clinical Consultations & EMR', 'Active', NULL, '2026-11-02 08:05:00+08'),
('b101a111-0005-4000-8000-000000000005', 'USR-05', 'Carlos Dizon', 'admin@sanroque-chc.gov.ph', '$2a$10$LU7UnSQYYyA2yrAHQMn/lefHc069bihYdXLXKAeQGyT4jzzjehNdu', 'admin', 'Health Governance & IT', 'Active', NULL, '2026-11-02 08:00:00+08'),
('b101a111-0006-4000-8000-000000000006', 'USR-06', 'Dr. Lorna Pascual, MD', 'l.pascual@sanroque-chc.gov.ph', '$2a$10$LU7UnSQYYyA2yrAHQMn/lefHc069bihYdXLXKAeQGyT4jzzjehNdu', 'doctor', 'Maternal & Child Health', 'Active', NULL, '2026-11-01 16:40:00+08')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED HEALTHCARE SERVICES
INSERT INTO healthcare_services (
    id, service_code, name, category, description, schedule,
    assigned_personnel_id, assigned_personnel_name, daily_capacity, status
) VALUES
('7c9e6679-7425-40de-944b-e07fc1f90ae1', 'SRV-01', 'General Outpatient Consultation', 'Primary Care', 'Outpatient medical evaluation, acute illness diagnosis, and chronic disease management.', 'Mon - Fri (08:00 AM - 04:00 PM)', 'b101a111-0004-4000-8000-000000000004', 'Dr. Rafael Mendoza, MD', 30, 'Active'),
('7c9e6679-7425-40de-944b-e07fc1f90ae2', 'SRV-02', 'Prenatal & Maternal Care', 'Maternal & Child', 'Routine maternal assessment, fetal heart monitoring, micronutrient supplementation, and birth planning.', 'Tue & Thu (08:00 AM - 12:00 PM)', 'b101a111-0006-4000-8000-000000000006', 'Dr. Lorna Pascual, MD', 15, 'Active'),
('7c9e6679-7425-40de-944b-e07fc1f90ae3', 'SRV-03', 'Under-Five Immunization & Child Health', 'Preventive & Immunization', 'National Immunization Program vaccines (BCG, Pentavalent, OPV, PCV, MMR) for infants and children.', 'Wed (08:00 AM - 03:00 PM)', 'b101a111-0003-4000-8000-000000000003', 'Nurse Joy Bautista, RN', 25, 'Active'),
('7c9e6679-7425-40de-944b-e07fc1f90ae4', 'SRV-04', 'Hypertension & Diabetes Screening', 'Administrative & Screening', 'Hypertension monitoring, capillary blood glucose check, and PhilPEN cardiovascular risk assessment.', 'Mon - Fri (08:00 AM - 05:00 PM)', 'b101a111-0003-4000-8000-000000000003', 'Nurse Joy Bautista, RN', 40, 'Active'),
('7c9e6679-7425-40de-944b-e07fc1f90ae5', 'SRV-05', 'Senior Citizen Comprehensive Wellness', 'Primary Care', 'Geriatric assessment, medication reconciliation, and mobility evaluation.', 'Mon & Fri (01:00 PM - 04:00 PM)', 'b101a111-0004-4000-8000-000000000004', 'Dr. Rafael Mendoza, MD', 20, 'Active'),
('7c9e6679-7425-40de-944b-e07fc1f90ae6', 'SRV-06', 'Family Planning & Reproductive Health', 'Maternal & Child', 'Reproductive health education, contraceptive counseling, and wellness visits.', 'Mon - Fri (09:00 AM - 03:00 PM)', 'b101a111-0003-4000-8000-000000000003', 'Nurse Joy Bautista, RN', 15, 'Active'),
('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'SRV-07', 'Medical Certificate Issuance', 'Administrative & Screening', 'Physical fitness examination and official community health clearance for school or employment.', 'Mon - Fri (01:00 PM - 04:00 PM)', 'b101a111-0004-4000-8000-000000000004', 'Dr. Rafael Mendoza, MD', 15, 'Active')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED APPOINTMENTS
INSERT INTO appointments (
    id, appointment_code, patient_id, service_id, scheduled_date, time_slot,
    assigned_personnel, status, reason
) VALUES
('c101a111-0001-4000-8000-000000000001', 'APT-2026-801', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', '7c9e6679-7425-40de-944b-e07fc1f90ae4', '2026-11-02', '08:00 AM', 'Nurse Joy Bautista, RN', 'Confirmed', 'Monthly maintenance blood pressure evaluation and lifestyle consult.'),
('c101a111-0002-4000-8000-000000000002', 'APT-2026-802', 'e3b0c442-98fc-1c14-9afb-4c8996fb9242', '7c9e6679-7425-40de-944b-e07fc1f90ae1', '2026-11-02', '09:00 AM', 'Dr. Rafael Mendoza, MD', 'Approved', 'Persistent lower back pain radiating to left leg for two weeks.'),
('c101a111-0003-4000-8000-000000000003', 'APT-2026-803', 'e3b0c442-98fc-1c14-9afb-4c8996fb9243', '7c9e6679-7425-40de-944b-e07fc1f90ae2', '2026-11-03', '10:00 AM', 'Dr. Lorna Pascual, MD', 'Confirmed', 'Routine third trimester prenatal follow-up and fundic height check.'),
('c101a111-0004-4000-8000-000000000004', 'APT-2026-804', 'e3b0c442-98fc-1c14-9afb-4c8996fb9244', '7c9e6679-7425-40de-944b-e07fc1f90ae3', '2026-11-04', '09:00 AM', 'Nurse Joy Bautista, RN', 'Pending', 'Scheduled 60-month booster dose for MMR and oral polio vaccine.'),
('c101a111-0005-4000-8000-000000000005', 'APT-2026-805', 'e3b0c442-98fc-1c14-9afb-4c8996fb9245', '7c9e6679-7425-40de-944b-e07fc1f90ae1', '2026-11-02', '10:00 AM', 'Dr. Rafael Mendoza, MD', 'Completed', 'Annual PhilHealth Konsulta comprehensive physical exam and lab review.')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED QUEUE ENTRIES
INSERT INTO queue_entries (
    id, queue_number, queue_date, patient_id, service_id, service_name,
    priority, priority_weight, status, source, assigned_room, arrival_time
) VALUES
('d101a111-0001-4000-8000-000000000001', 'P-001', '2026-11-02', 'e3b0c442-98fc-1c14-9afb-4c8996fb9242', '7c9e6679-7425-40de-944b-e07fc1f90ae1', 'General Outpatient Consultation', 'Senior Citizen', 3, 'Called', 'Walk-in', 'Triage Station', '2026-11-02 07:48:00+08'),
('d101a111-0002-4000-8000-000000000002', 'Q-002', '2026-11-02', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', '7c9e6679-7425-40de-944b-e07fc1f90ae4', 'Hypertension & Diabetes Screening', 'Regular', 5, 'In Consultation', 'Appointment', 'Consultation Room 1', '2026-11-02 07:52:00+08'),
('d101a111-0003-4000-8000-000000000003', 'P-003', '2026-11-02', 'e3b0c442-98fc-1c14-9afb-4c8996fb9243', '7c9e6679-7425-40de-944b-e07fc1f90ae2', 'Prenatal & Maternal Care', 'Pregnant', 2, 'Waiting', 'Appointment', 'Consultation Room 2', '2026-11-02 08:05:00+08'),
('d101a111-0004-4000-8000-000000000004', 'Q-004', '2026-11-02', 'e3b0c442-98fc-1c14-9afb-4c8996fb9246', '7c9e6679-7425-40de-944b-e07fc1f90ae7', 'Medical Certificate Issuance', 'Regular', 5, 'Waiting', 'Walk-in', 'Consultation Room 1', '2026-11-02 08:12:00+08')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED VITAL SIGNS
INSERT INTO vital_signs (
    id, vital_code, patient_id, recorded_by_id, recorded_by_name, recorded_at,
    systolic, diastolic, temperature_c, heart_rate_bpm, respiratory_rate,
    weight_kg, height_cm, bmi, bmi_category, nursing_notes, follow_up_required
) VALUES
('e101a111-0001-4000-8000-000000000001', 'VIT-2026-501', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', 'b101a111-0003-4000-8000-000000000003', 'Nurse Joy Bautista, RN', '2026-11-02 08:00:00+08', 138, 88, 36.6, 74, 16, 61.2, 158.0, 24.5, 'Normal', 'Patient took maintenance Losartan 50mg early this morning. Asymptomatic, no dizziness.', FALSE),
('e101a111-0002-4000-8000-000000000002', 'VIT-2026-502', 'e3b0c442-98fc-1c14-9afb-4c8996fb9242', 'b101a111-0003-4000-8000-000000000003', 'Nurse Joy Bautista, RN', '2026-11-02 08:10:00+08', 152, 94, 36.8, 82, 18, 72.0, 166.0, 26.1, 'Overweight', 'Elevated BP noted upon rest repeat. Patient reports moderate throbbing temporal headache.', TRUE),
('e101a111-0003-4000-8000-000000000003', 'VIT-2026-503', 'e3b0c442-98fc-1c14-9afb-4c8996fb9243', 'b101a111-0003-4000-8000-000000000003', 'Nurse Joy Bautista, RN', '2026-10-28 09:30:00+08', 114, 72, 36.5, 78, 16, 64.5, 155.0, 26.8, 'Overweight', '28 weeks gestation. Normotensive. Good fetal movement reported by mother.', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 7. SEED CONSULTATIONS
INSERT INTO consultations (
    id, consultation_code, patient_id, attending_doctor_id, attending_doctor_name,
    vital_sign_id, consultation_date, chief_complaint, medical_history, clinical_findings,
    diagnosis, icd_code, treatment_plan, prescription_details, follow_up_date, consultation_notes
) VALUES
('f101a111-0001-4000-8000-000000000001', 'CON-2026-301', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', 'b101a111-0004-4000-8000-000000000004', 'Dr. Rafael Mendoza, MD', 'e101a111-0001-4000-8000-000000000001', '2026-11-02', 'Routine follow-up for Essential Hypertension management', 'Known hypertensive for 4 years on Losartan. Non-diabetic, non-smoker.', 'Clear breath sounds, normal S1/S2 heart sounds, no peripheral edema. BP well controlled.', 'Essential (Primary) Hypertension', 'I10', 'Maintain current antihypertensive regimen. Continue low-sodium diet and daily brisk walking.', 'Losartan Potassium 50mg tab - 1 tab PO once daily in the morning for 30 days.', '2026-12-02', 'Next follow-up should include fasting blood sugar and lipid profile.')
ON CONFLICT (id) DO NOTHING;

-- 8. SEED CONSULTATION AMENDMENTS (FR-028)
INSERT INTO consultation_amendments (
    id, consultation_id, amended_at, amended_by_id, amended_by_name, reason,
    previous_diagnosis, previous_treatment_plan, previous_prescription,
    new_diagnosis, new_treatment_plan, new_prescription
) VALUES
('a101a111-0001-4000-8000-000000000001', 'f101a111-0001-4000-8000-000000000001', '2026-11-02 09:15:00+08', 'b101a111-0004-4000-8000-000000000004', 'Dr. Rafael Mendoza, MD', 'Patient reported bilateral ankle stiffness; reviewed history and adjusted sodium reduction guidelines.', 'Essential (Primary) Hypertension - Mild', 'Standard low salt diet', 'Losartan Potassium 50mg', 'Essential (Primary) Hypertension', 'Maintain current antihypertensive regimen. Continue low-sodium diet and daily brisk walking.', 'Losartan Potassium 50mg tab - 1 tab PO once daily in the morning for 30 days.')
ON CONFLICT (id) DO NOTHING;

-- 9. SEED PRESCRIPTIONS & PRESCRIPTION ITEMS
INSERT INTO prescriptions (
    id, prescription_code, consultation_id, patient_id, doctor_id, doctor_name,
    prescribed_date, status, notes
) VALUES
('a201a111-0001-4000-8000-000000000001', 'RX-2026-001', 'f101a111-0001-4000-8000-000000000001', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', 'b101a111-0004-4000-8000-000000000004', 'Dr. Rafael Mendoza, MD', '2026-11-02', 'Dispensed', 'Dispensed 30 tablets of Losartan 50mg from municipal pharmacy supply.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (
    id, prescription_id, medication_name, generic_name, dosage_form, strength,
    instructions, quantity_prescribed, quantity_dispensed
) VALUES
('a301a111-0001-4000-8000-000000000001', 'a201a111-0001-4000-8000-000000000001', 'Losartan Potassium', 'Losartan', 'Tablet', '50 mg', 'Take 1 tablet once daily in the morning', 30, 30)
ON CONFLICT (id) DO NOTHING;

-- 10. SEED LAB REQUESTS & LAB RESULTS
INSERT INTO lab_requests (
    id, request_code, consultation_id, patient_id, doctor_id, test_category, test_name, priority, status
) VALUES
('a401a111-0001-4000-8000-000000000001', 'LAB-2026-101', 'f101a111-0001-4000-8000-000000000001', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', 'b101a111-0004-4000-8000-000000000004', 'Blood Chemistry', 'Fasting Blood Sugar (FBS)', 'Routine', 'Completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab_results (
    id, lab_request_id, parameter_name, result_value, unit, reference_range, is_abnormal
) VALUES
('a501a111-0001-4000-8000-000000000001', 'a401a111-0001-4000-8000-000000000001', 'Fasting Blood Sugar', '95.4', 'mg/dL', '70.0 - 100.0', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 11. SEED BILLING INVOICES & BILLING ITEMS
INSERT INTO billing_invoices (
    id, invoice_code, patient_id, consultation_id, invoice_date,
    total_amount, lgu_subsidy_amount, philhealth_coverage_amount, net_payable, payment_status
) VALUES
('a601a111-0001-4000-8000-000000000001', 'INV-2026-901', 'e3b0c442-98fc-1c14-9afb-4c8996fb9241', 'f101a111-0001-4000-8000-000000000001', '2026-11-02', 250.00, 250.00, 0.00, 0.00, 'Free/Subsidized')
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing_items (
    id, invoice_id, item_description, item_type, amount, is_covered_by_subsidy
) VALUES
('a701a111-0001-4000-8000-000000000001', 'a601a111-0001-4000-8000-000000000001', 'Primary Care Outpatient Consultation', 'Consultation', 250.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 12. SEED COMMUNITY ACTIVITIES
INSERT INTO community_activities (
    id, activity_code, title, category, barangay, activity_date,
    coordinator_name, participants_count, target_count, status, summary_notes
) VALUES
('a801a111-0001-4000-8000-000000000001', 'ACT-2026-01', 'Barangay San Roque Mass Polio & Measles Catch-Up Drive', 'Immunization', 'San Roque', '2026-10-24', 'Nurse Joy Bautista, RN', 84, 100, 'Completed', 'Reached 84 out of 100 targeted 0-59 month-old children across Purok 1 to 4.'),
('a801a111-0002-4000-8000-000000000002', 'ACT-2026-02', 'Community Hypertension & Diabetes Blood Sugar Screening', 'Nutrition & Screening', 'San Jose', '2026-11-07', 'Dr. Rafael Mendoza, MD', 42, 60, 'Scheduled', 'Mobile clinic screening focused on senior citizens and tricycle drivers association.')
ON CONFLICT (id) DO NOTHING;

-- 13. SEED NOTIFICATIONS
INSERT INTO notifications (
    id, notification_code, title, message, type, target_role, is_read, created_at
) VALUES
('a901a111-0001-4000-8000-000000000001', 'NOT-2026-01', 'DOH Measles Catch-Up Immunization Campaign', 'Free supplemental immunization for all children aged 6 to 59 months scheduled on Wednesday at Barangay San Roque Gymnasium.', 'Announcement', 'all', FALSE, '2026-11-01 09:00:00+08'),
('a901a111-0002-4000-8000-000000000002', 'NOT-2026-02', 'Appointment Confirmed - APT-2026-801', 'Your appointment for Hypertension & Diabetes Screening on 2026-11-02 at 08:00 AM has been confirmed.', 'Appointment', 'patient', FALSE, '2026-11-01 14:15:00+08')
ON CONFLICT (id) DO NOTHING;

-- 14. SEED AUDIT LOGS
INSERT INTO audit_logs (
    id, log_code, timestamp, actor_name, actor_role, action_type,
    module, target_entity_id, details
) VALUES
('aa01a111-0001-4000-8000-000000000001', 'AUD-9001', '2026-11-02 07:30:15+08', 'Elena Villanueva', 'staff', 'Authentication', 'Authentication', 'USR-02', 'Successful credential login from front desk workstation IP 192.168.1.102'),
('aa01a111-0002-4000-8000-000000000002', 'AUD-9002', '2026-11-02 08:00:22+08', 'Nurse Joy Bautista, RN', 'nurse', 'Patient Record', 'Vital Signs', 'VIT-2026-501', 'Recorded triage vital signs for Maria Clara Santos (CHC-2026-0101): BP 138/88, BMI 24.5'),
('aa01a111-0003-4000-8000-000000000003', 'AUD-9003', '2026-11-02 09:15:10+08', 'Dr. Rafael Mendoza, MD', 'doctor', 'Clinical Amendment', 'Consultations', 'CON-2026-301', 'Preserved amendment record AMD-2026-001 for patient CHC-2026-0101: Updated sodium reduction guidance')
ON CONFLICT (id) DO NOTHING;

