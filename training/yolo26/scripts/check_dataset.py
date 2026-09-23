from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "datasets" / "fire-safety"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def count_split(split: str) -> tuple[int, int, list[str]]:
    image_dir = DATASET / "images" / split
    label_dir = DATASET / "labels" / split
    images = [path for path in image_dir.iterdir() if path.suffix.lower() in IMAGE_EXTS]
    labels = [path for path in label_dir.iterdir() if path.suffix.lower() == ".txt"]
    label_stems = {path.stem for path in labels}
    missing = [path.name for path in images if path.stem not in label_stems]
    return len(images), len(labels), missing


def main() -> None:
    for split in ("train", "val", "test"):
        image_count, label_count, missing = count_split(split)
        print(f"{split}: images={image_count}, labels={label_count}, missing_labels={len(missing)}")
        for name in missing[:10]:
            print(f"  missing label: {name}")


if __name__ == "__main__":
    main()
