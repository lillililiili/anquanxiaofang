from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
APP_MODEL = REPO_ROOT / "server" / "models" / "yolo.onnx"
APP_CLASSES = REPO_ROOT / "server" / "models" / "classes.txt"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Copy trained YOLO26 ONNX and classes into the running app.")
    parser.add_argument("--onnx", required=True, help="Trained ONNX path.")
    parser.add_argument("--classes", default=str(Path(__file__).resolve().parents[1] / "classes.txt"))
    parser.add_argument("--no-backup", action="store_true")
    return parser.parse_args()


def backup(path: Path) -> None:
    if not path.exists():
        return
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = path.with_name(f"{path.stem}-backup-{stamp}{path.suffix}")
    shutil.copy2(path, backup_path)
    print(f"Backed up {path.name} -> {backup_path.name}")


def main() -> None:
    args = parse_args()
    onnx = Path(args.onnx)
    classes = Path(args.classes)
    if not onnx.exists():
        raise SystemExit(f"ONNX not found: {onnx}")
    if not classes.exists():
        raise SystemExit(f"Classes file not found: {classes}")

    APP_MODEL.parent.mkdir(parents=True, exist_ok=True)
    if not args.no_backup:
        backup(APP_MODEL)
        backup(APP_CLASSES)

    shutil.copy2(onnx, APP_MODEL)
    shutil.copy2(classes, APP_CLASSES)
    print(f"Synced model -> {APP_MODEL}")
    print(f"Synced classes -> {APP_CLASSES}")


if __name__ == "__main__":
    main()
