import type { Job, FormatInfo, AppLink, UrlAnalysisResult } from '../packages/core/src/index.js';

/**
 * Mock Client for Bagback Download SDK Interface Showcase
 * Demonstrates type consumption and client contract integration.
 */
export class BagbackDownloadClient {
  private baseUrl: string;

  constructor(baseUrl = 'https://download.bagbacktech.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze media URL to retrieve available formats and metadata
   */
  async analyze(url: string): Promise<UrlAnalysisResult> {
    console.log(`[Showcase Mock Client] Analyzing: ${url}`);
    return {
      supported: true,
      title: 'Showcase Demo Media',
      formats: [
        { id: 'bestvideo+bestaudio/best', ext: 'mp4', resolution: '1080p (Best)' },
        { id: '720p', ext: 'mp4', resolution: '720p HD' },
        { id: 'bestaudio/best', ext: 'mp3', resolution: 'Audio MP3' },
      ],
    };
  }

  /**
   * Request a new download job
   */
  async requestDownload(url: string, format?: string, audioOnly = false): Promise<{ id: string }> {
    console.log(`[Showcase Mock Client] Requesting download: ${url} (format: ${format || 'default'}, audioOnly: ${audioOnly})`);
    return { id: 'mock-job-uuid-12345' };
  }

  /**
   * Check status of a download job
   */
  async getJob(id: string): Promise<Job> {
    const now = new Date().toISOString();
    return {
      id,
      url: 'https://example.com/video',
      status: 'completed',
      progress: 100,
      title: 'Showcase Demo Media',
      format: 'bestvideo+bestaudio/best',
      createdAt: now,
      updatedAt: now,
    };
  }
}
