// Shared types + helpers for the project showcase.

export type ProjectTrack = 'spark' | 'wire' | 'forge' | 'edge';
export type ProjectStatus = 'pending' | 'approved' | 'rejected';

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  track: ProjectTrack;
  video_url: string | null;
  github_url: string | null;
  demo_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  upvotes: number;
  status: ProjectStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export const TRACK_LABEL: Record<ProjectTrack, string> = {
  spark: 'Spark',
  wire: 'Wire',
  forge: 'Forge',
  edge: 'Edge',
};

export const TRACK_ACCENT: Record<ProjectTrack, string> = {
  spark: '#00B8D4',
  wire: '#A56BFF',
  forge: '#00E5FF',
  edge: '#FFB800',
};

/** Pull the YouTube video id from any of the common URL shapes; return null if not a YouTube URL. */
export function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export function isLoomUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').endsWith('loom.com');
  } catch {
    return false;
  }
}

/** Used by both client preview and server-side validation. */
export function isAllowedVideoUrl(url: string): boolean {
  return youtubeVideoId(url) !== null || isLoomUrl(url);
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'Recently';
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return 'Just now';
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  if (diff < 7 * day) {
    const d = Math.floor(diff / day);
    return d === 1 ? '1 day ago' : `${d} days ago`;
  }
  return new Date(iso).toLocaleDateString();
}

export function shortAuthor(email: string | null | undefined, displayName: string | null | undefined): string {
  const base = (displayName || email || 'Anonymous').trim();
  const parts = base.split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0) return 'Anonymous';
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? '';
  return lastInitial ? `${first} ${lastInitial}.` : first;
}
