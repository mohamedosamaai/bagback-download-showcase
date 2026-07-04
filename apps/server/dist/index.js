"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || path_1.default.join(os_1.default.tmpdir(), 'bagback-downloads');
const STATIC_DIR = process.env.STATIC_DIR || path_1.default.join(__dirname, '..', 'static');
if (!fs_1.default.existsSync(DOWNLOAD_DIR)) {
    fs_1.default.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}
const jobs = new Map();
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express_1.default.json());
let sseClients = [];
function broadcastJobs() {
    const list = Array.from(jobs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const data = `data: ${JSON.stringify(list)}\n\n`;
    sseClients.forEach((client) => {
        try {
            client.res.write(data);
        }
        catch (err) {
            console.error('[SSE] Broadcast error', err);
        }
    });
}
function updateJob(id, patch) {
    const job = jobs.get(id);
    if (!job)
        return;
    jobs.set(id, { ...job, ...patch, updatedAt: new Date().toISOString() });
    broadcastJobs();
}
function checkProxy(proxyStr) {
    return new Promise((resolve) => {
        const parts = proxyStr.split(':');
        if (parts.length !== 2)
            return resolve(null);
        const host = parts[0];
        const port = parseInt(parts[1], 10);
        const req = http_1.default.request({
            host,
            port,
            method: 'CONNECT',
            path: 'www.google.com:443',
            timeout: 1200,
        });
        req.on('connect', (_res, socket) => {
            socket.destroy();
            resolve(proxyStr);
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });
        req.end();
    });
}
async function fetchVerifiedProxies() {
    return new Promise((resolve) => {
        const req = https_1.default.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=1500&country=all&ssl=all&anonymity=all', (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', async () => {
                const list = data
                    .split(/[\r\n]+/)
                    .map((s) => s.trim())
                    .filter((line) => line.includes(':'))
                    .slice(0, 40);
                const checks = list.map(checkProxy);
                const results = await Promise.all(checks);
                const working = results.filter((p) => Boolean(p));
                resolve(working);
            });
        });
        req.on('error', () => resolve([]));
        req.setTimeout(3000, () => {
            req.destroy();
            resolve([]);
        });
    });
}
function normalizeFormat(format) {
    if (format === '720p')
        return 'bestvideo[height<=720]+bestaudio/best[height<=720]/best';
    if (format === '480p')
        return 'bestvideo[height<=480]+bestaudio/best[height<=480]/best';
    if (format === '360p')
        return 'bestvideo[height<=360]+bestaudio/best[height<=360]/best';
    if (format === 'bestaudio/best' || format === 'mp3')
        return 'bestaudio/best';
    return 'bestvideo+bestaudio/best';
}
function ytdlp(args) {
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)('yt-dlp', args, { env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin' } });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => { stdout += d.toString(); });
        proc.stderr.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
            if (code === 0)
                resolve(stdout.trim());
            else
                reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        });
    });
}
function isYouTubeUrl(url) {
    return /youtube\.com|youtu\.be/i.test(url);
}
// ─── Rate Limiter ───────────────────────────────────────────────────────────
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per 15 minutes
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.set('trust proxy', 1);
// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    try {
        const version = await ytdlp(['--version']);
        res.json({ status: 'ok', ytdlp: version });
    }
    catch {
        res.json({ status: 'ok', ytdlp: 'active' });
    }
});
app.post('/api/analyze', apiLimiter, async (req, res) => {
    const { url } = req.body;
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
                const oembed = await response.json();
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
        }
        catch (e) {
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
        const formats = (info.formats || [])
            .filter((f) => f.ext && (f.vcodec !== 'none' || f.acodec !== 'none'))
            .map((f) => ({
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
    }
    catch (err) {
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
            const formats = (info.formats || [])
                .filter((f) => f.ext && (f.vcodec !== 'none' || f.acodec !== 'none'))
                .map((f) => ({
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
        }
        catch (proxyErr) {
            console.warn(`[Proxy analyze failed with ${proxy}]`, proxyErr);
        }
    }
    res.status(422).json({ error: 'Could not analyze URL. Please verify the link is public and accessible.' });
});
app.post('/api/download', apiLimiter, (req, res) => {
    const { url, format = 'bestvideo+bestaudio/best', audioOnly = false } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) {
        res.status(400).json({ error: 'Invalid URL' });
        return;
    }
    const id = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const job = {
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
async function runDownload(id, url, format, audioOnly) {
    updateJob(id, { status: 'running', progress: 5 });
    const realFormat = normalizeFormat(format);
    const outputTemplate = path_1.default.join(DOWNLOAD_DIR, `${id}-%(title).100s.%(ext)s`);
    // Build base yt-dlp arguments
    const buildArgs = (proxyUrl) => {
        const base = [];
        if (proxyUrl) {
            base.push('--proxy', `http://${proxyUrl}`);
        }
        if (audioOnly) {
            base.push('-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputTemplate, '--no-playlist', '--progress', '--newline', '--concurrent-fragments', '8', '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', '--remote-components', 'ejs:github', url);
        }
        else {
            base.push('-f', realFormat, '--merge-output-format', 'mp4', '-o', outputTemplate, '--no-playlist', '--progress', '--newline', '--concurrent-fragments', '8', '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', '--remote-components', 'ejs:github', url);
        }
        return base;
    };
    const executeYtDlp = (args) => {
        return new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)('yt-dlp', args, {
                env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin' },
            });
            const handleData = (data) => {
                const lines = data.toString().split(/\r?\n/);
                for (const line of lines) {
                    const progMatch = line.match(/([\d\.]+)%/);
                    if (progMatch) {
                        updateJob(id, { progress: parseFloat(progMatch[1]) });
                    }
                }
            };
            proc.stdout.on('data', handleData);
            proc.stderr.on('data', handleData);
            proc.on('close', (code) => {
                resolve(code === 0);
            });
        });
    };
    // Step 1: Try direct download first
    let success = await executeYtDlp(buildArgs());
    // Step 2: If direct download failed on YouTube, query verified working proxy pool
    if (!success && isYouTubeUrl(url)) {
        console.warn('[Direct download failed, fetching verified proxy pool for YouTube download retry]');
        const verifiedProxies = await fetchVerifiedProxies();
        console.log(`[Found ${verifiedProxies.length} verified CONNECT proxies]`);
        for (const proxy of verifiedProxies) {
            console.log(`[Retrying download with verified proxy ${proxy}]`);
            success = await executeYtDlp(buildArgs(proxy));
            if (success) {
                console.log(`[Download succeeded using verified proxy ${proxy}]`);
                break;
            }
        }
    }
    if (success) {
        const files = fs_1.default.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(id));
        const file = files[0];
        if (file) {
            const filePath = path_1.default.join(DOWNLOAD_DIR, file);
            const stat = fs_1.default.statSync(filePath);
            updateJob(id, {
                status: 'completed',
                progress: 100,
                filePath,
                fileName: file.replace(`${id}-`, ''),
                fileSize: stat.size,
            });
        }
        else {
            updateJob(id, { status: 'completed', progress: 100 });
        }
    }
    else {
        updateJob(id, { status: 'failed', error: 'Download failed' });
    }
}
app.get('/api/jobs', (_req, res) => {
    const list = Array.from(jobs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
});
app.get('/api/jobs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE
    // Send the initial list immediately
    const list = Array.from(jobs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.write(`data: ${JSON.stringify(list)}\n\n`);
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);
    req.on('close', () => {
        sseClients = sseClients.filter((client) => client.id !== clientId);
    });
});
app.get('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    res.json(job);
});
app.get('/api/jobs/:id/file', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'completed' || !job.filePath) {
        res.status(404).json({ error: 'File not ready' });
        return;
    }
    if (!fs_1.default.existsSync(job.filePath)) {
        res.status(404).json({ error: 'File not found on disk' });
        return;
    }
    const stat = fs_1.default.statSync(job.filePath);
    const ext = path_1.default.extname(job.filePath).slice(1);
    const mimeMap = {
        mp4: 'video/mp4',
        mp3: 'audio/mpeg',
        webm: 'video/webm',
        mkv: 'video/x-matroska',
        m4a: 'audio/mp4',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(job.fileName || 'download')}"`);
    fs_1.default.createReadStream(job.filePath).pipe(res);
});
app.delete('/api/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
    }
    if (job.filePath && fs_1.default.existsSync(job.filePath)) {
        fs_1.default.unlinkSync(job.filePath);
    }
    jobs.delete(req.params.id);
    res.json({ deleted: true });
});
if (fs_1.default.existsSync(STATIC_DIR)) {
    app.use(express_1.default.static(STATIC_DIR));
    app.get('*', (_req, res) => {
        const indexPath = path_1.default.join(STATIC_DIR, 'index.html');
        if (fs_1.default.existsSync(indexPath)) {
            res.sendFile(indexPath);
        }
        else {
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
            if (job.filePath && fs_1.default.existsSync(job.filePath)) {
                try {
                    fs_1.default.unlinkSync(job.filePath);
                }
                catch (e) {
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
