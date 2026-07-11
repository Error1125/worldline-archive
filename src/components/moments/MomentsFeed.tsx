import { useMemo, useState } from "react";
import MotionList from "@/components/motion/MotionList";

export interface MomentFeedItem {
  id: string;
  content: string;
  date: string;
  href: string;
  tags: string[];
  mood?: string;
  weather?: string;
  locationText?: string;
  images: string[];
}

interface FilterOption {
  value: string;
  count: number;
}

interface Props {
  moments: MomentFeedItem[];
  moods: FilterOption[];
  tags: FilterOption[];
}

function displayDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function MomentCard({ moment }: { moment: MomentFeedItem }) {
  const meta = [moment.mood, moment.weather, moment.locationText].filter(Boolean);

  return (
    <div className="moments-motion-card">
      <div className="glass-card group relative flex h-full flex-col gap-3 p-5">
        <a href={moment.href} className="card-link-overlay" aria-label="View moment" />
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow flex items-center gap-1.5">
            <span className="text-[var(--ia-neon)]" aria-hidden="true">✦</span>
            MOMENT // 说说
          </span>
          <time className="mono text-[11px] text-[var(--ia-mist)]" dateTime={moment.date}>{displayDate(moment.date)}</time>
        </div>

        <p className="relative z-10 whitespace-pre-line text-[15px] leading-relaxed text-[var(--ia-ink)]">{moment.content}</p>

        {moment.images.length > 0 && (
          <div className={`relative z-10 grid gap-2 ${moment.images.length === 1 ? "aspect-[4/3] grid-cols-1" : moment.images.length === 2 ? "grid-cols-2" : "grid-cols-[1.35fr_1fr]"}`}>
            {moment.images.map((src, index) => (
              <div key={src} className={`overflow-hidden rounded-lg border border-[var(--ia-line)] ${moment.images.length === 1 ? "" : "aspect-square"} ${moment.images.length === 3 && index === 0 ? "row-span-2 aspect-auto" : ""}`}>
                <img src={src} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
          {moment.tags.slice(0, 2).map((tag) => <span className="tag-chip" key={tag}>#{tag}</span>)}
          {meta.length > 0 && <span className="mono text-[11px] text-[var(--ia-mist)]">{meta.map((item) => `· ${item}`).join(" ")}</span>}
        </div>
      </div>
    </div>
  );
}

export default function MomentsFeed({ moments, moods, tags }: Props) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const visibleMoments = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return moments
      .filter((moment) => {
        if (mood !== "all" && moment.mood !== mood) return false;
        if (tag !== "all" && !moment.tags.includes(tag)) return false;
        const searchable = [moment.content, moment.mood, moment.weather, moment.locationText, ...moment.tags].filter(Boolean).join(" ").toLocaleLowerCase();
        return terms.every((term) => searchable.includes(term));
      })
      .sort((a, b) => sort === "newest" ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date));
  }, [moments, mood, query, sort, tag]);

  return (
    <section className="moments-island" aria-label="说说流">
      <div className="filter-panel mb-8 flex flex-col gap-4 p-4 sm:p-5">
        {(moods.length > 0 || tags.length > 0) && (
          <details className="moment-filter-details">
            <summary className="cursor-pointer mono text-[11px] text-[var(--ia-mist)]">FILTERS // mood · tags</summary>
            {moods.length > 0 && <div className="filter-bar"><span className="mono shrink-0 text-[11px] uppercase tracking-wider text-[var(--ia-mist)]">心情</span><div className="filter-group" role="group" aria-label="按心情筛选"><button type="button" className="filter-chip" data-active={mood === "all"} onClick={() => setMood("all")}>全部 <span className="chip-count">{moments.length}</span></button>{moods.map((item) => <button type="button" className="filter-chip" data-active={mood === item.value} onClick={() => setMood(item.value)} key={item.value}>{item.value} <span className="chip-count">{item.count}</span></button>)}</div></div>}
            {tags.length > 0 && <div className="filter-bar"><span className="mono shrink-0 text-[11px] uppercase tracking-wider text-[var(--ia-mist)]">标签</span><div className="filter-group" role="group" aria-label="按标签筛选"><button type="button" className="filter-chip" data-active={tag === "all"} onClick={() => setTag("all")}>全部</button>{tags.map((item) => <button type="button" className="filter-chip" data-active={tag === item.value} onClick={() => setTag(item.value)} key={item.value}>#{item.value} <span className="chip-count">{item.count}</span></button>)}</div></div>}
          </details>
        )}
        <div className="filter-bar">
          <label className="filter-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索这些碎碎念…" aria-label="搜索说说" /></label>
          <div className="filter-group" role="group" aria-label="排序方式"><button type="button" className="filter-chip" data-active={sort === "newest"} onClick={() => setSort("newest")}>最新</button><button type="button" className="filter-chip" data-active={sort === "oldest"} onClick={() => setSort("oldest")}>最早</button></div>
          <span className="filter-count-line">{visibleMoments.length} moments</span>
        </div>
      </div>

      <MotionList id="moments-feed" scene="moments" items={visibleMoments} getKey={(moment) => moment.id} className="moments-feed grid gap-5 sm:grid-cols-2" renderItem={(moment) => <MomentCard moment={moment} />} />

      {visibleMoments.length === 0 && <div className="filter-empty glass" data-show="true"><p className="text-sm text-[var(--ia-ink)]">没有匹配的说说</p><p className="mono mt-1 text-xs text-[var(--ia-mist)] opacity-70">// no moments match this filter</p></div>}
    </section>
  );
}
