# Community Health Center Patient Management System

A web-based platform for community health centers to manage patient registration, appointments, queues, consultations, vital signs, and community health monitoring.

---

## Project Structure

The project has been refactored into a workspace-enabled modular structure:

```text
Community-Health-Center-Patient-Management-System/
├── package.json               # Root package with workspace orchestration
├── package-lock.json
├── .gitignore
├── .env.example
├── client/                    # Client-side React + TypeScript application
│   ├── package.json           # Client package & dependencies
│   ├── vite.config.ts         # Vite bundler configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── index.html             # Client HTML entry point
│   ├── src/
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Main application shell & state orchestration
│   │   ├── index.css          # Tailwind CSS styles & design tokens
│   │   ├── components/        # UI modules (Queue, Patients, Vitals, Appointments, etc.)
│   │   ├── data/              # Mock dataset and initial records
│   │   ├── types/             # Domain TypeScript interfaces and types
│   │   └── utils/             # Clinical utilities & unit tests
```

---

## Getting Started

### 1. Install Dependencies
Run from the root directory:
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
# or
npm start
```
The application will be accessible at:
```
http://localhost:3000
```

### 3. Build for Production
```bash
npm run build
```

### 4. Run Tests & Type Checks
```bash
npm test       # Runs unit tests (healthLogic.test.ts)
npm run lint   # Runs TypeScript type check
```

