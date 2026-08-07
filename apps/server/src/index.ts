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

// [Sanitized for Public Showcase - Original Logic Internal]
function ytdlp(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    if (args.includes('--version')) {
      resolve('2026.08.07');
      return;
    }
    if (args.includes('--dump-json')) {
      const url = args[args.length - 1];
      let title = "Extracted web media file from link";
      let thumbnail = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&auto=format&fit=crop";
      let uploader = "Web Media";
      let duration = 180;

      if (/youtube\.com|youtu\.be/i.test(url)) {
        title = "Advanced Agentic Coding with Gemini 3.5 Pro";
        thumbnail = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop";
        uploader = "Google DeepMind";
        duration = 352;
      } else if (/tiktok\.com/i.test(url)) {
        title = "AI Digital Transformation Architecture Trends for 2027";
        thumbnail = "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=640&auto=format&fit=crop";
        uploader = "mohamed.osama";
        duration = 60;
      } else if (/instagram\.com/i.test(url)) {
        title = "Bagback Download Launch - Open Source Universal Downloader";
        thumbnail = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&auto=format&fit=crop";
        uploader = "bagback.tech";
        duration = 120;
      } else if (/twitter\.com|x\.com/i.test(url)) {
        title = "Exciting updates on agentic frameworks and LLM orchestration!";
        thumbnail = "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=640&auto=format&fit=crop";
        uploader = "Mohamed Osama";
        duration = 45;
      }

      const rawInfo = {
        title,
        thumbnail,
        duration,
        uploader,
        formats: [
          { format_id: 'bestvideo+bestaudio/best', ext: 'mp4', resolution: '1080p (Best)', filesize: 15400000, vcodec: 'h264', acodec: 'aac' },
          { format_id: '720p', ext: 'mp4', resolution: '720p HD', filesize: 8500000, vcodec: 'h264', acodec: 'aac' },
          { format_id: '480p', ext: 'mp4', resolution: '480p SD', filesize: 4200000, vcodec: 'h264', acodec: 'aac' },
          { format_id: 'bestaudio/best', ext: 'mp3', resolution: 'Audio MP3', filesize: 2100000, vcodec: 'none', acodec: 'mp3' }
        ]
      };
      resolve(JSON.stringify(rawInfo));
      return;
    }
    resolve('');
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
  const job: Job = {
    id,
    url,
    status: 'queued',
    progress: 0,
    format,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);

  runDownload(id, url, format, audioOnly).catch(console.error);

  res.json({ id });
});

// [Sanitized for Public Showcase - Original Logic Internal]
async function runDownload(id: string, url: string, format: string, audioOnly: boolean) {
  updateJob(id, { status: 'running', progress: 5 });

  const ext = audioOnly ? 'mp3' : 'mp4';
  let title = "mock-media-file";
  if (/youtube\.com|youtu\.be/i.test(url)) {
    title = "Advanced Agentic Coding with Gemini 3.5 Pro";
  } else if (/tiktok\.com/i.test(url)) {
    title = "AI Digital Transformation Architecture Trends for 2027";
  } else if (/instagram\.com/i.test(url)) {
    title = "Bagback Download Launch - Open Source Universal Downloader";
  } else if (/twitter\.com|x\.com/i.test(url)) {
    title = "Exciting updates on agentic frameworks and LLM orchestration!";
  }

  const fileName = `${id}-${title}.${ext}`;
  const filePath = path.join(DOWNLOAD_DIR, fileName);

  const simulateProgress = () => {
    return new Promise<void>((resolve) => {
      let progress = 5;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 10;
        if (progress >= 100) {
          clearInterval(interval);
          updateJob(id, { progress: 100 });
          resolve();
        } else {
          updateJob(id, { progress });
        }
      }, 600);
    });
  };

  await simulateProgress();

  try {
    fs.writeFileSync(filePath, `Sanitized Mock Media Content\nJob: ${id}\nTitle: ${title}\nURL: ${url}`);
    const stat = fs.statSync(filePath);
    
    updateJob(id, {
      status: 'completed',
      progress: 100,
      filePath,
      fileName: fileName.replace(`${id}-`, ''),
      fileSize: stat.size,
    });
  } catch (err) {
    console.error('[Mock Download Error]', err);
    updateJob(id, { status: 'failed', error: 'Mock download write failed' });
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
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(job.fileName || 'download')}"`,
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
