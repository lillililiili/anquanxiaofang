export type AiProvider = "mock" | "qwen" | "openai" | "deepseek" | "yolo";

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 8080),
  apiPublicUrl: env.API_PUBLIC_URL ?? "http://127.0.0.1:8080/api/",
  wsPublicUrl: env.WS_PUBLIC_URL ?? "ws://127.0.0.1:8080/ws/device",
  aiProvider: (env.AI_PROVIDER ?? "mock") as AiProvider,
  frameAnalyzeIntervalMs: Number(env.FRAME_ANALYZE_INTERVAL_MS ?? 3000),
  frameAnalyzeEnabled: (env.FRAME_ANALYZE_ENABLED ?? "true") !== "false",
  openaiApiKey: env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openaiVisionModel: env.OPENAI_VISION_MODEL ?? "gpt-4.1",
  qwenApiKey: env.QWEN_API_KEY ?? "",
  qwenBaseUrl: env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  qwenVisionModel: env.QWEN_VISION_MODEL ?? "qwen2.5-vl",
  deepseekApiKey: env.DEEPSEEK_API_KEY ?? "",
  deepseekBaseUrl: env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  deepseekModel: env.DEEPSEEK_MODEL ?? "deepseek-chat",
  yoloPythonPath: env.YOLO_PYTHON_PATH ?? "python",
  yoloScriptPath: env.YOLO_SCRIPT_PATH ?? "server/scripts/opencv_yolo_infer.py",
  yoloModelPath: env.YOLO_MODEL_PATH ?? "server/models/yolo.onnx",
  yoloClassNamesPath: env.YOLO_CLASS_NAMES_PATH ?? "server/models/classes.txt",
  yoloInputSize: Number(env.YOLO_INPUT_SIZE ?? 640),
  yoloConfidenceThreshold: Number(env.YOLO_CONFIDENCE_THRESHOLD ?? 0.35),
  yoloNmsThreshold: Number(env.YOLO_NMS_THRESHOLD ?? 0.45)
};
