export type RiskLevel = "低风险" | "中风险" | "高风险" | "建议人工复核";

export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SafetyDetection = {
  id: string;
  hazardName: string;
  category: "用电安全" | "消防安全" | "临时用电" | "动火作业" | "其他";
  riskLevel: RiskLevel;
  confidence: number;
  bbox?: BBox;
  description: string;
  evidence?: string;
  possibleConsequence?: string;
  basisKeywords: string[];
  rectificationSuggestion: string;
  needRetake: boolean;
  retakeSuggestions: string[];
  needExpertReview: boolean;
};

export type SafetyAnalysis = {
  analysisId: string;
  deviceId: string;
  taskId: string;
  captureTime: string;
  hasHazard: boolean;
  overallRiskLevel: RiskLevel;
  summary: string;
  detections: SafetyDetection[];
  manualReviewRequired: boolean;
  provider: string;
};

export type DeviceLiveState = {
  deviceId: string;
  deviceName: string;
  online: boolean;
  battery: number;
  network: string;
  taskId: string;
  taskName: string;
  inspector: string;
  streamUrl: string;
  aiEnabled: boolean;
  runTime: string;
  lastAnalysis?: SafetyAnalysis;
  latestReport?: Record<string, unknown>;
};

export type HazardCandidate = SafetyDetection & {
  candidateId: string;
  analysisId: string;
  deviceId: string;
  taskId: string;
  captureTime: string;
  status: "待确认" | "已生成草稿" | "已派发整改";
};

export type HazardDraft = {
  draftId: string;
  hazardName: string;
  category: string;
  riskLevel: RiskLevel;
  description: string;
  rectificationSuggestion: string;
  source: string;
  deviceId: string;
  taskId: string;
};

export type RectificationResult = {
  suggestions: string[];
  basisKeywords: string[];
  needExpertReview: boolean;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};
