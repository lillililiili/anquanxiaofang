from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Iterable

import cv2


IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert LabelMe rectangle/polygon JSON files to YOLO bbox labels.")
    parser.add_argument("--json-dir", required=True)
    parser.add_argument("--image-dir", required=True)
    parser.add_argument("--label-dir", required=True)
    parser.add_argument("--classes", required=True)
    parser.add_argument("--copy-images-to", default="", help="Optional destination for images referenced by LabelMe JSON.")
    return parser.parse_args()


def load_classes(path: Path) -> dict[str, int]:
    names = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return {name: index for index, name in enumerate(names)}


def find_image(image_dir: Path, image_name: str) -> Path | None:
    direct = image_dir / image_name
    if direct.exists():
        return direct
    stem = Path(image_name).stem
    for ext in IMAGE_EXTS:
        candidate = image_dir / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    return None


def bbox_from_points(points: Iterable[Iterable[float]]) -> tuple[float, float, float, float]:
    xs = [float(point[0]) for point in points]
    ys = [float(point[1]) for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def convert_one(json_path: Path, image_dir: Path, label_dir: Path, class_map: dict[str, int], copy_images_to: Path | None) -> None:
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    image_name = payload.get("imagePath") or f"{json_path.stem}.jpg"
    image_path = find_image(image_dir, image_name)
    if image_path is None:
        raise FileNotFoundError(f"Image not found for {json_path.name}: {image_name}")

    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")
    height, width = image.shape[:2]

    lines: list[str] = []
    for shape in payload.get("shapes", []):
        label = str(shape.get("label", "")).strip()
        if label not in class_map:
            print(f"Skip unknown label `{label}` in {json_path.name}")
            continue
        points = shape.get("points") or []
        if len(points) < 2:
            continue
        x1, y1, x2, y2 = bbox_from_points(points)
        x1 = max(0.0, min(float(width), x1))
        y1 = max(0.0, min(float(height), y1))
        x2 = max(0.0, min(float(width), x2))
        y2 = max(0.0, min(float(height), y2))
        box_w = max(0.0, x2 - x1)
        box_h = max(0.0, y2 - y1)
        if box_w <= 1 or box_h <= 1:
            continue
        x_center = (x1 + x2) / 2 / width
        y_center = (y1 + y2) / 2 / height
        lines.append(f"{class_map[label]} {x_center:.6f} {y_center:.6f} {box_w / width:.6f} {box_h / height:.6f}")

    label_dir.mkdir(parents=True, exist_ok=True)
    (label_dir / f"{image_path.stem}.txt").write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")

    if copy_images_to:
        copy_images_to.mkdir(parents=True, exist_ok=True)
        shutil.copy2(image_path, copy_images_to / image_path.name)


def main() -> None:
    args = parse_args()
    json_dir = Path(args.json_dir)
    image_dir = Path(args.image_dir)
    label_dir = Path(args.label_dir)
    copy_images_to = Path(args.copy_images_to) if args.copy_images_to else None
    class_map = load_classes(Path(args.classes))

    json_files = sorted(json_dir.glob("*.json"))
    if not json_files:
        raise SystemExit(f"No LabelMe JSON files found in {json_dir}")
    for json_path in json_files:
        convert_one(json_path, image_dir, label_dir, class_map, copy_images_to)
    print(f"Converted {len(json_files)} LabelMe files into {label_dir}")


if __name__ == "__main__":
    main()
