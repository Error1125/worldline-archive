/**
 * scripts/sync-github.ts
 *
 * GitHub 数据同步脚本（第一版为 mock）。
 * 运行：`pnpm sync:github`（package.json 中已注册，使用 tsx 执行）。
 *
 * 第一版行为：
 * - 直接把 src/lib/github/mock.ts 里的 mock 数据写到 src/data/github/*.json，
 *   证明「构建期生成静态 JSON、页面只读 JSON」这条链路是通的。
 *
 * TODO(未来接真实服务)：
 * - [ ] 用 GitHub GraphQL API 拉 repository 列表 + contributionsCollection；
 * - [ ] 用 GitHub REST API 拉 commits / issues / pull requests / releases；
 * - [ ] 用环境变量 GITHUB_TOKEN 注入只读 token（切勿写死）；
 * - [ ] 用 GitHub Actions schedule（cron）定时运行本脚本并提交生成的 JSON；
 * - [ ] 失败时保留上一次的 JSON，避免构建因网络问题中断。
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mockActivity, mockRepos } from "../src/lib/github/mock.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../src/data/github");

const now = new Date().toISOString();

async function main() {
  await mkdir(dataDir, { recursive: true });

  const reposPayload = {
    _note: "MOCK 数据，由 scripts/sync-github.ts 生成。未来替换为真实 GitHub 数据。",
    generatedAt: now,
    repos: mockRepos,
  };

  const activityPayload = {
    _note: "MOCK 数据，由 scripts/sync-github.ts 生成。未来替换为真实 GitHub 数据。",
    generatedAt: now,
    activity: mockActivity,
  };

  await writeFile(
    resolve(dataDir, "repos.json"),
    JSON.stringify(reposPayload, null, 2) + "\n",
    "utf8",
  );
  await writeFile(
    resolve(dataDir, "activity.json"),
    JSON.stringify(activityPayload, null, 2) + "\n",
    "utf8",
  );

  console.log("[sync-github] 已写入 mock 数据到 src/data/github/（repos.json, activity.json）");
  console.log("[sync-github] 提示：这是第一版 mock；接真实 API 的 TODO 见脚本顶部注释。");
}

main().catch((err) => {
  console.error("[sync-github] 失败：", err);
  process.exit(1);
});
