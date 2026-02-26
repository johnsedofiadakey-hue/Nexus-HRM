# 🚀 Nexus HRM v2.0 — Enterprise Edition

A full-stack Human Resource Management system built with **React + TypeScript + Node.js + Prisma + PostgreSQL**.

## ✨ Features

### Core HR
- 👥 Employee Management (profiles, documents, history, risk scoring)
- 🏢 Department Management with hierarchy
- 🌳 Interactive Org Chart (tree + list views)
- 📋 Role-Based Access Control (MD, HR Admin, Supervisor, Employee)

### Performance
- 🎯 KPI Management (assign, track, review, score)
- 📊 Appraisal Cycles (self-review → manager review → finalization)
- 📈 Performance dashboards with real-time charts

### Leave Management
- 📅 Leave requests with reliever workflow
- ✅ Weekend-aware working day calculation
- 🏖️ Leave balance accrual (monthly cron job)
- 📆 Holiday Calendar (Ghana public holidays included)

### Payroll
- 💰 Automated payroll runs with Ghana PAYE tax + SSNIT
- 📄 PDF payslip generation per employee
- 📊 CSV export for accounting software
- ✉️ Automatic payslip email notification on approval

### Notifications (Real-time)
- 🔌 WebSocket server for live push notifications
- 🔔 In-app notification bell with badge count
- 🍞 Toast notifications for real-time events
- ✉️ Automated email notifications (welcome, leave, payslip, appraisal)

### Onboarding
- ✅ Customizable onboarding templates
- 📋 Task checklists by category (HR, IT, Admin, Manager)
- 📊 Progress tracking per employee

### Training
- 🎓 Training program management
- 📝 Employee enrollment tracking
- 🏆 Completion certificates and scores
- 📊 CSV export of training data

### Admin
- 🎨 7 built-in theme presets + custom color picker
- 📧 SMTP email configuration (Gmail, SendGrid, Resend)
- 🔒 Maintenance mode with cache
- 📋 Audit trail (paginated, JSON details)
- 📤 Data exports (Employee CSV/PDF, Leave CSV, Performance CSV)
- 👤 Account creation policy control (MD/HR Admin/Both)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Custom CSS Variables |
| Charts | Recharts |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (8h access tokens) |
| Real-time | WebSockets (ws library) |
| Email | Nodemailer (SMTP) |
| PDF | PDFKit |
| Scheduler | node-cron |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env with your database URL and JWT_SECRET
npm install
npx prisma migrate dev
npx prisma db seed  # Optional: seed sample data
npm run dev
```

### Frontend Setup
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

### Environment Variables (Required)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32-char random string |
| `PORT` | Server port (default 5000) |

## 📚 API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `POST /api/auth/change-password` — Change password
- `POST /api/auth/forgot-password` — Request reset
- `POST /api/auth/reset-password` — Reset with token

### New in v2.0
- `GET /api/notifications` — Get notifications
- `POST /api/notifications/mark-read` — Mark as read
- `GET /api/payroll` — List payroll runs
- `POST /api/payroll/run` — Create payroll run
- `POST /api/payroll/:id/approve` — Approve + send payslips
- `GET /api/payroll/payslip/:runId/:empId/pdf` — Download PDF
- `GET /api/onboarding/my` — My onboarding tasks
- `POST /api/onboarding/start` — Start employee onboarding
- `GET /api/training` — Training programs
- `POST /api/training/enroll` — Enroll in training
- `GET /api/holidays` — Public holidays
- `POST /api/holidays/seed-ghana` — Seed Ghana 2025 holidays
- `GET /api/orgchart` — Org chart data
- `GET /api/export/employees/csv` — Export employees CSV
- `GET /api/export/employees/pdf` — Export employees PDF
- `GET /api/export/leave/csv` — Export leave report
- `GET /api/export/performance/csv` — Export performance report

### WebSocket
Connect to `ws://localhost:5000/ws?token=YOUR_JWT_TOKEN`

Events received:
- `NOTIFICATION` — New notification object
- `PENDING_NOTIFICATIONS` — Array of unread notifications on connect

## 🔐 Default Roles

| Role | Capabilities |
|------|-------------|
| `MD` | Full access, payroll approval, account creation policy |
| `HR_ADMIN` | Employee CRUD, payroll runs, onboarding, exports |
| `SUPERVISOR` | Team review, leave approval, KPI assignment |
| `EMPLOYEE` | Self-service: KPIs, leave, appraisals, training, payslips |

## 📦 Deployment

### Recommended Stack
- **Frontend**: Vercel / Netlify
- **Backend**: Railway / Render / DigitalOcean
- **Database**: Supabase / Neon / AWS RDS
- **Email**: SendGrid / Resend / AWS SES

### Production Checklist
- [ ] Set `JWT_SECRET` to a 64-char random string
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your frontend domain
- [ ] Set `API_BASE_URL` for avatar uploads
- [ ] Configure SMTP for email notifications
- [ ] Run `npx prisma migrate deploy` (not dev)
- [ ] Seed Ghana holidays: `POST /api/holidays/seed-ghana`
