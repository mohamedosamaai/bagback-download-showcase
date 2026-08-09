import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
import rateLimit from 'express-rate-limit';

const YOUTUBE_DL_PATH = require('youtube-dl-exec/src/constants').YOUTUBE_DL_PATH;

const app = express();
const PORT = process.env.PORT || 4000;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path.join(os.tmpdir(), 'bagback-downloads');
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', 'static');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

interface Job {
  id: string;
  url: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
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

interface FormatInfo {
  id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
}

const jobs = new Map<string, Job>();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

let sseClients: { id: number; res: Response }[] = [];

function broadcastJobs() {
  const list = Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const data = `data: ${JSON.stringify(list)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(data);
    } catch (err) {
      console.error('[SSE] Broadcast error', err);
    }
  });
}

function updateJob(id: string, patch: Partial<Job>) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch, updatedAt: new Date().toISOString() });
  broadcastJobs();
}

// [Sanitized for Public Showcase - Original Logic Internal]
function checkProxy(proxyStr: string): Promise<string | null> {
  return Promise.resolve(proxyStr);
}

// [Sanitized for Public Showcase - Original Logic Internal]
async function fetchVerifiedProxies(): Promise<string[]> {
  return ['127.0.0.1:8080', '192.168.1.1:8080'];
}

function normalizeFormat(format: string): string {
  if (format === '720p') return 'bestvideo[height<=720]+bestaudio/best[height<=720]/best';
  if (format === '480p') return 'bestvideo[height<=480]+bestaudio/best[height<=480]/best';
  if (format === '360p') return 'bestvideo[height<=360]+bestaudio/best[height<=360]/best';
  if (format === 'bestaudio/best' || format === 'mp3') return 'bestaudio/best';
  return 'bestvideo+bestaudio/best';
}

function ytdlp(args: string[], timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YOUTUBE_DL_PATH, args);
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`yt-dlp process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', chunk => stdout += chunk.toString());
    proc.stderr.on('data', chunk => stderr += chunk.toString());
    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
    });
    proc.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

// ─── Rate Limiter ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.set('trust proxy', 1);

// ─── Routes ───────────────────────────────────────────────────────────────

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const version = await ytdlp(['--version']);
    res.json({ status: 'ok', ytdlp: version });
  } catch {
    res.json({ status: 'ok', ytdlp: 'active' });
  }
});

app.post('/api/analyze', apiLimiter, async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
    return;
  }

  // 1. YouTube OEmbed First (instant metadata)
  if (isYouTubeUrl(url)) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);
      if (response.ok) {
        const oembed: any = await response.json();
        res.json({
          title: oembed.title,
          thumbnail: oembed.thumbnail_url,
          uploader: oembed.author_name,
          duration: 0,
          formats: [
            { id: 'bestvideo+bestaudio/best', ext: 'mp4', resolution: '1080p (Best)' },
            { id: '720p', ext: 'mp4', resolution: '720p HD' },
            { id: '480p', ext: 'mp4', resolution: '480p SD' },
            { id: 'bestaudio/best', ext: 'mp3', resolution: 'Audio MP3' },
          ],
        });
        return;
      }
    } catch (e) {
      console.warn('[YouTube OEmbed failed, trying yt-dlp]', e);
    }
  }

  // 2. Try yt-dlp directly
  try {
    const raw = await ytdlp([
      '--socket-timeout', '10',
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      '--remote-components', 'ejs:github',
      url,
    ]);
    const info = JSON.parse(raw);

    const formats: FormatInfo[] = (info.formats || [])
      .filter((f: any) => f.ext && (f.vcodec !== 'none' || f.acodec !== 'none'))
      .map((f: any) => ({
        id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.height ? `${f.height}p` : undefined),
        fps: f.fps,
        filesize: f.filesize,
        vcodec: f.vcodec,
        acodec: f.acodec,
      }))
      .slice(0, 20);

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      formats,
    });
    return;
  } catch (err) {
    console.warn('[Direct yt-dlp analyze failed, retrying with verified proxy]', err);
  }

  // 3. Retry with verified working proxy pool
  const verifiedProxies = await fetchVerifiedProxies();
  for (const proxy of verifiedProxies) {
    try {
      const raw = await ytdlp([
        '--socket-timeout', '10',
        '--proxy', `http://${proxy}`,
        '--dump-json',
        '--no-playlist',
        '--flat-playlist',
        '--remote-components', 'ejs:github',
        url,
      ]);
      const info = JSON.parse(raw);

      const formats: FormatInfo[] = (info.formats || [])
        .filter((f: any) => f.ext && (f.vcodec !== 'none' || f.acodec !== 'none'))
        .map((f: any) => ({
          id: f.format_id,
          ext: f.ext,
          resolution: f.resolution || (f.height ? `${f.height}p` : undefined),
          fps: f.fps,
          filesize: f.filesize,
          vcodec: f.vcodec,
          acodec: f.acodec,
        }))
        .slice(0, 20);

      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        formats,
      });
      return;
    } catch (proxyErr) {
      console.warn(`[Proxy analyze failed with ${proxy}]`, proxyErr);
    }
  }

  res.status(422).json({ error: 'Could not analyze URL. Please verify the link is public and accessible.' });
});

app.post('/api/download', apiLimiter, (req: Request, res: Response) => {
  const { url, format = 'bestvideo+bestaudio/best', audioOnly = false } = req.body as {
    url?: string;
    format?: string;
    audioOnly?: boolean;
  };

  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Apply normalization here
  const normalizedFormat = normalizeFormat(format);

  const job: Job = {
    id,
    url,
    status: 'queued',
    progress: 0,
    format: normalizedFormat,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);

  runDownload(id, url, normalizedFormat, audioOnly).catch(console.error);

  res.json({ id });
});

async function runDownload(id: string, url: string, format: string, audioOnly: boolean) {
  updateJob(id, { status: 'running', progress: 0 });

  const ext = audioOnly ? 'mp3' : 'mp4';
  const fileName = `${id}.%(ext)s`;
  const filePathTemplate = path.join(DOWNLOAD_DIR, fileName);

  const args = [
    '--no-playlist',
    '--newline',
    '-f', format,
  ];

  if (audioOnly) {
    args.push('-x', '--audio-format', 'mp3');
  } else {
    args.push('--merge-output-format', 'mp4');
  }

  args.push('-o', filePathTemplate);
  args.push(url);

  try {
    const proc = spawn(YOUTUBE_DL_PATH, args);

    proc.stdout.on('data', (chunk) => {
      const output = chunk.toString();
      
      if (output.includes('[Merger]') || output.includes('[ExtractAudio]')) {
        updateJob(id, { progress: 99 });
        return;
      }
      
      const match = output.match(/\[download\]\s+([\d\.]+)%/);
      if (match && match[1]) {
        const p = parseFloat(match[1]);
        if (!isNaN(p)) {
          // yt-dlp downloads video then audio. The % goes 0->100, then 0->100 again.
          // By updating on every percentage (even if it drops), we show accurate sub-process progress.
          updateJob(id, { progress: p });
        }
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        const files = fs.readdirSync(DOWNLOAD_DIR);
        // Find the completed file (ignore .part or .ytdl files)
        const downloadedFile = files.find(f => f.startsWith(id) && !f.endsWith('.part') && !f.endsWith('.ytdl'));
        
        if (downloadedFile) {
          const actualPath = path.join(DOWNLOAD_DIR, downloadedFile);
          const stat = fs.statSync(actualPath);
          updateJob(id, {
            status: 'completed',
            progress: 100,
            filePath: actualPath,
            fileName: downloadedFile,
            fileSize: stat.size,
          });
        } else {
          updateJob(id, { status: 'failed', error: 'File not found after download' });
        }
      } else {
        updateJob(id, { status: 'failed', error: `Process exited with code ${code}` });
      }
    });
  } catch (err) {
    console.error('[Download Error]', err);
    updateJob(id, { status: 'failed', error: 'Failed to start download process' });
  }
}

app.get('/api/jobs', (_req: Request, res: Response) => {
  const list = Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(list);
});

app.get('/api/jobs/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  // Send the initial list immediately
  const list = Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.write(`data: ${JSON.stringify(list)}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client.id !== clientId);
  });
});

app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

app.get('/api/jobs/:id/file', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== 'completed' || !job.filePath) {
    res.status(404).json({ error: 'File not ready' });
    return;
  }
  if (!fs.existsSync(job.filePath)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  const stat = fs.statSync(job.filePath);
  const ext = path.extname(job.filePath).slice(1);
  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    m4a: 'audio/mp4',
  };
  const contentType = mimeMap[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size);
  // Standard way to encode UTF-8 filenames in Content-Disposition to force download
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="download.${ext}"; filename*=UTF-8''${encodeURIComponent(job.fileName || 'download')}`
  );
  fs.createReadStream(job.filePath).pipe(res);
});

app.delete('/api/jobs/:id', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  if (job.filePath && fs.existsSync(job.filePath)) {
    fs.unlinkSync(job.filePath);
  }
  jobs.delete(req.params.id);
  res.json({ deleted: true });
});

if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get('*', (_req: Request, res: Response) => {
    const indexPath = path.join(STATIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built');
    }
  });
}

// ─── Auto-Cleanup Job ──────────────────────────────────────────────────────────

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours

setInterval(() => {
  const now = Date.now();
  console.log('[Cleanup] Running periodic cleanup job...');
  for (const [id, job] of jobs.entries()) {
    const jobAge = now - new Date(job.createdAt).getTime();
    if (jobAge > MAX_AGE) {
      console.log(`[Cleanup] Deleting old job ${id}`);
      if (job.filePath && fs.existsSync(job.filePath)) {
        try {
          fs.unlinkSync(job.filePath);
        } catch (e) {
          console.error(`[Cleanup] Error deleting file ${job.filePath}`, e);
        }
      }
      jobs.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

app.listen(PORT, () => {
  console.log(`[Bagback Download Server] listening on port ${PORT}`);
  console.log(`[Bagback Download Server] download dir: ${DOWNLOAD_DIR}`);
  console.log(`[Bagback Download Server] static dir: ${STATIC_DIR}`);
});
