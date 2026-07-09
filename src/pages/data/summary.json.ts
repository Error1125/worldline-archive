import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getTimelineItems, TYPE_META, type ContentType } from "@/lib/content";
import { getWorldlineState } from "@/lib/worldline";

/**
 * /data/summary.json —— 构建期静态站点摘要（v5.0）。
 *
 * Admin Dashboard 从「同源静态 JSON + 后端 /api/admin/status」两路取数：
 * 本端点提供构建期就能确定的一切（内容统计 / 草稿数 / 世界线状态 / 最近记录），
 * 部署与 commit 状态则由后端实时查询 GitHub API。
 */

const COLLECTIONS: { key: any; type: ContentType }[] = [
  { key: "posts", type: "post" },
  { key: "moments", type: "moment" },
  { key: "bugs", type: "bug" },
  { key: "projects", type: "project" },
  { key: "anime", type: "anime" },
  { key: "music", type: "music" },
  { key: "photos", type: "photo" },
];

export const GET: APIRoute = async () => {
  const items = await getTimelineItems();
  const wl = getWorldlineState(items);

  const counts: Record<string, { total: number; drafts: number; labelZh: string }> = {};
  let totalAll = 0;
  let draftAll = 0;
  for (const { key, type } of COLLECTIONS) {
    const all = await getCollection(key);
    const drafts = all.filter((e: any) => e.data.draft === true).length;
    counts[type] = { total: all.length, drafts, labelZh: TYPE_META[type].labelZh };
    totalAll += all.length;
    draftAll += drafts;
  }

  const recent = items.slice(0, 8).map((it) => ({
    type: it.type,
    typeLabel: TYPE_META[it.type].labelZh,
    title: it.title,
    date: it.date.toISOString(),
    href: it.href ?? "/timeline",
    impact: it.worldlineImpact ?? "medium",
  }));

  const body = {
    generatedAt: new Date().toISOString(),
    totals: { records: totalAll, drafts: draftAll },
    counts,
    worldline: {
      value: wl.value,
      score: wl.score,
      status: wl.status,
      statusLabel: wl.statusLabel,
      statusZh: wl.statusZh,
      baseValue: wl.baseValue,
      windowDays: wl.windowDays,
      recentEvents: wl.recentEvents.map((e) => ({
        title: e.title,
        type: e.type,
        typeLabel: TYPE_META[e.type].labelZh,
        date: e.date.toISOString(),
        contribution: e.contribution,
        impact: e.impact,
        href: e.href ?? "/timeline",
      })),
    },
    recent,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
