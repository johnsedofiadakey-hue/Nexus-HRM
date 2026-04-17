# Nexus HRM — v5.1.0 "Elite Edition"
<!-- Deployment Refresh Trigger: 2026-04-17T08:16:12Z -->
Enterprise SaaS Multi-Tenant Platform — High-Governance Edition

Nexus HRM is a production-grade, multi-tenant Human Resource Management system designed for high-security environments. v5.1.0 (Elite Edition) introduces advanced organizational analytics, a rank-based governance model, and "Production Shield" resilience for custom domain deployments.

---

## 🌌 The Atlas v2: Advanced Governance
The platform has transitioned from simple role-based checks to a rigorous **Numerical Rank-Based Hierarchy (0-100)**. permissions are inherited upwards, and visual artifacts are tiered based on institutional seniority.

### Institutional Tiers
| Tier | Rank Range | Visual Identity | Primary Focus |
|------|------------|-----------------|---------------|
| **Executive** | 90–100 | **Deep Indigo & Gold** | Strategic Vision, Multi-Tenant Control, Payroll Certification. |
| **Director** | 80–89 | **Vibrant Blue & Purple** | Departmental Calibration, Institutional Sign-offs, Risk Management. |
| **Manager** | 70–79 | **Emerald & Teal** | Team Growth, KPI Management, Appraisal Initiation. |
| **Supervisor**| 60–69 | **Amber & Slate** | First-line reviews, Punctuality tracking, Task delegation. |

### Adaptive Hierarchy (Horizontal Scaling)
The Org Chart (The Atlas) now implements **Dynamic Branching**. When a node has a Rank of 70+ (Manager) and manages more than 3 reports, the UI automatically shifts to horizontal branching to prevent vertical list fatigue, maintaining a professional visual density for large enterprises.

---

## 📊 Analytics & Growth Intelligence
v5.1.0 introduces a deep-analytics layer focused on institutional growth and peer alignment.

- **Institutional Growth Tracer**: An Area-Chart visualization that tracks employee performance across multiple appraisal cycles. Supports single-point rendering for new employees to ensure immediate feedback.
- **Competency Radar**: A multi-axis radar chart used during appraisals to synchronize **Self-Perception** vs. **Management Oversight**. High variance areas (Gaps) are highlighted for arbitration.
- **Calibration Hub**: A departmental dashboard component that visualizes team-wide performance distribution, allowing Directors to identify top-talent "Bands" and performance risks.

---

## 🛡️ The Shield: Resilience & Disaster Recovery
Designed for mission-critical reliability, "The Shield" protects data integrity across multiple failure scenarios.

### 1. Multi-Cloud Backup Architecture
- **Cloud Vault (Google Drive)**: Automatically syncs encrypted SQL database snapshots to a 2TB "Nexus-HRM-Cloud-Vault" folder via the `google-drive.service.ts`.
- **Firestore Redundancy**: `backup.service.ts` maintains a secondary JSON-based snapshot of critical tables (Users, Orgs, Subscriptions) in Firebase for rapid partial restoration.
- **Rolling History**: The system maintains a 30-day rolling history of snapshots, with automated pruning of older records.

### 2. Manual Restoration Protocol (Disaster Recovery)
In the event of database loss, follow these steps:
1.  Download the latest `.sql` snapshot from the **Google Drive Cloud Vault**.
2.  Install `postgresql-client` on your machine.
3.  Execute the restoration command:
    ```bash
    psql -h [your-db-host] -U [your-user] -d [your-dbname] -f latest-snapshot.sql
    ```
4.  Run `npx prisma generate` to re-synchronize the client.

### 3. Production Auto-Recovery (Domain Shield)
The frontend `api.ts` implements **Domain-Aware Detection**. If the app is deployed to a Custom Domain (e.g., Firebase or a private domain) and environment variables are missing, it automatically falls back to the production Render API.

---

## 🔗 Connectivity & Integration Engine
Nexus HRM v5.1.0 is built to serve as a central "Source of Truth" for other enterprise systems.

### ERP Integration Suite
The External API Gateway (`/api/erp/`) supports secure "Pull" requests from systems like SAP, Oracle, or Sage.
- **Authentication**: Requires the `X-Nexus-ERP-Key` header.
- **Endpoints**:
    - `/api/erp/employees.csv`: Full personnel sync.
    - `/api/erp/payroll.csv`: Post-certification payroll data.
    - `/api/erp/leave.csv`: Accrual and utilization records.

### Document Generator
A commercial-grade PDF engine (`pdf.service.ts`) produces:
- **Authorized Leave Certificates**: Secure documents for travel/compliance.
- **Achievement Certificates**: High-contrast reports for Target completions.
- **Performance Roadmaps**: Institutional dossiers showing growth trajectory.

---

## 📂 Dossier & History Architecture
The **Personnel Dossier** (`EmployeeProfile.tsx`) is the heart of the "Elite Edition." It merges several disparate data streams into a single high-density view:
- **Audit Table**: Real-time tracking of sensitive attribute changes (Bank details, Salary, Job Title).
- **Employment History**: Chronological log of disciplinary and commendation events.
- **History Overlay**: Direct integration of the Growth Tracer chart into the audit logs for simultaneous performance/conduct review.

---

## 🛠️ Developer Reference (Quick-Start)

### Required Environment Variables
| Variable | Scope | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Server | PostgreSQL Connection. |
| `GOOGLE_DRIVE_KEY_JSON` | Server | Service Account JSON for Cloud Vault. |
| `VITE_API_URL` | Client | Production API Endpoint. |
| `X_DEV_MASTER_KEY` | Global | System bypass for diagnostic support. |

### Safe Operations
- **System Purge**: The "Safe Reset" spares `MD` and `DEV` accounts.
- **Security Check**: `Rank 80+` is required for sensitive "Value-at-Risk" data (Salaries, SSN).

---
**Status: v5.1.0 Elite Edition Stable**
[API Service](https://nexus-hrm-api.onrender.com) | [Core Platform](https://nexus-hrm.web.app)
