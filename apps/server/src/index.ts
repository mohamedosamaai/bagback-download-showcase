import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import ytdl from '@distube/ytdl-core';

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

function updateJob(id: string, patch: Partial<Job>) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch, updatedAt: new Date().toISOString() });
}

function ytdlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin' } });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
    });
  });
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

// ─── Routes ───────────────────────────────────────────────────────────────

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const version = await ytdlp(['--version']);
    res.json({ status: 'ok', ytdlp: version, ytdlCore: true });
  } catch {
    res.json({ status: 'ok', ytdlp: 'fallback', ytdlCore: true });
  }
});

app.post('/api/analyze', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
    return;
  }

  // 1. Try @distube/ytdl-core for YouTube links first
  if (isYouTubeUrl(url)) {
    try {
      const info = await ytdl.getInfo(url);
      const formats: FormatInfo[] = info.formats
        .filter((f) => f.container && (f.hasVideo || f.hasAudio))
        .map((f) => ({
          id: f.itag.toString(),
          ext: f.container || 'mp4',
          resolution: f.qualityLabel || (f.height ? `${f.height}p` : undefined),
          filesize: f.contentLength ? parseInt(f.contentLength, 10) : undefined,
          vcodec: f.hasVideo ? 'h264' : undefined,
          acodec: f.hasAudio ? 'aac' : undefined,
        }))
        .slice(0, 15);

      res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails?.[0]?.url,
        duration: parseInt(info.videoDetails.lengthSeconds, 10),
        uploader: info.videoDetails.author?.name,
        formats,
      });
      return;
    } catch (err) {
      console.warn('[ytdl-core failed, falling back to yt-dlp]', err);
    }
  }

  // 2. Fallback to yt-dlp for all other sites or if ytdl-core fails
  try {
    const raw = await ytdlp([
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      '--extractor-args', 'youtube:player_client=mweb,web',
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to analyze URL';
    res.status(422).json({ error: msg });
  }
});

app.post('/api/download', (req: Request, res: Response) => {
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

async function runDownload(id: string, url: string, format: string, audioOnly: boolean) {
  updateJob(id, { status: 'running', progress: 5 });

  // Try ytdl-core for YouTube downloads
  if (isYouTubeUrl(url)) {
    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80);
      const ext = audioOnly ? 'mp3' : 'mp4';
      const fileName = `${id}-${title}.${ext}`;
      const filePath = path.join(DOWNLOAD_DIR, fileName);

      updateJob(id, { title: info.videoDetails.title, progress: 20 });

      const stream = ytdl(url, {
        filter: audioOnly ? 'audioonly' : 'videoandaudio',
        quality: audioOnly ? 'highestaudio' : 'highest',
      });

      const writeStream = fs.createWriteStream(filePath);
      let downloaded = 0;
      const total = parseInt(info.videoDetails.lengthSeconds, 10) * 100000; // estimated

      stream.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        const progress = Math.min(95, 20 + Math.round((downloaded / (total || 10000000)) * 75));
        updateJob(id, { progress });
      });

      stream.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });

      const stat = fs.statSync(filePath);
      updateJob(id, {
        status: 'completed',
        progress: 100,
        filePath,
        fileName: `${title}.${ext}`,
        fileSize: stat.size,
      });
      return;
    } catch (err) {
      console.warn('[ytdl-core download failed, trying yt-dlp]', err);
    }
  }

  // Fallback to yt-dlp
  const outputTemplate = path.join(DOWNLOAD_DIR, `${id}-%(title).100s.%(ext)s`);
  const args = audioOnly
    ? [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '-o', outputTemplate,
        '--no-playlist',
        '--progress',
        '--newline',
        '--extractor-args', 'youtube:player_client=mweb,web',
        url,
      ]
    : [
        '-f', format,
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--no-playlist',
        '--progress',
        '--newline',
        '--extractor-args', 'youtube:player_client=mweb,web',
        url,
      ];

  const proc = spawn('yt-dlp', args, {
    env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin' },
  });

  proc.stdout.on('data', (data: Buffer) => {
    const line = data.toString();
    const progMatch = line.match(/(\d+\.?\d*)%/);
    if (progMatch) {
      updateJob(id, { progress: parseFloat(progMatch[1]) });
    }
  });

  proc.stderr.on('data', (data: Buffer) => {
    const line = data.toString();
    const progMatch = line.match(/(\d+\.?\d*)%/);
    if (progMatch) {
      updateJob(id, { progress: parseFloat(progMatch[1]) });
    }
  });

  proc.on('close', (code) => {
    if (code === 0) {
      const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(id));
      const file = files[0];
      if (file) {
        const filePath = path.join(DOWNLOAD_DIR, file);
        const stat = fs.statSync(filePath);
        updateJob(id, {
          status: 'completed',
          progress: 100,
          filePath,
          fileName: file.replace(`${id}-`, ''),
          fileSize: stat.size,
        });
      } else {
        updateJob(id, { status: 'completed', progress: 100 });
      }
    } else {
      updateJob(id, { status: 'failed', error: `Download failed` });
    }
  });
}

app.get('/api/jobs', (_req: Request, res: Response) => {
  const list = Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(list);
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

app.listen(PORT, () => {
  console.log(`[Bagback Download Server] listening on port ${PORT}`);
  console.log(`[Bagback Download Server] download dir: ${DOWNLOAD_DIR}`);
  console.log(`[Bagback Download Server] static dir: ${STATIC_DIR}`);
});
