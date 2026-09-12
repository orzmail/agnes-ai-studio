# 部署 Agnes AI Studio

零依赖的 Agnes AI 图像/视频生成 Web 工作室。后端是一个 Node 代理服务，API Key 只存服务端、不下发浏览器。

## 架构

- **前端**：`public/` 纯静态文件，由 Node 服务直接托管
- **后端**：`server.js`（用 Node 内置 `http` 模块，无任何第三方依赖）做反向代理
- **有状态**：服务会把 Base URL + API Key 持久化到磁盘 `config.json`

## 本地运行

```bash
git clone https://github.com/orzmail/agnes-ai-studio.git
cd agnes-ai-studio
node server.js
# 打开 http://localhost:3000
# 右上角「设置」填 Base URL（默认 https://apihub.agnes-ai.com/v1，国内可用镜像 https://api.agnes-ai.cn/v1）+ API Key
```

也可把 `config.example.json` 复制为 `config.json` 直接填好再启动。

## 云端部署

### 适合的平台（有持久文件系统，直接跑）

服务需要把 Key 写入 `config.json`，因此选**有持久盘**的 Node 托管平台即可，零改代码：

- **Render**：New Web Service → 连仓库 → Build Command 留空 / Start Command `node server.js` → 端口自动识别（或设 `PORT` 环境变量）
- **Railway** / **Fly.io** / **任意 VPS**：同样 `node server.js`，监听 `process.env.PORT || 3000`

### Cloudflare / Vercel 注意事项（无持久文件系统）

这些平台的运行实例**没有可写文件系统**，`server.js` 写 `config.json` 会失败。有两种改法才能部署：

1. **改为读环境变量（最小改动）**：不写文件，启动时从 `AGNES_API_KEY` / `AGNES_BASE_URL` 读取 Key。这样服务变为无状态，可跑在 Cloudflare Workers / Vercel Functions。
2. **接 KV 存储**：把 Key 存 Cloudflare KV / Vercel KV，替换文件读写逻辑。

> 当前版本未做上述改造，故 Cloudflare/Vercel 直接部署会因无法写盘而报错。需要上这些平台时按上面方向改 `server.js` 即可。

## 安全提示

- API Key 仅存于服务端，不会进入浏览器或前端代码
- 若公开部署给多人使用，建议额外加一层访问口令，避免 Key 被滥用
