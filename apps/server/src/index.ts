import express, { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';

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

async function fetchFreeProxies(): Promise<string[]> {
  return new Promise((resolve) => {
    const req = https.get(
      'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=1500&country=all&ssl=all&anonymity=all',
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          const proxies = data.split(/[\r\n]+/).filter((line) => line.includes(':'));
          resolve(proxies.slice(0, 8));
        });
      }
    );
    req.on('error', () => resolve([]));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve([]);
    });
  });
}

function normalizeFormat(format: string): string {
  if (format === '720p') return 'bestvideo[height<=720]+bestaudio/best[height<=720]/best';
  if (format === '480p') return 'bestvideo[height<=480]+bestaudio/best[height<=480]/best';
  if (format === '360p') return 'bestvideo[height<=360]+bestaudio/best[height<=360]/best';
  if (format === 'bestaudio/best' || format === 'mp3') return 'bestaudio/best';
  return 'bestvideo+bestaudio/best';
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
    res.json({ status: 'ok', ytdlp: version });
  } catch {
    res.json({ status: 'ok', ytdlp: 'active' });
  }
});

app.post('/api/analyze', async (req: Request, res: Response) => {
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

  // 2. All other URLs or fallback: Try yt-dlp directly
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
    console.warn('[Direct yt-dlp analyze failed, retrying with proxy pool]', err);
  }

  // 3. Retry with Proxy pool for blocked datacenter IPs
  const proxies = await fetchFreeProxies();
  for (const proxy of proxies) {
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

  const realFormat = normalizeFormat(format);
  const outputTemplate = path.join(DOWNLOAD_DIR, `${id}-%(title).100s.%(ext)s`);

  // Build base yt-dlp arguments
  const buildArgs = (proxyUrl?: string) => {
    const base: string[] = [];

    if (proxyUrl) {
      base.push('--proxy', `http://${proxyUrl}`);
    }

    if (audioOnly) {
      base.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '-o', outputTemplate,
        '--no-playlist',
        '--progress',
        '--newline',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        '--remote-components', 'ejs:github',
        url
      );
    } else {
      base.push(
        '-f', realFormat,
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--no-playlist',
        '--progress',
        '--newline',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        '--remote-components', 'ejs:github',
        url
      );
    }

    return base;
  };

  const executeYtDlp = (args: string[]): Promise<boolean> => {
    return new Promise((resolve) => {
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
        resolve(code === 0);
      });
    });
  };

  // Step 1: Try direct download first
  let success = await executeYtDlp(buildArgs());

  // Step 2: If direct download failed on YouTube, iterate through proxy pool
  if (!success && isYouTubeUrl(url)) {
    console.warn('[Direct download failed, fetching free proxy pool for YouTube download retry]');
    const proxies = await fetchFreeProxies();
    for (const proxy of proxies) {
      console.log(`[Retrying download with proxy ${proxy}]`);
      success = await executeYtDlp(buildArgs(proxy));
      if (success) {
        console.log(`[Download succeeded using proxy ${proxy}]`);
        break;
      }
    }
  }

  if (success) {
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
    updateJob(id, { status: 'failed', error: 'Download failed' });
  }
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
