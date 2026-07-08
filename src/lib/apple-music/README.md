# lib/apple-music

Apple Music 接入的**预留模块**。第一版只做 UI + mock，不做真实登录。

## 现状

- `types.ts` —— 曲目 / Now Playing / 授权状态类型。
- `mock.ts` —— 原创虚构曲目数据（**不含真实歌词**）。
- `client.ts` —— 返回 mock，`getAuthState()` 永远未连接。

`/music` 页面与 `NowPlayingCard` / `MusicPlayer` island 通过本模块取数。

## 未来怎么接真实服务

1. 在 Apple Developer 后台创建 MusicKit identifier，拿到 Team ID / Key ID / 私钥。
2. **服务端**用私钥签发 developer token（ES256 JWT），私钥放环境变量或密钥管理服务，**绝不写死在前端**。
3. **前端**引入 MusicKit JS，用户点击「连接 Apple Music」后走 `music.authorize()` 拿 user token。
4. 用 developer token + user token 调 Apple Music API：
   - heavy rotation / recently played 作为「最近喜欢」；
   - 歌单 / 专辑详情。
5. 歌词受版权保护，**站内继续只放原创氛围短句**，不要展示真实歌词。
