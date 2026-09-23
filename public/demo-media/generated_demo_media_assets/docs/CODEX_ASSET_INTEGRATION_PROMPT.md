# Demo 媒体素材接入说明

请把本素材包中的 `public/demo-media/` 复制到项目根目录的 `public/demo-media/`。

## 接入规则

1. 所有图片、视频、音频都使用本地静态资源，不接外部服务。
2. 页面中不允许出现灰色占位图；没有真实图时，优先使用 `demo-media/images/` 中的证据图。
3. 视频用 `<video src="/demo-media/videos/xxx.mp4" controls />` 或自定义播放器。
4. 音频用 `<audio src="/demo-media/audio/xxx.mp3" controls />`，同时展示 `asset_manifest.json` 中的 transcript。
5. 图片取证、视频关键帧、语音记录、位置轨迹四个 Tab 必须全部有内容。
6. 主操作按钮统一蓝色，不出现“Demo / 演示”字样。

## 推荐映射

### 图片取证
- `/demo-media/images/evidence_electrical_panel_open.jpg`
- `/demo-media/images/evidence_cable_exposed.jpg`
- `/demo-media/images/evidence_fire_corridor_blocked.jpg`
- `/demo-media/images/evidence_extinguisher_low_pressure.jpg`

### 视频关键帧
- `/demo-media/videos/helmet_live_electrical_inspection.mp4`
- `/demo-media/videos/fire_corridor_obstruction.mp4`
- `/demo-media/videos/extinguisher_pressure_check.mp4`
- `/demo-media/videos/hot_work_temp_power_check.mp4`

### 语音记录
- `/demo-media/audio/audio_hazard_description.mp3`
- `/demo-media/audio/audio_expert_instruction.mp3`
- `/demo-media/audio/audio_rectification_update.mp3`
- `/demo-media/audio/audio_recheck_result.mp3`

### 位置轨迹
- `/demo-media/images/location_trajectory_map.png`
- `/demo-media/videos/location_trajectory_replay.mp4`

### 整改前后
- `/demo-media/images/rectification_before.jpg`
- `/demo-media/images/rectification_after.jpg`
- `/demo-media/images/rectification_process_01.jpg` 到 `/demo-media/images/rectification_process_08.jpg`

## 给 Codex 的接入提示词

请接入 `public/demo-media/asset_manifest.json`，把页面中所有灰色占位图片、空视频、空音频替换为本地素材。

重点替换：
- `/hazards/register` 的图片取证、视频关键帧、语音记录、位置轨迹；
- `/hazards/rectification` 的整改前后对比、整改过程照片、整改说明语音；
- `/helmet-live` 的视频画面和疑似隐患证据；
- `/expert` 的主视频、截图列表和语音对讲记录；
- `/reports/generate` 的证据链归档缩略图。

所有媒体按钮逻辑：
- 点击图片：打开大图预览弹窗；
- 点击视频：打开视频播放弹窗或展开播放器；
- 点击音频：播放/暂停，显示语音转文字；
- 点击位置轨迹：打开轨迹图或播放轨迹回放；
- 点击全部下载：Toast 提示“证据材料已打包下载”。

不接后端，不接真实上传，不接真实 AI；全部使用本地 mock 素材。执行完成后运行 `npm run build`。
