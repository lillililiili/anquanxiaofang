import base64
import json
import os
import sys
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np


def fail(message: str, code: int = 1) -> None:
    print(message, file=sys.stderr)
    sys.exit(code)


def read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        fail("empty stdin payload")
    return json.loads(raw)


def decode_image(frame_base64: str) -> np.ndarray:
    if "," in frame_base64:
        frame_base64 = frame_base64.split(",", 1)[1]
    data = base64.b64decode(frame_base64)
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        fail("failed to decode frame image")
    return image


def load_class_names(path: str) -> List[str]:
    if not path or not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as file:
        return [line.strip() for line in file.readlines() if line.strip()]


def letterbox(image: np.ndarray, size: int) -> Tuple[np.ndarray, float, float, float]:
    height, width = image.shape[:2]
    ratio = min(size / width, size / height)
    new_width = int(round(width * ratio))
    new_height = int(round(height * ratio))
    resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    left = (size - new_width) / 2
    top = (size - new_height) / 2
    canvas[int(round(top)):int(round(top)) + new_height, int(round(left)):int(round(left)) + new_width] = resized
    return canvas, ratio, left, top


def normalize_outputs(outputs: Any) -> np.ndarray:
    output = outputs[0] if isinstance(outputs, (list, tuple)) else outputs
    prediction = np.asarray(output)
    prediction = np.squeeze(prediction)
    if prediction.ndim != 2:
        fail(f"unsupported YOLO output shape: {prediction.shape}")
    # YOLOv8 ONNX commonly returns (classes + 4, anchors). Convert it to (anchors, attrs).
    if prediction.shape[0] < prediction.shape[1] and prediction.shape[0] <= 256:
        prediction = prediction.T
    return prediction


def forward_onnx(model_path: str, blob: np.ndarray) -> np.ndarray:
    try:
        import onnxruntime as ort
    except ImportError:
        net = cv2.dnn.readNetFromONNX(model_path)
        net.setInput(blob)
        return normalize_outputs(net.forward(net.getUnconnectedOutLayersNames()))

    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    return normalize_outputs(session.run(None, {input_name: blob}))


def parse_row(row: np.ndarray, input_size: int) -> Tuple[int, float, List[float]]:
    cols = row.shape[0]
    if cols == 6:
        x1, y1, x2, y2, confidence, class_id = row.tolist()
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        width = x2 - x1
        height = y2 - y1
        return int(class_id), float(confidence), [cx, cy, width, height]

    if cols < 7:
        return -1, 0.0, [0.0, 0.0, 0.0, 0.0]

    class_scores_v8 = row[4:]
    class_id_v8 = int(np.argmax(class_scores_v8))
    confidence_v8 = float(class_scores_v8[class_id_v8])

    class_scores_v5 = row[5:]
    class_id_v5 = int(np.argmax(class_scores_v5))
    confidence_v5 = float(row[4] * class_scores_v5[class_id_v5])

    if confidence_v5 > confidence_v8 and row[4] <= 1.0:
        return class_id_v5, confidence_v5, row[:4].tolist()
    return class_id_v8, confidence_v8, row[:4].tolist()


def xywh_to_original_box(xywh: List[float], image_shape: Tuple[int, int], input_size: int, ratio: float, pad_x: float, pad_y: float) -> Tuple[int, int, int, int]:
    original_height, original_width = image_shape
    cx, cy, width, height = xywh

    if max(abs(cx), abs(cy), abs(width), abs(height)) <= 1.5:
        cx *= input_size
        cy *= input_size
        width *= input_size
        height *= input_size

    x1 = (cx - width / 2 - pad_x) / ratio
    y1 = (cy - height / 2 - pad_y) / ratio
    x2 = (cx + width / 2 - pad_x) / ratio
    y2 = (cy + height / 2 - pad_y) / ratio

    x1 = int(max(0, min(original_width - 1, round(x1))))
    y1 = int(max(0, min(original_height - 1, round(y1))))
    x2 = int(max(0, min(original_width - 1, round(x2))))
    y2 = int(max(0, min(original_height - 1, round(y2))))
    return x1, y1, max(1, x2 - x1), max(1, y2 - y1)


def infer(payload: Dict[str, Any]) -> Dict[str, Any]:
    model_path = payload.get("modelPath", "")
    if not model_path or not os.path.exists(model_path):
        fail(f"YOLO model not found: {model_path}")

    input_size = int(payload.get("inputSize", 640))
    confidence_threshold = float(payload.get("confidenceThreshold", 0.35))
    nms_threshold = float(payload.get("nmsThreshold", 0.45))
    class_names = load_class_names(payload.get("classNamesPath", ""))
    image = decode_image(payload.get("frameBase64", ""))
    original_height, original_width = image.shape[:2]

    padded, ratio, pad_x, pad_y = letterbox(image, input_size)
    blob = cv2.dnn.blobFromImage(padded, scalefactor=1 / 255.0, size=(input_size, input_size), swapRB=True, crop=False)

    predictions = forward_onnx(model_path, blob)

    boxes: List[List[int]] = []
    confidences: List[float] = []
    class_ids: List[int] = []

    for row in predictions:
        class_id, confidence, xywh = parse_row(row, input_size)
        if class_id < 0 or confidence < confidence_threshold:
            continue
        x, y, w, h = xywh_to_original_box(xywh, (original_height, original_width), input_size, ratio, pad_x, pad_y)
        boxes.append([x, y, w, h])
        confidences.append(confidence)
        class_ids.append(class_id)

    indices = cv2.dnn.NMSBoxes(boxes, confidences, confidence_threshold, nms_threshold)
    kept = np.array(indices).flatten().tolist() if len(indices) else []

    detections = []
    for index in kept:
        x, y, w, h = boxes[index]
        class_id = class_ids[index]
        label = class_names[class_id] if 0 <= class_id < len(class_names) else f"class_{class_id}"
        detections.append({
            "classId": class_id,
            "label": label,
            "confidence": round(float(confidences[index]), 4),
            "bbox": {
                "x": round(x / original_width, 6),
                "y": round(y / original_height, 6),
                "w": round(w / original_width, 6),
                "h": round(h / original_height, 6),
            },
        })

    return {"detections": detections}


def main() -> None:
    payload = read_payload()
    result = infer(payload)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
