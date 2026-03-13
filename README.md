# Nexus HRM — Production-Grade Human Resource Management System

A full-stack HRM platform with **role-based dashboards**, multi-tenancy, payroll, KPI management, leave, attendance, and more.

---

## 🏗️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend    | Node.js, Express, TypeScript        |
| Database   | SQLite (dev) / PostgreSQL (prod)    |
| ORM        | Prisma                              |
| Auth       | JWT (15min) + Refresh Token (7 day) |
| Charts     | Recharts                            |
| Realtime   | WebSocket (ws)                      |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Install dependencies
```bash
# Root
npm install

# Server
cd server && npm install

# Client  
cd ../client && npm install
```

### 2. Configure environment
```bash
# Server
cd server
cp .env.example .env
# Edit .env — set JWT_SECRET to a long random string
```

### 3. Set up the database
```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

### 4. Run
```bash
# From project root (runs both server + client)
npm run dev

# Or separately:
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend: http://localhost:3000  
Backend API: http://localhost:5000/api

---

## 🔑 Demo Credentials

All seeded accounts use the same system. Log in at the main `/` route.

| Role           | Email                      | Password               | Access Level |
|----------------|----------------------------|------------------------|--------------|
| **DEV**        | dev@nexus-system.com       | DevMaster@2025!        | Full System  |
| **MD**         | md@nexus.com               | MD@Nexus2025!          | Org-wide     |
| **Director**   | director@nexus.com         | Director@Nexus2025!    | Dept-wide    |
| **Manager**    | manager@nexus.com          | Manager@Nexus2025!     | Team         |
| **Team Lead**  | mid@nexus.com              | Mid@Nexus2025!         | Sub-team     |
| **Staff**      | staff@nexus.com            | Staff@Nexus2025!       | Personal     |
| **Casual**     | casual@nexus.com           | Casual@Nexus2025!      | Self-service |

> Each role sees a **different dashboard** with data and tools scoped to their access level.

---

## 🎭 Role Architecture

```
DEV  (100) — System developer. Full access + dev portal.
 └─ MD (90) — Managing Director. All org data, payroll approval, announcements.
     └─ DIRECTOR (80) — Dept-level oversight, appraisal initiation, headcount.
         └─ MANAGER (70) — Team KPIs, leave approval, performance reviews.
             └─ MID_MANAGER (60) — Team targets, sub-team ops.
                 └─ STAFF (50) — Personal performance, leave requests, payslips.
                     └─ CASUAL (40) — Attendance, self-service only.
```

### What each role can see:

| Feature              | DEV | MD | DIR | MGR | MID | STAFF | CASUAL |
|----------------------|-----|----|-----|-----|-----|-------|--------|
| All Employee Data    | ✅  | ✅ | ✅  | ❌  | ❌  | ❌    | ❌     |
| Payroll Engine       | ✅  | ✅ | ❌  | ❌  | ❌  | ❌    | ❌     |
| Announcements (post) | ✅  | ✅ | ✅  | ❌  | ❌  | ❌    | ❌     |
| Dept Management      | ✅  | ✅ | ✅  | ❌  | ❌  | ❌    | ❌     |
| Audit Logs           | ✅  | ✅ | ❌  | ❌  | ❌  | ❌    | ❌     |
| Team Targets (set)   | ✅  | ✅ | ✅  | ✅  | ✅  | ❌    | ❌     |
| Appraisals (manage)  | ✅  | ✅ | ✅  | ✅  | ✅  | ❌    | ❌     |
| Leave Request        | ✅  | ✅ | ✅  | ✅  | ✅  | ✅    | ✅     |
| Attendance           | ✅  | ✅ | ✅  | ✅  | ✅  | ✅    | ✅     |

---

## 📁 Project Structure

```
nexus-hrm/
├── client/                    # React frontend
│   └── src/
│       ├── pages/
│       │   ├── dashboards/    # Role-specific dashboards (MD, Director, Manager…)
│       │   ├── Login.tsx
│       │   └── …
│       ├── components/
│       │   └── layout/
│       │       ├── Sidebar.tsx       # Role-gated navigation
│       │       ├── TopHeader.tsx     # User name + title display
│       │       └── DashboardRouter.tsx  # Routes to correct dashboard by rank
│       ├── utils/session.ts   # getStoredUser, getRankFromRole
│       └── services/api.ts    # Axios instance with JWT interceptors
│
└── server/                    # Express backend
    ├── prisma/
    │   ├── schema.prisma      # Full DB schema
    │   └── seed.ts            # Demo data for all 7 roles
    └── src/
        ├── controllers/       # Business logic per module
        ├── routes/            # Express routes with auth guards
        ├── middleware/
        │   └── auth.middleware.ts  # authenticate + requireRole(rank)
        └── services/          # Email, payroll, leave balance…
```

---

## 🐛 Bugs Fixed in This Version

1. **Dashboard Routing Bug** — All users were seeing the Staff (rank-50) dashboard regardless of role. Root cause: `rank` was not included in the login API response, so `user.rank` was always `undefined` (defaulting to 50). Fixed by including `rank` in the login response AND deriving it live from `role` in the client via `getRankFromRole()`.

2. **User Name/Title Not Displayed** — Dashboards showed hardcoded placeholder text. Fixed: every dashboard now reads `user.name`, `user.jobTitle`, and `user.role` from session and displays them in the page header.

3. **Seed FK Constraint Crash** — `saasSubscription`, `refreshToken`, and `loginSecurityEvent` tables were not cleared before `user` deletion. Fixed with correct deleteMany order.

4. **DEV Redirect Path Wrong** — Login sent DEV users to `/dev` which has no route. Fixed to `/dev/dashboard`.

5. **Sidebar Logo Commented Out** — The company logo code was disabled. Fixed and wired to ThemeContext settings.

6. **Refresh Token Missing Fields** — Token refresh response did not return `jobTitle` or `rank`, causing role/UI to reset after token refresh. Fixed.

---

## 🔒 Security Notes

- JWT access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days** and are stored hashed in DB
- All sensitive routes protected with `authenticate` + `requireRole(rank)`
- Salary data only visible to rank ≥ 80 (Director+)
- Login events (success + failure) logged to `LoginSecurityEvent`
- Rate limiting on auth endpoints

---

## 🌍 Deployment (Render/Railway/VPS)

1. Set `NODE_ENV=production` in server env
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Run `npx prisma migrate deploy` on first deploy
4. Set `VITE_API_URL` in client env to your production API URL
5. Build client: `cd client && npm run build` → serve `dist/` as static files

