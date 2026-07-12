import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import FilterSelect from "@/components/ui/FilterSelect";
import { layoutSpring } from "@/lib/motion/presets";

export type WorldlineView = "timeline" | "observation";
export type WorldlineSort = "latest" | "oldest";
export type WorldlineRecord = { id: string; type: string; label: string; title: string; description?: string; date: string; href?: string; tags: string[]; color: string };
type TypeMeta = { type: string; label: string; color: string };

export default function WorldlineRecordsExplorer({ items, types, initialView = "timeline" }: { items: WorldlineRecord[]; types: TypeMeta[]; initialView?: WorldlineView }) {
  const [view, setView] = useState<WorldlineView>(initialView);
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<WorldlineSort>("latest");
  const reduced = useReducedMotion() ?? false;
  const tabsId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(rawQuery.trim().toLowerCase()), 100);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  useEffect(() => {
    const syncFromLocation = () => setView(new URLSearchParams(window.location.search).get("view") === "index" ? "observation" : "timeline");
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  const filteredRecords = useMemo(() => items
    .filter((record) => type === "all" || record.type === type)
    .filter((record) => !debouncedQuery || `${record.title} ${record.description ?? ""} ${record.tags.join(" ")} ${record.type} ${record.label}`.toLowerCase().includes(debouncedQuery))
    .sort((a, b) => sort === "latest" ? +new Date(b.date) - +new Date(a.date) : +new Date(a.date) - +new Date(b.date)), [items, type, debouncedQuery, sort]);
  const counts = useMemo(() => items.reduce((map, item) => map.set(item.type, (map.get(item.type) ?? 0) + 1), new Map<string, number>()), [items]);

  const chooseView = (next: WorldlineView) => {
    if (next === view) return;
    setView(next);
    const url = new URL(window.location.href);
    if (next === "observation") url.searchParams.set("view", "index"); else url.searchParams.delete("view");
    window.history.pushState(null, "", url);
  };

  return <section data-motion-managed="react">
    <div className="view-toggle mb-5" role="tablist" aria-label="世界线记录视图">
      <button id={`${tabsId}-timeline`} type="button" className="view-toggle-btn" role="tab" aria-controls={`${tabsId}-stage`} aria-selected={view === "timeline"} onClick={() => chooseView("timeline")}>时间轴</button>
      <button id={`${tabsId}-observation`} type="button" className="view-toggle-btn" role="tab" aria-controls={`${tabsId}-stage`} aria-selected={view === "observation"} onClick={() => chooseView("observation")}>观测索引</button>
    </div>
    <div className="filter-panel worldline-toolbar mb-8 flex flex-col gap-3 p-4 sm:p-5">
      <div className="filter-bar worldline-toolbar-main">
        <label className="filter-search"><span aria-hidden>⌕</span><input type="search" value={rawQuery} onChange={(event) => setRawQuery(event.target.value)} placeholder="搜索标题、摘要、标签或类型" aria-label="搜索世界线记录" /></label>
        <FilterSelect value={sort} onChange={setSort} options={[{ value: "latest", label: "最新" }, { value: "oldest", label: "最早" }]} />
        <span className="filter-count-line" aria-live="polite">{filteredRecords.length} records</span>
      </div>
      <div className="filter-group worldline-type-chips" role="group" aria-label="按类型筛选">
        <button type="button" className="filter-chip" data-active={type === "all"} onClick={() => setType("all")}>全部 <span className="chip-count">{items.length}</span></button>
        {types.map((item) => <button key={item.type} type="button" className="filter-chip" data-active={type === item.type} style={{ "--acc": item.color } as React.CSSProperties} onClick={() => setType(item.type)}><span className="chip-dot" />{item.label} <span className="chip-count">{counts.get(item.type) ?? 0}</span></button>)}
      </div>
    </div>
    <LayoutGroup id="worldline-records-stage">
      <motion.div id={`${tabsId}-stage`} role="tabpanel" aria-labelledby={`${tabsId}-${view}`} layout="size" transition={reduced ? { duration: 0.1 } : layoutSpring} className="worldline-view-stage">
        <AnimatePresence mode="wait" initial={false}>
          {view === "timeline" ? <TimelineRecordsView key="timeline" records={filteredRecords} sort={sort} reduced={reduced} /> : <ObservationRecordsView key="observation" records={filteredRecords} reduced={reduced} />}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  </section>;
}

function TimelineRecordsView({ records, sort, reduced }: { records: WorldlineRecord[]; sort: WorldlineSort; reduced: boolean }) {
  const groups = useMemo(() => { const map = new Map<number, WorldlineRecord[]>(); records.forEach((record) => { const year = new Date(record.date).getFullYear(); map.set(year, [...(map.get(year) ?? []), record]); }); return [...map.entries()].sort(([a], [b]) => sort === "latest" ? b - a : a - b); }, [records, sort]);
  return <motion.div className="worldline-stage-panel" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: reduced ? 0.1 : 0.18 }}>
    {groups.length === 0 ? <EmptyState /> : groups.map(([year, entries]) => <motion.section layout="position" key={year} className="timeline-year mb-10"><div className="mb-4 flex items-center gap-3"><h2 className="font-serif text-3xl font-bold text-[var(--ia-ink)]">{year}</h2><span className="mono text-[11px] text-[var(--ia-mist)]">{entries.length} records</span><span className="h-px flex-1 bg-[var(--ia-line)]" /></div><div className="relative pl-6"><motion.span className="timeline-line absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-[var(--ia-line-strong)] via-[var(--ia-line)] to-transparent" style={{ transformOrigin: "top" }} initial={reduced ? false : { scaleY: 0, opacity: 0.35 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ duration: reduced ? 0 : 0.28 }} /> <ul className="flex flex-col gap-5">{entries.map((record, index) => <motion.li layout="position" key={record.id} className="timeline-record relative" initial={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduced ? 0.1 : 0.18, delay: reduced ? 0 : Math.min(index, 5) * 0.025 }}><span className="timeline-node absolute -left-[21px] top-2 grid size-3.5 place-items-center rounded-full ring-2 ring-[var(--ia-bg)]" style={{ background: record.color, boxShadow: `0 0 10px ${record.color}` }} /> <RecordCard record={record} timeline /></motion.li>)}</ul></div></motion.section>)}</motion.div>;
}

function ObservationRecordsView({ records, reduced }: { records: WorldlineRecord[]; reduced: boolean }) {
  return <motion.div className="worldline-stage-panel observation-grid" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: reduced ? 0.1 : 0.2 }}>
    {records.length === 0 ? <EmptyState /> : records.map((record, index) => <motion.div layout="position" key={record.id} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0.1 : 0.18, delay: reduced ? 0 : Math.min(index, 5) * 0.025 }}><RecordCard record={record} /></motion.div>)}
  </motion.div>;
}

function RecordCard({ record, timeline = false }: { record: WorldlineRecord; timeline?: boolean }) { const content = <><div className="oc-top"><span className="oc-badge" style={{ color: record.color, borderColor: `color-mix(in srgb, ${record.color} 42%, transparent)` }}>{record.label}</span><time className="mono text-[10px] text-[var(--ia-mist)]">{new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(record.date))}</time></div><h3 className="oc-title text-[var(--ia-ink)]">{record.title}</h3>{record.description && <p className="oc-summary text-[var(--ia-mist)]">{record.description}</p>}{record.tags.length > 0 && <div className="mt-auto flex flex-wrap gap-1 pt-1">{record.tags.slice(0, 3).map((tag) => <span className="tag-chip" key={tag}>{tag}</span>)}</div>}</>; const className = timeline ? "glass-card clickable block rounded-xl p-4" : "observation-card glass-card clickable group"; return record.href ? <a href={record.href} className={className}>{content}</a> : <div className={className}>{content}</div>; }
function EmptyState() { return <div className="filter-empty glass col-span-full">没有匹配的存档记录。</div>; }
