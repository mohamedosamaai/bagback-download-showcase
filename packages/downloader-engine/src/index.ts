export type SourceSupport = 'supported' | 'unsupported' | 'needs_review';

export type AnalyzeResult = {
  url: string;
  support: SourceSupport;
  reason?: string;
};

export function analyzeUrl(url: string): AnalyzeResult {
  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        url,
        support: 'unsupported',
        reason: 'Only HTTP and HTTPS links are accepted.'
      };
    }

    return {
      url,
      support: 'needs_review',
      reason: 'Engine integration is pending source review.'
    };
  } catch {
    return {
      url,
      support: 'unsupported',
      reason: 'Invalid URL.'
    };
  }
}
