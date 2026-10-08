// Same city counts and risk levels as the existing workbench's ShandongMap.
// These are geographic demo aggregates, not live warning or hazard records.
export type RegionalRiskLevel = "高风险" | "较高风险" | "中风险" | "低风险";
export type RegionalRiskSample = { name: string; count: number; risk: RegionalRiskLevel };

export const regionalRiskSamples: RegionalRiskSample[] = [
  { name: "德州市", count: 1, risk: "低风险" },
  { name: "济南市", count: 12, risk: "高风险" },
  { name: "淄博市", count: 8, risk: "较高风险" },
  { name: "潍坊市", count: 5, risk: "中风险" },
  { name: "青岛市", count: 3, risk: "低风险" },
  { name: "烟台市", count: 7, risk: "较高风险" },
  { name: "临沂市", count: 6, risk: "中风险" },
  { name: "日照市", count: 2, risk: "低风险" },
];
