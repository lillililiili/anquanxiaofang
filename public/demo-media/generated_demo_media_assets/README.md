# 消防与用电安全智能检查 Demo 媒体素材包

本包包含用于前端 Demo 的本地图片、视频和音频素材。

## 数量
- 图片：29 个
- 视频：6 个 MP4
- 音频：6 个 MP3，另含 WAV 源文件

## 目录
- `public/demo-media/images/`：现场证据、整改前后、位置轨迹、页面 mockup 图
- `public/demo-media/videos/`：视频关键帧、巡检回放、整改过程短视频
- `public/demo-media/audio/`：语音记录、专家指导、复查语音
- `public/demo-media/asset_manifest.json`：素材清单和页面映射
- `docs/CODEX_ASSET_INTEGRATION_PROMPT.md`：给 Codex 的接入提示词

## 使用方式
把 `public/demo-media/` 复制到项目的 `public/` 目录下，在 React 中使用：

```tsx
<img src="/demo-media/images/evidence_electrical_panel_open.jpg" />
<video src="/demo-media/videos/helmet_live_electrical_inspection.mp4" controls />
<audio src="/demo-media/audio/audio_hazard_description.mp3" controls />
```

这些素材用于产品演示和 Mock 数据展示，不代表真实检查结论。
