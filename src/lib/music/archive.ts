import { withBase } from "@/lib/paths";
import type { MusicArchiveTrack } from "@/lib/apple-music/types";

type MusicData = {
  title: string; artist: string; album?: string; date: Date; type: "song" | "album" | "playlist";
  cover?: string; tags: string[]; mood?: string; moods?: string[]; comment?: string; thoughts?: string;
  featured?: boolean; appleMusicUrl?: string;
  appleMusic?: { url?: string; artworkUrl?: string; previewUrl?: string; releaseDate?: string; durationMs?: number; genres?: string[] };
  rating?: number; status?: MusicArchiveTrack["status"];
};

type MusicEntry = { id: string; data: MusicData };

const validExternalUrl = (url?: string) => Boolean(url && /^https?:\/\//i.test(url));

/** The sole compatibility boundary between Astro collection entries and music UI. */
export function mapMusicArchiveEntry(entry: MusicEntry): MusicArchiveTrack {
  const { data } = entry;
  const appleMusicUrl = validExternalUrl(data.appleMusic?.url) ? data.appleMusic!.url : validExternalUrl(data.appleMusicUrl) ? data.appleMusicUrl : undefined;
  const artworkUrl = data.appleMusic?.artworkUrl || data.cover;
  return {
    id: entry.id,
    slug: entry.id,
    href: withBase(`/music/${entry.id}`),
    kind: data.type,
    title: data.title,
    artist: data.artist,
    album: data.album,
    artworkUrl,
    appleMusicUrl,
    previewUrl: validExternalUrl(data.appleMusic?.previewUrl) ? data.appleMusic?.previewUrl : undefined,
    durationMs: data.appleMusic?.durationMs,
    releaseDate: data.appleMusic?.releaseDate,
    genres: data.appleMusic?.genres ?? [],
    date: data.date.toISOString(),
    tags: data.tags ?? [],
    moods: data.moods?.length ? data.moods : data.mood ? [data.mood] : [],
    thoughts: data.thoughts ?? data.comment,
    rating: data.rating,
    status: data.status,
    featured: data.featured === true,
  };
}

export function selectFeaturedRecord(items: MusicArchiveTrack[]): MusicArchiveTrack | undefined {
  return [...items].sort((a, b) => +new Date(b.date) - +new Date(a.date)).find((item) => item.featured) ??
    [...items].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
}
