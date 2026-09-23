from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export trained YOLO26 weights to ONNX.")
    parser.add_argument("--weights", default=str(ROOT / "runs" / "fire-safety-yolo26" / "weights" / "best.pt"))
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--opset", type=int, default=12)
    parser.add_argument("--output", default=str(ROOT / "exports" / "fire-safety-yolo26.onnx"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    weights = Path(args.weights)
    if not weights.exists():
        raise SystemExit(f"Weights not found: {weights}")

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit("Missing dependency: run `python -m pip install -r training/yolo26/requirements.txt` first.") from exc

    model = YOLO(str(weights))
    exported_path = Path(model.export(format="onnx", imgsz=args.imgsz, opset=args.opset))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(exported_path, output)
    print(f"Exported ONNX: {output}")


if __name__ == "__main__":
    main()
