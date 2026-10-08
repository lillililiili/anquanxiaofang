import { resolveDemoImage } from "./demoSceneMedia";
export type WarningStatus = "待响应" | "处理中" | "已处理";
export type OperationWarning = {
  id: string; title: string; project: string; category: string; risk: "高风险" | "中风险" | "低风险";
  location: string; date: string; deadline: string; owner: string; status: WarningStatus;
  image: string; suggestion: string; logs: { time: string; text: string }[];
};
export type OperationReport = {
  id: string; title: string; project: string; template: string; start: string; end: string;
  createdAt: string; status: "待复核" | "已复核" | "已归档"; author: string;
  summary: string; evidence: OperationWarning[]; reviewNote?: string;
};
export type OperationRule = { id: string; name: string; description: string; hours: number; enabled: boolean; recipient: string };
export type OperationsState = { warnings: OperationWarning[]; reports: OperationReport[]; rules: OperationRule[] };
export const operationsPeriod = { start: "2026-09-18", end: "2026-09-24" };
export const operationsProjects = ["齐鲁科技园", "国控大厦项目", "鲁商广场", "高新智造产业园", "银座佳驿酒店", "鲁商物流园"];
export const reportTemplates = [
  { name: "综合安全检查报告", description: "消防与用电风险汇总，适用于项目检查交付", sections: "检查概况 / 疑似隐患 / 证据记录 / 整改建议" },
  { name: "整改建议书", description: "逐项列明责任人、整改期限与建议措施", sections: "问题清单 / 风险分级 / 整改措施 / 跟进安排" },
  { name: "安全运营周报", description: "汇总预警响应与处置情况，支持运营复盘", sections: "运营概览 / 预警分布 / 处置进展 / 重点关注" },
];
const subjects = [
  { title: "配电箱未关闭", category: "用电安全", image: "evidence_electrical_panel_open.jpg", suggestion: "建议核查配电箱门锁与警示标识，由持证电工处理并补充现场照片。" },
  { title: "消防通道占用", category: "消防安全", image: "evidence_fire_corridor_blocked.jpg", suggestion: "建议清理通道杂物，核查疏散条件，补充整改前后对比照片。" },
  { title: "线缆防护待核查", category: "用电安全", image: "evidence_cable_exposed.jpg", suggestion: "建议做好区域隔离，由持证电工检查绝缘与防护情况，并申请专家复核。" },
  { title: "灭火器压力待核查", category: "消防安全", image: "evidence_extinguisher_low_pressure.jpg", suggestion: "建议核查压力指示与有效期，更换异常器材，补充设备标识照片。" },
];
export const seedOperationWarnings: OperationWarning[] = Array.from({ length: 24 }, (_, i) => {
  const subject = subjects[i % subjects.length];
  const date = `2026-09-${String(18 + i % 7).padStart(2, "0")}`;
  const status: WarningStatus = i % 5 === 0 ? "已处理" : i % 3 === 0 ? "处理中" : "待响应";
  return { ...subject, id: `YJ202609${String(i + 1).padStart(3, "0")}`, project: operationsProjects[i % 6],
    risk: i % 4 === 0 ? "高风险" : i % 3 === 0 ? "低风险" : "中风险", date,
    deadline: `2026-09-${String(20 + i % 8).padStart(2, "0")}`, location: `${1 + i % 3}号楼 · ${i % 2 ? "东侧消防通道" : "B1配电室"}`,
    owner: status === "待响应" ? "待指派" : ["李四", "王工", "赵工"][i % 3], status,
    image: resolveDemoImage(`/demo-media/images/${subject.image}`), logs: [{ time: `${date} 09:30`, text: "演示检查记录触发预警，建议现场核查。" },
      ...(status !== "待响应" ? [{ time: `${date} 10:00`, text: "项目安全员已接收并安排核查。" }] : []),
      ...(status === "已处理" ? [{ time: `${date} 16:00`, text: "已完成预警核查并记录处置意见；隐患销号需另行复查。" }] : [])] };
});
export const seedOperationReports: OperationReport[] = operationsProjects.map((project, i) => ({
  id: `BG202609${String(i + 1).padStart(3, "0")}`, title: `${project}${reportTemplates[i % 3].name}`,
  project, template: reportTemplates[i % 3].name, ...operationsPeriod, createdAt: "2026-09-24 10:00",
  status: i % 3 === 0 ? "待复核" : i % 3 === 1 ? "已复核" : "已归档", author: ["张三", "李四"][i % 2],
  summary: "本次检查重点覆盖消防设施、疏散通道与用电环境。所列记录为疑似隐患，建议结合现场情况核查并落实整改。",
  evidence: seedOperationWarnings.filter(item => item.project === project),
  ...(i % 3 ? { reviewNote: "演示复核：检查记录及整改建议完整，建议按责任分工跟进。" } : {}),
}));
export const seedOperationRules: OperationRule[] = [
  { id: "RULE-1", name: "高风险优先响应", description: "高风险疑似隐患进入优先关注队列", hours: 2, enabled: true, recipient: "项目安全员" },
  { id: "RULE-2", name: "整改到期提醒", description: "整改期限临近时建议联系责任人核查进度", hours: 24, enabled: true, recipient: "项目负责人" },
  { id: "RULE-3", name: "待响应升级提醒", description: "长时间未响应的预警建议升级专家关注", hours: 8, enabled: false, recipient: "专家组" },
];
