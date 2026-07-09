import wlConfig from "@/config/worldline.json";
import type { ContentType, TimelineItem } from "@/lib/content";

/**
 * Worldline Divergence Engine —— 世界线变动率引擎（v5.0）。
 *
 * 世界线数值不再是静态彩蛋，而是由内容更新驱动：
 *
 *   Worldline = baseValue + contentImpact(activityScore) + displayJitter(客户端)
 *
 * activityScore 计算（见 getWorldlineActivityScore）：
 *   对最近 windowDays 内的每条记录：
 *     contribution = typeWeight × impactMultiplier × featuredMultiplier × exp(-daysAgo / halfLifeDays)
 *   全部求和即为 activity score。
 *
 * 状态分级（thresholds 可在 /admin/settings/worldline 调整）：
 *   score <  observing   → stable
 *   score <  unstable    → observing
 *   score <  divergence  → unstable
 *   score >= divergence  → divergence shift
 *
 * 配置来源：src/config/worldline.json（Admin Console 通过 GitHub commit 更新）。
 */

export type WorldlineStatus = "stable" | "observing" | "unstable" | "divergence";

export interface WorldlineConfig {
  baseValue: number;
  windowDays: number;
  halfLifeDays: number;
  dynamicDisplay: boolean;
  /** score → 数值偏移比例（score×scale 叠加到 baseValue 小数位上） */
  valueScale: number;
  weights: Record<string, number>;
  impactMultipliers: Record<string, number>;
  featuredMultiplier: number;
  typeBonus: { photoAlbum: number; longPost: number; activeProject: number };
  thresholds: { observing: number; unstable: number; divergence: number };
}

export interface WorldlineEvent {
  id: string;
  type: ContentType;
  title: string;
  date: Date;
  href?: string;
  impact: string;
  featured: boolean;
  /** 该记录对 activity score 的贡献值（已含衰减） */
  contribution: number;
  daysAgo: number;
}

export interface WorldlineState {
  value: string;
  valueNumber: number;
  score: number;
  status: WorldlineStatus;
  statusLabel: string;
  statusZh: string;
  baseValue: number;
  recentEvents: WorldlineEvent[];
  windowDays: number;
  dynamicDisplay: boolean;
  generatedAt: string;
}

export const worldlineConfig = wlConfig as WorldlineConfig;

export const WORLDLINE_STATUS_META: Record<
  WorldlineStatus,
  { label: string; zh: string; tone: string; jitterFrom: number; jitterAmp: number }
> = {
  stable: { label: "archive stable", zh: "世界线稳定", tone: "var(--ia-success)", jitterFrom: 5, jitterAmp: 1 },
  observing: { label: "observation active", zh: "观测进行中", tone: "var(--ia-neon)", jitterFrom: 4, jitterAmp: 2 },
  unstable: { label: "archive unstable", zh: "世界线不稳定", tone: "var(--ia-warning)", jitterFrom: 3, jitterAmp: 4 },
  divergence: { label: "divergence shifting", zh: "世界线正在变动", tone: "var(--ia-danger)", jitterFrom: 2, jitterAmp: 9 },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** 单条记录对世界线的贡献（含时间衰减；超窗返回 0） */
export function getRecordContribution(
  item: Pick<TimelineItem, "type" | "date" | "featured" | "worldlineImpact" | "worldlineWeight" | "status" | "description">,
  now: Date = new Date(),
  cfg: WorldlineConfig = worldlineConfig,
): { contribution: number; daysAgo: number } {
  const date = toDate(item.date);
  const daysAgo = Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
  if (daysAgo > cfg.windowDays) return { contribution: 0, daysAgo };

  const weight = item.worldlineWeight ?? cfg.weights[item.type] ?? 1;
  const impact = cfg.impactMultipliers[item.worldlineImpact ?? "medium"] ?? 1;
  const featured = item.featured ? cfg.featuredMultiplier : 1;

  // 类型加成：相册 / 长文 / 进行中项目
  let bonus = 1;
  if (item.type === "photo") bonus *= cfg.typeBonus.photoAlbum;
  if (item.type === "post" && (item.description?.length ?? 0) > 80) bonus *= cfg.typeBonus.longPost;
  if (item.type === "project" && (item.status === "building" || item.status === "active")) {
    bonus *= cfg.typeBonus.activeProject;
  }

  const decay = Math.exp(-daysAgo / cfg.halfLifeDays);
  return { contribution: weight * impact * featured * bonus * decay, daysAgo };
}

/** 近期内容活跃度分数（世界线扰动源） */
export function getWorldlineActivityScore(
  records: TimelineItem[],
  now: Date = new Date(),
  cfg: WorldlineConfig = worldlineConfig,
): number {
  let score = 0;
  for (const r of records) score += getRecordContribution(r, now, cfg).contribution;
  return Math.round(score * 1000) / 1000;
}

/** 由分数得到状态档位 */
export function scoreToStatus(score: number, cfg: WorldlineConfig = worldlineConfig): WorldlineStatus {
  if (score < cfg.thresholds.observing) return "stable";
  if (score < cfg.thresholds.unstable) return "observing";
  if (score < cfg.thresholds.divergence) return "unstable";
  return "divergence";
}

export function getWorldlineStatus(records: TimelineItem[], now?: Date): WorldlineStatus {
  return scoreToStatus(getWorldlineActivityScore(records, now));
}

/** 世界线观测值（baseValue + score 映射到小数位；固定 6 位小数展示） */
export function getWorldlineValue(records: TimelineItem[], now?: Date): string {
  const score = getWorldlineActivityScore(records, now);
  const v = worldlineConfig.baseValue + score * worldlineConfig.valueScale;
  return v.toFixed(6);
}

/** 最近影响世界线的记录（按贡献值倒序） */
export function getWorldlineRecentEvents(
  records: TimelineItem[],
  limit = 6,
  now: Date = new Date(),
): WorldlineEvent[] {
  const events: WorldlineEvent[] = [];
  for (const r of records) {
    const { contribution, daysAgo } = getRecordContribution(r, now);
    if (contribution <= 0) continue;
    events.push({
      id: r.id,
      type: r.type,
      title: r.title,
      date: toDate(r.date),
      href: r.href,
      impact: r.worldlineImpact ?? "medium",
      featured: !!r.featured,
      contribution: Math.round(contribution * 100) / 100,
      daysAgo: Math.round(daysAgo * 10) / 10,
    });
  }
  return events.sort((a, b) => b.contribution - a.contribution).slice(0, limit);
}

/** 一次性取得完整世界线状态（供 WorldlineMeter / summary.json / Admin 使用） */
export function getWorldlineState(records: TimelineItem[], now: Date = new Date()): WorldlineState {
  const score = getWorldlineActivityScore(records, now);
  const status = scoreToStatus(score);
  const meta = WORLDLINE_STATUS_META[status];
  const valueNumber = worldlineConfig.baseValue + score * worldlineConfig.valueScale;
  return {
    value: valueNumber.toFixed(6),
    valueNumber,
    score,
    status,
    statusLabel: meta.label,
    statusZh: meta.zh,
    baseValue: worldlineConfig.baseValue,
    recentEvents: getWorldlineRecentEvents(records, 6, now),
    windowDays: worldlineConfig.windowDays,
    dynamicDisplay: worldlineConfig.dynamicDisplay,
    generatedAt: now.toISOString(),
  };
}
