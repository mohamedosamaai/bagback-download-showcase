import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  url: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  title?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
}

interface Format {
  id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  filesize?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
}

interface AnalyzeResult {
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  formats: Format[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const API = '/api';
const POLL_INTERVAL = 2000;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function truncateUrl(url: string, max = 50): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.slice(0, max) + (url.length > max ? '…' : '');
  }
}

const STATUS_LABELS: Record<Job['status'], string> = {
  queued: 'في الانتظار',
  running: 'جارٍ التحميل',
  completed: 'اكتمل',
  failed: 'فشل',
};

// ─── Components ─────────────────────────────────────────────────────────────

// Icon components
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── JobCard ─────────────────────────────────────────────────────────────────
function JobCard({ job, onDelete }: { job: Job; onDelete: (id: string) => void }) {
  const handleDownload = () => {
    window.open(`${API}/jobs/${job.id}/file`, '_blank');
  };

  return (
    <div className="job-card">
      <div className="job-header">
        <div className={`job-status-dot ${job.status}`} />
        <div className="job-info">
          <div className="job-title" dir="ltr">
            {job.title || truncateUrl(job.url)}
          </div>
          <div className="job-url" dir="ltr">{truncateUrl(job.url)}</div>
        </div>
        <div className="job-actions">
          {job.status === 'completed' && (
            <button
              className="icon-btn download-btn"
              onClick={handleDownload}
              title="تحميل الملف"
            >
              <DownloadIcon />
            </button>
          )}
          <button
            className="icon-btn delete-btn"
            onClick={() => onDelete(job.id)}
            title="حذف"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${job.progress}%` }}
          />
        </div>
        <div className="progress-meta">
          <span className={`status-text ${job.status}`}>
            {STATUS_LABELS[job.status]}
            {job.status === 'running' && ` — ${job.progress.toFixed(0)}%`}
          </span>
          <span className="file-size">
            {job.status === 'completed' && job.fileSize
              ? formatSize(job.fileSize)
              : job.error
              ? job.error.slice(0, 60)
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── AnalyzeResultCard ────────────────────────────────────────────────────────
function AnalyzeResultCard({
  result,
  url,
  onDownload,
}: {
  result: AnalyzeResult;
  url: string;
  onDownload: (opts: { url: string; format: string; audioOnly: boolean }) => void;
}) {
  const [audioOnly, setAudioOnly] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('bestvideo+bestaudio/best');
  const [loading, setLoading] = useState(false);

  // Filter to unique resolutions
  const videoFormats = result.formats
    .filter((f) => f.vcodec && f.vcodec !== 'none' && f.resolution)
    .reduce((acc: Format[], f) => {
      const key = f.resolution!;
      if (!acc.find((x) => x.resolution === key)) acc.push(f);
      return acc;
    }, [])
    .slice(0, 6);

  const handleStart = async () => {
    setLoading(true);
    await onDownload({ url, format: audioOnly ? 'bestaudio/best' : selectedFormat, audioOnly });
    setLoading(false);
  };

  return (
    <div className="analyze-result">
      <div className="media-preview">
        {result.thumbnail && (
          <img
            src={result.thumbnail}
            alt="preview"
            className="media-thumb"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="media-info">
          <h3>{result.title}</h3>
          <div className="media-meta">
            {result.uploader && (
              <span className="media-badge">🎬 {result.uploader}</span>
            )}
            {result.duration && (
              <span className="media-badge">⏱ {formatDuration(result.duration)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Audio/Video toggle */}
      <div className="options-row" style={{ marginBottom: '16px' }}>
        <button
          className={`option-chip ${!audioOnly ? 'selected' : ''}`}
          onClick={() => setAudioOnly(false)}
        >
          🎬 فيديو
        </button>
        <button
          className={`option-chip ${audioOnly ? 'selected' : ''}`}
          onClick={() => setAudioOnly(true)}
        >
          🎵 صوت فقط (MP3)
        </button>
      </div>

      {/* Format selection */}
      {!audioOnly && videoFormats.length > 0 && (
        <div className="formats-section">
          <div className="formats-label">اختر الجودة</div>
          <div className="formats-grid">
            {videoFormats.map((f) => (
              <button
                key={f.id}
                className={`format-option ${selectedFormat === f.id ? 'selected' : ''}`}
                onClick={() => setSelectedFormat(f.id)}
              >
                <span className="format-res">{f.resolution}</span>
                <span className="format-ext">{f.ext}{f.fps ? ` ${f.fps}fps` : ''}</span>
              </button>
            ))}
            <button
              className={`format-option ${selectedFormat === 'bestvideo+bestaudio/best' ? 'selected' : ''}`}
              onClick={() => setSelectedFormat('bestvideo+bestaudio/best')}
            >
              <span className="format-res">أفضل</span>
              <span className="format-ext">auto</span>
            </button>
          </div>
        </div>
      )}

      <div className="download-actions">
        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> جارٍ الإضافة...</> : <><DownloadIcon /> ابدأ التحميل</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
function App() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll jobs
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/jobs`);
        if (res.ok) {
          const data: Job[] = await res.json();
          setJobs(data);
        }
      } catch {
        // server might be starting
      }
    };
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const handleAnalyze = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setAnalyzeError('');
    setAnalyzeResult(null);
    setAnalyzing(true);
    try {
      const res = await fetch(`${API}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحليل');
      setAnalyzeResult(data);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setAnalyzing(false);
    }
  }, [url]);

  const handleDownload = useCallback(async (opts: { url: string; format: string; audioOnly: boolean }) => {
    try {
      const res = await fetch(`${API}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error('فشل بدء التحميل');
      setAnalyzeResult(null);
      setUrl('');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'فشل بدء التحميل');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`${API}/jobs/${id}`, { method: 'DELETE' });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('http')) {
        setUrl(text);
        setAnalyzeResult(null);
        setAnalyzeError('');
      }
    } catch {
      // clipboard permission not granted
    }
  };

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const doneJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'failed');

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <a href="/" className="logo">
            <div className="logo-icon">⬇</div>
            <div className="logo-text">
              Bagback <span>Download</span>
            </div>
          </a>
          <nav className="header-nav">
            <a href="https://bagbacktech.com" target="_blank" rel="noreferrer">
              <button className="nav-btn">Bagbacktech.com</button>
            </a>
            <a href="https://github.com/mohamedosamaai/bagback-download" target="_blank" rel="noreferrer">
              <button className="nav-btn">GitHub</button>
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        <div className="container">
          {/* Hero */}
          <div className="hero">
            <div className="hero-eyebrow">
              <CheckIcon />
              مفتوح المصدر · مجاني · بدون إعلانات
            </div>
            <h1>مدير التحميل الذكي</h1>
            <p className="hero-desc">
              حمّل مقاطع الفيديو والصوت من آلاف المصادر بجودة عالية.
              مبني بحب من Bagback Digital Solutions، بيد المطور محمد أسامة.
            </p>
          </div>

          {/* Input card */}
          <div className="input-card">
            <div className="url-input-wrap">
              <input
                ref={inputRef}
                type="url"
                className="url-input"
                placeholder="الصق رابط الفيديو أو الصوت هنا..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setAnalyzeResult(null);
                  setAnalyzeError('');
                }}
                onKeyDown={handleKeyDown}
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={analyzing || !url.trim()}
              >
                {analyzing ? (
                  <><span className="spinner" /> جارٍ التحليل...</>
                ) : (
                  <><SearchIcon /> تحليل</>
                )}
              </button>
            </div>
            <div className="options-row">
              <button className="option-chip" onClick={handlePaste}>
                📋 لصق من الحافظة
              </button>
              <button className="option-chip" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                يوتيوب · تيك توك · إنستغرام · تويتر · وأكثر
              </button>
            </div>
          </div>

          {/* Error */}
          {analyzeError && (
            <div className="error-msg">
              ⚠️ {analyzeError}
            </div>
          )}

          {/* Analyze result */}
          {analyzeResult && (
            <AnalyzeResultCard
              result={analyzeResult}
              url={url}
              onDownload={handleDownload}
            />
          )}

          {/* Queue */}
          {(activeJobs.length > 0 || doneJobs.length > 0) && (
            <div className="queue-section">
              {activeJobs.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="section-header">
                    <div className="section-title">
                      جارٍ التحميل
                      <span className="badge">{activeJobs.length}</span>
                    </div>
                  </div>
                  {activeJobs.map((job) => (
                    <JobCard key={job.id} job={job} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {doneJobs.length > 0 && (
                <div>
                  <div className="section-header">
                    <div className="section-title">
                      السجل
                      <span className="badge">{doneJobs.length}</span>
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                      onClick={() => Promise.all(doneJobs.map((j) => handleDelete(j.id)))}
                    >
                      مسح الكل
                    </button>
                  </div>
                  {doneJobs.map((job) => (
                    <JobCard key={job.id} job={job} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {jobs.length === 0 && !analyzeResult && (
            <div className="empty-state">
              <div className="empty-icon">⬇️</div>
              <p>الصق رابطاً وابدأ التحميل</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            مبني بحب من{' '}
            <a href="https://bagbacktech.com" target="_blank" rel="noreferrer">
              Bagback Digital Solutions
            </a>{' '}
            · مفتوح المصدر تحت رخصة Apache 2.0
          </div>
          <div className="footer-links">
            <a href="https://bagbacktech.com" target="_blank" rel="noreferrer">BagbackTech</a>
            <a href="https://elitk.com" target="_blank" rel="noreferrer">Elitk</a>
            <a href="https://mohamedosama.me" target="_blank" rel="noreferrer">Mohamed Osama</a>
            <a href="https://github.com/mohamedosamaai/bagback-download" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Mount
createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
