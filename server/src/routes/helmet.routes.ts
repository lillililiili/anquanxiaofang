import { Router } from "express";
import { generateRectificationWithDeepSeek } from "../services/deepseek-text.service.js";
import { createId, state } from "../state.js";
import type { HazardDraft, SafetyDetection } from "../types/safety.types.js";

export const helmetRouter = Router();

helmetRouter.get("/tasks/:taskId/hazard-candidates", (req, res) => {
  const taskId = req.params.taskId;
  const list = [...state.hazardCandidates.values()].filter((item) => item.taskId === taskId);
  res.json({ success: true, data: list });
});

helmetRouter.post("/hazard-candidates/:candidateId/register-draft", (req, res) => {
  const candidate = state.hazardCandidates.get(req.params.candidateId);
  if (!candidate) {
    res.status(404).json({ success: false, message: "hazard candidate not found" });
    return;
  }
  const draft: HazardDraft = {
    draftId: createId("DRAFT"),
    hazardName: candidate.hazardName,
    category: candidate.category,
    riskLevel: candidate.riskLevel,
    description: candidate.description,
    rectificationSuggestion: candidate.rectificationSuggestion,
    source: "智能安全帽AI识别",
    deviceId: candidate.deviceId,
    taskId: candidate.taskId
  };
  state.drafts.set(draft.draftId, draft);
  state.hazardCandidates.set(candidate.candidateId, { ...candidate, status: "已生成草稿" });
  res.json({ success: true, data: draft });
});

helmetRouter.post("/ai/generate-rectification", async (req, res, next) => {
  try {
    const hazards = (Array.isArray(req.body.hazards) ? req.body.hazards : []) as Pick<SafetyDetection, "hazardName" | "riskLevel" | "description">[];
    const result = await generateRectificationWithDeepSeek(hazards);
    state.rectificationSuggestions.unshift({ id: createId("REC"), suggestions: result.suggestions, createdAt: new Date().toISOString() });
    state.rectificationSuggestions.splice(20);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
