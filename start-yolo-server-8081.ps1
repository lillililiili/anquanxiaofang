$env:PORT='8081'
$env:AI_PROVIDER='yolo'
$env:YOLO_PYTHON_PATH='.venv-yolo26\Scripts\python.exe'
$env:YOLO_MODEL_PATH='server/models/yolo.onnx'
$env:YOLO_CLASS_NAMES_PATH='server/models/classes.txt'
$env:YOLO_INPUT_SIZE='640'
npm.cmd run server:dev *> yolo-server-8081.out.log
