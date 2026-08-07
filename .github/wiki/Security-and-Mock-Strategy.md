# Security & Mock Strategy

## The Zero-Leak Architecture Guarantee

Bagback Download operates under a strict **dual-repository model**:

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│   Private Core Repository   │      │  Public Showcase Repository  │
│   (Access: Owner only)      │      │  (Access: Public)            │
│                             │      │                              │
│  ✅ Real download engine    │      │  ✅ Full UI source code      │
│  ✅ Proxy rotation logic    │      │  ✅ Architecture docs        │
│  ✅ Rate bypass strategies  │      │  ✅ Type-safe mock layer     │
│  ✅ Production API keys     │      │  ✅ CI/CD pipelines          │
│  ✅ Database credentials    │      │  ✅ .env.example             │
│  🚫 Never public            │      │  🚫 Zero secrets             │
└─────────────────────────────┘      └──────────────────────────────┘
```

---

## What Gets Sanitized

Every file that crosses from the private core to the public showcase passes through a sanitization filter:

### Sanitization Rules

| File Type | Rule |
|-----------|------|
| `.env` files | **NEVER copied** — only `.env.example` with placeholder values |
| API keys / tokens | Regex-scanned and rejected if any pattern matches |
| Business logic functions | Body replaced with typed mock return + sanitization comment |
| AI prompts / system instructions | Replaced with generic placeholder string |
| Database schemas with real data | Replaced with example seed data |
| External service URLs (private) | Replaced with localhost or example.com |

### Sanitization Marker

Every sanitized function in this codebase is marked with:

```typescript
// [Sanitized for Public Showcase - Original Logic Internal]
```

This marker is:
- **Searchable** — you can grep for it to find all sanitized locations
- **Honest** — it tells reviewers that real logic exists without revealing it
- **Professional** — common practice in open-core and dual-license projects

---

## The Mock Layer Design

### Interface Contract

The mock layer implements the same `DownloadService` interface as the real backend:

```typescript
// src/lib/api.ts

export interface DownloadService {
  analyze(url: string): Promise<MediaInfo>;
  download(url: string, format: string, audioOnly: boolean): Promise<{ id: string }>;
  streamJobs(callback: (jobs: Job[]) => void): () => void;
  cancelJob(id: string): Promise<void>;
  getDownloadUrl(id: string): string;
}

// Real implementation → talks to Express API
class RealDownloadService implements DownloadService { ... }

// Mock implementation → runs entirely in-browser
class MockDownloadService implements DownloadService { ... }
```

### Mock Selection Logic

```typescript
function createService(): DownloadService {
  const isStaticHost =
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app');

  const isMockForced =
    new URLSearchParams(window.location.search).get('mock') === 'true' ||
    import.meta.env.VITE_USE_MOCKS === 'true';

  if (isStaticHost || isMockForced) {
    return new MockDownloadService();
  }
  return new RealDownloadService();
}

export const api = createService();
```

### Server-Side Mock Engine

The Express server also operates in mock mode in this showcase — `yt-dlp` subprocess calls are replaced with a deterministic metadata generator and a progress simulation timer:

```typescript
// [Sanitized for Public Showcase - Original Logic Internal]
async function runDownload(id: string, url: string) {
  // Simulates download progress with setInterval
  // Writes a text placeholder file to DOWNLOAD_DIR
  // All download/serve/delete endpoints remain fully functional
}
```

---

## Security Scanning

This repository uses **GitHub CodeQL** for automated security analysis on every push to `main`.

**Scanned vulnerability classes:**
- SQL injection
- XSS / DOM injection
- Path traversal
- Insecure deserialization
- Hardcoded credentials

**Dependabot** is configured to scan npm dependencies weekly and auto-open PRs for security patches.

---

## Secret Scanning

GitHub's built-in secret scanning is enabled on this repository. It will:
1. Block any push containing detected secrets (API key patterns, tokens, etc.)
2. Alert the repository owner immediately if a leak is detected
3. Revoke tokens where GitHub has partnerships with the provider (AWS, GCP, etc.)

---

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Credential leak in commit | `.gitignore` + GitHub secret scanning + pre-commit hooks |
| DDoS on API | `express-rate-limit` (10 req/15min per IP) |
| Path traversal on file serve | Job ID is UUIDv4 — files addressed by job ID only |
| Unbounded disk growth | Auto-cleanup job deletes files after 1 hour TTL |
| XSS via media title | React's JSX escapes all string values by default |
