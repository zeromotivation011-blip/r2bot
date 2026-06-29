// Shared types + small formatters for the India robotics job board.

export type JobTrack = 'spark' | 'wire' | 'forge' | 'edge' | 'all';

export type Job = {
  id: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  skills: string[];
  description: string | null;
  apply_url: string;
  source: string;
  posted_at: string | null;
  fetched_at: string | null;
  is_active: boolean;
  track_relevance: JobTrack | null;
};

export const TRACK_LABEL: Record<JobTrack, string> = {
  spark: 'Spark',
  wire: 'Wire',
  forge: 'Forge',
  edge: 'Edge',
  all: 'All levels',
};

export const TRACK_ACCENT: Record<JobTrack, string> = {
  spark: '#00B8D4',
  wire: '#A56BFF',
  forge: '#00E5FF',
  edge: '#FFB800',
  all: '#8893A4',
};

export const CITY_OPTIONS = [
  'All Cities',
  'Bangalore',
  'Mumbai',
  'Pune',
  'Hyderabad',
  'Chennai',
  'Delhi',
  'Remote',
] as const;

export type CityFilter = (typeof CITY_OPTIONS)[number];

export type ExperienceBucket = 'all' | 'fresher' | 'junior' | 'mid' | 'senior';

export const EXPERIENCE_LABEL: Record<ExperienceBucket, string> = {
  all: 'All',
  fresher: 'Fresher (0–1yr)',
  junior: 'Junior (1–3yr)',
  mid: 'Mid (3–6yr)',
  senior: 'Senior (6+yr)',
};

export function bucketForExperience(exp: number | null | undefined): ExperienceBucket {
  if (exp === null || exp === undefined) return 'all';
  if (exp <= 1) return 'fresher';
  if (exp <= 3) return 'junior';
  if (exp <= 6) return 'mid';
  return 'senior';
}

export function formatSalary(job: Pick<Job, 'salary_min' | 'salary_max'>): string {
  const min = job.salary_min;
  const max = job.salary_max;
  if (!min && !max) return 'Salary not disclosed';
  const toLpa = (n: number) => {
    const lpa = n / 100000;
    return lpa >= 10 ? lpa.toFixed(0) : lpa.toFixed(1).replace(/\.0$/, '');
  };
  if (min && max && min !== max) return `₹${toLpa(min)}–${toLpa(max)} LPA`;
  return `₹${toLpa(max ?? min ?? 0)} LPA`;
}

export function formatExperience(job: Pick<Job, 'experience_min' | 'experience_max'>): string {
  const a = job.experience_min;
  const b = job.experience_max;
  if (a === null && b === null) return 'Experience not specified';
  if (a !== null && b !== null && a !== b) return `${a}–${b} yrs`;
  const v = a ?? b;
  if (v === 0) return 'Fresher';
  return `${v} yrs`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'Recently';
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (diff < hour) return 'Just posted';
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  if (diff < week) {
    const d = Math.floor(diff / day);
    return d === 1 ? '1 day ago' : `${d} days ago`;
  }
  if (diff < 4 * week) {
    const w = Math.floor(diff / week);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  return new Date(iso).toLocaleDateString();
}

export function locationMatches(location: string, city: CityFilter): boolean {
  if (city === 'All Cities') return true;
  const loc = location.toLowerCase();
  if (city === 'Remote') return /remote|wfh|work from home|anywhere/.test(loc);
  if (city === 'Bangalore') return /bangalore|bengaluru/.test(loc);
  return loc.includes(city.toLowerCase());
}
