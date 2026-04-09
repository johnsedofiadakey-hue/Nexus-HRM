# Nexus HRM
<!-- Deployment Refresh Trigger: 2026-04-09T08:19:35Z -->
 — Enterprise SaaS Multi-Tenant Platform

A production-grade Human Resource Management system designed for multi-tenancy, high-security operations, and granular role-based access control.

---

## 📅 Recent Optimization Milestones (April 2026)

The platform has recently undergone a major optimization phase focusing on stability, internationalization, and disaster recovery.

- **Cloud Snapshot System**: Integrated a 2TB Google Drive "Cloud Vault" that automatically syncs encrypted SQL database snapshots every 12 hours, maintaining a rolling 30-day history.
- **Safe Data Purge (Admin Protected)**: Implemented a production-ready reset mechanism that wipes all transactional and staff data while strictly preserving MD and Developer accounts to ensure continued access.
- **System-Wide Localization**: Full bilingual support (English/French) across all core modules: Payroll, Leave, Performance, and Settings.
- **Appraisal Lifecycle Hardening**: A 3-stage review cycle (**Self → Manager → Final**) with institutional arbitration and localized PDF reporting.
- **High-Security Vault**: AES-256 encryption for SSN, Bank Details, and Salaries with Rank 80+ access control.
- **Target Workflow Refinement**: Simplified English terminology for goal tracking and Pulse UI for real-time progress monitoring.

---

## 🚀 Full System Rebuild & Disaster Recovery

In the event of a total system failure or migration, follow these steps to rebuild the environment from scratch without data loss.

### 1. Code Repository
The entire system (Frontend, Backend, and Infrastructure) is stored in the root directory. Ensure all changes are committed to the `main` branch on GitHub.
- **Backend**: `/server`
- **Frontend**: `/client`
- **Config**: `render.yaml`, `firebase.json`

### 2. Infrastructure Setup
- **API (Backend)**: Deploy to Render as a "Web Service". Point to the `server/` root.
- **Database**: Create a "PostgreSQL" instance on Render.
- **Client (Frontend)**: Deploy to Firebase Hosting (Standard) or Render Static Sites.

### 3. Environment Variables (Required for Rebuild)
You MUST configure these in your hosting dashboard for the system to function:

| Variable | Location | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Server | Connection string for PostgreSQL. |
| `JWT_SECRET` | Server | Token encryption (64-char random string). |
| `GOOGLE_DRIVE_KEY_JSON` | Server | Service Account JSON for 2TB Cloud Vault Sync. |
| `FRONTEND_URL` | Server | CORS whitelist for the frontend (e.g. `https://nexus-hrm.web.app`). |
| `SMTP_HOST` / `SMTP_PASS` | Server | Email delivery settings (Gmail/SendGrid). |
| `VITE_API_URL` | Client | Endpoint for the API (e.g. `https://api.yourdomain.com/api`). |

### 4. Data Restoration (Disaster Recovery)
If the database is lost, retrieve the latest snapshot from your **Google Drive "Nexus-HRM-Cloud-Vault"** folder.
1. Download the latest `.sql` file.
2. Connect to your new PostgreSQL instance via CLI or GUI (e.g., pgAdmin/DBeaver).
3. Run the restoration:
   ```bash
   psql -h your-db-host -U your-user -d your-dbname -f latest-snapshot.sql
   ```
4. Run `npx prisma generate` and `npx prisma db push` to sync any schema changes.

### 5. Access Restoration
- **Admin Access**: Use your existing **MD** or **DEV** credentials. They are preserved in all safe purges.
- **Default MD (Emergency Only)**: `md@nexus.com` / `MD@Nexus2025!` (if setup script is rerun).

---

## 🛡️ Role Architecture & Rank

Nexus HRM uses a Rank-Based access system. Higher ranks inherit permissions from lower ranks.

| Role | Rank | Scope | Key Capabilities |
|------|------|-------|------------------|
| **DEV** | 100 | **System-Wide** | Platform control, billing, telemetry, multi-tenant diagnostics. |
| **MD** | 90 | **Organization** | Payroll approval, subscription management, data purge resets. |
| **IT_MANAGER** | 85 | **Technical** | IT Provisioning, asset management, infrastructure monitoring. |
| **DIRECTOR** | 80 | **Department** | Appraisal initiation, department budgets, institutional sign-offs. |
| **MANAGER** | 70 | **Team** | Team KPIs, performance reviews, leave approvals (1st level). |
| **STAFF** | 40 | **Self** | Personal leave requests, password management, goal tracking. |

---

## 🛠️ Developer Operations

### Re-Deploying the Backend (Render)
1. Ensure your local `server/.env` is correct.
2. `cd server && npm run build`
3. `git add . && git commit -m "update: deployment" && git push origin main`
4. Render will pull the pre-compiled `dist/` folder and restart automatically.

### Re-Deploying the Frontend (Firebase)
1. `cd client`
2. `npm run build`
3. `firebase deploy`

---

## 🐛 Lifecycle Safety
- **Safe Purge**: The "Production Reset" button in Settings now strictly spares `MD` and `DEV` users.
- **Passwords**: All new users can change their password immediately upon login via the **Profile > Security** tab.
- **Encryption**: Sensitive employee data is encrypted at rest and only accessible to Rank 80+ authorized personnel.

---

### Current Status: **v3.5.0 Production Ready**
- **API**: [nexus-hrm-api.onrender.com](https://nexus-hrm-api.onrender.com)
- **Frontend**: [nexus-hrm.web.app](https://nexus-hrm.web.app)

 
