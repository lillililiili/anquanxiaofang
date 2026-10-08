# 场景素材与展示真实性修正

日期：2026-09-24。本次修正展示素材与对应关系，应用仍是本地演示系统。

## 修改结果

- 远程专家图库去除旧界面截图嵌套，采用实拍参考、明确标注的 AI 场景及原素材纯照片裁切；缩略图保持比例，点击可查看来源。
- 隐患登记按类型匹配图片及轮播，无对应素材时显示待补充。整改照片按记录隔离，灭火器、通道等不再套用配电柜整改图。
- 原重复的八阶段整改截图改为两张前后参考图；这些不构成真实项目的整改证明。
- 本地画面标记为演示回放；离线通道不播放；去除假实时码率与默认识别框。
- 安全帽现场端的当前图、预览图、模型验证输入一致。只有主动验证同一画面得到的 YOLO 结果才展示识别框。
- 预警、报告、首页及历史本地记录中的已知旧演示图片路径统一升级，保留用户其他数据与自有素材。
- 压力表实拍不能证明压力异常，相关标题改为“灭火器压力待核查”；线缆参考改为“线缆防护待核查”。

## 代码清单

| 文件 | 方法/组件 | 作用与本次变更 |
| --- | --- | --- |
| src/App.tsx | ExpertPage、captureSnapshot、switchChannel | 场景播放与图库；明确演示性质，调整离线行为与来源说明 |
| src/App.tsx | MultiHazardRegisterPage、MultiHazardRectifyPage、HazardRectificationPage | 隐患证据与整改；按对象关联素材，缺图空态，参考图片按记录隔离 |
| src/App.tsx | HelmetLivePage、LiveVideoPanel、updateModelStatus、verifyYoloModel | 画面与模型展示；图片、预览、分析输入一致，限制识别框只对应已分析画面 |
| src/App.tsx | MediaPreviewModal、ReportsGeneratePage、App | 预览与布局；来源标注，替换截图式报告，增加素材授权入口 |
| src/data/demoSceneMedia.ts | getHazardScene、resolveDemoImage、getMediaSourceNote | 素材映射、旧路径兼容、作者与许可提示 |
| src/data/expertMockData.ts、src/data/mockData.ts、src/data/operationsData.ts | 无具体方法（演示数据） | 替换图片/视频引用，修正不受图片支持的标题与播放状态 |
| src/features/operations/operationsStore.ts | readState、reportHtml | 保存记录兼容与报告导出；仅升级已知演示路径，报告增加素材声明 |
| src/styles.css、src/styles/expert-government-blue.css | 无具体方法（媒体样式） | 缩略图完整显示，补充来源、缺图、离线及报告样式 |

## 素材

目录：public/demo-media/scene-photos/、public/demo-media/scene-clips/。
五张公开实拍及衍生裁切的作者、原始文件链接、许可、修改方式见 scene-photos/sources.json 和 sources.html。
六段 WebM 是图片轮播，非现场摄像录像。

AI 图片：public/demo-media/scene-photos/electrical-panel.jpg。生成模式：imagegen 新图生成；裁切、压缩另由本地图片处理完成。其余实拍参考并非该演示项目现场。

最终生成提示词：

> Generate one photorealistic natural documentary inspection photograph for a Chinese industrial safety software DEMO. Landscape 3:2. Subject: an ordinary gray low voltage electrical distribution cabinet with its hinged steel door open, correctly plausible DIN rail circuit breakers, neatly connected red yellow blue black insulated conductors, metal backplate, gray conduit entering below. Seen from chest height 1.5 meters away in a modest equipment room, off-white concrete wall, worn floor. A mundane handheld phone photo, natural uneven fluorescent lighting, realistic dust, wear, understated colors, slight perspective, adequate detail, no cinematic lighting, no glossy 3D render. The subject fills the image with room context at edges. No people, no UI, no screenshots, no detection boxes, no overlays, no logos, no captions, no added text or watermarks. This is a synthetic illustrative asset, not actual evidence. Save generated result as a local file for copying into the project.

## 验证

- npm run build 通过（TypeScript 与 Vite）；保留原有大资源 chunk 提示。
- 15 张新增图片与 6 段视频 HTTP 200；视频均可读取首帧，浏览器播放确认。
- 专家页约 1440 与 1920 CSS 像素宽度无横向溢出，图片加载成功；查看大图及来源正常。
- 登记页切换消防通道记录后仅显示对应图与轮播。
- 整改页灭火器记录展示压力表参考，整改后待补充；切换应急照明记录后不泄漏前一记录参考图。
- 安全帽页默认配电柜、切换压力表后画面对应，未验证时不显示预制识别框；未运行实际 YOLO 服务测试。
- 报告预览显示独立正文、对应图片及作者许可入口。

范围限制：真实设备接入、实地照片采集及既有演示业务数据真实性不属于本次交付；不能把参考图用于真实取证或作出已完成整改结论。
