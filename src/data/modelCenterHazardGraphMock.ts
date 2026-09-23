export type GraphNode = {
  id: string;
  label: string;
  type: "center" | "risk" | "hazard" | "factor" | "basis" | "action";
  risk: "高风险" | "中风险" | "低风险";
  x: number;
  y: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
};

export const graphCategories = [
  ["用电安全", "18"],
  ["消防设施", "12"],
  ["临时用电", "8"],
  ["动火作业", "6"],
  ["物业巡检", "6"]
];

export const topHazards = ["配电箱未关闭", "线缆裸露", "门未闭合", "接地异常", "电气火灾", "触电风险", "责任不清", "管理制度缺失", "设备故障", "插座超负荷"];

export const graphNodes: GraphNode[] = [
  { id: "center", label: "配电箱未关闭", type: "center", risk: "高风险", x: 50, y: 50 },
  { id: "fire", label: "电气火灾", type: "risk", risk: "高风险", x: 50, y: 16 },
  { id: "shock", label: "触电风险", type: "risk", risk: "高风险", x: 78, y: 30 },
  { id: "cable", label: "线缆裸露", type: "hazard", risk: "高风险", x: 85, y: 52 },
  { id: "ground", label: "接地异常", type: "hazard", risk: "中风险", x: 72, y: 77 },
  { id: "door", label: "门未闭合", type: "hazard", risk: "中风险", x: 50, y: 83 },
  { id: "duty", label: "责任不清", type: "factor", risk: "低风险", x: 30, y: 78 },
  { id: "system", label: "管理制度缺失", type: "factor", risk: "中风险", x: 18, y: 50 },
  { id: "suggestion", label: "整改建议", type: "action", risk: "低风险", x: 80, y: 67 },
  { id: "basis", label: "检查依据", type: "basis", risk: "低风险", x: 20, y: 68 },
  { id: "fault", label: "设备故障", type: "factor", risk: "中风险", x: 28, y: 28 }
];

export const graphEdges: GraphEdge[] = [
  { id: "e1", source: "center", target: "fire", relation: "可能导致" },
  { id: "e2", source: "center", target: "shock", relation: "可能导致" },
  { id: "e3", source: "center", target: "cable", relation: "直接原因" },
  { id: "e4", source: "center", target: "ground", relation: "关联因素" },
  { id: "e5", source: "center", target: "door", relation: "关联因素" },
  { id: "e6", source: "center", target: "duty", relation: "管理因素" },
  { id: "e7", source: "center", target: "system", relation: "根本原因" },
  { id: "e8", source: "center", target: "suggestion", relation: "治理措施" },
  { id: "e9", source: "center", target: "basis", relation: "依据支持" },
  { id: "e10", source: "center", target: "fault", relation: "诱发因素" }
];

export const relationRows = [
  ["配电箱未关闭", "直接原因", "线缆裸露", "《低压配电设计规范》GB 50054-2011 第4.2.3条", "高风险"],
  ["配电箱未关闭", "可能导致", "电气火灾", "《用电安全导则》GB/T 13869-2017 第5.1.2条", "高风险"],
  ["配电箱未关闭", "可能导致", "触电风险", "《用电安全导则》GB/T 13869-2017 第5.1.1条", "高风险"],
  ["线缆裸露", "关联因素", "接地异常", "《建筑电气工程施工质量验收规范》GB 50303-2015 第6.2.5条", "中风险"],
  ["配电箱未关闭", "根本原因", "管理制度缺失", "《用电安全导则》GB/T 13869-2017 第6.1.3条", "中风险"]
];

export const relatedKnowledge = [
  "《低压配电设计规范》GB 50054-2011 7.1.5",
  "《建筑电气工程施工质量验收规范》GB 50303-2015 14.1.1",
  "《用电安全导则》GB/T 13869-2017 6.2.3"
];

export const similarCases = [
  "生产车间配电箱未关闭引发电气火灾",
  "仓库配电箱门未闭合导致线路跳闸",
  "配电柜接地异常致人员触电"
];

export const riskAssessment = {
  level: "高风险",
  score: 86,
  hint: "配电箱门处于开启状态，易形成误触、短路、粉尘进入和设备误操作风险。",
  suggestion: "立即关闭并上锁配电箱，整理裸露线缆，补充巡检记录并提交整改后照片。"
};
