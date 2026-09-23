import OpenAI from "openai";
import { safetyVisionSystemPrompt, safetyVisionUserPrompt } from "../prompts/safety-vision.prompt.js";
import type { SafetyAnalysis } from "../types/safety.types.js";

function parseJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI response does not contain JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function analyzeFrameWithOpenAICompatible(options: {
  apiKey: string;
  baseURL: string;
  model: string;
  frameBase64: string;
  analysisId: string;
  deviceId: string;
  taskId: string;
  captureTime: string;
  provider: string;
}): Promise<SafetyAnalysis> {
  if (!options.apiKey) throw new Error(`${options.provider} API key is not configured`);
  const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
  const completion = await client.chat.completions.create({
    model: options.model,
    temperature: 0.1,
    messages: [
      { role: "system", content: safetyVisionSystemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: safetyVisionUserPrompt },
          { type: "image_url", image_url: { url: options.frameBase64 } }
        ]
      }
    ]
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI response is empty");
  const parsed = parseJsonObject(Array.isArray(content) ? content.map((part) => ("text" in part ? part.text : "")).join("\n") : content);
  return {
    analysisId: options.analysisId,
    deviceId: options.deviceId,
    taskId: options.taskId,
    captureTime: options.captureTime,
    hasHazard: Boolean(parsed.hasHazard),
    overallRiskLevel: parsed.overallRiskLevel ?? "建议人工复核",
    summary: parsed.summary ?? "已完成当前帧安全检查辅助研判。",
    detections: (parsed.detections ?? []).map((item: Record<string, unknown>, index: number) => ({
      id: String(item.id ?? `D${String(index + 1).padStart(3, "0")}`),
      hazardName: String(item.hazardName ?? "疑似隐患"),
      category: String(item.category ?? "其他"),
      riskLevel: String(item.riskLevel ?? "建议人工复核"),
      confidence: Number(item.confidence ?? 0.6),
      bbox: item.bbox,
      description: String(item.description ?? ""),
      evidence: String(item.evidence ?? ""),
      possibleConsequence: String(item.possibleConsequence ?? ""),
      basisKeywords: Array.isArray(item.basisKeywords) ? item.basisKeywords.map(String) : [],
      rectificationSuggestion: String(item.rectificationSuggestion ?? "建议人工复核后制定整改措施。"),
      needRetake: Boolean(item.needRetake),
      retakeSuggestions: Array.isArray(item.retakeSuggestions) ? item.retakeSuggestions.map(String) : [],
      needExpertReview: Boolean(item.needExpertReview)
    })),
    manualReviewRequired: Boolean(parsed.manualReviewRequired ?? true),
    provider: options.provider
  } as SafetyAnalysis;
}
