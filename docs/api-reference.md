# Bagback Download API & Interface Reference

This document outlines the public contract specifications and TypeScript interfaces provided by `@bagback-download/core`.

## Core Types

### `Job`
Represents an asynchronous download job lifecycle state:

```typescript
export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  progress: number;
  title?: string;
  format?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `JobStatus`
```typescript
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
```

### `FormatInfo`
Media format metadata returned during analysis:

```typescript
export interface FormatInfo {
  id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
}
```

### `UrlAnalysisResult`
Result of URL validation and format detection:

```typescript
export interface UrlAnalysisResult {
  supported: boolean;
  title?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  formats?: FormatInfo[];
  extractor?: string;
}
```

## REST API Endpoints

- `GET /api/health` — System status and engine availability.
- `POST /api/analyze` — Request metadata and format options for a given URL.
- `POST /api/download` — Queue a new download task. Returns `{ id: string }`.
- `GET /api/jobs` — Retrieve active and historical jobs.
- `GET /api/jobs/stream` — Real-time Server-Sent Events (SSE) stream for download updates.
- `GET /api/jobs/:id/file` — Stream completed download file attachment.
- `DELETE /api/jobs/:id` — Cancel job and clean temporary buffer.
