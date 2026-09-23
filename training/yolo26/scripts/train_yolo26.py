from __future__ import annotations

import argparse
from pathlib import Path

import yaml


# ROOT 指向 training/yolo26 目录。
# 这样无论你从项目根目录还是其他目录运行脚本，脚本都能找到同级的 dataset.yaml、datasets/ 和 runs/。
ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    # 这里定义训练命令支持的参数。
    # 示例：
    # python training/yolo26/scripts/train_yolo26.py --model yolo26n.pt --epochs 100 --batch 8 --device 0
    parser = argparse.ArgumentParser(description="Train a custom YOLO26 fire-safety detector.")

    # 基础模型权重。yolo26n.pt 是轻量版，适合 RTX 4060 Laptop 这类 8GB 显存显卡先跑通。
    # 如果以后数据量更大、显存更足，可以尝试 yolo26s.pt / yolo26m.pt。
    parser.add_argument("--model", default="yolo26n.pt", help="Base YOLO26 checkpoint, e.g. yolo26n.pt.")

    # 数据集配置文件。里面定义 train/val/test 图片路径和类别 names。
    # 默认使用 training/yolo26/dataset.yaml。
    parser.add_argument("--data", default=str(ROOT / "dataset.yaml"), help="Dataset yaml path.")

    # 训练轮数。每一轮都会完整看一遍训练集。
    # 当前导入的 FireSafetyNet 灭火器数据不大，100 轮适合作为第一版训练。
    parser.add_argument("--epochs", type=int, default=100)

    # 输入图片尺寸。YOLO 会把图片缩放/填充到这个尺寸训练。
    # 640 是检测模型常用尺寸，兼顾精度和速度。
    parser.add_argument("--imgsz", type=int, default=640)

    # 每次送进显卡的图片数量。数值越大越快，但越吃显存。
    # RTX 4060 Laptop 8GB 建议从 8 起步，显存不足就降到 4。
    parser.add_argument("--batch", type=int, default=8)

    # 训练设备。0 表示第 0 块 NVIDIA 显卡；cpu 表示不用显卡。
    # 注意：必须安装 CUDA 版 PyTorch，--device 0 才会生效。
    parser.add_argument("--device", default="0", help="GPU id like 0, or cpu.")

    # 数据加载进程数。Windows 笔记本上过高可能卡顿，建议 2 或 4。
    parser.add_argument("--workers", type=int, default=4)

    # Ultralytics 训练输出根目录。
    # 训练日志、权重、评估结果都会写到 training/yolo26/runs/。
    parser.add_argument("--project", default=str(ROOT / "runs"))

    # 本次训练任务名称。最终 best.pt 默认在：
    # training/yolo26/runs/fire-safety-yolo26/weights/best.pt
    parser.add_argument("--name", default="fire-safety-yolo26")
    return parser.parse_args()


def resolve_dataset_yaml(data_path: str) -> str:
    # Ultralytics 会按 dataset.yaml 里的 path 字段查找图片。
    # 原始 dataset.yaml 里写的是相对路径 datasets/fire-safety。
    # 为了避免“从不同目录运行脚本导致找不到数据集”，这里把默认 dataset.yaml 转成绝对路径版本。
    path = Path(data_path)

    # 如果用户手动传了其他 --data 文件，就尊重用户输入，不自动改写。
    if path.resolve() != (ROOT / "dataset.yaml").resolve():
        return str(path)

    payload = yaml.safe_load(path.read_text(encoding="utf-8"))

    # 把 path 改成绝对路径，例如：
    # C:/.../training/yolo26/datasets/fire-safety
    payload["path"] = str((ROOT / "datasets" / "fire-safety").resolve())

    # 生成临时配置文件，避免修改原始 dataset.yaml。
    # Ultralytics 训练时实际读取这个 .generated-dataset.yaml。
    generated = ROOT / ".generated-dataset.yaml"
    generated.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return str(generated)


def main() -> None:
    # 读取命令行参数。
    args = parse_args()

    # 训练能力来自 ultralytics 包；如果没安装依赖，这里给出明确提示。
    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit("Missing dependency: run `python -m pip install -r training/yolo26/requirements.txt` first.") from exc

    # 加载基础 YOLO26 模型。
    # 第一次使用 yolo26n.pt 时，Ultralytics 会尝试自动下载这个预训练权重。
    model = YOLO(args.model)

    # 真正开始训练。
    # 训练结束后，Ultralytics 会自动保存 last.pt 和 best.pt。
    # best.pt 是验证集指标最好的模型，后续导出 ONNX 时用它。
    model.train(
        data=resolve_dataset_yaml(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        workers=args.workers,
        project=args.project,
        name=args.name,
        exist_ok=True,
    )


if __name__ == "__main__":
    main()
