# OpenCV + YOLO 接入说明

## 接入位置

YOLO 已接入后端现有的帧分析链路：

```text
前端智能安全帽页面
  -> POST /api/vision/analyze-frame
  -> server/src/services/frame-analyzer.service.ts
  -> server/src/services/yolo-vision.service.ts
  -> server/scripts/opencv_yolo_infer.py
  -> 返回候选隐患 detections
```

前端页面、隐患候选、隐患登记、远程专家和报告中心不需要额外改造。

## 准备模型

将 YOLO ONNX 模型放到：

```text
server/models/yolo.onnx
```

将类别文件放到：

```text
server/models/classes.txt
```

每行一个类别名，例如：

```text
person
bicycle
car
...
fire hydrant
...
toothbrush
```

类别名会在 Node 后端映射成平台里的隐患名称、风险等级、整改建议和补拍提示。

## 安装 Python 依赖

```bash
pip install opencv-python numpy
```

如果服务器没有图形环境，可以使用：

```bash
pip install opencv-python-headless numpy
```

## 启动 YOLO 模式

PowerShell 示例：

```powershell
$env:AI_PROVIDER="yolo"
$env:YOLO_MODEL_PATH="server/models/yolo.onnx"
$env:YOLO_CLASS_NAMES_PATH="server/models/classes.txt"
$env:YOLO_PYTHON_PATH="python"
npm run dev
```

可选参数：

```powershell
$env:YOLO_INPUT_SIZE="640"
$env:YOLO_CONFIDENCE_THRESHOLD="0.35"
$env:YOLO_NMS_THRESHOLD="0.45"
```

## 当前映射规则

| YOLO 类别关键词 | 平台隐患 |
| --- | --- |
| `open_electrical_box` / `electrical_box_open` / `power_box_open` | 配电箱未关闭 |
| `exposed_wire` / `wire_exposed` / `cable_exposed` | 线缆裸露 |
| `fire_corridor_blocked` / `blocked_fire_exit` | 消防通道占用 |
| `extinguisher_low_pressure` | 灭火器压力不足 |
| `fire_extinguisher` / `FireExtinguisher` | 灭火器位置确认 |
| `fire hydrant` | 消火栓位置确认 |
| `flame` / `smoke` | 疑似明火或烟雾 |
| `no_helmet` / `no_hardhat` | 人员未佩戴安全帽 |

未匹配到的类别会生成“疑似某目标”的候选隐患，并建议人工复核。

当前演示模型使用 YOLO26n COCO 预训练 ONNX，类别为 COCO 80 类。它是通用目标检测模型，不包含 `fire_extinguisher` 灭火器专用类别；如需灭火器框选，请换回 `server/models/yolo-fire-extinguisher.onnx` 并恢复对应类别表。

## 失败回退

如果没有放置模型、Python 依赖缺失、模型推理失败，后端会打印错误并回退到现有 Mock 识别结果，保证演示页面不崩。
