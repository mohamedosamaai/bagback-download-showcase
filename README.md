<p align="center">
  <img src="https://raw.githubusercontent.com/mohamedosamaai/bagback-download-showcase/main/apps/web/public/apple-icon.png" alt="Bagback Download" width="100" />
</p>

<h1 align="center">Bagback Download</h1>

<p align="center">
  <strong>Enterprise-Grade Universal Media Download Manager</strong><br/>
  <sub>Monorepo · React 19 PWA · Express · TypeScript Strict · Docker · CI/CD</sub>
</p>

<p align="center">
  <a href="https://github.com/mohamedosamaai/bagback-download-showcase/actions/workflows/ci.yml">
    <img src="https://github.com/mohamedosamaai/bagback-download-showcase/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>
  <a href="https://github.com/mohamedosamaai/bagback-download-showcase/actions/workflows/codeql.yml">
    <img src="https://github.com/mohamedosamaai/bagback-download-showcase/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" />
  </a>
  <img src="https://img.shields.io/github/license/mohamedosamaai/bagback-download-showcase?style=flat-square&color=blue" alt="License MIT" />
  <img src="https://img.shields.io/github/v/release/mohamedosamaai/bagback-download-showcase?style=flat-square&color=violet" alt="Release" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
</p>

---

> **Public Showcase Repository** — This repository demonstrates the architecture, engineering standards, and UI of the Bagback Download platform. Business-critical logic runs in a hardened private core and is replaced here with type-safe mock interfaces.

---

## ⚡ Live Interactive Demo

> Try the full UI — URL analysis, format selection, download queue, real-time progress — **no backend required**.

<p align="center">
  <a href="https://mohamedosamaai.github.io/bagback-download-showcase?mock=true">
    <img src="https://img.shields.io/badge/▶%20Launch%20Live%20Demo-4F46E5?style=for-the-badge&logoColor=white" alt="Live Demo" height="40" />
  </a>
  &nbsp;
  <a href="https://github.com/mohamedosamaai/bagback-download-showcase/wiki">
    <img src="https://img.shields.io/badge/📚%20Read%20the%20Wiki-0F172A?style=for-the-badge" alt="Wiki" height="40" />
  </a>
</p>

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   bagback-download (Monorepo)                    │
│                                                                   │
│  ┌─────────────────────────┐   ┌───────────────────────────┐    │
│  │     apps/web (PWA)       │   │    apps/server (API)       │    │
│  │                          │   │                            │    │
│  │  src/                    │   │  src/                      │    │
│  │   app/         ← Router  │   │   routes/   ← REST + SSE  │    │
│  │   components/  ← UI      │   │   services/ ← Engine      │    │
│  │   lib/         ← Logic   │   │   jobs/     ← Queue       │    │
│  │   mocks/       ← Demo    │   │   middleware/← Rate limit  │    │
│  │   types/       ← Domain  │   │                            │    │
│  └──────────┬───────────────┘   └────────────┬──────────────┘    │
│             │                                │                    │
│             └──────────── HTTP / SSE ────────┘                    │
│                                                                   │
│  packages/              ← Shared utilities (types, constants)     │
│  docker-compose.yml     ← Single-command production deployment   │
└─────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
User pastes URL
     │
     ▼
[React PWA] ──── POST /api/analyze ────► [Express API]
     │                                        │
     │           ◄─── metadata JSON ──────────┘
     │
     ▼
User selects format + clicks Download
     │
     ▼
[React PWA] ──── POST /api/download ───► [Express API]
     │                                        │
     │                              [Job Queue - in-memory]
     │                                        │
     │           ◄─── SSE stream ─────────────┘
     │              (progress 0→100%)
     ▼
[Download complete] → File served via /api/download/:id/file
```

---

## 🎯 Engineering Highlights

| Concern | Solution | Why it matters |
|---------|----------|---------------|
| **Real-time Updates** | Server-Sent Events (SSE) — not WebSockets | Unidirectional, HTTP/1.1 compatible, no WS overhead |
| **Mock / Prod Parity** | `DownloadService` interface with `Real` + `Mock` implementations | Seamless toggle via env flag — zero code change required |
| **i18n / RTL** | `useTranslation()` hook + translation dictionary | Arabic UI renders correctly without manual CSS direction hacks |
| **Rate Limiting** | `express-rate-limit` per IP | Protects production from abuse without API gateway cost |
| **PWA** | `vite-plugin-pwa` with Workbox `GenerateSW` | Offline capability + installable on mobile with zero native code |
| **Container** | Multi-stage Dockerfile — Node 22 Alpine | < 180MB production image, Python + FFmpeg included |
| **Type Safety** | TypeScript `strict: true` across all workspaces | Catches 90%+ of runtime errors at compile time |

---

## 🔒 Security & Sanitization Model

This public showcase enforces a **Zero-Leak Architecture**:

- All business-critical logic, AI prompts, and proprietary algorithms reside in a **private core repository**
- Functions sanitized in this showcase are replaced with `// [Sanitized for Public Showcase]` typed stubs that return deterministic mock data
- No `.env` files, API keys, or tokens exist anywhere in this repository
- All environment variables are declared in [`.env.example`](.env.example)

---

## 🚀 Quickstart

```bash
# 1. Clone
git clone https://github.com/mohamedosamaai/bagback-download-showcase.git
cd bagback-download-showcase

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# → Edit .env with your values

# 4. Run (development)
npm run web:dev       # Frontend at http://localhost:5173
npm run server:dev    # Backend  at http://localhost:4000

# 5. Run (production)
docker compose up -d --build
```

### Mock Mode (no backend needed)
```bash
# Open browser at:
http://localhost:5173?mock=true
```

---

## 📁 Repository Structure

```
bagback-download-showcase/
├── apps/
│   ├── web/                    # React 19 PWA (Vite + TypeScript)
│   │   └── src/
│   │       ├── app/            # Root component & state
│   │       ├── components/     # layouts/ · features/ · ui/
│   │       ├── lib/            # api.ts · translations.ts
│   │       ├── mocks/          # Client-side mock engine
│   │       └── types/          # Domain entity types
│   └── server/                 # Express 5 API (TypeScript)
│       └── src/
│           └── index.ts        # Routes · SSE · Job queue
├── packages/                   # Shared workspace packages
├── .github/
│   ├── workflows/              # CI · CodeQL
│   ├── ISSUE_TEMPLATE/         # Bug report · Feature request
│   └── wiki/                   # Architecture documentation
├── tools/
│   └── showcase-generator.ps1  # Reusable sanitizer script
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 📊 Project Management

This project is managed using **GitHub Projects V2** with 8 specialized board views:

| Board | Purpose |
|-------|---------|
| 🗺️ Roadmap | Quarterly milestone planning |
| 📋 Kanban | Sprint execution (Todo → In Progress → Review → Done) |
| 📝 Backlog | Feature prioritization and grooming |
| 🚀 Releases | Version planning and changelog management |
| 🐛 Bug Tracker | Severity-triaged defect management |
| ⚡ Sprints | 2-week sprint tracking |
| 🏛️ Architecture | System design decisions and ADRs |
| 🔄 Retrospective | Team velocity and improvement tracking |

→ [View Project Board](https://github.com/mohamedosamaai/bagback-download-showcase/projects)

---

## 🤝 Contributing

Contributions to the showcase layer are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting a pull request.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Designed & architected by <strong>Mohamed Osama</strong><br/>
  <sub>Digital Transformation Architect · Founder @ Bagback Digital Solutions</sub><br/><br/>
  <a href="https://github.com/mohamedosamaai">GitHub</a> ·
  <a href="https://github.com/mohamedosamaai/bagback-download-showcase/wiki">Documentation</a> ·
  <a href="https://github.com/mohamedosamaai/bagback-download-showcase/issues">Report Bug</a>
</p>
