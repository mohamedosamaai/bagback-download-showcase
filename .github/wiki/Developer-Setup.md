# Developer Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v22+ | Runtime for both frontend and backend |
| npm | v10+ | Package management (workspaces) |
| Git | v2.40+ | Version control |
| Docker | v24+ | Optional — containerized deployment |

---

## 1. Clone the Repository

```bash
git clone https://github.com/mohamedosamaai/bagback-download-showcase.git
cd bagback-download-showcase
```

---

## 2. Install Dependencies

This is an **npm workspaces** monorepo. One install at the root handles all workspaces:

```bash
npm install
```

This installs dependencies for:
- Root workspace (shared tooling)
- `apps/web` (React PWA)
- `apps/server` (Express API)

---

## 3. Environment Configuration

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Download Settings
DOWNLOAD_DIR=/tmp/bagback-downloads

# Frontend Configuration
VITE_API_URL=http://localhost:4000
VITE_USE_MOCKS=false
```

> See [`.env.example`](../.env.example) for the full list of variables.

---

## 4. Run Development Servers

### Frontend (React PWA)

```bash
npm run web:dev
```

Opens at `http://localhost:5173` with hot module replacement.

### Backend (Express API)

```bash
npm run server:dev
```

Starts at `http://localhost:4000`.

> **Tip:** Run both in separate terminal windows, or use a tool like `tmux` or `concurrently`.

---

## 5. Mock Mode (No Backend Required)

Open the frontend at:

```
http://localhost:5173?mock=true
```

Or set in `.env`:

```env
VITE_USE_MOCKS=true
```

The PWA will switch to the `MockDownloadService` automatically — no backend process needed.

---

## 6. Production Build

```bash
# Build all workspaces
npm run build

# Output locations:
# apps/web/dist/       ← Static frontend files
# apps/server/dist/    ← Compiled Express server
```

---

## 7. Docker Deployment (Recommended for Production)

```bash
docker compose up -d --build
```

This builds a multi-stage Docker image that:
1. Compiles TypeScript for both workspaces
2. Bundles the Vite frontend
3. Packages Node 22 Alpine + the compiled server
4. Serves frontend static files from Express

**Access:** `http://localhost:4000`

### Docker environment

Override environment variables for Docker:

```bash
docker compose up -d --build \
  -e PORT=4000 \
  -e DOWNLOAD_DIR=/tmp/downloads \
  -e NODE_ENV=production
```

---

## 8. Running Type Checks

```bash
# Check both workspaces
cd apps/web && npx tsc --noEmit
cd apps/server && npx tsc --noEmit
```

---

## 9. CI/CD Overview

Every push to `main` triggers the GitHub Actions pipeline:

```yaml
Jobs:
  1. install      → npm ci (cached)
  2. type-check   → tsc --noEmit (both workspaces)
  3. lint         → eslint (both workspaces)
  4. build        → npm run build
  5. codeql       → GitHub CodeQL security scan
```

The CI badge in the README reflects the live status of this pipeline.

---

## Common Issues

### `DOWNLOAD_DIR` does not exist

```bash
mkdir -p /tmp/bagback-downloads
```

### Port already in use

```bash
# Find process using port 4000
lsof -i :4000
kill -9 <PID>
```

### TypeScript errors after adding new file

```bash
npm run build  # Runs tsc before vite build
```
