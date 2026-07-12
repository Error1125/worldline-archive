import type { CSSProperties } from "react";
import { formatDate } from "@/lib/format";

export interface PhotoFeedItem {
  id: string;
  title: string;
  date: string;
  album?: string;
  description?: string;
  tags: string[];
  mood?: string;
  location?: string;
  href: string;
  images: string[];
}

interface Props {
  item: PhotoFeedItem;
  style?: CSSProperties;
}

export default function PhotoPolaroidCard({ item, style }: Props) {
  const cover = item.images[0];
  const extra = Math.max(item.images.length - 1, 0);
  const date = formatDate(item.date);

  return (
    <a
      href={item.href}
      data-astro-reload
      className="photo-tile photo-stack group block w-full text-left"
      aria-label={`打开相册：${item.title}`}
      style={style}
    >
      {item.images.length >= 3 && (
        <span className="photo-stack-back b2" aria-hidden="true">
          <span className="photo-stack-back-img" style={{ backgroundImage: `url("${item.images[2]}")` }} />
        </span>
      )}
      {item.images.length >= 2 && (
        <span className="photo-stack-back b1" aria-hidden="true">
          <span className="photo-stack-back-img" style={{ backgroundImage: `url("${item.images[1]}")` }} />
        </span>
      )}

      <figure className="photo-polaroid">
        <div className="photo-polaroid-frame">
          {cover ? <img src={cover} alt={item.title} loading="lazy" /> : <div className="photo-polaroid-fallback" aria-hidden="true" />}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          {extra > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-[var(--ia-line-strong)] bg-black/45 px-2 py-0.5 mono text-[11px] text-[var(--ia-star)] backdrop-blur">
              <span aria-hidden="true">▣</span> +{extra}
            </div>
          )}
          {item.album && <span className="absolute left-2 top-2 tag-chip backdrop-blur">{item.album}</span>}
          <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="grid size-10 place-items-center rounded-full border border-white/40 bg-black/40 text-white backdrop-blur">
              <span aria-hidden="true">↗</span>
            </span>
          </span>
        </div>

        <figcaption className="photo-polaroid-cap">
          <span className="photo-polaroid-title">{item.title}</span>
          <time className="photo-polaroid-date" dateTime={item.date}>{date}</time>
        </figcaption>

        {(item.description || item.mood) && (
          <div className="flex items-center justify-between gap-2 px-0.5 pt-1">
            {item.description ? <span className="line-clamp-1 text-[11px] leading-snug text-[var(--ia-mist)]">{item.description}</span> : <span />}
            {item.mood && <span className="shrink-0 mono text-[10px] text-[var(--ia-nebula)]">◇ {item.mood}</span>}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between px-0.5 mono text-[10px] text-[var(--ia-mist)]">
          <span>{item.images.length} photos</span>
          <span>{item.location ?? ""}</span>
        </div>

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-0.5 pt-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span className="mono text-[10px] text-[var(--ia-mist)] opacity-70" key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </figure>
    </a>
  );
}
