from __future__ import annotations

import argparse
import json
import shutil
import sys
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
TARGET_DATASET = ROOT / "datasets" / "fire-safety"
DOWNLOADS = ROOT / "downloads"
EXTRACTED = ROOT / "extracted"
REPORTS = ROOT / "import-reports"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass
class ImportStats:
    images: int = 0
    labels: int = 0
    boxes: int = 0
    skipped_boxes: int = 0
    missing_images: int = 0


def read_lines(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def app_classes() -> list[str]:
    return read_lines(ROOT / "classes.txt")


def request_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def download_file(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as response, destination.open("wb") as file:
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            file.write(chunk)
            done += len(chunk)
            if total:
                percent = done / total * 100
                print(f"\r{destination.name}: {percent:5.1f}%", end="")
        if total:
            print()


def safe_extract_zip(archive: Path, destination: Path) -> None:
    destination = destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zip_file:
        for member in zip_file.infolist():
            target = (destination / member.filename).resolve()
            if not str(target).startswith(str(destination)):
                raise ValueError(f"Unsafe zip member: {member.filename}")
        zip_file.extractall(destination)


def list_zenodo(record_id: str) -> None:
    payload = request_json(f"https://zenodo.org/api/records/{record_id}")
    print(f"title: {payload.get('metadata', {}).get('title', '')}")
    print(f"record: {record_id}")
    print("files:")
    for file_info in payload.get("files", []):
        key = file_info.get("key", "")
        size = int(file_info.get("size") or 0)
        checksum = file_info.get("checksum", "")
        print(f"  - {key} ({size / 1024 / 1024:.1f} MB) {checksum}")


def download_firesafetynet(files: list[str], extract: bool) -> None:
    record_id = "13358169"
    payload = request_json(f"https://zenodo.org/api/records/{record_id}")
    available = {file_info["key"]: file_info for file_info in payload.get("files", [])}
    selected = files or ["1_FSE Detection.zip"]

    for name in selected:
        if name not in available:
            raise SystemExit(f"File not found in Zenodo record: {name}")
        file_info = available[name]
        url = file_info.get("links", {}).get("self")
        if not url:
            raise SystemExit(f"No download URL for {name}")
        archive_path = DOWNLOADS / "firesafetynet" / name
        print(f"Downloading {name}")
        download_file(url, archive_path)
        if extract:
            output_dir = EXTRACTED / "firesafetynet" / archive_path.stem.replace(" ", "_")
            print(f"Extracting to {output_dir}")
            safe_extract_zip(archive_path, output_dir)


def parse_class_source(value: str) -> list[str]:
    path = Path(value)
    if path.exists():
        return read_lines(path)
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_class_map(items: list[str], source_classes: list[str], default_map: dict[str, str] | None = None) -> dict[int, str]:
    app = set(app_classes())
    mapping: dict[str, str] = {}
    if default_map:
        mapping.update({key.lower(): value for key, value in default_map.items()})
    for item in items:
        if "=" not in item:
            raise SystemExit(f"Invalid class map `{item}`, expected source=target")
        source, target = item.split("=", 1)
        mapping[source.strip().lower()] = target.strip()

    result: dict[int, str] = {}
    for index, source_name in enumerate(source_classes):
        target = mapping.get(source_name.lower(), source_name)
        target = target.replace("-", "_").replace(" ", "_")
        if target in app:
            result[index] = target
    return result


def find_split_dirs(source: Path, split: str) -> tuple[Path, Path]:
    source_split_names = [split]
    if split == "val":
        source_split_names.append("valid")

    candidates = [
        (source / "images" / split, source / "labels" / split),
        (source / "images", source / "labels"),
        (source, source),
    ]
    for source_split in source_split_names:
        candidates.insert(1, (source / source_split / "images", source / source_split / "labels"))
        candidates.insert(2, (source / source_split, source / source_split))
    for image_dir, label_dir in candidates:
        if image_dir.exists() and label_dir.exists() and any(label_dir.rglob("*.txt")):
            return image_dir, label_dir
    raise SystemExit(f"Could not find YOLO image/label dirs under {source} for split `{split}`")


def find_image_for_label(image_dir: Path, label_path: Path) -> Path | None:
    stem = label_path.stem
    direct_parent = image_dir / label_path.relative_to(label_path.parents[0]).with_suffix("")
    for ext in IMAGE_EXTS:
        candidate = direct_parent.with_suffix(ext)
        if candidate.exists():
            return candidate
    for ext in IMAGE_EXTS:
        matches = list(image_dir.rglob(f"{stem}{ext}"))
        if matches:
            return matches[0]
    return None


def remap_label_file(label_path: Path, class_map: dict[int, str], target_class_to_id: dict[str, int]) -> tuple[list[str], int]:
    output: list[str] = []
    skipped = 0
    for line in label_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        parts = line.strip().split()
        if len(parts) < 5:
            continue
        try:
            source_id = int(float(parts[0]))
        except ValueError:
            continue
        target_class = class_map.get(source_id)
        if target_class is None:
            skipped += 1
            continue
        output.append(" ".join([str(target_class_to_id[target_class]), *parts[1:5]]))
    return output, skipped


def import_yolo_dataset(
    source: Path,
    source_classes: list[str],
    class_map: dict[int, str],
    split: str,
    prefix: str,
    dry_run: bool,
    include_empty: bool,
) -> ImportStats:
    image_dir, label_dir = find_split_dirs(source, split)
    target_image_dir = TARGET_DATASET / "images" / split
    target_label_dir = TARGET_DATASET / "labels" / split
    target_class_to_id = {name: index for index, name in enumerate(app_classes())}
    stats = ImportStats()

    if not dry_run:
        target_image_dir.mkdir(parents=True, exist_ok=True)
        target_label_dir.mkdir(parents=True, exist_ok=True)

    for label_path in sorted(label_dir.rglob("*.txt")):
        if label_path.name.startswith("."):
            continue
        image_path = find_image_for_label(image_dir, label_path)
        if image_path is None:
            stats.missing_images += 1
            continue
        remapped, skipped = remap_label_file(label_path, class_map, target_class_to_id)
        stats.skipped_boxes += skipped
        if not remapped and not include_empty:
            continue

        target_stem = f"{prefix}_{image_path.stem}" if prefix else image_path.stem
        if not dry_run:
            shutil.copy2(image_path, target_image_dir / f"{target_stem}{image_path.suffix.lower()}")
            (target_label_dir / f"{target_stem}.txt").write_text("\n".join(remapped) + ("\n" if remapped else ""), encoding="utf-8")
        stats.images += 1
        stats.labels += 1
        stats.boxes += len(remapped)

    report = {
        "source": str(source),
        "source_classes": source_classes,
        "class_map": {str(key): value for key, value in class_map.items()},
        "split": split,
        "prefix": prefix,
        "dry_run": dry_run,
        "stats": stats.__dict__,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / f"import_{prefix or 'dataset'}_{split}.json"
    if not dry_run:
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return stats


def command_import_yolo(args: argparse.Namespace) -> None:
    source_classes = parse_class_source(args.source_classes)
    class_map = parse_class_map(args.class_map, source_classes)
    import_yolo_dataset(
        source=Path(args.source),
        source_classes=source_classes,
        class_map=class_map,
        split=args.split,
        prefix=args.prefix,
        dry_run=args.dry_run,
        include_empty=args.include_empty,
    )


def command_import_dfire(args: argparse.Namespace) -> None:
    source_classes = parse_class_source(args.source_classes)
    default_map = {
        "smoke": "smoke",
        "fire": "flame",
        "flame": "flame",
    }
    class_map = parse_class_map(args.class_map, source_classes, default_map=default_map)
    for split in args.split:
        import_yolo_dataset(
            source=Path(args.source),
            source_classes=source_classes,
            class_map=class_map,
            split=split,
            prefix=args.prefix,
            dry_run=args.dry_run,
            include_empty=args.include_empty,
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Download and import public fire-safety datasets.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    zenodo = subparsers.add_parser("zenodo-list", help="List files in a Zenodo record.")
    zenodo.add_argument("--record-id", default="13358169")

    fire = subparsers.add_parser("download-firesafetynet", help="Download FireSafetyNet files from Zenodo.")
    fire.add_argument("--files", nargs="*", default=["1_FSE Detection.zip"])
    fire.add_argument("--extract", action="store_true")

    generic = subparsers.add_parser("import-yolo", help="Import any YOLO-format dataset into training/yolo26.")
    generic.add_argument("--source", required=True)
    generic.add_argument("--source-classes", required=True, help="Comma-separated classes or path to class file.")
    generic.add_argument("--class-map", action="append", default=[], help="Map source class to target class, e.g. Fire=flame.")
    generic.add_argument("--split", default="train", choices=["train", "val", "test"])
    generic.add_argument("--prefix", default="public")
    generic.add_argument("--dry-run", action="store_true")
    generic.add_argument("--include-empty", action="store_true")

    dfire = subparsers.add_parser("import-dfire", help="Import D-Fire YOLO dataset into smoke/flame classes.")
    dfire.add_argument("--source", required=True)
    dfire.add_argument("--source-classes", default="Smoke,Fire")
    dfire.add_argument("--class-map", action="append", default=[])
    dfire.add_argument("--split", nargs="+", default=["train"], choices=["train", "val", "test"])
    dfire.add_argument("--prefix", default="dfire")
    dfire.add_argument("--dry-run", action="store_true")
    dfire.add_argument("--include-empty", action="store_true")

    return parser


def main(argv: Iterable[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "zenodo-list":
        list_zenodo(args.record_id)
    elif args.command == "download-firesafetynet":
        download_firesafetynet(args.files, args.extract)
    elif args.command == "import-yolo":
        command_import_yolo(args)
    elif args.command == "import-dfire":
        command_import_dfire(args)
    else:
        parser.error(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main(sys.argv[1:])
