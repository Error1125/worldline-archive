import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import MotionList from "@/components/motion/MotionList";
import FilterSelect from "@/components/ui/FilterSelect";
import PhotoPolaroidCard, { type PhotoFeedItem } from "@/components/photos/PhotoPolaroidCard";

type SortValue = "newest" | "oldest";

interface AlbumOption {
  value: string;
  count: number;
}

interface Props {
  items: PhotoFeedItem[];
  albums: AlbumOption[];
}

const sortOptions: { value: SortValue; label: string }[] = [
  { value: "newest", label: "最新" },
  { value: "oldest", label: "最早" },
];

function seededStyle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;

  const rotate = (((hash % 45) / 10) - 2.2).toFixed(1);
  const shiftX = (((Math.floor(hash / 7) % 17) - 8)).toString();
  const shiftY = (((Math.floor(hash / 13) % 19) - 6)).toString();

  return {
    "--photo-rotate": `${rotate}deg`,
    "--photo-shift-x": `${shiftX}px`,
    "--photo-shift-y": `${shiftY}px`,
  } as CSSProperties;
}

export default function PhotosFeed({ items, albums }: Props) {
  const [album, setAlbum] = useState("all");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortValue>("newest");

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery.trim().toLowerCase()), 100);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => album === "all" || item.album === album)
      .filter((item) => {
        if (!query) return true;
        const searchable = [
          item.title,
          item.description ?? "",
          item.album ?? "",
          item.mood ?? "",
          item.location ?? "",
          ...item.tags,
        ].join(" ").toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => {
        const left = +new Date(a.date);
        const right = +new Date(b.date);
        return sort === "newest" ? right - left : left - right;
      });
  }, [album, items, query, sort]);

  return (
    <div data-motion-managed="react" data-motion-scene="photos">
      <div className="filter-panel photos-filter-panel mb-8 flex flex-col gap-3 p-4 sm:p-5">
        <div className="filter-bar">
          <div className="filter-group photos-album-chips" role="group" aria-label="按相册筛选">
            <button type="button" className="filter-chip" data-active={album === "all"} onClick={() => setAlbum("all")}>
              全部 <span className="chip-count">{items.length}</span>
            </button>
            {albums.map((option) => (
              <button
                type="button"
                className="filter-chip"
                data-active={album === option.value}
                key={option.value}
                onClick={() => setAlbum(option.value)}
              >
                {option.value} <span className="chip-count">{option.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-bar photos-toolbar-main">
          <label className="filter-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={rawQuery}
              onChange={(event) => setRawQuery(event.target.value)}
              placeholder="搜索照片…"
              aria-label="搜索照片"
            />
          </label>
          <FilterSelect value={sort} onChange={setSort} options={sortOptions} />
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <MotionList
          id="photos-feed"
          scene="photos"
          items={visibleItems}
          getKey={(item) => item.id}
          className="photo-wall"
          renderItem={(item) => (
            <div className="photo-motion-slot">
              <PhotoPolaroidCard item={item} style={seededStyle(item.id)} />
            </div>
          )}
        />
      ) : (
        <div className="filter-empty glass" data-show="true">
          <p className="text-sm text-[var(--ia-ink)]">没有匹配的照片</p>
          <p className="mono mt-1 text-xs text-[var(--ia-mist)] opacity-70">// no photos match this filter</p>
        </div>
      )}
    </div>
  );
}
