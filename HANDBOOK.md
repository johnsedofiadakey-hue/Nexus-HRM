# Nexus HRM Project Handbook & Logic Guide

Welcome to the **Nexus HRM Handbook**. This document serves as the master source of truth for the platform's architecture, business logic, and operational protocols. It is designed to guide administrators, developers, and the leadership team in maintaining and upgrading the system.

---

## 🏗️ 1. System Architecture

Nexus HRM is built on a **Modern SaaS Stack** optimized for security and performance.

*   **Frontend**: React (Vite) + Tailwind CSS + Framer Motion (for premium animations).
*   **Backend**: Node.js + Express + Prisma (ORM).
*   **Database**: PostgreSQL (Production) / SQLite (Dev).
*   **Infrastructure**: 
    *   **Hosting**: Firebase Hosting (Frontend).
    *   **API**: Render.com (Backend).
    *   **Backups**: Google Drive Cloud Vault + Firebase Redundancy.

---

## 🔒 2. Governance & Security Model

The system uses a **Rank-Based Hierarchy (0-100)** to enforce permissions and visibility.

### Role & Rank Map
| Role | Rank | Description |
|------|------|-------------|
| **MD** | 90 | Full institutional oversight. Can bypass standard guards. |
| **Director / HR** | 85 | Departmental sign-offs and payroll certification. |
| **Manager** | 70 | Performance review initiation and team management. |
| **Supervisor** | 60 | First-line approvals and relief handling. |
| **Staff** | 50 | Standard employee access (Leave, KPIs, Personal Profile). |

### Password & Security Protocol
- **Strength Rules**: Passwords require **8+ characters**, **1 Number**, and **1 Special Character** (e.g. `!@#._`).
- **Signature Auth**: Sensitive actions (Appraisal sign-offs, Target acknowledgments) require a **Digital Wet-Signature** registered in the user profile.

---

## ⚙️ 3. Core Business Logics

### 📅 A. Leave Management (The Flow)
1.  **Request**: Employee selects dates and provides a reason.
2.  **Relief**: The request is first sent to a **Reliever** for acknowledgment.
3.  **Approval**: Once relieved, it moves to the **Manager/Director** for final certification.
4.  **Action Center**: Administrators can see the `startDate`, `endDate`, and `reason` directly in their inbox before approving (the "Read-First" flow).

### 📈 B. Performance Appraisal (The Cycle)
The system uses a 3-stage process to ensure fair calibration:
1.  **Self-Review**: Employee evaluates themselves.
2.  **Manager-Review**: Manager evaluates the employee (Staff assessment is hidden until this starts).
3.  **Arbitration**: If scores differ, the MD or HR provides the **Final Verdict** and **Arbitrated Score**.

### 🎯 C. Target (KPI) Cascading
- **Strategy to Execution**: Targets are created at the top and cascaded down.
- **Acknowledgments**: When a target is assigned, it appears in the employee's **Inbox** for digital acknowledgment.

---

## 📥 4. The Action Center (Inbox)

The **Action Center** is a specialized high-density interface for decision-makers.
- **Location**: Top-right bell icon or Sidebar > "Inbox".
- **Metadata Handling**: Unlike standard notifications, Action Center items contain embedded logic (e.g., Leave durations) so decisions can be made without leaving the page.
- **Routing**: Each item links directly to its execution context (e.g., Redirecting to an Appraisal Sign-off).

---

## 🚢 5. Operational Guide for Upgrades

### Database Updates
When changing the schema:
1. Update `prisma/schema.prisma`.
2. Run `npx prisma migrate dev` (locally).
3. Push changes; Render will automatically apply `prisma migrate deploy`.

### Manual Deployments
- **Frontend**: `cd client && npm run build && npx firebase-tools deploy --only hosting`
- **Backend**: Auto-deploys via GitHub push to `main` branch.

### Future Roadmap Suggestions
- **AI Integration**: The "Sparkle" buttons are designed to trigger AI calibration summaries.
- **Webhooks**: Use the `erp` route pattern for integrating with external finance systems.

---

**Status**: Verified stable (v5.1.0)
**Support**: System Developer (Rank 100)
