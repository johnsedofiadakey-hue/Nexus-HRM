# Nexus HRM — Render Deployment Guide

## Prerequisites
- Render account (render.com)
- Your PostgreSQL DATABASE_URL from Render (or Supabase/Neon)
- SMTP credentials for email (Brevo transactional SMTP — see [SMTP setup](#smtp-setup-brevo) below; a personal Gmail App Password works too but hits volume/deliverability limits faster)
- This codebase pushed to GitHub

---

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Nexus HRM v5 - Production Ready"
git remote add origin https://github.com/YOUR_USERNAME/nexus-hrm.git
git push -u origin main
```

---

## Step 2: Create PostgreSQL Database on Render

1. Render Dashboard → **New** → **PostgreSQL**
2. Name: `nexus-hrm-db`
3. Plan: Free (for testing) or Starter (production)
4. Copy the **Internal Database URL** — you'll need it in Step 3

---

## Step 3: Deploy Backend API

> ⚠️ **This repo ships a `render.yaml` Blueprint — use it instead of manually
> re-creating services below.** `render.yaml` is the actual source of truth for
> what's deployed today. Render Dashboard → **New** → **Blueprint** → point at
> this repo, and Render will read the settings below from `render.yaml`
> directly, so they can never drift out of sync with what this doc says again.
> The steps below are for reference / manual setup only.

1. Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `nexus-hrm-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install --no-audit --no-fund && npx prisma generate && npx tsc && npx prisma migrate deploy`
   - **Start Command**: `node --max-old-space-size=400 dist/app.js`
   - **Health Check Path**: `/api/health`

   > 🛑 **Never use `prisma db push --accept-data-loss` in a start command.**
   > It runs on *every single boot/restart* — not just the first deploy — and
   > will silently apply destructive schema changes (dropped columns, etc.)
   > without confirmation. Always use committed migrations
   > (`npx prisma migrate deploy`) in the **build** step instead, exactly as
   > `render.yaml` does. `migrate deploy` only ever applies migrations you've
   > already reviewed and committed to `server/prisma/migrations/` — it never
   > improvises a schema change against production.

4. Environment Variables (set in Render dashboard):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Render PostgreSQL Internal URL |
| `JWT_SECRET` | Click "Generate" in Render |
| `JWT_REFRESH_SECRET` | Click "Generate" in Render |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `FRONTEND_URL` | Your frontend URL (set after Step 4) |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Brevo SMTP login (looks like `xxxxxxxx@smtp-brevo.com`, not your account email — find it on Brevo's SMTP & API page) |
| `SMTP_PASS` | Your Brevo SMTP key (see below) |
| `EMAIL_FROM` | `"Your Company" <verified-sender@address>` — the code reads `EMAIL_FROM`, not `SMTP_FROM`; the sender address must be verified in Brevo (Senders, Domains & IPs → Senders) or every send is rejected |

### SMTP setup (Brevo)

Nexus HRM sends all email — notifications, password resets, email-change confirmations, welcome emails, payslips — through `nodemailer` configured from these four env vars (`server/src/services/email.service.ts`). The transporter is created once at server startup, so **any credential change requires a redeploy to take effect** — saving the env var in Render triggers that automatically.

**Generate/rotate the SMTP key:**
1. Brevo → **Settings → SMTP & API → SMTP tab** (not "API keys & MCP" — that's a separate, unrelated integration this project doesn't use).
2. **"Generate a new SMTP key"** → name it → copy the value using Brevo's own copy icon, not manual text selection.
3. Leave the "block unauthorized IPs" toggle on that page **off** — Render's outbound IP isn't static on the starter plan, so enabling it will silently break sending the moment Render rotates it.

**Apply it:**
1. Render dashboard → `nexus-hrm-api` → **Environment** → **Edit**.
2. Paste the new value into `SMTP_PASS` → **Save, rebuild, and deploy**. That save *is* the deploy; there's no separate step.
3. Confirm via Render's **Logs** tab: search `EmailService` after the next real send. These are two different failure modes with two different fixes — don't mix them up:
   - **A `535 Username and Password not accepted` error on our side** — SMTP authentication itself failed. This always means `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` don't actually match each other (this has happened before, specifically as `SMTP_HOST`/`SMTP_USER` silently drifting back to the old Gmail values while only `SMTP_PASS` got rotated — always verify all three together, not just the key you just changed). Authentication happens before the server ever sends the message, so this can *never* be caused by an unverified sender — don't waste time checking Brevo's Senders page for this one.
   - **No error at all on our side, but nothing shows up in Brevo's Transactional → Logs page** — authentication succeeded, but Brevo silently rejected the send, almost always because the address in `EMAIL_FROM` isn't a verified sender (Brevo → Senders, Domains & IPs → Senders). Check Brevo's own logs, not ours, to tell these two apart.

---

## Step 4: Deploy Frontend

1. Render Dashboard → **New** → **Static Site**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `nexus-hrm-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://nexus-hrm-api.onrender.com/api` |

5. Under **Redirects/Rewrites**, add:
   - Source: `/*` → Destination: `/index.html` → Type: **Rewrite**

---

## Step 5: Run First-Time Setup

After your backend deploys successfully, run the setup script to create all default accounts:

```bash
# SSH into Render shell, or run locally with production DATABASE_URL:
DATABASE_URL="your-postgres-url" npx ts-node src/scripts/setup.ts
```

Or add it as a one-time job in Render → **Jobs** → **One-Off Job**.

---

## Step 6: Update FRONTEND_URL

Once your frontend URL is known (e.g. `https://nexus-hrm-client.onrender.com`):
1. Go to your **API service** in Render
2. Update `FRONTEND_URL` environment variable
3. Redeploy

---

## Default Login Accounts

| Role | Email | Password |
|---|---|---|
| DEV | dev@nexus-system.com | DevMaster@2025! |
| MD | md@nexus.com | MD@Nexus2025! |
| Director | director@nexus.com | Director@Nexus2025! |
| Manager | manager@nexus.com | Manager@Nexus2025! |
| Team Lead | mid@nexus.com | Mid@Nexus2025! |
| Staff | staff@nexus.com | Staff@Nexus2025! |
| Casual | casual@nexus.com | Casual@Nexus2025! |

> ⚠️ **Change all passwords immediately after first login.**

---

## Production Checklist

- [ ] PostgreSQL database created and URL set
- [ ] JWT_SECRET set (minimum 64 chars)
- [ ] SMTP configured and tested
- [ ] FRONTEND_URL set to deployed frontend
- [ ] Setup script run (default accounts created)
- [ ] Passwords changed on all default accounts
- [ ] Custom domain configured (optional)

---

## Monitoring

- Health check: `GET /api/health`
- Logs: Render Dashboard → Your API service → **Logs**
- Database: Render PostgreSQL Dashboard

## Local Development

```bash
# Install all dependencies
npm run install:all   # from root, or:
cd server && npm install
cd client && npm install

# Setup database
cd server
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# Run migrations
npx prisma migrate dev

# Create accounts
npx ts-node src/scripts/setup.ts

# Start dev servers
cd ..
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:5000/api
