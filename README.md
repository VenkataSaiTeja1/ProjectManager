# College Project Monitoring Portal (ProjectMonitor27)

A full-stack, production-ready portal designed for college **Project Coordinators (Admin)**, **Faculty Guides**, and **Student Teams**. Tracks daily development logs, automated late-submission detection, weekly review milestones, research paper publication stages, follow-up intervention calls, and multi-format Excel report generation.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Hosting Target |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router), Tailwind CSS, Recharts, React-Hot-Toast | **Vercel** |
| **Backend** | Node.js, Express REST API, Zod, ExcelJS, Helmet, CORS | **Render** (Web Service) |
| **Database** | PostgreSQL (with SSL Pool, connection retry logic) | **Aiven** |
| **Auth** | HTTP-Only SameSite Cookies + Next.js Proxy Rewrites (`/api/*`) | First-Party Domain Proxy |

---

## 📂 Repository Monorepo Structure

```
ProjectMonitor27/
├── backend/
│   ├── src/
│   │   ├── config/database.js        # Aiven PostgreSQL Pool with SSL & retry logic
│   │   ├── controllers/             # Express route controllers for all 14 modules
│   │   ├── middleware/              # JWT auth, role RBAC, first-login password enforcement, errorHandler
│   │   ├── migrations/              # 001_initial_schema.sql and migration runner
│   │   ├── routes/                  # Express REST routes
│   │   ├── services/emailService.js  # Email notifications & cron reminder triggers
│   │   ├── utils/                   # Helpers, audit log logger
│   │   ├── validators/schemas.js    # Strict Zod validation schemas
│   │   ├── app.js                   # Express application setup, security & route registration
│   │   ├── index.js                 # Server entrypoint with DB connection verification
│   │   └── seed.js                  # Initial admin and demo data seed script
│   ├── tests/                       # Jest & Supertest integration tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js 14 App Router pages (Admin, Faculty, Student)
│   │   │   ├── admin/               # Dashboard, daily-tracker, batches, users, teams, reviews, papers, etc.
│   │   │   ├── faculty/             # Dashboard, teams/[id], reviews
│   │   │   ├── student/             # Dashboard, daily-update, reviews, announcements, team
│   │   │   ├── login/
│   │   │   └── change-password/
│   │   ├── components/              # Layout, Sidebar, Navbar, NotificationBell, StatCard, Modals, Badges
│   │   ├── contexts/AuthContext.js  # Global session management
│   │   └── lib/api.js               # Centralized API client & Excel file downloader
│   ├── next.config.js               # Reverse proxy rewrites for /api/* to Render backend
│   ├── jsconfig.json                # Webpack alias mapping (@/*)
│   ├── tailwind.config.js
│   ├── .env.example
│   └── package.json
├── render.yaml                      # Infrastructure-as-code for Render deployment
├── vercel.json                      # Vercel deployment & rewrite configuration
└── README.md
```

---

## 🔐 Roles & Permission Matrix

| Role | Access Level |
|---|---|
| **ADMIN (Coordinator)** | Full access to all cohorts, users, teams, daily tracker, research papers, holidays, audit logs, and all 7 Excel exports. |
| **FACULTY (Guide)** | Scoped only to assigned project teams. Can view daily updates, submit guidance remarks on weekly reviews, and post comments. |
| **STUDENT (Team Lead)** | Can submit and edit daily status until midnight. Receives late flag if submitting after 8:00 PM cutoff. Views team, paper status, and acknowledges reviews. |
| **STUDENT (Member)** | Read-only view of their assigned team, daily updates, coordinator announcements, and weekly review checklist. |

---

## 🗄️ Database Setup (Aiven PostgreSQL)

1. **Create an Aiven PostgreSQL Database**:
   - Go to [Aiven Console](https://console.aiven.io/) and create a PostgreSQL service.
   - Note down the **Service URI** (e.g. `postgres://avnadmin:password@host:port/defaultdb?sslmode=require`).
2. **SSL Certificate**:
   - Aiven provides a `ca.pem` certificate in the overview dashboard.
   - For local development or quick setup, `ssl: { rejectUnauthorized: false }` is automatically used as fallback when `PG_CA_CERT` is not provided.
   - For production, set `PG_CA_CERT` to the contents of `ca.pem` or leave it empty to use standard SSL require mode.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```ini
DATABASE_URL=postgres://avnadmin:YOUR_PASSWORD@host:port/defaultdb?sslmode=require
PG_CA_CERT=
JWT_SECRET=super-secret-jwt-key-min-32-chars
FRONTEND_URL=http://localhost:3000,https://your-app.vercel.app
PORT=5000
NODE_ENV=development
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=Admin@123
DAILY_CUTOFF_TIME=20:00
TIMEZONE=Asia/Kolkata
SEED_DEMO=true
CRON_SECRET=your-cron-secret-key
EMAIL_ENABLED=false
```

### Frontend (`frontend/.env.local`)
```ini
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=/api
```

---

## 🚀 Local Development Setup

### 1. Database Migration & Seeding
From the `backend` folder:
```bash
cd backend
npm install
npm run migrate   # Applies 001_initial_schema.sql
npm run seed      # Creates default Admin and demo cohort/teams (when SEED_DEMO=true)
```

**Default Demo Credentials:**
- **Admin (Coordinator):** `admin@college.edu` / `Admin@123`
- **Faculty 1:** `ramesh@college.edu` / `Password@123`
- **Faculty 2:** `priya@college.edu` / `Password@123`
- **Student Lead (Team Alpha):** `arun@student.edu` / `Password@123`
- **Student Lead (Team Beta):** `deepika@student.edu` / `Password@123`

### 2. Start Backend Server
```bash
cd backend
npm run dev
# Server running at http://localhost:5000
# Health check available at http://localhost:5000/api/health
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:3000
```

---

## 🧪 Testing

Run backend tests for auth, access permissions, and daily tracker calculation:
```bash
cd backend
npm test
```

---

## ☁️ Deployment Guide

### A. Deploy Backend to Render (Web Service)

1. Push this repository to GitHub/GitLab.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint** and select `render.yaml`, OR click **New Web Service**:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Health Check Path:** `/api/health`
3. Configure Environment Variables in Render:
   - `DATABASE_URL` = Your Aiven connection string (with `?sslmode=require`)
   - `JWT_SECRET` = A strong 32+ character random secret
   - `FRONTEND_URL` = Your Vercel frontend URL (e.g. `https://your-project.vercel.app`)
   - `NODE_ENV` = `production`
   - `ADMIN_EMAIL` = `admin@college.edu`
   - `ADMIN_PASSWORD` = Your desired secure initial admin password
   - `DAILY_CUTOFF_TIME` = `20:00`
   - `TIMEZONE` = `Asia/Kolkata`
   - `SEED_DEMO` = `false` (or `true` if you want initial demo teams)
   - `CRON_SECRET` = A secret token for triggering reminders
4. In Render Shell, run migrations once:
   ```bash
   npm run migrate
   npm run seed
   ```

### B. Deploy Frontend to Vercel

1. In [Vercel Dashboard](https://vercel.com), click **Add New** -> **Project** and import this repository.
2. In Project Settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Edit and set to `frontend`
3. Add Environment Variables in Vercel:
   - `BACKEND_URL` = Your Render backend URL (e.g. `https://project-monitor-backend.onrender.com`)
   - `NEXT_PUBLIC_API_URL` = `/api`
4. Deploy! Next.js will automatically proxy all `/api/*` calls to your Render backend via `next.config.js` rewrites, ensuring cookies are first-party and immune to third-party cookie restrictions.

---

## 🔔 Scheduled Cron Reminders

To trigger automated reminder emails/notifications for teams with missing updates:
- Set up a cron job (Render Cron Service or external cron like cron-job.org) targeting:
  - **Method:** `POST`
  - **URL:** `https://your-backend.onrender.com/api/cron/remind-missing`
  - **Header:** `x-cron-secret: your-cron-secret-key`
  - **Schedule:** Everyday at 19:00 (7:00 PM) before the 8:00 PM cutoff.

---

## 📋 Post-Deployment Checklist

- [ ] Verify `/api/health` returns status 200 on Render backend.
- [ ] Log in with initial Admin credentials at your Vercel URL.
- [ ] Create an academic batch (e.g. "2027 Batch").
- [ ] Add faculty guides and student teams (or bulk import via Excel).
- [ ] Log in as a student team lead, verify daily update form, submit an update, and test the progress slider.
- [ ] Open the **Daily Tracker** as Admin and verify the submitted team appears in the Submitted table and pending teams in the Not Submitted table.
- [ ] Download Excel reports from `/admin/reports` and check headers and styling.
