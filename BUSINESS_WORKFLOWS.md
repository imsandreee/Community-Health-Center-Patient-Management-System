# Clinical & Operational Business Workflows
**Facility**: San Roque Community Health Center  
**Regulatory Standards**: Republic Act No. 10173, RA 9994, BP 344, DOH PhilPEN Protocols  
**Document Revision**: 1.0.0  
**Effective Date**: November 2, 2026  

---

## 1. User Personas & Operational Responsibilities

The San Roque Community Health Center operates across five discrete user personas, each reflecting distinct operational roles and legal privacy obligations:

```
+---------------------------------------------------------------------------------------------------+
|                                 CLINICAL OPERATIONAL ECOSYSTEM                                    |
|                                                                                                   |
|  [ Patient ]               [ Front-Desk Staff ]        [ Community Nurse ]     [ Medical Officer ]|
|  Self-Service Portal       Intake, Scheduling          Triage, Vitals,         Consultations,     |
|  & Appointments            & Queue Management          BMI, Outreach           EMR & Amendments   |
|                                                                                                   |
|                                [ System Administrator ]                                           |
|                                Governance, User Accounts,                                         |
|                                Service Schedules & Audit Logs                                     |
+---------------------------------------------------------------------------------------------------+
```

### 1.1 Patient (`patient`) — *e.g., Maria Clara Santos*
- **Role Context**: Catchment barangay resident seeking primary care, prenatal checkups, immunization, or chronic disease management.
- **Access Level**: Strictly limited to personal demographic data, appointment requests, active queue tickets, permitted visit summaries, and announcements.
- **Key Responsibilities**: Online self-registration, booking appointments, self-canceling pending visits, monitoring real-time queue status.

### 1.2 Health Center Front-Desk Staff (`staff`) — *e.g., Elena Villanueva*
- **Role Context**: Reception triage clerk, intake officer, and appointment coordinator.
- **Access Level**: Full management of demographic registrations, appointment scheduling, walk-in queue check-ins, and service availability. **Explicitly restricted from reading or modifying clinical diagnoses and vital signs (RA 10173).**
- **Key Responsibilities**: Patient intake, duplicate check verification, appointment approval/rejection, ticket issuance, calling patients to triage.

### 1.3 Community Nurse (`nurse`) — *e.g., Nurse Joy Bautista, RN*
- **Role Context**: Licensed triage and public health nurse handling initial patient assessment and community field surveillance.
- **Access Level**: Full management of vital signs and community health activity logs; read-only access to patient demographics and doctor consultation records.
- **Key Responsibilities**: Measuring vital signs (BP, HR, RR, temp, height, weight), calculating BMI, flagging elevated BP under PhilPEN protocols, logging outreach vaccination drives.

### 1.4 Medical Officer / Attending Physician (`doctor`) — *e.g., Dr. Rafael Mendoza, MD*
- **Role Context**: Municipal outpatient physician diagnosing illnesses, prescribing medication, and directing care plans.
- **Access Level**: Sole authority to document outpatient consultations, assign ICD-10 diagnostic codes, prescribe medicines, and execute auditable record amendments.
- **Key Responsibilities**: Clinical examination, reviewing triage vitals, recording formal consultations, ordering diagnostic tests, executing auditable corrections.

### 1.5 System Administrator (`admin`) — *e.g., Carlos Dizon*
- **Role Context**: Municipal Health Information Systems (HIS) officer responsible for system security, accounts, and legal compliance.
- **Access Level**: Full management of user accounts, role permissions, healthcare service parameters, and security audit logs. **Strictly restricted from clinical medical records, vital signs, and diagnostic details under RA 10173.**
- **Key Responsibilities**: Provisioning personnel accounts, toggling user/service activation, monitoring immutable security audit trails.

---

## 2. Section 5 Role-Based Access Control (RBAC) Matrix

The table below defines the authoritative Section 5 permission matrix enforced across the application and PostgreSQL database:

| Module Identifier | Clinical / Administrative Domain | Patient | Staff | Nurse | Doctor | Administrator |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `dashboard` | Operational Overview & KPI Feed | `own` | `view` | `view` | `view` | `view` |
| `patients` | Demographic Master Registry | `own` | `manage` | `view` | `view` | `manage` |
| `appointments` | Clinic Reservations & Slots | `own` | `manage` | `view` | `view` | `manage` |
| `queue` | Priority Flow & Live Board | `own` | `manage` | `manage` | `manage` | `manage` |
| `vitals` | Nursing Triage & Measurements | `own` | **`restricted`** | `manage` | `view` | **`restricted`** |
| `consultations`| Clinical EMR, Diagnoses & Rx | `own` | **`restricted`** | `view` | `manage` | **`restricted`** |
| `services` | Healthcare Programs Catalog | `view` | `view` | `view` | `view` | `manage` |
| `monitoring` | Catchment Public Health Stats | `none` | `view` | `view` | `view` | `manage` |
| `reports` | Reporting & RFC 4180 CSV Export | `none` | `view` | `view` | `view` | `manage` |
| `notifications`| In-App Alerts & Announcements | `own` | `manage` | `view` | `view` | `manage` |
| `users` | Personnel Accounts & Roles | `own` | `none` | `none` | `none` | `manage` |
| `audit` | Immutable Audit Logs | `none` | `none` | `none` | `none` | `view` |

*Permission Key*:
- `none`: Module is hidden from sidebar; direct route access returns HTTP 403.
- `own`: Access strictly partitioned to records where `patientId === currentUser.patientId`.
- `view`: Read-only access to all records in the module.
- `manage`: Full creation, editing, status transitions, and administrative rights.
- `restricted`: **Statutory clinical privacy barrier enforced by RA 10173**; database RLS policies deny access (returns 0 rows).

---

## 3. End-to-End Clinical & Operational Workflows

```
  [ Patient ]              [ Staff ]                 [ Nurse ]                 [ Doctor ]               [ Pharmacy / Lab ]
       |                       |                         |                         |                              |
       |-- 1. Self Register -->|                         |                         |                              |
       |   or Walk-In Intake ->| (Duplicate Check)       |                         |                              |
       |                       |                         |                         |                              |
       |-- 2. Request Visit -->| (Check Conflict)        |                         |                              |
       |                       |-- Approve/Confirm ----->|                         |                              |
       |                       |                         |                         |                              |
       |-- 3. Arrive / CheckIn>|                         |                         |                              |
       |                       |-- Issue Queue Ticket -->|                         |                              |
       |                       |   (Priority Weight)     |                         |                              |
       |                       |                         |                         |                              |
       |                       |                         |-- 4. Call to Triage --->|                              |
       |                       |                         |-- Record Vitals ------->|                              |
       |                       |                         |   (Calculate BMI)       |                              |
       |                       |                         |-- Flag High BP Alert -->|                              |
       |                       |                         |                         |                              |
       |                       |                         |                         |-- 5. Call Patient ---------->|
       |                       |                         |                         |-- Review Vitals & History -->|
       |                       |                         |                         |-- Document ICD-10 Diagnosis->|
       |                       |                         |                         |-- Prescribe Rx & Lab Orders->|
       |                       |                         |                         |-- (Optional) Amend Record -->|
       |                       |                         |                         |                              |
       |                       |                         |                         |                              |-- 6. Dispense Meds
       |                       |                         |                         |                              |-- 7. Process Lab
       |                       |                         |                         |                              |-- 8. Billing Clearance
```

---

### Workflow 1: Patient Intake & Registration
1. **Intake Trigger**: Patient initiates registration either through online self-service (`AuthPage.tsx`) or in person at the front desk (`PatientModule.tsx`).
2. **Duplicate Record Detection (FR-010)**:
   - System normalizes the candidate's `fullName` (trimmed, lowercase) and compares it alongside `dateOfBirth` against all existing records.
   - If an exact match or normalized match is found, registration is blocked and an amber warning banner is displayed.
   - Front-desk staff may only override the warning if physical verification confirms a distinct identity (e.g., Junior/Senior suffix), marking the `allowDuplicateOverride` checkbox.
3. **Sequential Identifier Allocation (FR-007)**:
   - System queries the highest registered numeric index for the current calendar year.
   - Format: `CHC-YYYY-XXXX` (e.g., `CHC-2026-0107`).
4. **Data Privacy Consent (RA 10173)**:
   - Patients must explicitly accept statutory consent for demographic and medical processing.
5. **Audit Trail Generation**:
   - Creates an immutable audit entry recording registrar name, target patient ID, barangay, and timestamp.

---

### Workflow 2: Appointment Scheduling & Conflict Resolution
1. **Booking Submission**:
   - Patient or staff selects patient, healthcare service, preferred date, and time slot (08:00 AM – 03:00 PM).
2. **Deterministic Conflict Validation (FR-015)**:
   - *Patient Double-Booking*: Verifies patient does not already possess an active (`Pending`, `Approved`, `Confirmed`) appointment for that date and time slot.
   - *Service Slot Capacity*: Counts active bookings for the specified service and slot. If existing bookings $\ge 2$, the slot is rejected with a maximum capacity conflict error.
3. **Approval Lifecycle (FR-014)**:
   - Appointments submitted by patients enter `Pending` status.
   - Staff reviews the pending queue to `Approve` or `Reject` (with mandatory reason).
   - Appointments booked by clinic staff directly enter `Confirmed` status.
4. **Queue Check-In (FR-018)**:
   - On the appointment day, staff executes the Check-In action, updating the appointment to `Confirmed` and issuing a queue ticket.

---

### Workflow 3: Priority Queuing & Station Routing (RA 9994 / BP 344)
1. **Queue Ticket Generation (FR-019)**:
   - Priority classification is determined based on patient profile and intake evaluation:
     - Age $\ge 60$: `Senior Citizen` (RA 9994) $\rightarrow$ Ticket prefix `P-xxx`
     - Physical disability: `PWD` (BP 344) $\rightarrow$ Ticket prefix `P-xxx`
     - Maternal: `Pregnant` $\rightarrow$ Ticket prefix `P-xxx`
     - Acute clinical instability: `Emergency` $\rightarrow$ Ticket prefix `P-xxx`
     - General outpatient: `Regular` $\rightarrow$ Ticket prefix `Q-xxx`
2. **Dynamic Priority Sorting Algorithm (FR-020)**:
   - The queue monitor sorts waiting tickets using a strict hierarchical weight:
     $$\text{Emergency (1)} < \text{Pregnant (2)} < \text{Senior Citizen (3)} < \text{PWD (4)} < \text{Regular (5)}$$
   - Patients sharing the same priority tier are ordered strictly by arrival time (`arrival_time ASC`).
3. **Station Calling & Live Board Display (FR-021)**:
   - Triage nurse or physician calls next ticket: status transitions from `Waiting` to `Called`.
   - The tri-panel live display board updates: 'Now In Consultation', 'Called to Station', 'Next Priority'.

---

### Workflow 4: Nursing Triage & Vital Signs Evaluation (PhilPEN)
1. **Patient Call**: Nurse calls patient to the triage station and initiates vital signs recording.
2. **Data Intake (FR-029)**:
   - Systolic & Diastolic BP (mmHg), Temperature (°C), Heart Rate (bpm), Respiratory Rate (cpm), Weight (kg), Height (cm), and Nursing Notes.
3. **Deterministic BMI Engine (FR-030)**:
   $$BMI = \frac{\text{weight in kg}}{(\text{height in m})^2}$$
   - Classifications: Underweight ($<18.5$), Normal ($18.5 - 24.9$), Overweight ($25.0 - 29.9$), Obese ($\ge 30.0$).
4. **Clinical Alert Flagging (FR-031)**:
   - Systolic $\ge 140$ mmHg OR Diastolic $\ge 90$ mmHg triggers an automated amber 'Elevated BP' indicator under DOH PhilPEN guidelines.
   - Nurse checks `followUpRequired` if clinical findings require active monitoring.

---

### Workflow 5: Physician Consultation, Diagnosis & Auditable Amendments
1. **Clinical Encounter Documentation (FR-023–FR-027)**:
   - Physician opens the patient encounter; the latest triage record (`vitalSignId`) is automatically attached.
   - Documents Chief Complaint, Medical History, Clinical Findings, Diagnosis, ICD-10 Code, Treatment Plan, Prescription Details, and Follow-Up Date.
2. **Auditable Amendment Process (FR-028)**:
   - **Legal Requirement**: Medical records must NEVER be destructively overwritten or deleted.
   - If diagnosis or treatment plans are corrected post-consultation (e.g. following lab test results), the doctor invokes `applyConsultationAmendment()`.
   - The prior diagnosis, treatment, and prescription are permanently captured in the `consultation_amendments` table with amendment timestamp, doctor identity, and mandatory clinical justification.

---

### Workflow 6: Prescriptions & Pharmacy Dispensing
1. **Medication Prescription**:
   - Physician orders medications with generic names, dosage forms, strengths, quantities, and instructions.
   - Prescription enters `Pending` status.
2. **Pharmacy Dispensing**:
   - Pharmacist or dispensing nurse verifies allergy records, dispenses medication, and transitions status to `Dispensed` or `Partially Dispensed`.

---

### Workflow 7: Laboratory Diagnostic Ordering & Results
1. **Laboratory Order**:
   - Physician requests diagnostic tests (CBC, Urinalysis, Fasting Blood Sugar, Sputum Microscopy). Status enters `Requested`.
2. **Specimen Collection & Result Recording**:
   - Medical Technologist collects specimen (`Sample Collected`), runs tests (`In Progress`), and inputs quantitative values, reference ranges, and abnormal flags (`Completed`). Results link to the consultation record.

---

### Workflow 8: Billing Clearance, Subsidies & PhilHealth
1. **Fee Calculation**:
   - Standard primary care services and consultations are 100% subsidized by the LGU (`Free/Subsidized`).
2. **Clearance Invoicing**:
   - Administrative certifications or non-covered items generate invoices settled via Official Receipt or billed to PhilHealth Konsulta package clearances.

---

## 4. Status Lifecycles & State Machine Specifications

### 4.1 Appointment Lifecycle
```
 [Pending] ------------> [Approved] -----------> [Confirmed] ------------> [Completed]
    |                       |                         |
    +-----> [Rejected]      +-----> [Cancelled]       +-----> [No-show]
    |                                                 |
    +-----> [Cancelled]                               +-----> [Cancelled]
```

### 4.2 Queue Ticket Lifecycle
```
 [Waiting] ------------> [Called] -------------> [In Consultation] ------> [Completed]
    |                       |                         |
    +-----> [Skipped]       +-----> [Skipped]         +-----> [Cancelled]
    |                       |
    +-----> [Cancelled]     +-----> [Cancelled]
```

### 4.3 Prescription Lifecycle
```
 [Pending] ------------> [Partially Dispensed] -------> [Dispensed]
    |
    +-----> [Cancelled]
```

### 4.4 Laboratory Request Lifecycle
```
 [Requested] ----------> [Sample Collected] --------> [In Progress] -------> [Completed]
    |
    +-----> [Cancelled]
```

### 4.5 Billing Invoice Lifecycle
```
 [Free/Subsidized] (Auto-Cleared)
 [Pending] ------------------------> [Paid] (Official Receipt)
    |
    +-----> [PhilHealth Covered]
    |
    +-----> [Cancelled / Waived]
```
