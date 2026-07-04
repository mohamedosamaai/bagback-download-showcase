export type JobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export type JobItem = {
  id: string;
  url: string;
  title?: string;
  status: JobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
};

export type AppLink = {
  label: string;
  url: string;
};

export const bagbackLinks: AppLink[] = [
  { label: 'Bagback Tech', url: 'https://bagbacktech.com' },
  { label: 'Elitk', url: 'https://elitk.com' },
  { label: 'Library', url: 'https://library.elitk.com' },
  { label: 'Mohamed Osama', url: 'https://mohamedosama.me' }
];
