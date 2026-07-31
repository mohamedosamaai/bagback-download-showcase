/// <reference types="vite-plugin-pwa/client" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker
registerSW({ immediate: true });

// ─── Translations Dictionary ───────────────────────────────────────────────

type Lang = 'ar' | 'en';

const dict = {
  ar: {
    appName: 'Bagback Download',
    tagline: 'مدير التحميل المفتوح والمجاني لمحتوى الويب والفيديو والصوت',
    subtagline: 'صنع بحب للمستخدمين بدون أرباح، من شركة Bagback Digital Solutions بيد المطور محمد أسامة.',
    inputPlaceholder: 'الصق رابط الفيديو أو الصوت هنا...',
    analyze: 'تحليل',
    analyzing: 'جارٍ التحليل...',
    pasteClipboard: '📋 لصق من الحافظة',
    supportedSites: 'يوتيوب · تيك توك · إنستغرام · تويتر · فيسبوك · وآلاف المواقع الأخرى',
    videoTab: '🎬 فيديو',
    audioTab: '🎵 صوت فقط (MP3)',
    selectQuality: 'اختر الجودة',
    bestQuality: 'أفضل جودة',
    startDownload: 'ابدأ التحميل',
    addingDownload: 'جارٍ الإضافة...',
    downloading: 'جارٍ التحميل',
    history: 'سجل التحميلات',
    clearAll: 'مسح الكل',
    emptyQueue: 'الصق رابطاً وابدأ التحميل',
    statusQueued: 'في الانتظار',
    statusRunning: 'جارٍ التحميل',
    statusCompleted: 'اكتمل التحميل',
    statusFailed: 'فشل التحميل',
    openFile: 'تحميل الملف',
    deleteItem: 'حذف',
    legalNotice: 'استخدم التطبيق فقط مع المحتوى المسموح لك بحفظه طبقاً للقوانين.',
    localHistoryTitle: 'سجل التحميلات المحلي',
    localHistoryEmpty: 'لا يوجد سجل سابق.',
    loadHistoryUrl: 'استرجاع الرابط',
    clearLocalHistory: 'مسح السجل المحلي',
    saveToDropbox: 'حفظ في Dropbox',
    
    // Nav & Footer
    termsBtn: 'شروط الاستخدام',
    privacyBtn: 'سياسة الخصوصية',
    cleanRoomBtn: 'عن المشروع',
    bagbackTech: 'BagbackTech',
    portfolio: 'محمد أسامة',
    github: 'GitHub',
    
    // Modals
    termsTitle: 'شروط الاستخدام والخدمة',
    termsBody: `Bagback Download هو تطبيق وإطارية عمل مفتوحة المصدر (Apache 2.0) مخصصة لإدارة وتحميل الوسائط الرقمية والملفات التي يمتلك المستخدم الحق القانوني في حفظها أو الوصول إليها.
- يقر المستخدم بمسؤوليته الكاملة عن أي محتوى يقوم بتحميله أو معالجته عبر التطبيق.
- يُحظر استخدام الخدمة في أي أنشطة تنتهك حقوق الملكية الفكرية أو القوانين المحلية والدولية.
- يتم تقديم البرمجية كما هي (As-Is) دون أي ضمانات صريحة أو ضمنية.`,
    
    privacyTitle: 'سياسة الخصوصية وأمان البيانات',
    privacyBody: `تولي Bagback Digital Solutions أهمية قصوى لخصوصية وسريّة بيانات المستخدمين:
- لا يتم حفظ أي سجلات تتبع (No Tracking) أو تقنيات ملفات تعريف ارتباط (Cookies) خارجية.
- جميع عمليات التحميل تتم مباشرة دون مشاركة بياناتك الشخصية مع أي طرف ثالث.
- يتم حذف الملفات المؤقتة من السيرفر فور اكتمال عملية التحميل أو حسب إعدادات التنفيذ.`,

    cleanRoomTitle: 'بيان المشروع والتطوير المستقل (Clean-Room Policy)',
    cleanRoomBody: `تم بناء Bagback Download بالكامل من الصفر بواسطة المهندس محمد أسامة وشركة Bagback Digital Solutions كمنتج أصلي مفتوح المصدر:
- التزام تام بسياسة Clean-Room Development دون نسخ أي كود أو واجهات من تطبيقات أخرى.
- ترخيص البرمجية: Apache License 2.0 متاح للعامة على ريبوزيتوري GitHub.
- رؤية المنتجات: جزء من منظومة Bagback التقنية للحلول الرقمية المتطورة.`,

    closeModal: 'إغلاق',
  },
  en: {
    appName: 'Bagback Download',
    tagline: 'Free, Open-Source Universal Media & File Download Manager',
    subtagline: 'Built with love for users without profit, by Bagback Digital Solutions & lead developer Mohamed Osama.',
    inputPlaceholder: 'Paste video or media link here...',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    pasteClipboard: '📋 Paste from Clipboard',
    supportedSites: 'YouTube · TikTok · Instagram · Twitter · Facebook · & Thousands More',
    videoTab: '🎬 Video',
    audioTab: '🎵 Audio Only (MP3)',
    selectQuality: 'Select Quality',
    bestQuality: 'Best Quality',
    startDownload: 'Start Download',
    addingDownload: 'Adding...',
    downloading: 'Downloading',
    history: 'Download History',
    clearAll: 'Clear All',
    emptyQueue: 'Paste a link above to start downloading',
    statusQueued: 'Queued',
    statusRunning: 'Downloading',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    openFile: 'Download File',
    deleteItem: 'Delete',
    legalNotice: 'Use this app only with media you have permission to download.',
    localHistoryTitle: 'Local Download History',
    localHistoryEmpty: 'No previous history.',
    loadHistoryUrl: 'Load Link',
    clearLocalHistory: 'Clear Local History',
    saveToDropbox: 'Save to Dropbox',
    
    // Nav & Footer
    termsBtn: 'Terms of Service',
    privacyBtn: 'Privacy Policy',
    cleanRoomBtn: 'About Project',
    bagbackTech: 'BagbackTech',
    portfolio: 'Mohamed Osama',
    github: 'GitHub',
    
    // Modals
    termsTitle: 'Terms of Service & Usage',
    termsBody: `Bagback Download is an open-source utility (Apache 2.0) built for managing and downloading digital media and files that users have explicit legal rights to access.
- Users assume full responsibility for all content processed through the application.
- Infringing upon intellectual property or copyright laws is strictly prohibited.
- Software is provided "As-Is" without warranties of any kind.`,
    
    privacyTitle: 'Privacy Policy & Data Security',
    privacyBody: `Bagback Digital Solutions strictly prioritizes user privacy and security:
- Zero user tracking, zero third-party telemetry, zero commercial trackers.
- Downloads are processed directly without storing personal information.
- Temporary download files are automatically purged from server buffers upon completion.`,

    cleanRoomTitle: 'Clean-Room Engineering Statement',
    cleanRoomBody: `Bagback Download was engineered completely from scratch by Mohamed Osama and Bagback Digital Solutions as an original open-source product:
- Strict compliance with Clean-Room Development standards — zero copied source code or UI assets.
- License: Apache License 2.0 publicly available on GitHub.
- Ecosystem: Proud component of the Bagback Digital Solutions technology suit.`,

    closeModal: 'Close',
  }
} as const;

type DictKeys = keyof typeof dict['ar'];

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

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  timestamp: number;
}

const API = '/api';

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

function truncateUrl(url: string, max = 45): string {
  try {
    const u = new URL(url);
    const display = u.hostname + u.pathname;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.slice(0, max) + (url.length > max ? '…' : '');
  }
}

// SVG Icons
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}

// ─── Dropbox Saver Component ────────────────────────────────────────────────

function DropboxSaver({ url, filename, title }: { url: string; filename: string; title: string }) {
  useEffect(() => {
    if (!document.getElementById('dropboxjs')) {
      const script = document.createElement('script');
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.id = 'dropboxjs';
      // Developer: Replace with your actual Dropbox App Key
      script.setAttribute('data-app-key', 'YOUR_DROPBOX_APP_KEY');
      document.body.appendChild(script);
    }
  }, []);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!(window as any).Dropbox) {
      alert('Dropbox SDK not loaded or AdBlocker preventing it.');
      return;
    }
    const options = {
      files: [{ url: url, filename: filename }],
      success: function () { console.log('Saved to Dropbox successfully!'); },
      progress: function (progress: any) { },
      cancel: function () { },
      error: function (errorMessage: any) { console.error(errorMessage); }
    };
    (window as any).Dropbox.save(options);
  };

  return (
    <button className="icon-btn dropbox-btn" onClick={handleSave} title={title}>
      <CloudIcon />
    </button>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function JobCard({
  job,
  onDelete,
  t,
}: {
  job: Job;
  onDelete: (id: string) => void;
  t: (key: DictKeys) => string;
}) {
  const handleDownload = () => {
    window.open(`${API}/jobs/${job.id}/file`, '_blank');
  };

  const getStatusLabel = (status: Job['status']) => {
    if (status === 'queued') return t('statusQueued');
    if (status === 'running') return t('statusRunning');
    if (status === 'completed') return t('statusCompleted');
    return t('statusFailed');
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
            <>
              <button
                className="icon-btn download-btn"
                onClick={handleDownload}
                title={t('openFile')}
              >
                <DownloadIcon />
              </button>
              <DropboxSaver
                url={`${window.location.origin}${API}/jobs/${job.id}/file`}
                filename={job.fileName || 'download'}
                title={t('saveToDropbox')}
              />
            </>
          )}
          <button
            className="icon-btn delete-btn"
            onClick={() => onDelete(job.id)}
            title={t('deleteItem')}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${job.progress}%` }} />
        </div>
        <div className="progress-meta">
          <span className={`status-text ${job.status}`}>
            {getStatusLabel(job.status)}
            {job.status === 'running' && ` — ${job.progress.toFixed(0)}%`}
          </span>
          <span className="file-size">
            {job.status === 'completed' && job.fileSize
              ? formatSize(job.fileSize)
              : job.error
              ? job.error.slice(0, 50)
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function AnalyzeResultCard({
  result,
  url,
  onDownload,
  t,
}: {
  result: AnalyzeResult;
  url: string;
  onDownload: (opts: { url: string; format: string; audioOnly: boolean }) => void;
  t: (key: DictKeys) => string;
}) {
  const [audioOnly, setAudioOnly] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('bestvideo+bestaudio/best');
  const [loading, setLoading] = useState(false);

  const videoFormats = result.formats
    .filter((f) => f.vcodec && f.vcodec !== 'none' && f.resolution)
    .reduce((acc: Format[], f) => {
      if (!acc.find((x) => x.resolution === f.resolution)) acc.push(f);
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

      <div className="options-row" style={{ marginBottom: '16px' }}>
        <button
          className={`option-chip ${!audioOnly ? 'selected' : ''}`}
          onClick={() => setAudioOnly(false)}
        >
          {t('videoTab')}
        </button>
        <button
          className={`option-chip ${audioOnly ? 'selected' : ''}`}
          onClick={() => setAudioOnly(true)}
        >
          {t('audioTab')}
        </button>
      </div>

      {!audioOnly && videoFormats.length > 0 && (
        <div className="formats-section">
          <div className="formats-label">{t('selectQuality')}</div>
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
              <span className="format-res">{t('bestQuality')}</span>
              <span className="format-ext">Auto</span>
            </button>
          </div>
        </div>
      )}

      <div className="download-actions">
        <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? (
            <><span className="spinner" /> {t('addingDownload')}</>
          ) : (
            <><DownloadIcon /> {t('startDownload')}</>
          )}
        </button>
      </div>
    </div>
  );
}

// Modal component
function InfoModal({
  title,
  body,
  onClose,
  t,
}: {
  title: string;
  body: string;
  onClose: () => void;
  t: (key: DictKeys) => string;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {body.split('\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{t('closeModal')}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Application ──────────────────────────────────────────────────────

function App() {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('bagback-lang') as Lang) || 'ar';
  });
  const [url, setUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('url') || '';
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('bagback-local-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'cleanRoom' | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('bagback-theme') as 'light' | 'dark') || 'dark';
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Translation helper function t(key)
  const t = useCallback((key: DictKeys): string => {
    return dict[lang][key] || dict.ar[key] || '';
  }, [lang]);

  // Update HTML document attributes when language and theme changes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('bagback-lang', lang);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bagback-theme', theme);
  }, [lang, theme]);

  // SSE for jobs instead of polling
  useEffect(() => {
    const eventSource = new EventSource(`${API}/jobs/stream`);
    
    eventSource.onmessage = (e) => {
      try {
        const data: Job[] = JSON.parse(e.data);
        setJobs(data);
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleAnalyze = useCallback(async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) {
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
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze URL');
      setAnalyzeResult(data);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setAnalyzing(false);
    }
  }, [url]);

  // Auto-analyze on load if URL is passed in query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('url');
    if (paramUrl) {
      // Remove it from the URL so refresh doesn't trigger it again
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAnalyze(paramUrl);
    }
  }, [handleAnalyze]);

  const handleDownload = useCallback(async (opts: { url: string; format: string; audioOnly: boolean }) => {
    try {
      if (analyzeResult) {
        setLocalHistory(prev => {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            url: opts.url,
            title: analyzeResult.title,
            thumbnail: analyzeResult.thumbnail,
            timestamp: Date.now()
          };
          const filtered = prev.filter(h => h.url !== opts.url);
          const updated = [newItem, ...filtered].slice(0, 20); // Keep last 20 history items
          localStorage.setItem('bagback-local-history', JSON.stringify(updated));
          return updated;
        });
      }

      const res = await fetch(`${API}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      if (!res.ok) throw new Error('Failed to start download');
      setAnalyzeResult(null);
      setUrl('');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Failed to start download');
    }
  }, [analyzeResult]);

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
      // Permission denied
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
            <img src="/logo-landscape.png" alt="Bagback Download Logo" className="logo-image" style={{ height: '40px', objectFit: 'contain' }} />
          </a>
          <nav className="header-nav">
            <button
              className="nav-btn lang-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="nav-btn lang-btn"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            >
              <GlobeIcon /> {lang === 'ar' ? 'English' : 'عربي'}
            </button>
            <a href="https://bagbacktech.com" target="_blank" rel="noreferrer">
              <button className="nav-btn">{t('bagbackTech')}</button>
            </a>
            <a href="https://github.com/mohamedosamaai/bagback-download" target="_blank" rel="noreferrer">
              <button className="nav-btn">{t('github')}</button>
            </a>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="main">
        <div className="container">
          {/* Hero Section */}
          <div className="hero">
            <div className="hero-eyebrow">
              <CheckIcon /> {t('tagline')}
            </div>
            <h1>{t('appName')}</h1>
            <p className="hero-desc">{t('subtagline')}</p>
          </div>

          {/* Input Card */}
          <div className="input-card">
            <div className="url-input-wrap">
              <input
                ref={inputRef}
                type="url"
                className="url-input"
                placeholder={t('inputPlaceholder')}
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
                onClick={() => handleAnalyze()}
                disabled={analyzing || !url.trim()}
              >
                {analyzing ? (
                  <><span className="spinner" /> {t('analyzing')}</>
                ) : (
                  <><SearchIcon /> {t('analyze')}</>
                )}
              </button>
            </div>

            <div className="options-row">
              <button className="option-chip" onClick={handlePaste}>
                {t('pasteClipboard')}
              </button>
              <span className="supported-hint">{t('supportedSites')}</span>
            </div>
          </div>

          {/* Error Message */}
          {analyzeError && (
            <div className="error-msg">
              ⚠️ {analyzeError}
            </div>
          )}

          {/* Analyze Result Card */}
          {analyzeResult && (
            <AnalyzeResultCard
              result={analyzeResult}
              url={url}
              onDownload={handleDownload}
              t={t}
            />
          )}

          {/* Download Queue / History */}
          {(activeJobs.length > 0 || doneJobs.length > 0) && (
            <div className="queue-section">
              {activeJobs.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="section-header">
                    <div className="section-title">
                      {t('downloading')}
                      <span className="badge">{activeJobs.length}</span>
                    </div>
                  </div>
                  {activeJobs.map((job) => (
                    <JobCard key={job.id} job={job} onDelete={handleDelete} t={t} />
                  ))}
                </div>
              )}

              {doneJobs.length > 0 && (
                <div>
                  <div className="section-header">
                    <div className="section-title">
                      {t('history')}
                      <span className="badge">{doneJobs.length}</span>
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                      onClick={() => Promise.all(doneJobs.map((j) => handleDelete(j.id)))}
                    >
                      {t('clearAll')}
                    </button>
                  </div>
                  {doneJobs.map((job) => (
                    <JobCard key={job.id} job={job} onDelete={handleDelete} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Local History Section */}
          {localHistory.length > 0 && (
            <div className="queue-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <div className="section-title">
                  <HistoryIcon /> {t('localHistoryTitle')}
                  <span className="badge">{localHistory.length}</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                  onClick={() => {
                    setLocalHistory([]);
                    localStorage.removeItem('bagback-local-history');
                  }}
                >
                  {t('clearLocalHistory')}
                </button>
              </div>
              <div className="history-grid">
                {localHistory.map((item) => (
                  <div key={item.id} className="history-card" onClick={() => {
                    setUrl(item.url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // Optional: trigger analyze immediately
                  }}>
                    {item.thumbnail ? (
                      <div className="history-thumb-wrap">
                        <img src={item.thumbnail} alt={item.title} className="history-thumb" />
                      </div>
                    ) : (
                      <div className="history-thumb-wrap empty">
                        <HistoryIcon />
                      </div>
                    )}
                    <div className="history-info">
                      <div className="history-title" dir="ltr">{item.title}</div>
                      <div className="history-url" dir="ltr">{truncateUrl(item.url, 30)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {jobs.length === 0 && !analyzeResult && (
            <div className="empty-state">
              <div className="empty-icon">
                <img src="/apple-icon.png" alt="Bagback Download Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', opacity: 0.8 }} />
              </div>
              <p>{t('emptyQueue')}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <a href="https://bagbacktech.com" target="_blank" rel="noreferrer">
              Bagback Digital Solutions
            </a>{' '}
            · Apache 2.0 License
          </div>

          <div className="footer-links">
            <button className="footer-link-btn" onClick={() => setActiveModal('terms')}>
              {t('termsBtn')}
            </button>
            <button className="footer-link-btn" onClick={() => setActiveModal('privacy')}>
              {t('privacyBtn')}
            </button>
            <button className="footer-link-btn" onClick={() => setActiveModal('cleanRoom')}>
              {t('cleanRoomBtn')}
            </button>
            <a href="https://mohamedosama.me" target="_blank" rel="noreferrer">
              {t('portfolio')}
            </a>
          </div>
        </div>
      </footer>

      {/* Info Modals */}
      {activeModal === 'terms' && (
        <InfoModal
          title={t('termsTitle')}
          body={t('termsBody')}
          onClose={() => setActiveModal(null)}
          t={t}
        />
      )}
      {activeModal === 'privacy' && (
        <InfoModal
          title={t('privacyTitle')}
          body={t('privacyBody')}
          onClose={() => setActiveModal(null)}
          t={t}
        />
      )}
      {activeModal === 'cleanRoom' && (
        <InfoModal
          title={t('cleanRoomTitle')}
          body={t('cleanRoomBody')}
          onClose={() => setActiveModal(null)}
          t={t}
        />
      )}
    </div>
  );
}

// Mount React Root
createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
