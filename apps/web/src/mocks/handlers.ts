import { Format, AnalyzeResult } from '../types';

export const mockFormats: Format[] = [
  { id: 'bestvideo+bestaudio/best', ext: 'mp4', resolution: '1080p (Best)' },
  { id: '720p', ext: 'mp4', resolution: '720p HD' },
  { id: '480p', ext: 'mp4', resolution: '480p SD' },
  { id: '360p', ext: 'mp4', resolution: '360p' },
  { id: 'bestaudio/best', ext: 'mp3', resolution: 'Audio MP3' }
];

export function getMockMetadata(url: string): AnalyzeResult {
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return {
      title: "Advanced Agentic Coding with Gemini 3.5 Pro",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop",
      duration: 352,
      uploader: "Google DeepMind",
      formats: mockFormats
    };
  }
  if (/tiktok\.com/i.test(url)) {
    return {
      title: "AI Digital Transformation Architecture Trends for 2027",
      thumbnail: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=640&auto=format&fit=crop",
      duration: 60,
      uploader: "mohamed.osama",
      formats: mockFormats
    };
  }
  if (/instagram\.com/i.test(url)) {
    return {
      title: "Bagback Download Launch - Open Source Universal Downloader",
      thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&auto=format&fit=crop",
      duration: 120,
      uploader: "bagback.tech",
      formats: mockFormats
    };
  }
  if (/twitter\.com|x\.com/i.test(url)) {
    return {
      title: "Exciting updates on agentic frameworks and LLM orchestration!",
      thumbnail: "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=640&auto=format&fit=crop",
      duration: 45,
      uploader: "Mohamed Osama",
      formats: mockFormats
    };
  }
  return {
    title: "Extracted web media file from link",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&auto=format&fit=crop",
    duration: 180,
    uploader: "Web Media",
    formats: mockFormats
  };
}
