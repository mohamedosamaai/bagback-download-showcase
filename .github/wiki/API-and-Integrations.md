# API & Integrations

## REST API Reference

**Base URL:** `http://localhost:4000`

---

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "ytdlp": "2026.08.07",
  "timestamp": "2026-08-07T18:00:00.000Z"
}
```

---

### Analyze URL

```
POST /api/analyze
Content-Type: application/json
```

**Request body:**
```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Response `200 OK`:**
```json
{
  "title": "Video Title Here",
  "thumbnail": "https://...",
  "duration": 352,
  "uploader": "Channel Name",
  "formats": [
    {
      "format_id": "bestvideo+bestaudio/best",
      "ext": "mp4",
      "resolution": "1080p (Best)",
      "filesize": 154000000,
      "vcodec": "h264",
      "acodec": "aac"
    },
    {
      "format_id": "bestaudio/best",
      "ext": "mp3",
      "resolution": "Audio MP3",
      "filesize": 8500000,
      "vcodec": "none",
      "acodec": "mp3"
    }
  ]
}
```

**Error `400 Bad Request`:**
```json
{ "error": "Invalid or unsupported URL" }
```

**Error `429 Too Many Requests`:**
```json
{ "error": "Too many requests from this IP, please try again after 15 minutes" }
```

---

### Start Download

```
POST /api/download
Content-Type: application/json
```

**Request body:**
```json
{
  "url": "https://...",
  "format": "720p",
  "audioOnly": false
}
```

**Supported format values:**
| Value | Description |
|-------|-------------|
| `best` | Best quality (default) |
| `720p` | 720p HD video |
| `480p` | 480p SD video |
| `360p` | 360p video |
| `mp3` | Audio only (MP3) |

**Response `202 Accepted`:**
```json
{ "id": "550e8400-e29b-41d4-a716-446655440000" }
```

---

### Job List

```
GET /api/jobs
```

**Response `200 OK`:**
```json
[
  {
    "id": "550e8400-...",
    "url": "https://...",
    "status": "completed",
    "progress": 100,
    "format": "720p",
    "filePath": "/downloads/550e8400-Video Title.mp4",
    "fileName": "Video Title.mp4",
    "fileSize": 85000000,
    "createdAt": "2026-08-07T18:00:00.000Z",
    "updatedAt": "2026-08-07T18:00:45.000Z"
  }
]
```

**Job status values:**

```
queued → running → completed
                → failed
```

---

### Real-Time Job Stream (SSE)

```
GET /api/jobs/stream
Accept: text/event-stream
```

The server opens an SSE connection and pushes the full job list on every state change:

```
data: [{"id":"...","status":"running","progress":45,...}]

data: [{"id":"...","status":"completed","progress":100,...}]
```

The connection is kept alive indefinitely. On disconnect, the client browser automatically reconnects using the `EventSource` retry mechanism.

---

### Download File

```
GET /api/download/:id/file
```

Returns the completed media file as a binary stream with appropriate headers:

```
Content-Type: video/mp4
Content-Disposition: attachment; filename="Video Title.mp4"
Content-Length: 85000000
```

> ⚠️ The file is **deleted from the server** immediately after this request completes.

---

### Cancel / Delete Job

```
DELETE /api/jobs/:id
```

Cancels a running job (if in progress) and removes it from the queue. Deletes any associated file from disk.

**Response `200 OK`:**
```json
{ "success": true }
```

---

## Rate Limiting

All `/api/*` endpoints are protected by a rate limiter:

| Parameter | Value |
|-----------|-------|
| Window | 15 minutes |
| Max requests | 10 per IP |
| Headers | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |

---

## Service Contract (TypeScript)

The full TypeScript interface that both the real backend client and mock client implement:

```typescript
export interface MediaInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  formats: FormatOption[];
}

export interface FormatOption {
  format_id: string;
  ext: string;
  resolution: string;
  filesize: number;
  vcodec: string;
  acodec: string;
}

export interface Job {
  id: string;
  url: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  format: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadService {
  analyze(url: string): Promise<MediaInfo>;
  download(url: string, format: string, audioOnly: boolean): Promise<{ id: string }>;
  streamJobs(callback: (jobs: Job[]) => void): () => void;
  cancelJob(id: string): Promise<void>;
  getDownloadUrl(id: string): string;
}
```
