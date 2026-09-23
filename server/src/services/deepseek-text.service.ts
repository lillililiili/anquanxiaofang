import OpenAI from "openai";
import { config } from "../env.js";
import { rectificationSystemPrompt } from "../prompts/rectification.prompt.js";
import type { RectificationResult, SafetyDetection } from "../types/safety.types.js";

function parseJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("DeepSeek response does not contain JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export function getMockRectification(hazards: Pick<SafetyDetection, "hazardName" | "riskLevel" | "description">[]): RectificationResult {
  const names = hazards.map((item) => item.hazardName).join("、") || "现场疑似隐患";
  return {
    suggestions: [
      `针对${names}，先设置现场警戒并由责任人确认风险点。`,
      "立即关闭配电箱门并上锁，对裸露线缆进行绝缘包扎和走线整理。",
      "复核灭火器压力、有效期和摆放位置，补拍整改前后对比照片。",
      "整改完成后由检查人员复查确认，纳入隐患闭环台账。"
    ],
    basisKeywords: ["低压配电", "触电风险", "电气火灾", "消防设施"],
    needExpertReview: hazards.some((item) => item.riskLevel === "高风险")
  };
}

export async function generateRectificationWithDeepSeek(hazards: Pick<SafetyDetection, "hazardName" | "riskLevel" | "description">[]): Promise<RectificationResult> {
  if (!config.deepseekApiKey) return getMockRectification(hazards);
  try {
    const client = new OpenAI({ apiKey: config.deepseekApiKey, baseURL: config.deepseekBaseUrl });
    const completion = await client.chat.completions.create({
      model: config.deepseekModel,
      temperature: 0.2,
      messages: [
        { role: "system", content: rectificationSystemPrompt },
        { role: "user", content: `请为以下消防与用电安全疑似隐患生成整改建议：\n${JSON.stringify(hazards, null, 2)}` }
      ]
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("DeepSeek response is empty");
    const parsed = parseJsonObject(content);
    return {
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : getMockRectification(hazards).suggestions,
      basisKeywords: Array.isArray(parsed.basisKeywords) ? parsed.basisKeywords.map(String) : [],
      needExpertReview: Boolean(parsed.needExpertReview)
    };
  } catch (error) {
    console.warn("[deepseek] fallback to mock rectification:", error);
    return getMockRectification(hazards);
  }
}
