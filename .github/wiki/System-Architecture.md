# System Architecture

## C4 Model — Context Level

```mermaid
C4Context
  title System Context — Bagback Download Platform

  Person(user, "End User", "Pastes a media URL and downloads a file")
  System(bagback, "Bagback Download", "Universal media download manager with real-time progress tracking")
  System_Ext(media, "Media Platforms", "YouTube, TikTok, Instagram, X/Twitter, etc.")
  System_Ext(storage, "Local Filesystem", "Temporary download cache — auto-wiped after delivery")

  Rel(user, bagback, "Submits URL, selects format, tracks progress", "HTTPS / SSE")
  Rel(bagback, media, "Fetches metadata + streams media content", "HTTPS")
  Rel(bagback, storage, "Writes temporary file, serves it, then deletes", "Filesystem I/O")
```

---

## C4 Model — Container Level

```mermaid
C4Container
  title Container Diagram — Bagback Download

  Person(user, "End User")

  Container_Boundary(mono, "Monorepo: bagback-download") {
    Container(web, "Web PWA", "React 19, Vite, TypeScript", "Progressive Web App served as static files. Supports offline via Service Worker.")
    Container(api, "API Server", "Node.js, Express 5, TypeScript", "Handles URL analysis, job queueing, file serving, and real-time SSE streams.")
    ContainerDb(jobstore, "In-Memory Job Store", "Map<string, Job>", "Holds active download job state. Evicted after TTL.")
    ContainerDb(filesystem, "Download Cache", "Local filesystem (DOWNLOAD_DIR)", "Temporary media files. Deleted after successful client download.")
  }

  Rel(user, web, "Uses browser", "HTTPS")
  Rel(web, api, "Analyzes URL / starts download", "REST API")
  Rel(web, api, "Subscribes to job updates", "Server-Sent Events")
  Rel(api, jobstore, "Reads/writes job state")
  Rel(api, filesystem, "Writes/reads/deletes media files")
```

---

## Monorepo Structure

```
bagback-download-showcase/
│
├── apps/
│   ├── web/                         ← Frontend application workspace
│   │   ├── src/
│   │   │   ├── app/App.tsx          ← Root component (state orchestrator)
│   │   │   ├── components/
│   │   │   │   ├── layouts/         ← Header, Footer
│   │   │   │   ├── features/        ← JobCard, AnalyzeResultCard
│   │   │   │   └── ui/              ← Icons, InfoModal, DropboxSaver
│   │   │   ├── lib/
│   │   │   │   ├── api.ts           ← DownloadService interface + Real/Mock impls
│   │   │   │   └── translations.ts  ← EN/AR dictionary + useTranslation hook
│   │   │   ├── mocks/
│   │   │   │   └── handlers.ts      ← Mock metadata generator (by platform)
│   │   │   └── types/
│   │   │       └── index.ts         ← Domain entity types (Job, Lang, etc.)
│   │   ├── public/                  ← Static assets, PWA icons, sitemap
│   │   └── vite.config.ts
│   │
│   └── server/                      ← Backend API workspace
│       └── src/
│           └── index.ts             ← Express routes, SSE, job queue, mocks
│
├── packages/                        ← Shared workspace packages (types, utils)
├── tools/
│   └── showcase-generator.ps1       ← Reusable repo sanitizer script
├── .github/
│   ├── workflows/                   ← CI/CD pipelines
│   ├── ISSUE_TEMPLATE/              ← Bug + Feature YAML forms
│   ├── CODEOWNERS                   ← Code ownership rules
│   └── wiki/                        ← This documentation
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | React 19 + Vite | Fast HMR, RSC-ready, PWA via `vite-plugin-pwa` |
| Backend framework | Express 5 | Minimal, battle-tested, async-native in v5 |
| Language | TypeScript `strict: true` | Catches 90%+ runtime errors at compile time |
| Real-time protocol | Server-Sent Events (SSE) | Simpler than WebSockets for unidirectional server→client push |
| State management | `useState` + SSE subscription | No Redux overhead needed for this data shape |
| i18n | Custom `useTranslation()` hook | Zero dependency, RTL/LTR via `document.dir` |
| Containerization | Multi-stage Alpine Dockerfile | < 180MB image with Node 22 + Python + FFmpeg |
| Rate limiting | `express-rate-limit` per IP | Cost-free protection without API gateway |
