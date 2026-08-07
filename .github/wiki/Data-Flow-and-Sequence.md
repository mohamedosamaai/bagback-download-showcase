# Data Flow & Sequence Diagrams

This page documents the exact flow of data through the system for the two core user journeys: **URL Analysis** and **File Download**.

---

## 1. URL Analysis Flow

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant PWA as React PWA
  participant API as Express API
  participant Engine as [Sanitized] Download Engine

  User->>PWA: Pastes media URL + clicks Analyze
  PWA->>PWA: Validates URL format (regex)
  PWA->>API: POST /api/analyze { url }
  API->>API: Rate limit check (10 req / 15 min per IP)
  API->>Engine: Extract metadata (title, thumbnail, duration, formats)
  Engine-->>API: MediaInfo JSON
  API-->>PWA: 200 OK { title, thumbnail, duration, formats[] }
  PWA->>User: Renders AnalyzeResultCard with format options
```

---

## 2. Download Pipeline Flow

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant PWA as React PWA
  participant API as Express API
  participant Queue as Job Queue
  participant Engine as [Sanitized] Download Engine
  participant FS as Filesystem

  User->>PWA: Selects format + clicks Download
  PWA->>API: POST /api/download { url, format, audioOnly }
  API->>Queue: Creates Job { id, status: 'queued', progress: 0 }
  API-->>PWA: 202 Accepted { id }

  Note over PWA: Opens SSE connection

  PWA->>API: GET /api/jobs/stream (SSE)
  API-->>PWA: event: data [initial job list]

  par Async download execution
    Queue->>Engine: runDownload(id, url, format)
    Engine->>Engine: progress: 5% → 20% → 50% → 80% → 100%
    Engine->>FS: Write media file to DOWNLOAD_DIR
    Engine->>Queue: updateJob { status: 'completed', filePath }
    Queue->>API: broadcastJobs() → SSE push
    API-->>PWA: event: data [updated job list]
  end

  PWA->>User: Shows "Download Ready" + Download button
  User->>PWA: Clicks Download
  PWA->>API: GET /api/download/:id/file
  API->>FS: Read file stream
  API-->>PWA: File binary (Content-Disposition: attachment)
  API->>FS: Delete file after serving (cleanup)
```

---

## 3. Mock Mode Flow (Client-Side)

When `?mock=true` or deployed to static hosting (GitHub Pages, Vercel), the PWA automatically switches to `MockDownloadService`:

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant PWA as React PWA
  participant Mock as MockDownloadService
  participant Browser as Browser Memory

  User->>PWA: Pastes URL + Analyze
  PWA->>Mock: analyze(url)
  Mock->>Mock: Match URL pattern (YouTube/TikTok/Instagram/X)
  Mock-->>PWA: Static MediaInfo (title, thumbnail, formats)
  PWA->>User: Renders AnalyzeResultCard

  User->>PWA: Download
  PWA->>Mock: download(url, format)
  Mock->>Browser: setInterval — simulate progress 5%→100%
  Mock-->>PWA: SSE-compatible callback stream
  Mock->>Browser: new Blob([mockContent]) → createObjectURL
  Browser-->>User: Browser download dialog (mock .mp4 / .mp3 file)
```

---

## 4. SSE Stream Protocol

The API uses Server-Sent Events for job state synchronization:

```
GET /api/jobs/stream
Accept: text/event-stream

← data: [{"id":"abc","status":"queued","progress":0,...}]
← data: [{"id":"abc","status":"running","progress":25,...}]
← data: [{"id":"abc","status":"running","progress":67,...}]
← data: [{"id":"abc","status":"completed","progress":100,...}]
```

**Client handling:**
```typescript
const source = new EventSource('/api/jobs/stream');
source.onmessage = (e) => {
  const jobs: Job[] = JSON.parse(e.data);
  setJobs(jobs);
};
```

**Reconnection:** The browser automatically reconnects on disconnect (EventSource built-in retry). The server re-sends full job state on each new connection.

---

## 5. Auto-Cleanup Job

The server runs a background interval every 60 seconds that evicts completed/failed jobs older than 1 hour and deletes their associated files from disk — ensuring the server never accumulates unbounded state.

```
Every 60s:
  jobs.forEach(job => {
    if (job.status in ['completed', 'failed']) {
      if (age(job) > 1hr) {
        fs.unlink(job.filePath)
        jobs.delete(job.id)
      }
    }
  })
```
