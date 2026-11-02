# System Architecture Specification
**System**: San Roque Community Health Center — Patient Management System  
**Document Revision**: 1.0.0  
**Effective Date**: November 2, 2026  
**Status**: Approved Architecture Baseline  

---

## 1. Architectural Overview & System Topography

The San Roque Community Health Center Patient Management System is an enterprise outpatient operations and clinical electronic medical records (EMR) platform. The system operates as a unified npm workspace monorepo comprising a modern client Single-Page Application (SPA), a modular Node.js + Express.js REST API server, and a normalized PostgreSQL database managed through local Supabase CLI or standalone PostgreSQL.

```
+---------------------------------------------------------------------------------------------------+
|                                      CLIENT LAYER (React 19 SPA)                                 |
|                                                                                                   |
|  +------------------+  +-------------------+  +-------------------+  +-------------------------+  |
|  | Patient Portal   |  | Front-Desk Staff  |  | Nursing Triage    |  | Physician Outpatient    |  |
|  | & Appointments   |  | & Queue Intake   |  | & Vital Signs     |  | & EMR Consultations     |  |
|  +------------------+  +-------------------+  +-------------------+  +-------------------------+  |
|  | Institutional UI Primitives (<Button>, <Input>, <Modal>, <DataTable>, <StatusBadge>, etc.)   |  |
|  | State Layer: TanStack Query Cache + JWT Session Context + Optimistic UI Updates                |  |
|  | HTTP Client: Axios / Fetch Typed Client (`/api/v1`) with Bearer Authorization Interceptor     |  |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                    HTTPS / REST API (Port 5000)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  APPLICATION BACKEND (Node.js / Express)                          |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Middleware Pipeline: Helmet | CORS | Rate-Limiter | Express JSON | Request Logging          |  |
|  +---------------------------------------------------------------------------------------------+  |
|  | Authentication & RBAC Gateways: `authMiddleware` (JWT Bearer) & `rbacMiddleware` (Section 5)|  |
|  +---------------------------------------------------------------------------------------------+  |
|  | Modular Route Controllers:                                                                  |  |
|  |  - Auth & Profile (`/auth`)              - Patient Registry (`/patients`)                   |  |
|  |  - Appointments & Slots (`/appointments`) - Priority Queue (`/queue`)                       |  |
|  |  - Triage Vitals (`/vitals`)             - Physician Consultations (`/consultations`)       |  |
|  |  - Services Directory (`/services`)      - Community Monitoring (`/community`)             |  |
|  |  - Reporting Engine (`/reports`)         - Notifications & Alerts (`/notifications`)        |  |
|  |  - Personnel Admin (`/users`)            - Security Audit Trail (`/audit-logs`)             |  |
|  +---------------------------------------------------------------------------------------------+  |
|  | Business Logic Layer: Duplicate Checking, Slot Capacity, Priority Sorting, BMI Engine       |  |
|  +---------------------------------------------------------------------------------------------+  |
|  | Centralized Error Handler: RFC 7807 Problem Details Standard                                |  |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                   TCP Connection Pool (Port 5432)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 DATA PERSISTENCE LAYER (PostgreSQL / Supabase)                     |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | 14 Normalized 3NF Relational Tables:                                                        |  |
|  |  `user_accounts`, `patients`, `healthcare_services`, `appointments`, `queue_entries`,       |  |
|  |  `vital_signs`, `consultations`, `consultation_amendments`, `prescriptions`,                |  |
|  |  `prescription_items`, `lab_requests`, `lab_results`, `billing_invoices`, `billing_items`,  |  |
|  |  `community_activities`, `notifications`, `audit_logs`                                      |  |
|  +---------------------------------------------------------------------------------------------+  |
|  | Row Level Security (RLS) Engine: Kernel-Level RA 10173 Clinical Privacy Enforcement        |  |
|  | Relational Integrity: Foreign Key Constraints (CASCADE / RESTRICT) & Unique Indexes         |  |
|  | B-Tree Search Optimization: Accelerated querying on Name, DOB, Slots, Status, and Date     |  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Monorepo Structure & Workspace Organization

The repository is structured as an npm workspaces monorepo:

```text
Community-Health-Center-Patient-Management-System/
├── package.json                       # Root orchestration package & workspace scripts
├── package-lock.json                  # Root npm dependency lockfile
├── .gitignore                         # Build output, dependency, and secret ignore rules
├── .env.example                       # Application environment template
├── README.md                          # Repository overview and setup commands
│
├── client/                            # Frontend Application Workspace
│   ├── package.json                   # Client dependencies (React 19, Tailwind v4, Lucide)
│   ├── tsconfig.json                  # Client TypeScript compiler settings
│   ├── vite.config.ts                 # Bundler config, Tailwind plugin, API proxy (`/api`)
│   ├── index.html                     # HTML5 entry & Google Fonts imports
│   └── src/
│       ├── main.tsx                   # React 19 concurrent root mounting
│       ├── App.tsx                    # Shell component & route orchestration
│       ├── index.css                  # Tailwind CSS v4 directives & design tokens
│       ├── components/                # Domain feature modules & views
│       │   ├── ui/                    # Reusable UI primitives (Button, Modal, Input, etc.)
│       │   ├── AppointmentModule.tsx  # Appointment scheduling & slot validation
│       │   ├── AuditLogsModule.tsx    # RA 10173 immutable activity log viewer
│       │   ├── AuthPage.tsx           # Full-screen login & self-registration
│       │   ├── CommunityMonitoringModule.tsx # Epidemiological stats & outreach
│       │   ├── ConsultationModule.tsx # EMR, ICD-10 diagnosis & amendments
│       │   ├── DashboardView.tsx      # Role-specific dashboards (5 roles)
│       │   ├── NotificationsModule.tsx # Public announcements & appointment alerts
│       │   ├── PatientModule.tsx      # Demographic registry & duplicate detection
│       │   ├── QueueModule.tsx        # Daily priority queue & live board
│       │   ├── ReportsModule.tsx      # Multi-category reports & CSV export
│       │   ├── ServicesModule.tsx     # Healthcare programs & schedules
│       │   ├── Sidebar.tsx            # Left navigation & role switcher
│       │   ├── UserAdminModule.tsx    # Personnel accounts & RBAC management
│       │   └── VitalSignsModule.tsx   # Triage BP, BMI calculation & alerts
│       ├── services/                  # HTTP API client services (Axios / Fetch)
│       ├── hooks/                     # Custom React & TanStack Query hooks
│       ├── types/
│       │   └── health.ts              # Domain interfaces & TypeScript types
│       └── utils/
│           ├── healthLogic.ts         # Deterministic domain logic (BMI, Priority, Conflicts)
│           └── healthLogic.test.ts    # Unit test suite (8 tests)
│
├── server/                            # Backend REST API Workspace (Phase 3)
│   ├── package.json                   # Server dependencies (Express, cors, pg, jsonwebtoken)
│   ├── tsconfig.json                  # Server TypeScript compiler configuration
│   └── src/
│       ├── index.ts                   # Express server entry point (Port 5000)
│       ├── config/                    # Database connection pool & environment variables
│       ├── middleware/                # Auth, RBAC, error handling, rate limiting
│       ├── controllers/               # Request/response HTTP controllers
│       ├── services/                  # Business logic services
│       ├── validators/                # Request payload validation schemas
│       ├── routes/                    # Modular Express route declarations
│       └── types/                     # Server-side TypeScript interfaces
│
└── supabase/                          # Database Engineering Workspace (Phase 4)
    ├── config.toml                    # Local Supabase CLI configuration
    ├── migrations/                    # Sequential SQL DDL migrations & RLS policies
    └── seeds/                         # Deterministic mock & reference seed data
```

---

## 3. Client Frontend Architecture (React 19 SPA)

### 3.1 Technology Foundation
- **React 19.0.1**: Concurrently rendered component hierarchy leveraging standard React hooks (`useState`, `useMemo`, `useCallback`, `useEffect`).
- **TypeScript 7.0.2**: Strongly-typed domain interfaces (`client/src/types/health.ts`) guaranteeing contract compliance across UI modules.
- **Vite 8.3.5 Bundler**: Hot Module Replacement (HMR) and optimized Rollup production bundling yielding sub-500kB bundles.
- **Tailwind CSS v4 & Lucide React**: Unified atomic utility styling with responsive breakpoints and lightweight SVG medical icons.

### 3.2 State Management & Data Flow Architecture
The frontend transitions from in-memory state hooks into a three-tiered state architecture:
1. **Server State (TanStack Query)**: Remote data collections (`patients`, `appointments`, `queue`, `vitals`, `consultations`, `services`, `activities`, `notifications`, `auditLogs`) are managed via query hooks with automated background revalidation, stale-while-revalidate caching, and optimistic mutations.
2. **Session & Security State (React Context)**: The authenticated user profile (`UserAccount`), active JWT token, and derived Section 5 permissions are stored in a centralized `AuthContext` with secure `localStorage` or `sessionStorage` token caching.
3. **Local Component UI State**: Transient UI interactions (active modal dialogs, search queries, active filter segment buttons, and temporary form field inputs) are isolated within respective component boundaries.

### 3.3 Routing & Navigation Strategy
- **Client Route Guarding**: Modules are conditionally accessible based on `getRolePermission(currentUser.role, moduleId) !== 'none'`.
- **Browser History Integration**: To eliminate the current limitation of single-URL state navigation (TD-04), client routing maps to clean browser paths (`/dashboard`, `/patients`, `/appointments`, `/queue`, `/vitals`, `/consultations`, `/services`, `/monitoring`, `/reports`, `/notifications`, `/users`, `/audit`), enabling deep linking, browser back/forward navigation, and bookmarking.

---

## 4. Backend REST API Architecture (Node.js & Express.js)

### 4.1 Server Middleware Pipeline
The Express server (`server/src/index.ts`) initializes an enterprise middleware stack:
1. **`helmet()`**: Sets secure HTTP response headers (Content-Security-Policy, X-Frame-Options, HSTS).
2. **`cors()`**: Restricts cross-origin requests strictly to authorized client domains (`http://localhost:3000` in development).
3. **`express.json({ limit: '1mb' })`**: Parses incoming JSON request payloads with size protection.
4. **`requestLogger`**: Implements structured audit logging for incoming HTTP requests with latency metrics.
5. **`authMiddleware`**: Verifies `Authorization: Bearer <token>`, decodes JWT claims, and attaches `req.user = { id, role, patientId }`.
6. **`rbacMiddleware(allowedRoles)`**: Enforces role access at route level, returning `403 Forbidden` for unauthorized actors.
7. **`errorHandler`**: Centralized exception handler converting internal errors to RFC 7807 Problem Details.

### 4.2 Modular Controller & Service Pattern
To maintain clean separation of concerns, the backend enforces a layered pattern:
- **Routes Layer** (`routes/`): Defines HTTP methods, URL paths, and binds validation and RBAC middleware.
- **Controllers Layer** (`controllers/`): Unpacks parameters, headers, and request bodies, invokes service methods, and serializes JSON HTTP responses with standard status codes.
- **Services Layer** (`services/`): Encapsulates deterministic business rules (duplicate patient checks, appointment conflict checks, BMI formula, queue priority weightings, consultation amendment archiving).
- **Data Access Layer** (`db/`): Executes parameterized SQL queries via a managed PostgreSQL connection pool (`pg.Pool`), eliminating SQL injection vulnerabilities.

---

## 5. Database Architecture & Local Supabase / PostgreSQL Integration

### 5.1 Relational Architecture & Normalization
The database is fully normalized to Third Normal Form (3NF) across 14 tables, eliminating data redundancy and ensuring relational integrity:
- **`user_accounts`**: System personnel and patient user credentials.
- **`patients`**: Master patient registry and demographic profiles.
- **`healthcare_services`**: Clinical programs, schedules, and capacity parameters.
- **`appointments`**: Scheduled consultation reservations and conflict constraints.
- **`queue_entries`**: Daily outpatient queue tickets with statutory priority weights.
- **`vital_signs`**: Nursing triage measurements, automatic BMI, and follow-up flags.
- **`consultations`**: Physician clinical notes, ICD-10 diagnoses, and treatment plans.
- **`consultation_amendments`**: Immutable audit logs of clinical record amendments (FR-028).
- **`prescriptions` & `prescription_items`**: Normalized pharmacy medication orders and dispensing status.
- **`lab_requests` & `lab_results`**: Outpatient diagnostic orders and quantitative results.
- **`billing_invoices` & `billing_items`**: Fee statements, LGU subsidies, and PhilHealth clearances.
- **`community_activities`**: Field outreach programs and disease surveillance events.
- **`notifications`**: Targeted in-app alerts and public health broadcasts.
- **`audit_logs`**: Immutable security and administrative access trails.

### 5.2 Connection Pooling & Transactions
- **Pool Sizing**: Configured with a default pool size of 20 concurrent connections with automatic connection recycling.
- **ACID Transactions**: Complex multi-table operations (such as converting an appointment to a queue ticket, or applying an auditable clinical amendment) execute within PostgreSQL `BEGIN ... COMMIT` blocks to prevent partial state writes.

---

## 6. Security Boundaries, RA 10173 Compliance & RBAC Matrix

### 6.1 Statutory Privacy Protection (RA 10173)
The Philippine Data Privacy Act of 2012 classifies individual health records and medical diagnoses as Sensitive Personal Information (SPI). The system enforces strict architectural separation between administrative management and confidential medical data:

```
[ Administrative Boundary ]                     [ Clinical Boundary ]
Administrator & Desk Staff                      Physicians & Community Nurses
--------------------------                     ----------------------------
- User provisioning                            - Physical triage measurements
- Service capacity scheduling                  - Blood pressure & vitals evaluation
- Appointment approvals                        - Clinical diagnoses (ICD-10)
- Operational reports & billing                - Treatment plans & prescriptions
- Security audit monitoring                    - Medical record amendments
             |                                              |
             v                                              v
[ Access Denied (HTTP 403 / RLS DENY) ]         [ Authorized Clinical Access ]
Cannot read or write diagnoses, vitals,         Full read/write authority for licensed
or clinical consultation notes.                 care providers.
```

### 6.2 Database Row Level Security (RLS) Policies
PostgreSQL kernel-level RLS policies guarantee that even if an application bug bypasses the API middleware, unauthorized database queries return 0 rows:
- `vital_signs`: Policy permits `SELECT` and `INSERT/UPDATE` to `nurse` and `doctor`. Policy permits `patient` to select only their own records (`patient_id = auth.get_patient_id()`). **No policy exists for `admin` or `staff`, enforcing automatic default DENY.**
- `consultations`: Policy permits full access to `doctor` and read access to `nurse`. Policy permits `patient` to view permitted visit summaries. **Access is strictly blocked for `admin` and `staff`.**
- `audit_logs`: Append-only inserts allowed for backend service role; `SELECT` restricted to `admin`. User updates and deletions are disabled.

---

## 7. Data Flow & State Lifecycle Diagram

The diagram below traces an outpatient's journey from front-desk check-in through triage, consultation, and auditable record storage:

```
Patient Arrival         Front Desk (Staff)        Triage Station (Nurse)        Doctor Consultation Room
      |                         |                           |                             |
      |--- 1. Walk-in Intake -->|                           |                             |
      |                         |-- 2. Check Duplicates --->|                             |
      |                         |   POST /api/v1/patients   |                             |
      |                         |                           |                             |
      |                         |-- 3. Issue Queue Ticket ->|                             |
      |                         |   (Priority Lane Weight)  |                             |
      |                         |   POST /api/v1/queue      |                             |
      |                         |                           |                             |
      |                         |                           |-- 4. Call to Triage ------->|
      |                         |                           |   PATCH /queue/:id/status   |
      |                         |                           |                             |
      |                         |                           |-- 5. Record Vitals -------->|
      |                         |                           |   (Auto-calculate BMI)      |
      |                         |                           |   POST /api/v1/vitals       |
      |                         |                           |                             |
      |                         |                           |                             |-- 6. Call Patient
      |                         |                           |                             |   PATCH /queue/:id/status
      |                         |                           |                             |
      |                         |                           |                             |-- 7. Document Diagnosis
      |                         |                           |                             |   (Link Triage Vital ID)
      |                         |                           |                             |   POST /api/v1/consultations
      |                         |                           |                             |
      |                         |                           |                             |-- 8. (Optional) Amend
      |                         |                           |                             |   POST /consultations/:id/amendments
      |                         |                           |                             |   (Archive previous to history)
```

---

## 8. Monorepo Build, Packaging & Execution Blueprint

### 8.1 Production Build Pipeline
- **Client**: `npm run build --workspace=client` executes `vite build`, producing static assets in `client/dist/`.
- **Server**: `npm run build --workspace=server` executes `tsc -p tsconfig.json`, producing compiled JavaScript in `server/dist/`.
- **Packaging**: In production, Express can serve the compiled client static assets directly or run alongside an Nginx reverse proxy.

### 8.2 Environment Configuration Schema
Environment variables are managed strictly via `.env` files and never committed to source control:
- `PORT`: Server port (default: `5000`).
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://postgres:postgres@localhost:54322/postgres`).
- `JWT_SECRET`: Cryptographic secret key for signing authentication tokens.
- `JWT_EXPIRES_IN`: Session token lifetime (default: `8h`).
- `VITE_API_URL`: Client-side base URL for REST API requests (default: `/api/v1` via Vite proxy).
