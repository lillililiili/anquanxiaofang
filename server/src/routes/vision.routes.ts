import { Router } from "express";
import { analyzeFrame } from "../services/frame-analyzer.service.js";
import { createId, getDevice, state, updateDevice } from "../state.js";
import type { ApiResponse, HazardCandidate, SafetyAnalysis } from "../types/safety.types.js";

export const visionRouter = Router();

visionRouter.post("/vision/analyze-frame", async (req, res, next) => {
  try {
    const deviceId = String(req.body.deviceId ?? "SHM20250516001");
    const taskId = String(req.body.taskId ?? getDevice(deviceId).taskId);
    const frameBase64 = String(req.body.frameBase64 ?? "");
    const captureTime = String(req.body.captureTime ?? new Date().toISOString());
    const analysis = await analyzeFrame({ deviceId, taskId, frameBase64, captureTime });
    state.latestAnalysis.set(deviceId, analysis);
    updateDevice(deviceId, { lastAnalysis: analysis, aiEnabled: true });
    if (frameBase64) {
      state.evidenceList.unshift({ id: createId("EV"), deviceId, taskId, captureTime, frameBase64 });
      state.evidenceList.splice(12);
    }
    const candidates = analysis.detections.map((item): HazardCandidate => {
      const candidateId = `${analysis.analysisId}-${item.id}`;
      const candidate: HazardCandidate = {
        ...item,
        candidateId,
        analysisId: analysis.analysisId,
        deviceId,
        taskId,
        captureTime,
        status: "待确认"
      };
      state.hazardCandidates.set(candidateId, candidate);
      return candidate;
    });
    res.json({
      success: true,
      data: {
        ...analysis,
        candidates
      }
    } satisfies ApiResponse<SafetyAnalysis & { candidates: HazardCandidate[] }>);
  } catch (error) {
    next(error);
  }
});

visionRouter.get("/vision/latest", (req, res) => {
  const deviceId = String(req.query.deviceId ?? "SHM20250516001");
  const latest = state.latestAnalysis.get(deviceId);
  res.json({ success: true, data: latest ?? null });
});
