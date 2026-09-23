# YOLO26 消防专用模型训练架子

这个目录用于把当前通用 YOLO26n 训练成消防与用电安全场景模型，训练完成后导出 ONNX，并同步到现有后端：

```text
采集图片
-> 标注 bbox
-> 转成 YOLO 格式
-> 训练 YOLO26n
-> 导出 ONNX
-> 复制到 server/models/yolo.onnx
-> 页面继续走现有 OpenCV YOLO 接口
```

## 目录结构

```text
training/yolo26/
  dataset.yaml
  classes.txt
  requirements.txt
  datasets/fire-safety/
    images/train/
    images/val/
    images/test/
    labels/train/
    labels/val/
    labels/test/
  scripts/
    check_dataset.py
    train_yolo26.py
    export_onnx.py
    sync_to_app.py
    labelme_to_yolo.py
```

## 当前训练类别

类别顺序必须和标注文件里的 class id 一致：

```text
0 fire_extinguisher
1 fire_hydrant
2 open_electrical_box
3 exposed_wire
4 fire_corridor_blocked
5 smoke
6 flame
7 no_helmet
```

## 1. 安装训练依赖

Windows + RTX 4060 Laptop 的 GPU 环境配置见：

[setup_windows_gpu.md](setup_windows_gpu.md)

建议用独立 Python 虚拟环境：

```powershell
cd C:\Users\Admin（无密码）\Desktop\消防与用电安全智能检查\消防与用电安全智能检查
python -m venv .venv-yolo26
.\.venv-yolo26\Scripts\Activate.ps1
python -m pip install -r training\yolo26\requirements.txt
```

## 2. 准备数据

公开数据集下载和整理脚本见：

[download_public_datasets.md](download_public_datasets.md)

把图片放入：

```text
training/yolo26/datasets/fire-safety/images/train
training/yolo26/datasets/fire-safety/images/val
training/yolo26/datasets/fire-safety/images/test
```

把对应 YOLO 标注放入：

```text
training/yolo26/datasets/fire-safety/labels/train
training/yolo26/datasets/fire-safety/labels/val
training/yolo26/datasets/fire-safety/labels/test
```

每张图片对应一个同名 `.txt`，格式：

```text
class_id x_center y_center width height
```

坐标都是 0 到 1 的归一化值。

## 3. 如果用 LabelMe 标注

LabelMe 导出的 JSON 可以转成 YOLO：

```powershell
python training\yolo26\scripts\labelme_to_yolo.py `
  --json-dir training\yolo26\raw-labelme\train `
  --image-dir training\yolo26\datasets\fire-safety\images\train `
  --label-dir training\yolo26\datasets\fire-safety\labels\train `
  --classes training\yolo26\classes.txt
```

验证集和测试集同理，把 `train` 换成 `val` 或 `test`。

## 4. 开始训练

训练前可以先检查数据量和缺失标注：

```powershell
python training\yolo26\scripts\check_dataset.py
```

CPU 也能跑通流程，但会很慢；建议 NVIDIA GPU。

```powershell
python training\yolo26\scripts\train_yolo26.py `
  --model yolo26n.pt `
  --epochs 100 `
  --imgsz 640 `
  --batch 8 `
  --device 0
```

没有 GPU 时：

```powershell
python training\yolo26\scripts\train_yolo26.py --device cpu --epochs 20 --batch 2
```

训练输出默认在：

```text
training/yolo26/runs/fire-safety-yolo26/weights/best.pt
```

## 5. 导出 ONNX

```powershell
python training\yolo26\scripts\export_onnx.py `
  --weights training\yolo26\runs\fire-safety-yolo26\weights\best.pt `
  --imgsz 640
```

导出文件会复制到：

```text
training/yolo26/exports/fire-safety-yolo26.onnx
```

## 6. 同步到当前系统

```powershell
python training\yolo26\scripts\sync_to_app.py `
  --onnx training\yolo26\exports\fire-safety-yolo26.onnx `
  --classes training\yolo26\classes.txt
```

同步后当前系统会使用：

```text
server/models/yolo.onnx
server/models/classes.txt
```

后端已经有 `fire_extinguisher`、`open_electrical_box`、`exposed_wire`、`fire_corridor_blocked`、`smoke`、`flame`、`no_helmet` 等关键词映射。

## 标注建议

- 每个类别先准备 200 到 500 张有效样本，少量样本可以先跑通流程。
- 同一类要覆盖远近、明暗、遮挡、不同角度、不同设备画质。
- 不要只用系统截图训练，尽量用现场原图。
- 灭火器“本体”和“压力不足”是两个不同问题；如果要识别压力不足，需要单独标注压力表或低压状态类别。
