import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SearchDoc } from "@/lib/content";
import { withBase } from "@/lib/paths";

/**
 * SearchBox —— 纯客户端搜索。
 * 第一版基于构建期生成的静态 index（SearchDoc[]），在标题/描述/标签/类型上做匹配。
 * 无后端。未来可替换为 Pagefind（见 /search 页面与 README 的 TODO）。
 */
interface Props {
  index: SearchDoc[];
}

const TYPE_COLOR: Record<string, string> = {
  post: "var(--ia-neon)",
  moment: "var(--ia-star)",
  bug: "var(--ia-danger)",
  project: "var(--ia-nebula)",
  anime: "var(--ia-success)",
  music: "var(--ia-warning)",
  photo: "var(--ia-mist)",
};

export default function SearchBox({ index }: Props) {
  // 首页大搜索框以 GET ?q= 跳转过来；client:only 组件可直接读 location（保守起见仍做 window 守卫）
  const [q, setQ] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("q") ?? ""),
  );

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const tokens = query.split(/\s+/);
    return index
      .filter((doc) => {
        const hay = [doc.title, doc.description, doc.typeLabelZh, ...doc.tags]
          .join(" ")
          .toLowerCase();
        return tokens.every((tk) => hay.includes(tk));
      })
      .slice(0, 40);
  }, [q, index]);

  const showEmpty = q.trim().length > 0 && results.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 输入框 */}
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[var(--ia-mist)]" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索文章 / 说说 / 番剧 / 音乐 / 项目 / Bug…"
          autoFocus
          className="w-full bg-transparent text-sm text-[var(--ia-ink)] outline-none placeholder:text-[var(--ia-mist)]"
        />
        {q && (
          <span className="shrink-0 font-mono text-[11px] text-[var(--ia-mist)]">{results.length} 条</span>
        )}
      </div>

      {/* 结果 */}
      {showEmpty && (
        <div className="glass rounded-2xl px-6 py-10 text-center">
          <p className="text-sm text-[var(--ia-ink)]">没有找到匹配的存档</p>
          <p className="mt-1 font-mono text-xs text-[var(--ia-mist)] opacity-70">// no records match "{q}"</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {results.map((doc, i) => (
            <motion.a
              key={doc.href + doc.title + i}
              href={withBase(doc.href)}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.02, 0.2) }}
              className="clickable glass-card group flex items-center gap-3 rounded-xl px-4 py-3"
            >
              <span
                className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                style={{
                  color: TYPE_COLOR[doc.type] ?? "var(--ia-mist)",
                  border: `1px solid color-mix(in srgb, ${TYPE_COLOR[doc.type] ?? "var(--ia-mist)"} 40%, transparent)`,
                }}
              >
                {doc.typeLabelZh}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[var(--ia-ink)] group-hover:text-[var(--ia-star)]">
                  {doc.title}
                </span>
                {doc.description && (
                  <span className="block truncate text-xs text-[var(--ia-mist)]">{doc.description}</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-[var(--ia-mist)]">
                {doc.date.slice(0, 10)}
              </span>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>

      {!q && (
        <p className="text-center font-mono text-xs text-[var(--ia-mist)] opacity-60">
          // 输入关键词开始检索这条世界线上的记录
        </p>
      )}
    </div>
  );
}
