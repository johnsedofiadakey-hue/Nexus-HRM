# Nexus HRM — Enterprise SaaS Multi-Tenant Platform

A production-grade Human Resource Management system designed for multi-tenancy, high-security operations, and granular role-based access control.

---

## 🚀 deployment & Infrastructure (Dev vs. Prod)

Nexus HRM uses a hybrid database strategy to ensure fast local development and robust production performance.

### 1. Database: The "Dynamic Provider" Strategy
The system is built on **Prisma** and supports two database providers seamlessly:
- **Development (Local)**: Uses **SQLite** for zero-setup, file-based data storage (`server/prisma/dev.db`).
- **Production (Render)**: Uses **PostgreSQL** for persistence and multi-user performance.

> [!IMPORTANT]
> To support both without maintaining two schemas, the `render.yaml` build process uses a `sed` command to dynamically swap the provider in `schema.prisma` before generating the client:
> `sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma`

### 2. Backend Hosting: Render
- **Host**: [nexus-hrm-api.onrender.com](https://nexus-hrm-api.onrender.com)
- **Engine**: Node.js / Express
- **Build**: The `server/dist` folder is pre-compiled and committed to GitHub to avoid memory-intensive builds on Render's free tier.

### 3. Frontend Hosting: Firebase
- **URL**: [https://nexus-hrm.web.app](https://nexus-hrm.web.app)
- **Engine**: React 18 (Vite)
- **Deployment**: `npm run build && firebase deploy`

---

## 🛡️ Super-DEV Command Center
The platform includes a specialized **Control Suite** for system owners (DEV role) to manage the entire ecosystem without touching the database.

| Feature | Description |
|---------|-------------|
| **Platform Telemetry** | Real-time monitoring of login success/failure rates and system health. |
| **Security Audit Trail** | Global log system tracking every administrative action across all tenants. |
| **Kill-Switch / Maintenance** | Instantly toggle "Maintenance Mode" or "Security Lockdown" across the platform. |
| **Revenue Control** | Configure global pricing (Monthly/Annual) and trial durations (default 14 days). |
| **Paystack Integration** | Manage production API keys and fallback manual payment links. |
| **Tenant Activation** | Manually activate tenants who pay via bank transfer with a full audit trail. |
| **Feature Toggles** | Enable/Disable specific modules (e.g., Assets, Training) for individual organizations. |

---

## 🔑 Role Architecture & Rank

Nexus HRM uses a Rank-Based access system. Higher ranks inherit permissions from lower ranks.

| Role | Rank | Scope | Key Capabilities |
|------|------|-------|------------------|
| **DEV** | 100 | **System-Wide** | Platform control, billing, telemetry, multi-tenant diagnostics. |
| **MD** | 90 | **Organization** | Payroll approval, subscription management, org-wide settings. |
| **DIRECTOR** | 80 | **Department** | Appraisal initiation, department budgets, headcount reporting. |
| **MANAGER** | 70 | **Team** | Team KPIs, performance reviews, leave approvals (1st level). |
| **STAFF** | 50 | **Self** | Personal leave requests, payslips, goal tracking. |

---

## 🏗️ Project Structure

```
nexus-hrm/
├── client/                     # React (Vite) Frontend
│   ├── src/pages/dev/          # Super-DEV Command Center UI
│   ├── src/pages/dashboards/   # Role-based landing pages
│   ├── src/components/billing/ # Paystack & Trial logic
│   └── firebase.json           # Hosting configuration
│
├── server/                     # Node.js (Express) Backend
│   ├── src/controllers/dev/    # Platform control logic
│   ├── src/middleware/         # auth, rate-limit, maintenance, subscription guards
│   ├── prisma/schema.prisma    # Single source for SQLite & PG
│   └── dist/                   # PRODUCTION-READY BUILDS (Force-committed)
│
└── render.yaml                 # Optimized Render Orchestration
```

---

## 🔐 Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Server | Critical for token signing. (64-char random string). |
| `DATABASE_URL` | Server | Dev: `file:./prisma/dev.db` \| Prod: `postgresql://...` |
| `FRONTEND_URL` | Server | CORS whitelist (e.g. `https://nexus-hrm.web.app`). |
| `PAYSTACK_SECRET_KEY` | Server | Managed via Command Center or `.env`. |
| `VITE_API_URL` | Client | Backend endpoint (e.g. `https://nexus-hrm-api.onrender.com`). |

---

## 🛠️ Developer Operations

### Re-Deploying the Backend
1. Ensure your local `server/.env` is correct.
2. `cd server && npm run build`
3. `git add . && git commit -m "feat: your change" && git push origin main`
4. Render will pull the `dist/` folder and restart automatically.

### Re-Deploying the Frontend
1. `cd client`
2. `npm run build`
3. `firebase deploy`

---

## 🐛 Notable Architecture Decisions
- **Enums as Strings**: Enums are stored as strings in Prisma to maintain 100% compatibility between SQLite (local) and PostgreSQL (prod).
- **Graceful Failures**: The dashboard uses `Promise.allSettled` to ensure that if one service (like telemetry) is down, the rest of the app remains functional.
- **Role Isolation**: The system uses a strict `organizationId` filter on every database query to prevent cross-tenant data leaks. DEV users are the only ones permitted to query across all IDs.

