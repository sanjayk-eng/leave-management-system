# Leave Management System — Frontend

**A React + TypeScript single-page app for the Leave Management System, built with Vite and shadcn/ui.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Docker](#docker-setup) • [Contributing](#contributing)

</div>

---

> This repository contains the **frontend** only. The Go backend lives in a [separate repository].

## Overview

This is the frontend client for the **Leave Management System (LMS)** — a role-based dashboard for applying, reviewing, and approving leave requests. It's built as a Vite-powered React SPA styled with Tailwind CSS and shadcn/ui (Radix primitives), and communicates with the LMS backend over a REST API.

## Features

- 📊 **Role-aware dashboards** — different views and actions depending on the logged-in user's role (SuperAdmin, Admin, HR, Employee, Intern)
- 📝 **Leave request workflows** — apply, edit, cancel, withdraw, and track status through to approval/rejection
- 📅 **Leave & holiday calendars** — weekly/monthly views
- 📈 **Data tables & grids** — built on AG Grid for sortable, filterable record views (leave history, employee lists, reports)
- 📄 **PDF export** — leave reports generated client-side via `@react-pdf/renderer`
- 🎨 **Component library** — shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS
- ✅ **Form validation** — `react-hook-form` + `zod` schemas
- 🔔 **Toast notifications** — via `sonner`
- 🐳 **Containerized** — multi-stage Docker build, served by Nginx in production

## Tech Stack

| | |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build tool** | Vite 5 (with `@vitejs/plugin-react-swc`) |
| **Styling** | Tailwind CSS, `tailwindcss-animate` |
| **Components** | shadcn/ui (Radix UI primitives) |
| **Routing** | `react-router-dom` |
| **Data fetching** | `@tanstack/react-query` |
| **Forms & validation** | `react-hook-form`, `zod` |
| **Tables/grids** | `ag-grid-react` |
| **PDF generation** | `@react-pdf/renderer` |
| **Charts** | `recharts` |
| **Linting** | ESLint 9 (flat config) + `typescript-eslint` |
| **Containerization** | Docker (Node build stage → Nginx runtime stage) |

## Project Structure

```
.
├── public/                 # Static assets served as-is
├── src/
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React context providers (e.g. auth, theme)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                 # Shared utilities/config (e.g. API client setup)
│   ├── pages/                # Route-level page components
│   ├── pdf/                   # PDF report templates (@react-pdf/renderer)
│   ├── services/               # API call definitions (backend integration)
│   ├── styles/                  # Global styles
│   ├── types/                    # Shared TypeScript types
│   ├── utils/                     # Helper functions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env                        # Local environment variables (not committed)
├── .env.example                  # Environment variable template
├── components.json                # shadcn/ui configuration
├── docker-compose.yml               # Docker Compose configuration
├── Dockerfile                          # Multi-stage build (Node → Nginx)
├── nginx.conf                           # Nginx config template (port injected at runtime)
├── eslint.config.js
├── index.html
├── package.json
├── vite-env.d.ts
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm
- The LMS backend running and reachable (see the backend repository's README)

### 1. Clone & install

```bash
git clone https://github.com/Zenithive/LeaveManagementSystem-Frontend.git
cd LeaveManagementSystem-Frontend
npm ci
```

### 2. Configure environment

```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:8082/api
```

Set this to wherever the backend API is reachable. For local development against a Dockerized backend, this is typically `http://localhost:8082/api` (matching the backend's `APP_PORT`).

### 3. Run the dev server

```bash
npm run dev
```

Vite starts a local dev server with hot module reloading (default `http://localhost:5173`, unless configured otherwise).

### 4. Build for production

```bash
npm run build
```

Output is written to `dist/`. Preview the production build locally with:

```bash
npm run preview
```

### 5. Lint

```bash
npm run lint
```

## Docker Setup

The frontend ships with a multi-stage Dockerfile: a Node stage builds the static assets, and an Nginx stage serves them in production.

**docker-compose.yml**

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: http://localhost:8082/api
    image: leave-management-frontend:latest
    container_name: leave-management-frontend
    ports:
      - "8089:8089"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

> `VITE_API_BASE_URL` is a **build-time** argument, not a runtime environment variable — Vite bakes it into the static bundle when `npm run build` runs inside the Docker build stage. Changing it requires rebuilding the image, not just restarting the container.

**Build and run:**

```bash
docker compose up -d --build
```

**Common commands:**

| Command | Action |
|---|---|
| `docker compose up -d --build` | Build and start in the background |
| `docker compose down` | Stop the container |
| `docker logs -f leave-management-frontend` | Follow logs live |
| `docker exec -it leave-management-frontend sh` | Shell into the running container |

### How the Dockerfile works

1. **Builder stage** (`node:20-alpine`) — installs dependencies with `npm ci`, copies source, runs `npm run build` with `VITE_API_BASE_URL` baked in via build args.
2. **Production stage** (`nginx:alpine`) — copies the built `dist/` output (and `public/` assets) into Nginx's web root, and serves them.
3. **Port handling** — `nginx.conf` is copied as a *template*; Nginx's entrypoint runs `envsubst` on it at container start, substituting `${PORT}` (defaults to `8080`, overridden by platforms like Railway that inject `PORT` at runtime).
4. **Healthcheck** — the container checks `http://localhost:${PORT}/` every 30s to confirm Nginx is actually serving content.

## Testing

> Test suite is in progress. Once tests are added, the standard Vite/React convention applies:

```bash
npm run test
```

Recommended conventions going forward: component tests colocated with the component (`Button.test.tsx` next to `Button.tsx`), and API calls in `services/` mocked rather than hitting a real backend in unit tests.

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with clear, focused messages
4. Run `npm run lint` before pushing
5. Open a Pull Request describing what changed and why

For larger changes, please open an issue first to discuss the approach.

## License

MIT — see [LICENSE](./LICENSE).
