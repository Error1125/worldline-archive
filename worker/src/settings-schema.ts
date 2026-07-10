/**
 * worker/src/settings-schema.ts（v5.0.2 §11.2）
 *
 * 设置保存的基础 schema 校验：写坏一份 JSON 配置会直接写坏整个站点构建，
 * 因此所有 PUT /api/admin/settings/:name 在 commit 到 GitHub 之前必须先过这里。
 *
 * 校验失败 → 抛 SettingsValidationError（HTTP 400，code = SETTINGS_INVALID），
 * 不写入 GitHub，前端保留表单并显示逐字段错误。
 *
 * 只做「防写坏」级别的类型校验，不做业务级别的强约束：
 *   - 字符串字段不能是对象 / 数组；
 *   - 数字字段必须是有限 number；
 *   - URL 字段必须是合法 http(s) URL 或空；
 *   - worldline baseValue / thresholds / weights 等必须是 number；
 *   - footerBadges 必须是字符串数组；
 *   - profile.links 必须是对象（键值均为字符串）。
 */

export class SettingsValidationError extends Error {
  code = "SETTINGS_INVALID";
  fields: string[];
  constructor(problems: string[]) {
    super(`设置校验未通过：${problems.join("；")}`);
    this.fields = problems;
  }
}

type Obj = Record<string, unknown>;

const isStr = (v: unknown) => typeof v === "string";
const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isBool = (v: unknown) => typeof v === "boolean";
const isPlainObj = (v: unknown): v is Obj =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isUrlOrEmpty = (v: unknown) =>
  v === undefined || v === null || (isStr(v) && (v === "" || /^https?:\/\/\S+$/i.test(v)));

function checkStr(o: Obj, key: string, out: string[], required = false) {
  const v = o[key];
  if (v === undefined || v === null) {
    if (required) out.push(`${key} 缺失`);
    return;
  }
  if (!isStr(v)) out.push(`${key} 必须是字符串（当前是 ${Array.isArray(v) ? "数组" : typeof v}）`);
}

function checkNum(o: Obj, key: string, out: string[], required = false) {
  const v = o[key];
  if (v === undefined || v === null) {
    if (required) out.push(`${key} 缺失`);
    return;
  }
  if (!isNum(v)) out.push(`${key} 必须是数字（当前是 ${typeof v}）`);
}

function checkBool(o: Obj, key: string, out: string[]) {
  const v = o[key];
  if (v === undefined || v === null) return;
  if (!isBool(v)) out.push(`${key} 必须是布尔值`);
}

function checkUrl(o: Obj, key: string, out: string[]) {
  if (!isUrlOrEmpty(o[key])) out.push(`${key} 必须是合法 URL（http/https）或留空`);
}

function checkNumMap(v: unknown, label: string, out: string[]) {
  if (v === undefined || v === null) return;
  if (!isPlainObj(v)) {
    out.push(`${label} 必须是对象`);
    return;
  }
  for (const [k, val] of Object.entries(v)) {
    if (!isNum(val)) out.push(`${label}.${k} 必须是数字`);
  }
}

/* ---------------- 各配置校验器 ---------------- */

function validateProfile(d: Obj): string[] {
  const out: string[] = [];
  for (const k of ["author", "handle", "signature", "status", "mood", "coordinate", "bio", "aboutTitle", "aboutSubtitle", "aboutBody", "githubUsername"]) {
    checkStr(d, k, out);
  }
  checkStr(d, "author", out, true);
  checkUrl(d, "avatar", out);
  checkUrl(d, "cover", out);
  for (const key of ["researchAreas", "techStack", "interests"]) {
    const value = d[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((item) => !isStr(item)))) out.push(`${key} 必须是字符串数组`);
  }
  if (d.showGithubContributions !== undefined && typeof d.showGithubContributions !== "boolean") out.push("showGithubContributions 必须是布尔值");
  const links = d.links;
  if (links !== undefined && links !== null) {
    if (Array.isArray(links)) {
      // 文档允许「对象或数组」；数组时每项必须是字符串
      for (let i = 0; i < links.length; i++) {
        if (!isStr(links[i])) out.push(`links[${i}] 必须是字符串`);
      }
    } else if (isPlainObj(links)) {
      for (const [k, v] of Object.entries(links)) {
        if (v !== undefined && v !== null && !isStr(v)) out.push(`links.${k} 必须是字符串`);
      }
      checkUrl(links, "github", out);
      checkUrl(links, "bilibili", out);
    } else {
      out.push("links 必须是对象或数组");
    }
  }
  if (d.githubStats !== undefined && d.githubStats !== null && !isPlainObj(d.githubStats)) {
    out.push("githubStats 必须是对象");
  }
  return out;
}

function validateSite(d: Obj): string[] {
  const out: string[] = [];
  for (const k of ["title", "subtitle", "description", "heroTagline", "language", "foundedAt", "archiveStartedAt", "archiveSyncLabel", "copyrightName"]) {
    checkStr(d, k, out);
  }
  checkStr(d, "title", out, true);
  checkUrl(d, "backgroundDay", out);
  checkUrl(d, "backgroundNight", out);
  checkUrl(d, "defaultCover", out);
  const badges = d.footerBadges;
  if (badges !== undefined && badges !== null) {
    if (!Array.isArray(badges)) out.push("footerBadges 必须是数组");
    else {
      for (let i = 0; i < badges.length; i++) {
        if (!isStr(badges[i])) out.push(`footerBadges[${i}] 必须是字符串`);
      }
    }
  }
  if (isStr(d.foundedAt) && d.foundedAt && !/^\d{4}-\d{2}-\d{2}$/.test(d.foundedAt as string)) {
    out.push("foundedAt 必须是 YYYY-MM-DD 格式");
  }
  if (isStr(d.archiveStartedAt) && d.archiveStartedAt && !/^\d{4}-\d{2}-\d{2}$/.test(d.archiveStartedAt as string)) {
    out.push("archiveStartedAt 必须是 YYYY-MM-DD 格式");
  }
  return out;
}

function validateWorldline(d: Obj): string[] {
  const out: string[] = [];
  checkNum(d, "baseValue", out, true);
  checkNum(d, "windowDays", out, true);
  checkNum(d, "halfLifeDays", out, true);
  checkNum(d, "valueScale", out, true);
  checkNum(d, "impactWindowDays", out);
  checkNum(d, "stableAfterDays", out);
  checkNum(d, "jitterDigits", out);
  checkNum(d, "featuredMultiplier", out);
  checkBool(d, "dynamicDisplay", out);
  checkBool(d, "jitterEnabled", out);
  checkNumMap(d.weights, "weights", out);
  checkNumMap(d.impactMultipliers, "impactMultipliers", out);
  checkNumMap(d.typeBonus, "typeBonus", out);
  const th = d.thresholds;
  if (!isPlainObj(th)) out.push("thresholds 必须是对象");
  else {
    for (const k of ["observing", "unstable", "divergence"]) {
      if (!isNum(th[k])) out.push(`thresholds.${k} 必须是数字`);
    }
  }
  // 数值合理性（防止把窗口 / 半衰期改成 0 / 负数写坏引擎）
  if (isNum(d.windowDays) && (d.windowDays as number) <= 0) out.push("windowDays 必须 > 0");
  if (isNum(d.halfLifeDays) && (d.halfLifeDays as number) <= 0) out.push("halfLifeDays 必须 > 0");
  if (isNum(d.stableAfterDays) && (d.stableAfterDays as number) <= 0) out.push("stableAfterDays 必须 > 0");
  if (isNum(d.jitterDigits) && ((d.jitterDigits as number) < 1 || (d.jitterDigits as number) > 6)) {
    out.push("jitterDigits 必须在 1~6 之间");
  }
  return out;
}

const VALIDATORS: Record<string, (d: Obj) => string[]> = {
  profile: validateProfile,
  site: validateSite,
  worldline: validateWorldline,
};

/** 校验设置数据；有问题时抛 SettingsValidationError */
export function validateSettings(name: string, data: unknown): void {
  if (!isPlainObj(data)) throw new SettingsValidationError(["data 必须是对象"]);
  const fn = VALIDATORS[name];
  if (!fn) return; // 未知设置名由路由层拦截
  const problems = fn(data);
  if (problems.length > 0) throw new SettingsValidationError(problems);
}
