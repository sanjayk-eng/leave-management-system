# Leave Management System

A full-stack, role-based leave management platform built for organizations that need structured approval workflows, configurable leave policies, and automated notifications — all in one place.

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)

---

## What is this?

The Leave Management System (LMS) is an open-source HR tool that replaces leave tracking in spreadsheets and chat threads with a single source of truth. Every leave request follows a defined approval chain, every policy has its own configured rules, and every status change is logged end-to-end — with email and Slack notifications so teams don't have to check the system manually.

**It was built for organizations that have:**
- Multiple roles (SuperAdmin, Admin, HR, Manager, Employee, Intern)
- More than one layer of approval before leave is granted
- A need for audit history, leave balance tracking, and reporting

---

## Who built it?

This project was developed by **[Zenithive Pvt. Ltd.](https://www.zenithive.com)**, a technology consulting and product engineering company based in Ahmedabad, India. Zenithive specialises in AI, Data Science, Full-Stack Development, UI/UX Design, and DevOps — acting as an engineering partner for startups, SMBs, and enterprises that need scalable digital solutions built with speed and clarity.

The Leave Management System was built as an internal tool to manage HR operations and was later open-sourced for the broader community.

Contributions from the community are welcome — see [Contributing](#contributing).

---

## Features

| Area | What it does |
|---|---|
| **Role-based access** | SuperAdmin, Admin, HR, Manager, Employee, Intern — each with scoped permissions |
| **Leave workflows** | Apply, edit, cancel, withdraw; multi-stage configurable approval chains |
| **Leave policies** | Paid, unpaid, early leave, WFH — per-role entitlements, yearly accrual |
| **Approval flows** | Configurable per policy: who approves at each stage and in what order |
| **Leave balances** | Tracked per employee per year; manual adjustments with reason audit trail |
| **Holiday calendar** | Org-wide holidays managed by admins; leave calendar views |
| **Payroll** | Salary-based payslip generation with deductions for unpaid leave |
| **Asset management** | Assign and track equipment per employee |
| **Reports** | Monthly and yearly leave reports, exportable as PDF |
| **Notifications** | Email on leave events (apply, approve, reject); Slack daily summary and birthday announcements |
| **Audit logs** | System-wide action history for compliance |

---

## Tech Stack

### Backend
| | |
|---|---|
| Language | Go 1.25 |
| Framework | Gin |
| Database | PostgreSQL 16 via `sqlx` |
| Migrations | Goose |
| Auth | JWT + bcrypt |
| Email | Resend HTTP API |
| Notifications | Slack Incoming Webhooks |
| Containerization | Docker + Docker Compose |

### Frontend
| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS + shadcn/ui (Radix UI) |
| Data fetching | TanStack Query v5 |
| Routing | React Router v6 |
| Tables | AG Grid |
| Forms | react-hook-form + zod |
| PDF export | @react-pdf/renderer |
| Containerization | Docker (Node build → Nginx runtime) |

---

## Repository Structure

```
leave-management-system/
├── backend/           # Go REST API
│   ├── cmd/
│   │   ├── server/    # Application entrypoint
│   │   └── seed/      # Demo account seeder
│   ├── internal/      # Handlers, services, repositories, models
│   ├── middleware/    # JWT auth, RBAC, CORS
│   ├── migration/     # Goose migration files
│   ├── pkg/           # Notifications, security, shared utilities
│   ├── routes/        # Route registration
│   ├── .env.example   # Backend environment variable template
│   └── README.md      # Backend-specific documentation
│
├── frontend/          # React + TypeScript SPA
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── .env.example   # Frontend environment variable template
│   └── README.md      # Frontend-specific documentation
│
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
└── README.md          # This file
```

---

## Getting Started

Both services have their own setup guides with full details — see the README in each directory. The short version:

### Backend

```bash
cd backend
cp .env.example .env        # fill in DB_URL, SECRET_KEY, RESEND_API_KEY, etc.
go mod tidy
go run cmd/server/main.go   # starts on port 8082 by default
```

### Frontend

```bash
cd frontend
cp .env.example .env        # set VITE_API_BASE_URL=http://localhost:8082/api
npm install
npm run dev                  # starts on http://localhost:5173
```

### Docker (both services)

Each service ships with its own `docker-compose.yml`. Run them independently or adapt them into a single compose file for your deployment.

```bash
# Backend
cd backend && docker compose up -d --build

# Frontend
cd frontend && docker compose up -d --build
```

---

## Environment Variables

| File | Purpose |
|---|---|
| `backend/.env.example` | All backend config: database, JWT secret, email, Slack, CORS, cron |
| `frontend/.env.example` | Frontend config: `VITE_API_BASE_URL` pointing at the backend |

Never commit real `.env` files. Use the `.example` templates as the source of truth.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

For security vulnerabilities, see [SECURITY.md](./SECURITY.md) — do not open a public issue.

---

## License

Copyright 2024 Leave Management System Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

See the full license text in [LICENSE](./LICENSE).
