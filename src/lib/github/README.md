# lib/github

GitHub 数据接入的**预留模块**。第一版全部返回 mock。

## 现状

- `types.ts` —— 仓库 / 活动 / 资料统计的类型定义。
- `mock.ts` —— 静态 mock 数据（与 `src/data/github/*.json` 同源理念）。
- `client.ts` —— 异步接口，当前返回 mock。

页面 `GitHubActivityCard.astro` 与 `/projects` 通过 `client.ts` 读取数据。

## 未来怎么接真实服务

1. 申请一个仅含只读权限的 Personal Access Token，注入环境变量 `GITHUB_TOKEN`，**不要写死在代码里**。
2. 在 `client.ts` 中：
   - 用 GitHub **GraphQL API**（`https://api.github.com/graphql`）拉取仓库列表与贡献图（`contributionsCollection`）。
   - 用 GitHub **REST API**（`/users/{login}/events`、`/repos/{owner}/{repo}/commits` 等）拉取最近 commits / issues / PR。
3. 推荐把网络请求放到构建期：由 `scripts/sync-github.ts` 定时（GitHub Actions schedule）生成 `src/data/github/*.json`，页面只读静态 JSON，既快又稳。
4. 保持 `types.ts` 不变，页面层无需改动。
