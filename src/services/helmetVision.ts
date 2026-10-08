export type HelmetRiskLevel = "高风险" | "中风险" | "低风险" | "建议人工复核";
export type HelmetBBox = { x: number; y: number; w: number; h: number };
export type HelmetDetection = {
  id: string;
  candidateId?: string;
  hazardName: string;
  category: string;
  riskLevel: HelmetRiskLevel;
  confidence: number;
  bbox?: HelmetBBox;
  description: string;
  rectificationSuggestion: string;
  needExpertReview: boolean;
};
export type HelmetAnalysis = {
  analysisId: string;
  deviceId: string;
  taskId: string;
  captureTime: string;
  hasHazard: boolean;
  overallRiskLevel: HelmetRiskLevel;
  summary: string;
  detections: HelmetDetection[];
  candidates?: (HelmetDetection & { candidateId: string; status: string })[];
  provider: string;
};

type ApiResponse<T> = { success: boolean; message?: string; data: T };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080/api").replace(/\/$/, "");

function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL.endsWith("/api") || normalizedPath.startsWith("/api/")) return `${API_BASE_URL}${normalizedPath}`;
  return `${API_BASE_URL}/api${normalizedPath}`;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path));
  if (!response.ok) throw new Error(`接口请求失败：${response.status}`);
  const payload = await response.json() as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.message ?? "接口返回失败");
  return payload.data;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`接口请求失败：${response.status}`);
  const payload = await response.json() as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.message ?? "接口返回失败");
  return payload.data;
}

export function formatProviderName(provider: string) {
  if (!provider) return "未读取";
  if (provider === "yolo") return "OpenCV YOLO26n";
  if (provider === "yolo-fallback-mock") return "OpenCV YOLO 回退 Mock";
  if (provider.includes("fallback")) return `${provider} 回退`;
  if (provider === "mock") return "Mock 演示数据";
  if (provider === "openai") return "OpenAI 视觉模型";
  if (provider === "qwen") return "通义千问视觉模型";
  if (provider === "deepseek") return "DeepSeek";
  return provider;
}

export async function imageAssetToDataUrl(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) throw new Error("图片画面不可用");
  context.drawImage(image, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  if (!dataUrl.includes(",") || dataUrl.endsWith(",")) throw new Error("图片转换为空");
  return dataUrl;
}

export async function fetchLatestHelmetAnalysis(deviceId = "SHM20250516001") {
  return apiGet<HelmetAnalysis | null>(`/vision/latest?deviceId=${encodeURIComponent(deviceId)}`);
}

export async function analyzeHelmetFrame(options: {
  frameSrc: string;
  deviceId?: string;
  taskId?: string;
}) {
  const frameBase64 = await imageAssetToDataUrl(options.frameSrc);
  return apiPost<HelmetAnalysis>("/vision/analyze-frame", {
    deviceId: options.deviceId || "SHM20250516001",
    taskId: options.taskId || "TASK20250516001",
    captureTime: new Date().toISOString(),
    frameBase64
  });
}
