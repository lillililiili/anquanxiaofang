import { useState } from "react";
import { resolveDemoImage } from "../../data/demoSceneMedia";
import { seedOperationReports, seedOperationRules, seedOperationWarnings } from "../../data/mockData";
import type { OperationReport, OperationsState, OperationWarning } from "../../data/operationsData";

const STORAGE_KEY = "safety-operations-v1";
const seed = (): OperationsState => JSON.parse(JSON.stringify({ warnings: seedOperationWarnings, reports: seedOperationReports, rules: seedOperationRules }));
export function localTimestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function validWarning(value: unknown): value is OperationWarning {
  if (!value || typeof value !== "object") return false;
  const w = value as OperationWarning;
  return [w.id, w.title, w.project, w.category, w.risk, w.location, w.date, w.deadline, w.owner, w.status, w.image, w.suggestion].every(v => typeof v === "string")
    && ["待响应", "处理中", "已处理"].includes(w.status) && ["高风险", "中风险", "低风险"].includes(w.risk)
    && Array.isArray(w.logs) && w.logs.every(l => l && typeof l.time === "string" && typeof l.text === "string");
}
function readState(): { data: OperationsState; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: seed(), error: "" };
    const value = JSON.parse(raw) as OperationsState;
    if (!Array.isArray(value.warnings) || !value.warnings.every(validWarning)
      || !Array.isArray(value.reports) || !value.reports.every(r => r && [r.id, r.title, r.project, r.template, r.start, r.end, r.createdAt, r.author, r.summary].every(v => typeof v === "string") && ["待复核", "已复核", "已归档"].includes(r.status) && Array.isArray(r.evidence) && r.evidence.every(validWarning))
      || !Array.isArray(value.rules) || !value.rules.every(r => r && [r.id, r.name, r.description, r.recipient].every(v => typeof v === "string") && Number.isFinite(r.hours) && typeof r.enabled === "boolean")) throw new Error("invalid data");
    const upgradeImage = (warning: OperationWarning) => ({ ...warning, image: resolveDemoImage(warning.image) });
    return { data: { ...value, warnings: value.warnings.map(upgradeImage), reports: value.reports.map(report => ({ ...report, evidence: report.evidence.map(upgradeImage) })) }, error: "" };
  } catch { return { data: seed(), error: "本机记录读取失败，当前展示初始演示数据；本次操作将尝试重新保存。" }; }
}
export function useOperationsStore() {
  const [initial] = useState(readState);
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  function save(next: OperationsState) {
    setData(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setError(""); }
    catch { setError("本机存储不可用，修改仅保留在当前页面会话，请及时导出。 "); }
  }
  return { data, save, error };
}
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}
export function reportHtml(report: OperationReport) {
  const e = escapeHtml;
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${e(report.title)}</title><style>body{font:14px/1.8 system-ui;color:#243448;max-width:960px;margin:40px auto;padding:24px}h1{font-size:25px}h2{font-size:18px;margin-top:28px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #d6dfe8;padding:10px;text-align:left}th{background:#edf3fa}small{color:#63758a}article{break-inside:avoid;border-top:1px solid #ddd;padding:16px 0}img{width:240px;max-height:180px;object-fit:cover}@media print{body{margin:0;padding:0}@page{margin:18mm}}</style><body><small>山东省国控企业管理有限公司 · 演示数据</small><h1>${e(report.title)}</h1><p>编号：${e(report.id)} ｜ 状态：${e(report.status)}<br>项目：${e(report.project)} ｜ 检查周期：${e(report.start)} 至 ${e(report.end)}<br>编制：${e(report.author)} ｜ 生成时间：${e(report.createdAt)}</p><h2>一、${report.template === "安全运营周报" ? "运营概览" : "检查概况"}</h2><p>${e(report.summary)}</p><p>纳入 ${report.evidence.length} 项疑似隐患，其中高风险 ${report.evidence.filter(w => w.risk === "高风险").length} 项；预警已处理 ${report.evidence.filter(w => w.status === "已处理").length} 项。</p><h2>二、${report.template === "整改建议书" ? "整改任务清单" : "疑似隐患与处置记录"}</h2><table><thead><tr><th>记录</th><th>风险</th><th>责任人</th><th>期限</th><th>预警状态</th></tr></thead><tbody>${report.evidence.map(w => `<tr><td>${e(w.title)}<br><small>${e(w.id)}</small></td><td>${e(w.risk)}</td><td>${e(w.owner)}</td><td>${e(w.deadline)}</td><td>${e(w.status)}</td></tr>`).join("")}</tbody></table><h2>三、证据与整改建议</h2>${report.evidence.map(w => `<article><h3>${e(w.title)}</h3><p>${e(w.location)} · ${e(w.date)}</p><img src="${e(new URL(w.image, window.location.origin).href)}" alt="${e(w.title)}"><p>${e(w.suggestion)}</p><p>${e(w.logs[w.logs.length - 1]?.text || "待现场核查")}</p></article>`).join("")}<h2>四、复核意见</h2><p>${e(report.reviewNote || "待专家复核。")}</p><small>本文件为演示报告，图片为参考素材，非项目实地取证。<a href="${e(new URL("/demo-media/scene-photos/sources.html", window.location.origin).href)}">素材作者与许可</a>。预警已处理不等同于隐患已销号；风险结论须结合现场核查。</small></body></html>`;
}
export function downloadReport(report: OperationReport) {
  const url = URL.createObjectURL(new Blob([reportHtml(report)], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `${report.id}-${report.template}.html`; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function printReport(report: OperationReport) {
  const frame = document.createElement("iframe");
  frame.title = "报告打印"; frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) { frame.remove(); return; }
    win.addEventListener("afterprint", () => frame.remove(), { once: true });
    win.focus(); win.print();
    window.setTimeout(() => frame.remove(), 60000);
  };
  frame.srcdoc = reportHtml(report); document.body.appendChild(frame);
}
