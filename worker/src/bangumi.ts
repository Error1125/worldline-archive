import { commitFiles, getFile, listDir, type GitHubEnvLike } from "./github";

export interface BangumiEnvLike extends GitHubEnvLike { BANGUMI_TOKEN?: string }
type Config = { username: string; syncScopes: string[]; schedule: "manual" | "6h" | "daily"; syncMissingPolicy: "keep" | "hide" };
const status: Record<number, string> = { 1: "planned", 2: "completed", 3: "watching", 4: "paused", 5: "dropped" };

function quote(value: string) { return JSON.stringify(value); }
function replaceLine(source: string, key: string, value: string) {
  const expression = new RegExp(`^${key}:.*$`, "m");
  return expression.test(source) ? source.replace(expression, `${key}: ${value}`) : source.replace(/^---\r?\n/, `---\n${key}: ${value}\n`);
}
function subjectId(source: string) { return source.match(/externalIds:\s*\{[^}]*"?bangumi"?\s*:\s*"?(\d+)/)?.[1]; }

export async function loadBangumiConfig(env: GitHubEnvLike): Promise<Config> {
  const file = await getFile(env, "src/config/bangumi.json");
  if (!file) throw new Error("BANGUMI_NOT_CONFIGURED");
  const value = JSON.parse(file.content) as Partial<Config>;
  if (!value.username?.trim()) throw new Error("BANGUMI_NOT_CONFIGURED");
  return { username: value.username.trim(), syncScopes: value.syncScopes ?? Object.values(status), schedule: value.schedule === "6h" || value.schedule === "daily" ? value.schedule : "manual", syncMissingPolicy: value.syncMissingPolicy === "hide" ? "hide" : "keep" };
}

export async function runBangumiSync(env: BangumiEnvLike) {
  const settings = await loadBangumiConfig(env);
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "worldline-archive" };
  if (env.BANGUMI_TOKEN) headers.Authorization = `Bearer ${env.BANGUMI_TOKEN}`;
  const selected = new Set(settings.syncScopes);
  const remote: any[] = [];
  for (const type of Object.keys(status).map(Number).filter((type) => selected.has(status[type]))) {
    for (let offset = 0; offset < 10000; offset += 100) {
      const response = await fetch(`https://api.bgm.tv/v0/users/${encodeURIComponent(settings.username)}/collections?subject_type=2&type=${type}&limit=100&offset=${offset}`, { headers });
      if (!response.ok) throw new Error(`BANGUMI_FETCH_FAILED:${response.status}`);
      const data = await response.json() as { data?: any[]; total?: number };
      const items = data.data ?? []; remote.push(...items);
      if (!items.length || offset + items.length >= (data.total ?? 0)) break;
    }
  }
  const files = (await listDir(env, "src/content/anime"))?.filter((item: any) => item.type === "file" && item.name.endsWith(".md")) ?? [];
  const local = new Map<string, { path: string; content: string }>();
  for (const item of files) { const file = await getFile(env, item.path); if (file) { const id = subjectId(file.content) ?? item.name.match(/^bgm-(\d+)/)?.[1]; if (id) local.set(id, { path: item.path, content: file.content }); } }
  const changes: Array<{ path: string; content: string }> = []; let created = 0, updated = 0, unchanged = 0;
  const remoteIds = new Set(remote.map((item) => String(item.subject_id)));
  for (const item of remote) {
    const id = String(item.subject_id); const subject = item.subject ?? {}; const now = new Date().toISOString();
    const values: Array<[string, string]> = [["status", quote(status[item.type] ?? "planned")], ["externalIds", JSON.stringify({ bangumi: Number(id) })], ["bangumiSyncedAt", quote(now)]];
    if (subject.name_cn) values.push(["titleCn", quote(subject.name_cn)]); if (subject.name) values.push(["titleJP", quote(subject.name)]);
    if (subject.images?.large || subject.images?.common) values.push(["cover", quote(subject.images.large ?? subject.images.common)]);
    if (subject.eps) values.push(["episodes", String(subject.eps)]); if (item.ep_status) values.push(["currentEpisode", String(item.ep_status)]);
    if (item.rate > 0) values.push(["bangumiUserRate", String(item.rate)]); if (subject.score > 0) values.push(["bangumiCommunityScore", String(subject.score)]);
    try {
      const detailResponse = await fetch(`https://api.bgm.tv/v0/subjects/${encodeURIComponent(id)}`, { headers });
      if (detailResponse.ok) {
        const detail = await detailResponse.json() as any;
        if (detail.summary?.trim()) values.push(["bangumiSummary", quote(detail.summary)]);
        if (detail.date) values.push(["bangumiAirDate", quote(detail.date)]);
        if (Number.isFinite(detail.rank)) values.push(["bangumiRank", String(detail.rank)]);
        if (Array.isArray(detail.tags)) values.push(["bangumiTags", JSON.stringify(detail.tags.map((tag: any) => tag.name).filter(Boolean))]);
      }
    } catch { /* a failed detail must not abort the batch or erase old metadata */ }
    const existing = local.get(id);
    if (existing) { let next = existing.content; for (const [key, value] of values) next = replaceLine(next, key, value); if (next === existing.content) unchanged++; else { changes.push({ path: existing.path, content: next }); updated++; } }
    else { const title = subject.name_cn || subject.name || `Bangumi ${id}`; const frontmatter = [`title: ${quote(title)}`, `date: ${String(item.updated_at || now).slice(0,10)}`, ...values.map(([key, value]) => `${key}: ${value}`), "visibility: \"public\""].join("\n"); changes.push({ path: `src/content/anime/bgm-${id}.md`, content: `---\n${frontmatter}\n---\n` }); created++; }
  }
  if (settings.syncMissingPolicy === "hide") {
    for (const [id, existing] of local) {
      if (remoteIds.has(id) || /manualHidden:\s*true/.test(existing.content)) continue;
      const next = replaceLine(existing.content, "visibility", quote("hidden"));
      if (next !== existing.content) { changes.push({ path: existing.path, content: next }); updated++; }
    }
  }
  const commit = await commitFiles(env, changes, `content(anime): sync ${changes.length} Bangumi collections [bangumi-sync]`);
  return { success: true, username: settings.username, scanned: remote.length, created, updated, unchanged, ...(commit ? { commitUrl: commit.commitUrl } : {}), message: changes.length ? `同步 ${changes.length} 条动画数据，已创建单次 commit。` : "无数据变化，未创建 commit。" };
}
