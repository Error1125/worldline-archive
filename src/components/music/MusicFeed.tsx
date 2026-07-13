import { useEffect, useMemo, useState } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import MotionList from "@/components/motion/MotionList";
import VinylRecordCard from "@/components/music/VinylRecordCard";
import { initializeMusicPlaylist } from "@/lib/music/store";
import type { MusicArchiveTrack } from "@/lib/apple-music/types";

type Props = { items: MusicArchiveTrack[]; kinds: { value: string; label: string; count: number }[]; tags: { value: string; count: number }[] };
export default function MusicFeed({ items, kinds, tags }: Props) {
  const [kind, setKind] = useState("all"); const [tag, setTag] = useState("all"); const [rawQuery, setRawQuery] = useState(""); const [query, setQuery] = useState(""); const [sort, setSort] = useState<"newest" | "oldest">("newest");
  useEffect(() => { initializeMusicPlaylist(items); }, [items]);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(rawQuery.toLowerCase()), 100); return () => window.clearTimeout(timer); }, [rawQuery]);
  const records = useMemo(() => items.filter((item) => {
    const searchable = [item.title, item.artist, item.album, item.thoughts, item.tags.join(" "), item.genres.join(" ")].filter(Boolean).join(" ").toLowerCase();
    return (kind === "all" || item.kind === kind) && (tag === "all" || item.tags.includes(tag)) && (!query || searchable.includes(query));
  }).sort((a, b) => sort === "newest" ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)), [items, kind, tag, query, sort]);
  return <section data-motion-managed="react" data-motion-scene="music">
    <div className="music-toolbar"><div className="filter-group"> <button className="filter-chip" data-active={kind === "all"} onClick={() => setKind("all")}>全部</button>{kinds.map((item) => <button key={item.value} className="filter-chip" data-active={kind === item.value} onClick={() => setKind(item.value)}>{item.label}</button>)}</div>
      <div className="filter-group music-tag-filters"><button className="filter-chip" data-active={tag === "all"} onClick={() => setTag("all")}>全部标签</button>{tags.map((item) => <button key={item.value} className="filter-chip" data-active={tag === item.value} onClick={() => setTag(item.value)}>#{item.value}</button>)}</div>
      <div className="music-toolbar-bottom"><label className="filter-search"><span aria-hidden="true">⌕</span><input value={rawQuery} onChange={(event) => setRawQuery(event.target.value)} placeholder="搜索标题、艺术家、专辑…" aria-label="搜索音乐档案" /></label><FilterSelect value={sort} onChange={setSort} options={[{ value: "newest", label: "最新" }, { value: "oldest", label: "最早" }]} /><span className="music-result-count">{records.length} records</span></div>
    </div>
    {records.length ? <MotionList id="music-feed" scene="music" items={records} getKey={(item) => item.id} className="vinyl-shelf" renderItem={(item) => <div className="vinyl-record-slot"><VinylRecordCard track={item} /></div>} /> : <div className="filter-empty glass">没有匹配的音乐档案</div>}
  </section>;
}
