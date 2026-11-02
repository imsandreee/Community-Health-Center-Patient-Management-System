# REST API Specification & Interface Contract
**Base URL**: `/api/v1`  
**Protocol**: HTTP/1.1 over TLS (HTTPS)  
**Data Format**: JSON (`application/json`)  
**Error Standard**: RFC 7807 Problem Details  
**Authentication**: JWT Bearer Token (`Authorization: Bearer <token>`)  
**Document Revision**: 1.0.0  
**Effective Date**: November 2, 2026  

---

## 1. Global Standards & Conventions

### 1.1 HTTP Headers
- `Content-Type`: `application/json` (Required for all `POST`, `PUT`, `PATCH` requests)
- `Accept`: `application/json` (or `text/csv` for CSV report exports)
- `Authorization`: `Bearer <jwt_token>` (Required for all protected endpoints)

### 1.2 Global Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120
  }
}
```

### 1.3 RFC 7807 Global Error Model
When an operation fails, the server responds with standard HTTP error codes and an RFC 7807 JSON error body:
```json
{
  "type": "https://api.sanroque-chc.gov.ph/errors/scheduling-conflict",
  "title": "Scheduling Conflict (FR-015)",
  "status": 409,
  "detail": "Patient already holds an active appointment for this date and time slot.",
  "instance": "/api/v1/appointments",
  "code": "SLOT_CONFLICT",
  "timestamp": "2026-11-02T10:15:30Z"
}
```

### 1.4 Standard HTTP Status Codes
- `200 OK`: Request succeeded; returns data payload.
- `201 Created`: Resource successfully created; returns newly created entity.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, invalid, or expired JWT token.
- `403 Forbidden`: Authenticated user lacks required Section 5 RBAC role.
- `404 Not Found`: Target entity or route does not exist.
- `409 Conflict`: Business rule violation (e.g. duplicate patient, double-booking).
- `500 Internal Server Error`: Unhandled server exception.

---

## 2. Exhaustive Endpoint Catalog by Functional Module (35 Endpoints)

---

### Module 1: Authentication & Session Management

#### 1. `POST /api/v1/auth/login`
- **Description**: Authenticate credentials (email + password) and issue JWT token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "e.villanueva@sanroque-chc.gov.ph",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsIn...",
        "user": {
          "id": "USR-02",
          "fullName": "Elena Villanueva",
          "email": "e.villanueva@sanroque-chc.gov.ph",
          "role": "staff",
          "department": "Patient Registration & Front Desk",
          "status": "Active"
        }
      }
    }
    ```
  - `401 Unauthorized`: Invalid email or password.

#### 2. `POST /api/v1/auth/register-patient`
- **Description**: Self-service registration for patients via online portal.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "fullName": "Clarissa Mendoza",
    "email": "clarissa.mendoza@email.ph",
    "dateOfBirth": "1994-05-18",
    "sex": "Female",
    "contactNumber": "0917-555-0821",
    "address": "45 Sampaguita St.",
    "barangay": "San Roque",
    "password": "SecurePassword123!",
    "consentAccepted": true
  }
  ```
- **Responses**:
  - `201 Created`: Returns JWT token, newly generated `patientId` (e.g., `CHC-2026-0107`), and user profile.
  - `409 Conflict`: Duplicate candidate match detected.

#### 3. `GET /api/v1/auth/me`
- **Description**: Retrieve active authenticated session and permissions.
- **Access**: All Authenticated Roles
- **Responses**:
  - `200 OK`: Returns current user details and resolved Section 5 RBAC map.

#### 4. `POST /api/v1/auth/password-recovery`
- **Description**: Initiate password recovery for user or patient portal.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "identifier": "maria.santos@patient.chc.ph"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Recovery instructions dispatched." }`

#### 5. `PUT /api/v1/auth/update-password`
- **Description**: Change password for authenticated user.
- **Access**: All Authenticated Roles
- **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword456!"
  }
  ```
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Password updated successfully." }`
  - `400 Bad Request`: Current password incorrect or new password too weak.

---

### Module 2: Patient Registry & Demographics

#### 6. `GET /api/v1/patients`
- **Description**: Query patient registry with search, barangay filtering, and pagination.
- **Access**: Staff, Nurse, Doctor, Admin
- **Query Parameters**:
  - `search` (string, optional): Search by full name, patient code, or contact number.
  - `barangay` (string, optional): Filter by barangay name.
  - `status` (string, optional): `'Active'` or `'Archived'`.
  - `page` (number, default: 1), `limit` (number, default: 20).
- **Responses**:
  - `200 OK`: Returns array of patient demographic records and pagination metadata.

#### 7. `GET /api/v1/patients/:id`
- **Description**: Retrieve complete profile of a specific patient.
- **Access**: Staff, Nurse, Doctor, Admin, Patient (own record only)
- **Responses**:
  - `200 OK`: Returns patient demographics, calculated age, blood type, allergies, and emergency contact.
  - `404 Not Found`: Patient not found.

#### 8. `POST /api/v1/patients`
- **Description**: Register a new patient at front desk with duplicate detection.
- **Access**: Staff, Admin
- **Request Body**:
  ```json
  {
    "fullName": "Roberto Dela Cruz",
    "dateOfBirth": "1975-08-20",
    "sex": "Male",
    "civilStatus": "Married",
    "contactNumber": "0918-123-4567",
    "email": "roberto.dc@email.ph",
    "address": "12 Narra Street",
    "barangay": "San Jose",
    "emergencyContactName": "Elena Dela Cruz",
    "emergencyContactNumber": "0918-987-6543",
    "bloodType": "O+",
    "allergies": "Penicillin",
    "allowDuplicateOverride": false
  }
  ```
- **Responses**:
  - `201 Created`: Returns created patient record with generated `patientCode`.
  - `409 Conflict`: Duplicate candidate match found; requires `allowDuplicateOverride: true`.

#### 9. `PUT /api/v1/patients/:id`
- **Description**: Update demographic and contact information.
- **Access**: Staff, Admin
- **Responses**:
  - `200 OK`: Returns updated patient record.

#### 10. `PATCH /api/v1/patients/:id/status`
- **Description**: Archive or restore patient record.
- **Access**: Staff, Admin
- **Request Body**: `{ "status": "Archived" }`
- **Responses**:
  - `200 OK`: Returns updated status.

#### 11. `POST /api/v1/patients/check-duplicate`
- **Description**: Real-time duplicate verification before form submission (FR-010).
- **Access**: Staff, Admin
- **Request Body**: `{ "fullName": "Maria Clara Santos", "dateOfBirth": "1988-04-12" }`
- **Responses**:
  - `200 OK`: `{ "isDuplicate": true, "matchReason": "Exact name and DOB match", "existingPatient": { "id": "CHC-2026-0101" } }`

---

### Module 3: Appointment Scheduling & Conflict Resolution

#### 12. `GET /api/v1/appointments`
- **Description**: Fetch appointment schedule by date range, service, or status.
- **Access**: Staff, Nurse, Doctor, Admin, Patient (own appointments only)
- **Query Parameters**:
  - `range` (`'Daily' | 'Weekly' | 'Monthly'`)
  - `status` (`'Pending' | 'Approved' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Rejected'`)
  - `serviceId` (UUID, optional)
- **Responses**:
  - `200 OK`: Returns array of appointment bookings.

#### 13. `POST /api/v1/appointments`
- **Description**: Schedule or request a clinic appointment (FR-012, FR-015).
- **Access**: Staff, Admin, Patient (own booking)
- **Request Body**:
  ```json
  {
    "patientId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "serviceId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "scheduledDate": "2026-11-04",
    "timeSlot": "09:00 AM",
    "reason": "Routine hypertension blood pressure checkup"
  }
  ```
- **Responses**:
  - `201 Created`: Appointment scheduled (Pending for patient, Confirmed for staff).
  - `409 Conflict`: Patient double-booking or slot capacity exceeded ($\ge 2$ bookings).

#### 14. `PATCH /api/v1/appointments/:id/status`
- **Description**: Transition appointment status (Approve, Reject, Cancel, Complete).
- **Access**: Staff, Admin, Patient (cancellation of own pending/approved visits)
- **Request Body**: `{ "status": "Approved", "cancellationReason": null }`
- **Responses**:
  - `200 OK`: Updated appointment record.

#### 15. `POST /api/v1/appointments/:id/check-in`
- **Description**: Convert confirmed appointment into active queue ticket (FR-014, FR-018).
- **Access**: Staff, Admin
- **Responses**:
  - `200 OK`: `{ "appointment": { "status": "Confirmed" }, "queueEntry": { "queueNumber": "P-004", "status": "Waiting" } }`

---

### Module 4: Patient Queue & Priority Routing

#### 16. `GET /api/v1/queue`
- **Description**: Fetch prioritized queue list for today's clinic session.
- **Access**: Staff, Nurse, Doctor, Admin, Patient (own queue ticket)
- **Query Parameters**: `status` (`'Waiting' | 'Called' | 'In Consultation' | 'Completed' | 'All'`)
- **Responses**:
  - `200 OK`: Returns queue entries sorted: Emergency > Pregnant > Senior > PWD > Regular.

#### 17. `GET /api/v1/queue/live-board`
- **Description**: Public live board display feed showing current station calls.
- **Access**: Public / All Roles
- **Responses**:
  - `200 OK`:
    ```json
    {
      "nowInConsultation": { "queueNumber": "Q-002", "assignedRoom": "Consultation Room 1" },
      "currentlyCalled": { "queueNumber": "P-001", "assignedRoom": "Triage Station" },
      "nextPriority": { "queueNumber": "P-003", "priority": "Pregnant" }
    }
    ```

#### 18. `POST /api/v1/queue`
- **Description**: Register walk-in patient into today's priority queue (FR-018, FR-019).
- **Access**: Staff, Nurse, Admin
- **Request Body**:
  ```json
  {
    "patientId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "serviceName": "General Outpatient Consultation",
    "priority": "Senior Citizen",
    "assignedRoom": "Consultation Room 1"
  }
  ```
- **Responses**:
  - `201 Created`: Returns queue ticket with generated `P-xxx` or `Q-xxx` number.

#### 19. `PATCH /api/v1/queue/:id/status`
- **Description**: Transition queue ticket (`Waiting` $\rightarrow$ `Called` $\rightarrow$ `In Consultation` $\rightarrow$ `Completed` / `Skipped`).
- **Access**: Staff, Nurse, Doctor, Admin
- **Request Body**: `{ "status": "Called" }`
- **Responses**:
  - `200 OK`: Updated queue entry.

---

### Module 5: Nursing Triage & Vital Signs

#### 20. `GET /api/v1/vitals`
- **Description**: Get historical vital signs records for a patient.
- **Access**: Nurse, Doctor, Patient (own vitals). **Strictly Forbidden for Admin and Staff (RA 10173).**
- **Query Parameters**: `patientId` (UUID, required)
- **Responses**:
  - `200 OK`: Returns array of vital sign records.
  - `403 Forbidden`: Admin or Staff role access attempt (RA 10173).

#### 21. `POST /api/v1/vitals`
- **Description**: Record patient vital signs with auto-calculated BMI and alerts (FR-029–FR-032).
- **Access**: Nurse
- **Request Body**:
  ```json
  {
    "patientId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "systolic": 142,
    "diastolic": 92,
    "temperatureC": 36.8,
    "heartRateBpm": 78,
    "respiratoryRate": 16,
    "weightKg": 68.5,
    "heightCm": 162.0,
    "nursingNotes": "Patient reports intermittent morning headache.",
    "followUpRequired": true
  }
  ```
- **Responses**:
  - `201 Created`: Returns recorded vitals with computed BMI ($26.1$), category (`Overweight`), and elevated BP alert flag.

---

### Module 6: Clinical Consultations & Auditable Amendments

#### 22. `GET /api/v1/consultations`
- **Description**: Retrieve chronological clinical EMR encounter history.
- **Access**: Doctor, Nurse, Patient (own permitted visit summaries). **Strictly Forbidden for Admin and Staff (RA 10173).**
- **Query Parameters**: `patientId` (UUID, required)
- **Responses**:
  - `200 OK`: Returns consultation records, diagnoses, ICD-10 codes, prescriptions, and amendment histories.
  - `403 Forbidden`: Admin or Staff role access attempt.

#### 23. `POST /api/v1/consultations`
- **Description**: Document clinical outpatient consultation encounter (FR-023–FR-027).
- **Access**: Doctor
- **Request Body**:
  ```json
  {
    "patientId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "vitalSignId": "d8f0a3e1-4567-4890-a1b2-c3d4e5f6a7b8",
    "chiefComplaint": "Fever and productive cough for 4 days",
    "medicalHistory": "No known asthma, non-hypertensive",
    "clinicalFindings": "Coarse crackles in right lower lung field",
    "diagnosis": "Community-Acquired Pneumonia, Low Risk",
    "icdCode": "J18.9",
    "treatmentPlan": "Oral antibiotic therapy, hydration, rest",
    "prescriptionDetails": "Amoxicillin 500mg TID for 7 days; Paracetamol 500mg q4h PRN",
    "followUpDate": "2026-11-09",
    "consultationNotes": "Patient instructed to return if dyspnea develops."
  }
  ```
- **Responses**:
  - `201 Created`: Returns newly created consultation record.

#### 24. `POST /api/v1/consultations/:id/amendments`
- **Description**: Apply auditable clinical amendment without deleting original records (FR-028).
- **Access**: Doctor
- **Request Body**:
  ```json
  {
    "reason": "Sputum microscopy confirms bacterial etiology; adjusted antibiotic spectrum.",
    "newDiagnosis": "Community-Acquired Bacterial Pneumonia",
    "newTreatmentPlan": "Switched to Co-Amoxiclav 625mg BID for 7 days.",
    "newPrescription": "Co-Amoxiclav 625mg BID x 7 days; Salbutamol nebule PRN"
  }
  ```
- **Responses**:
  - `200 OK`: Returns amended consultation with updated fields and historical snapshot in `amendments` array.

---

### Module 7: Prescriptions, Laboratory & Billing Endpoints

#### 25. `GET /api/v1/prescriptions`
- **Description**: List prescription records by patient or status.
- **Access**: Doctor, Nurse, Patient (own)
- **Query Parameters**: `patientId`, `status` (`'Pending' | 'Dispensed'`)
- **Responses**:
  - `200 OK`: Array of prescriptions with items.

#### 26. `POST /api/v1/prescriptions/:id/dispense`
- **Description**: Record medication dispensing from pharmacy inventory.
- **Access**: Nurse, Staff (Pharmacist)
- **Request Body**: `{ "notes": "Dispensed 21 tablets of Amoxicillin 500mg" }`
- **Responses**:
  - `200 OK`: `{ "status": "Dispensed", "dispensedAt": "..." }`

#### 27. `POST /api/v1/lab-requests`
- **Description**: Physician order for outpatient diagnostic tests.
- **Access**: Doctor
- **Request Body**: `{ "patientId": "...", "testName": "Complete Blood Count", "testCategory": "Hematology", "priority": "Routine" }`
- **Responses**:
  - `201 Created`: Lab request entity.

#### 28. `POST /api/v1/lab-requests/:id/results`
- **Description**: Record diagnostic laboratory test results.
- **Access**: Doctor, Nurse, Medical Technologist
- **Request Body**:
  ```json
  {
    "results": [
      { "parameterName": "Hemoglobin", "resultValue": "13.2", "unit": "g/dL", "referenceRange": "12.0 - 16.0", "isAbnormal": false }
    ],
    "notes": "Specimen clear, no hemolysis."
  }
  ```
- **Responses**:
  - `200 OK`: Updated lab request with `Completed` status.

#### 29. `GET /api/v1/billing/invoices`
- **Description**: Query patient clearance statements and PhilHealth claims.
- **Access**: Staff, Admin
- **Responses**:
  - `200 OK`: Array of billing invoices.

#### 30. `POST /api/v1/billing/invoices/:id/settle`
- **Description**: Record receipt clearance or PhilHealth subsidy confirmation.
- **Access**: Staff, Admin
- **Request Body**: `{ "paymentStatus": "Paid", "officialReceiptNumber": "OR-2026-9011" }`
- **Responses**:
  - `200 OK`: Invoice settled.

---

### Module 8: Healthcare Services & Catalog

#### 31. `GET /api/v1/services`
- **Description**: List all public healthcare services and schedules.
- **Access**: Public / All Roles
- **Query Parameters**: `category`, `status`
- **Responses**:
  - `200 OK`: Array of service offerings.

#### 32. `POST /api/v1/services`
- **Description**: Add new clinical service program (FR-033).
- **Access**: Admin
- **Request Body**: `{ "name": "...", "category": "Primary Care", "schedule": "Mon-Fri", "assignedPersonnelName": "...", "dailyCapacity": 30 }`
- **Responses**:
  - `201 Created`: New service record.

#### 33. `PATCH /api/v1/services/:id/status`
- **Description**: Toggle service availability between Active and Inactive (FR-035).
- **Access**: Admin
- **Responses**:
  - `200 OK`: Updated service record.

---

### Module 9: Community Monitoring & Reports

#### 34. `GET /api/v1/community/stats`
- **Description**: Epidemiological catchment statistics, age distribution, top diagnoses, and high BP prevalence (FR-036–FR-038).
- **Access**: Staff, Nurse, Doctor, Admin
- **Responses**:
  - `200 OK`: Aggregated demographic breakdown, top 5 morbidity diagnoses, and elevated BP counts.

#### 35. `GET /api/v1/reports/export/csv`
- **Description**: Download RFC 4180 compliant CSV export for administrative and DOH reporting (FR-044).
- **Access**: Staff, Nurse, Doctor, Admin
- **Query Parameters**: `category` (`'patient_registry' | 'appointments' | 'consultations' | 'vitals' | 'community'`), `startDate`, `endDate`
- **Responses**:
  - `200 OK`: Stream with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="report.csv"`.
