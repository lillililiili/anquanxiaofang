# 智能安全帽 AI 识别后台

这是当前项目的轻量后台，用于支撑 `/helmet-live` 页面完成智能安全帽实时视频抽帧、AI 识别、候选隐患、登记草稿和整改建议生成。

## 启动

在项目根目录运行：

```bash
npm run dev
```

会同时启动：

- 前端：`http://127.0.0.1:5173`
- 后台：`http://127.0.0.1:8080`

也可以分别启动：

```bash
npm run frontend:dev
npm run server:dev
```

## 环境变量

默认使用本地 mock 识别结果，不需要数据库，不需要 API Key。

```bash
PORT=8080
AI_PROVIDER=mock
FRAME_ANALYZE_INTERVAL_MS=3000
FRAME_ANALYZE_ENABLED=true
```

可选视觉识别提供方：

```bash
AI_PROVIDER=mock | qwen | openai | deepseek
```

OpenAI：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_VISION_MODEL=gpt-4.1
```

Qwen：

```bash
QWEN_API_KEY=
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_VISION_MODEL=qwen2.5-vl
```

DeepSeek：

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

`/api/ai/generate-rectification` 优先使用 DeepSeek 生成整改建议。没有 `DEEPSEEK_API_KEY` 或调用失败时，会自动使用本地 mock 建议，保证页面可用。

## 主要接口

- `GET /api/health`
- `GET /api/helmet/live-state`
- `POST /api/vision/analyze-frame`
- `GET /api/vision/latest?deviceId=SHM20250516001`
- `GET /api/tasks/:taskId/hazard-candidates`
- `POST /api/hazard-candidates/:candidateId/register-draft`
- `POST /api/ai/generate-rectification`

设备最小兼容接口：

- `GET /api/index.php?ctl=config&act=get_config`
- `WebSocket /ws/device`
  - 支持 `ca_login`
  - 支持 `ca_report_location`

## 页面联动

打开：

```text
/helmet-live
```

点击“开始AI识别”后，前端会每 3 秒从视频中抽取当前帧，调用：

```text
POST /api/vision/analyze-frame
```

返回结果会更新视频识别框、右侧疑似隐患和下方现场隐患记录。

当前不使用数据库；所有设备状态、AI 识别结果、候选隐患、登记草稿都存在内存里，服务重启后会清空。
