import type { SafetyAnalysis, SafetyDetection } from "../types/safety.types.js";

export function getMockDetections(): SafetyDetection[] {
  return [
    {
      id: "D001",
      hazardName: "配电箱未关闭",
      category: "用电安全",
      riskLevel: "高风险",
      confidence: 0.94,
      bbox: { x: 0.36, y: 0.2, w: 0.3, h: 0.36 },
      description: "配电箱门未关闭，内部开关和线缆暴露，存在触电和误操作风险。",
      evidence: "画面中配电箱门处于开启状态，内部开关和线缆暴露。",
      possibleConsequence: "可能引发触电、短路或电气火灾。",
      basisKeywords: ["低压配电", "触电风险", "电气火灾"],
      rectificationSuggestion: "立即关闭配电箱门并上锁，检查门锁完好性，补充警示标识。",
      needRetake: true,
      retakeSuggestions: ["补拍配电箱门锁状态", "补拍配电箱内部接线"],
      needExpertReview: true
    },
    {
      id: "D002",
      hazardName: "线缆裸露",
      category: "用电安全",
      riskLevel: "高风险",
      confidence: 0.89,
      bbox: { x: 0.68, y: 0.2, w: 0.2, h: 0.44 },
      description: "画面中存在疑似线缆裸露或接线不规范情况。",
      evidence: "配电箱内部线缆局部外露，走线较乱。",
      possibleConsequence: "可能导致短路、触电或设备故障。",
      basisKeywords: ["线缆绝缘", "接线规范", "电气火灾"],
      rectificationSuggestion: "对裸露线缆进行绝缘包扎，整理线缆走向，必要时更换老化线路。",
      needRetake: true,
      retakeSuggestions: ["补拍裸露线缆细节", "补拍线缆接头位置"],
      needExpertReview: true
    },
    {
      id: "D003",
      hazardName: "灭火器压力不足",
      category: "消防安全",
      riskLevel: "中风险",
      confidence: 0.91,
      bbox: { x: 0.08, y: 0.52, w: 0.18, h: 0.3 },
      description: "灭火器压力表疑似不在正常区域。",
      evidence: "画面中灭火器压力表指针偏离正常范围。",
      possibleConsequence: "火情发生时可能影响初期灭火效果。",
      basisKeywords: ["灭火器", "压力表", "消防设施"],
      rectificationSuggestion: "更换或充装压力不足的灭火器，确保压力处于正常范围。",
      needRetake: true,
      retakeSuggestions: ["补拍灭火器压力表特写", "补拍灭火器有效期标签"],
      needExpertReview: false
    }
  ];
}

export function getMockAnalysis(analysisId: string, deviceId: string, taskId: string, captureTime: string, provider = "mock"): SafetyAnalysis {
  const detections = getMockDetections();
  return {
    analysisId,
    deviceId,
    taskId,
    captureTime,
    hasHazard: true,
    overallRiskLevel: "高风险",
    summary: "画面中存在配电箱未关闭、线缆裸露及灭火器压力不足等疑似隐患，建议人工确认并及时整改。",
    detections,
    manualReviewRequired: true,
    provider
  };
}
