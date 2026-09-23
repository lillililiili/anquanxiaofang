import { config } from "../env.js";
import { createId } from "../state.js";
import type { SafetyAnalysis } from "../types/safety.types.js";
import { getMockAnalysis } from "./mock-vision.service.js";
import { analyzeFrameWithOpenAICompatible } from "./openai-vision.service.js";
import { analyzeFrameWithOpenCvYolo } from "./yolo-vision.service.js";

export async function analyzeFrame(input: {
  deviceId: string;
  taskId: string;
  frameBase64: string;
  captureTime: string;
}): Promise<SafetyAnalysis> {
  const analysisId = createId("AI");
  const provider = config.aiProvider;
  if (provider === "mock") {
    return getMockAnalysis(analysisId, input.deviceId, input.taskId, input.captureTime, provider);
  }
  try {
    if (provider === "yolo") {
      return await analyzeFrameWithOpenCvYolo({
        analysisId,
        ...input
      });
    }
    if (provider === "qwen") {
      return await analyzeFrameWithOpenAICompatible({
        apiKey: config.qwenApiKey,
        baseURL: config.qwenBaseUrl,
        model: config.qwenVisionModel,
        provider,
        analysisId,
        ...input
      });
    }
    if (provider === "openai") {
      return await analyzeFrameWithOpenAICompatible({
        apiKey: config.openaiApiKey,
        baseURL: config.openaiBaseUrl,
        model: config.openaiVisionModel,
        provider,
        analysisId,
        ...input
      });
    }
    return await analyzeFrameWithOpenAICompatible({
      apiKey: config.deepseekApiKey,
      baseURL: config.deepseekBaseUrl,
      model: config.deepseekModel,
      provider,
      analysisId,
      ...input
    });
  } catch (error) {
    console.warn(`[${provider}] frame analysis failed, fallback to mock:`, error);
    return getMockAnalysis(analysisId, input.deviceId, input.taskId, input.captureTime, `${provider}-fallback-mock`);
  }
}
