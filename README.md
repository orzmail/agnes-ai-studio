# Agnes AI Studio

Agnes AI 图像 / 视频生成 Web Studio（零依赖 Node 代理 + 原生前端）。

## 功能
- 文生图：`POST /images/generations`（model: `agnes-image-2.1-flash`）
- 图生图：`POST /images/edits`（参考图以 dataURL 传入 `image` 字段）
- 文生视频：`POST /videos`（异步，返回 `video_id` 后轮询 `GET /agnesapi?video_id=`）
- 本地画廊：结果存 `localStorage`，刷新不丢

## 运行
```bash
cd 本目录
node server.js
# 打开 http://localhost:3000
```
首次打开点右上角「设置」填入：
- **Base URL**：默认 `https://apihub.agnes-ai.com/v1`（国内可用镜像 `https://api.agnes-ai.cn/v1`）
- **API Key**：你的 Agnes Key

也可把 `config.example.json` 复制为 `config.json` 直接填（`config.json` 已被 `.gitignore` 忽略，不会进版本库）。

## 安全
API Key 仅存储于服务端 `config.json`，**不下发浏览器**，符合 Agnes 安全规范。

## 已知不确定项（需实测后修正）
1. 图生图参考图字段 / 格式（当前假设 dataURL 放入 `image`）。
2. 视频返回结构（前端已做递归查找 `.mp4` 与 `video_id` 兜底，异常时显示原始 JSON）。

## 位置说明
本项目放在 `D:\Programs\.WorkBuddy\projects\` 内（WorkBuddy 数据根），
避免被「工作区之外目录清理」机制误删。已 `git init`，可推到远程仓库实现跨电脑。
