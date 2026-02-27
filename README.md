# 🚀 Nexus HRM v3.1 — Corporate Intelligence Edition

A high-fidelity, full-stack Human Resource Management system built with **React + TypeScript + Node.js + Prisma + PostgreSQL**.

This application has undergone a massive 9-phase overhaul to transform it into a premium, state-of-the-art enterprise portal, featuring glassmorphism aesthetics, dynamic micro-animations, and deep HR functional pipelines (Payroll, Disciplinary Actions, Soft-Delete Archiving).

---

## 🌍 Live Deployment Information

If you are a new developer or AI Agent picking up this repository, **do not spin up new deployments** unless instructed. The application is currently live at the following locations:

- **Frontend (Firebase Hosting):** [https://nexus-hrm.web.app](https://nexus-hrm.web.app)
- **Backend API (Render):** [https://nexus-hrm-api.onrender.com](https://nexus-hrm-api.onrender.com)
- **Database (Neon.tech PostgreSQL):** Hosted securely via connection string in Render environment.

> **Note to AI Agents:** The frontend connects to the backend via the `VITE_API_URL` environment variable. On Firebase, it points to the Render URL. Locally, it points to `http://localhost:5000/api`.

---

## ✨ Core Features & Modules

### 1. 👥 Human Capital & Archival (Phase 9)
- **Employee Management:** Complete CRUD with expanded profiles (Banking, Next of Kin, Ghana Card/SSNIT).
- **Soft-Delete Archiving:** Employees are never permanently deleted (to preserve payroll & query history); they are `ARCHIVED` and hidden from the active roster.
- **Documents Vault:** Secure digital uploads (contracts, IDs) directly on the employee profile.
- **Disciplinary Queries:** Managers can issue queries and track responses inside the employee file.

### 2. 💰 Financial Intelligence (Payroll)
- **Automated Runs:** Calculate Monthly Base, Allowances, Overtime, Bonuses, Deductions, PAYE Tax, and SSNIT.
- **Ledger Orchestration:** Beautiful glassmorphic UI for tracking monthly payroll runs and final outputs.
- **Dynamic Adjustments:** Managers can adjust employee salaries and bonuses on the fly from the Employee Profile.

### 3. 🏖️ Time Logistics (Leave Management)
- **Absence Deployment:** Request leave with manager approval queues.
- **Smart Calculation:** Weekend-aware logic for working days.
- **Accrual & Balances:** Automated accrual engines.

### 4. 📈 Performance & Talent
- **Appraisals:** Self-review → Manager review workflows with glowing UI scores.
- **KPI Metrics:** Assign KPIs, track quarterly progress, and mandate executive validation.
- **Training Catalog:** Skill development matrix and employee enrollment.

### 5. 🛡️ Admin & Infrastructure
- **Security Telemetry (Audit Logs):** Hacker-style glowing terminal ledger tracking system changes.
- **IT Command:** Account provisioning, password resets, and role entropy enforcement.
- **Hardware Fleet (Assets):** Track laptops, phones, and peripherals assigned to employees.

### 6. 💳 Corporate Finance Hub
- **Advances & Loans:** Employees can request loans. Approved loans automatically convert into monthly `otherDeductions` injected directly into their upcoming Payroll slips.
- **Expense Reimbursement:** Employees can request out-of-pocket returns. HR-approved expenses automatically filter into the payroll run as non-taxable allowances.

### 7. ⏱️ Time & Attendance
- **Daily Clock-In/Out:** Centralized employee timestamp logging.
- **HR Directory View:** Sortable historic view of when staff logged in and out to ensure presence and accountability.

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Setup** | React 18, Vite, TypeScript |
| **Frontend Styling** | Tailwind CSS, Framer Motion, Lucide React, Glassmorphism |
| **Backend Core** | Node.js, Express, TypeScript |
| **Database ORM** | Prisma ORM |
| **Database Engine** | PostgreSQL (Neon.tech free tier) |
| **Authentication** | JWT (8h access tokens), bcryptjs |

---

## 💻 Local Development Setup

To continue development locally, follow these steps:

### 1. Backend Setup
```bash
cd server
npm install
```
**Create `.env` in `server/`:**
```env
DATABASE_URL="postgres://YOUR_NEON_DB_STRING"
JWT_SECRET="YOUR_RANDOM_SECRET_STRING"
PORT=5000
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```
*Run:*
```bash
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
```
**Create `.env.development` in `client/`:**
```env
VITE_API_URL="http://localhost:5000/api"
VITE_TELEMETRY="enabled"
```
*Run:*
```bash
npm run dev
```

---

## 🚀 Deployment Instructions

If you need to update the live application, follow these exact rendering patterns:

### Deploying the Backend (Render)
The backend is connected automatically tracking the `main` branch via `render.yaml`.
1. Ensure your dependencies in `server/package.json` include `@types/node`, `typescript`, and `ts-node` under **`dependencies`** (NOT `devDependencies`), or the Render build will fail.
2. Ensure you push to GitHub:
   ```bash
   git add .
   git commit -m "feat: backend update"
   git push origin main
   ```
3. Render will auto-build and deploy. Monitor logs on the Render Dashboard.

### Deploying the Frontend (Firebase Hosting)
The frontend requires a manual build and deploy.
1. Ensure `client/.env.production` is set:
   ```env
   VITE_API_URL="https://nexus-hrm-api.onrender.com/api"
   ```
2. Build and Deploy:
   ```bash
   cd client
   npm run build
   firebase deploy --only hosting --non-interactive
   ```

---

## 📝 Agent Handoff Notes

- **If you are an AI assistant taking over:** Review the `schema.prisma` in `server/prisma/` to understand the data relationships (`User`, `EmployeeDocument`, `EmployeeQuery`, `PayrollRun`, `PayrollSlip`, etc.).
- When adding new modules to the UI, adhere strictly to the **Glassmorphism Design System** located in `index.css` (`.glass`, `.btn-primary`, `.nx-input`, `.nx-table`).
- Do not use raw colors; use the established Tailwind classes (e.g., `text-primary-light`, `bg-white/[0.02]`, `border-white/[0.05]`).
- Do NOT hard delete users. Use the `isArchived` and `status: 'ARCHIVED'` flags in the backend controllers.
