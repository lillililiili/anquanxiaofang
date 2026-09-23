# 公开数据集下载与整理

这份说明用于把公开消防数据集整理到当前训练目录：

```text
training/yolo26/datasets/fire-safety/
  images/train
  images/val
  images/test
  labels/train
  labels/val
  labels/test
```

当前项目训练类别在 `training/yolo26/classes.txt`：

```text
fire_extinguisher
fire_hydrant
open_electrical_box
exposed_wire
fire_corridor_blocked
smoke
flame
no_helmet
```

## 推荐数据集

### FireSafetyNet

用途：消防设施识别，尤其是 `fire_extinguisher`、smoke detector、manual call point、fire blanket、FSE signs 等。

来源：[FireSafetyNet on Zenodo](https://zenodo.org/records/13358169)

公开信息要点：

- Zenodo record id：`13358169`
- 许可：CC BY 4.0
- 总文件较大，约 7.2 GB
- 优先下载 `1_FSE Detection.zip`，它约 361.9 MB，最适合先做消防设施目标检测

列出 Zenodo 文件：

```powershell
python training\yolo26\scripts\public_datasets.py zenodo-list --record-id 13358169
```

下载 FireSafetyNet 的 FSE detection 子集：

```powershell
python training\yolo26\scripts\public_datasets.py download-firesafetynet `
  --files "1_FSE Detection.zip" `
  --extract
```

下载位置：

```text
training/yolo26/downloads/firesafetynet/
training/yolo26/extracted/firesafetynet/
```

下载后先检查解压目录结构。如果里面已经是 YOLO 格式，即存在类似 `images/`、`labels/`、`data.yaml` 或 `.txt` 标注文件，可以用 `import-yolo` 导入。

本项目已验证 `1_FSE Detection.zip` 解压后的结构为：

```text
training/yolo26/extracted/firesafetynet/1_FSE_Detection/1_FSE Detection/
  data.yaml
  train/images
  train/labels
  valid/images
  valid/labels
```

其类别顺序为：

```text
0 fire blanket
1 manual call point
2 smoke detector
3 fire extinguisher
```

如果只导入当前训练类别表里的灭火器，可执行：

```powershell
python training\yolo26\scripts\public_datasets.py import-yolo `
  --source "training\yolo26\extracted\firesafetynet\1_FSE_Detection\1_FSE Detection" `
  --source-classes "fire blanket,manual call point,smoke detector,fire extinguisher" `
  --class-map fire_extinguisher=fire_extinguisher `
  --split train `
  --prefix firesafetynet

python training\yolo26\scripts\public_datasets.py import-yolo `
  --source "training\yolo26\extracted\firesafetynet\1_FSE_Detection\1_FSE Detection" `
  --source-classes "fire blanket,manual call point,smoke detector,fire extinguisher" `
  --class-map fire_extinguisher=fire_extinguisher `
  --split val `
  --prefix firesafetynet
```

如果 FireSafetyNet 子集不是 YOLO bbox 格式，而是 COCO/LabelMe/segmentation，需要先转换。当前脚本先覆盖“已经是 YOLO 格式”的快速路径；复杂标注格式建议先用 CVAT/Roboflow/FiftyOne 转成 YOLO。

### D-Fire

用途：`smoke` 和 `flame`。

来源：[D-Fire GitHub](https://github.com/gaia-solutions-on-demand/DFireDataset)

公开信息要点：

- 21,000+ 图片
- 目标检测数据集
- YOLO 格式归一化坐标
- 类别为 fire 和 smoke
- 官方提供 OneDrive、预切分版本、Kaggle ready-to-use 版本

因为 OneDrive 链接通常需要浏览器确认或登录环境，脚本不强行自动拉 OneDrive。建议先按 GitHub README 下载或用 Kaggle 下载到本地，然后导入。

如果使用 Kaggle 版本，常见类别顺序是：

```text
0 Smoke
1 Fire
```

导入 D-Fire：

```powershell
python training\yolo26\scripts\public_datasets.py import-dfire `
  --source D:\datasets\d-fire `
  --split train `
  --prefix dfire
```

如果你的 D-Fire 解压目录已有 `train/valid/test` 或 `images/train`、`labels/train`，脚本会尽量自动识别。类别会映射为：

```text
Smoke -> smoke
Fire  -> flame
```

### Roboflow / 其他 YOLO 数据集

Roboflow Universe 上有不少 fire extinguisher、hardhat、fire/smoke 数据集，但每个项目许可不同。下载前确认 license。

如果下载的是 YOLO 格式，可以统一用：

```powershell
python training\yolo26\scripts\public_datasets.py import-yolo `
  --source D:\datasets\some-yolo-dataset `
  --source-classes fire-extinguisher,person `
  --class-map fire-extinguisher=fire_extinguisher `
  --split train `
  --prefix roboflow_extinguisher
```

## 检查导入结果

```powershell
python training\yolo26\scripts\check_dataset.py
```

## 开始训练

```powershell
python training\yolo26\scripts\train_yolo26.py `
  --model yolo26n.pt `
  --epochs 100 `
  --imgsz 640 `
  --batch 8 `
  --device 0
```

## 重要提醒

- `open_electrical_box`、`exposed_wire`、`fire_corridor_blocked` 这类“状态/违规行为”公开数据很少，仍需要现场图自采和标注。
- D-Fire 只能补火焰/烟雾，不会帮助识别灭火器、配电箱、线缆。
- FireSafetyNet 更适合消防设施本体识别，不等于能判断“灭火器压力不足”。
- 混合多个公开数据集时，务必统一类别名和标注标准。
