import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Download, Filter, MapPin, Play, Plus, Search, ShieldAlert, Target, Upload } from "lucide-react";
import { getHazardScene, sceneImages, sceneVideos } from "../data/demoSceneMedia";
import { Button, DataTable, Drawer, Field, MetricCard, Modal, PageHeader, Pill, SectionCard, Toolbar, cx, downloadText } from "./PrototypeUI";
import { hazards as prototypeHazards, projectNames, projects, tasks } from "./PrototypeFixtures";
import "./prototype-hazards.css";

type Log = { time: string; action: string; recipient: string; note: string };
type Photo = { id: string; title: string; src: string; stage: string; inReport: boolean };
type HazardClue = { id: string; taskName: string; project: string; checkType: string; inspector: string; checkDate: string; sourceDevice: string; foundTime: string; location: string; tags: string[]; risk: string; source: string; status: string; description: string; aiAdvice: string; image?: string; taskId?: string; recordId?: string };
type HazardLedger = { id: string; title: string; project: string; taskName: string; category: string; risk: string; unit: string; person: string; deadline: string; status: string; foundTime: string; overdueDays: number; source: string; measure: string; dept?: string; description?: string; location?: string; taskId?: string; tags?: string[]; image?: string; photos?: Photo[]; note?: string; logs?: Log[]; review?: { person: string; time: string; result: string; note: string }; company?: { person: string; time: string; note: string; signature: string; seal: string; letter: string }; expert?: { person: string; result: string; note: string }; archiveId?: string; archiveTime?: string; warningLevel?: string; feedback?: string };
type HazardStore = { rows: HazardLedger[]; clues: HazardClue[] };
type Navigate = (path: string, focusId?: string) => void;
type Preview = { title: string; src: string; type: "image" | "video" | "audio"; transcript?: string };
type RegistrationDraft = { tags: string[]; description: string; category: string; risk: string; project: string; taskName: string; taskId: string; unit: string; dept: string; person: string; deadline: string; source: string; location: string; measure: string };
type StoreActions = { store: HazardStore; save: (store: HazardStore, message?: string) => boolean; notify: (message: string) => void; navigate: Navigate };
const storageKey = "safety-prototype-hazards-v1";
const handoffKey = "safety-prototype-hazard-handoff-v1";
const statuses = ["待整改", "整改中", "待复查", "企业确认", "专家复核", "待销号归档", "已销号"];
const rectifyTabs = ["整改信息", "整改照片", "复查验收", "企业确认", "专家复核", "销号归档"];
const riskOptions = ["低风险", "中风险", "高风险", "重大隐患"];
const categoryOptions = ["用电安全 / 配电箱及线路", "用电安全 / 线缆", "消防安全 / 疏散通道", "消防设施 / 灭火器", "消防设施 / 消火栓", "消防设施 / 应急照明", "动火作业 / 临时用电"];
const now = () => new Date().toLocaleString("sv-SE", { hour12: false });
// Normalize only for comparisons; leave legacy local-storage records untouched.
function isoDate(value: string) {
  const match = value.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : "";
}
function matchesDateRange(value: string, start = "", end = "") {
  if (!start && !end) return true;
  const date = isoDate(value);
  return !!date && (!start || date >= start) && (!end || date <= end);
}
const localDateTime = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const riskTone = (risk: string) => /高风险|重大/.test(risk) ? "danger" : /中风险|较大/.test(risk) ? "warning" : "success";
const statusTone = (status: string) => status === "已销号" ? "success" : /超期|退回/.test(status) ? "danger" : status === "待整改" ? "neutral" : "warning";
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{unique([value, ...options]).map(item => <option key={item}>{item}</option>)}</select>;
}
function DetailPairs({ rows }: { rows: string[][] }) { return <div className="detail-grid">{rows.map(([label, value]) => <React.Fragment key={label}><span>{label}</span><strong>{value || "待补充"}</strong></React.Fragment>)}</div>; }
function MediaModal({ preview, close }: { preview: Preview | null; close: () => void }) {
  return <Modal title={preview?.title || "证据预览"} open={!!preview} onClose={close} wide>{preview && <div className="ph-media-preview">{preview.type === "image" ? <img src={preview.src} alt={preview.title} /> : preview.type === "video" ? <video src={preview.src} controls autoPlay /> : <audio src={preview.src} controls autoPlay />}{preview.transcript && <p>{preview.transcript}</p>}<p className="plain-note">{preview.type === "video" ? "图片轮播演示 · 非现场录像" : "演示参考材料 · 非项目实地证据"}</p></div>}</Modal>;
}
function Timeline({ row }: { row: HazardLedger }) {
  return <ol className="demo-overdue-history">{[{ time: row.foundTime, action: "隐患登记", recipient: row.source, note: row.description || row.title }, ...(row.logs || [])].map((log, index) => <li key={index}><strong>{log.action} · {log.recipient}</strong><time>{log.time}</time><p>{log.note}</p></li>)}</ol>;
}
function defaultPhotos(row: HazardLedger): Photo[] {
  if (row.photos) return row.photos;
  const image = row.image || getHazardScene(row.title)?.src;
  const before = image ? [{ id: `${row.id}-before`, title: "整改前参考图", src: image, stage: "整改前", inReport: true }] : [];
  return /配电箱|配电柜/.test(row.title) ? [...before, { id: `${row.id}-after`, title: "整改后参考图", src: sceneImages.rectificationAfter, stage: "整改后", inReport: true }] : before;
}
function csv(rows: HazardLedger[]) {
  const values = [["隐患编号", "项目", "任务", "描述", "分类", "风险", "责任单位", "部门", "责任人", "期限", "状态"], ...rows.map(row => [row.id, row.project, row.taskName, row.title, row.category, row.risk, row.unit, row.dept || "", row.person, row.deadline, row.status])];
  return "\uFEFF" + values.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(",")).join("\n");
}
function exportRecord(row: HazardLedger, kind: string) { downloadText(`${row.id}-${kind}.txt`, `消防与用电安全智能检查 · 演示数据\n${kind}\n${JSON.stringify({ ...row, photos: defaultPhotos(row) }, null, 2)}`); }
function readActiveTask(): { id?: string; name?: string; taskName?: string; project?: string; inspector?: string; device?: string } {
  try { const value = JSON.parse(sessionStorage.getItem("safety-prototype-active-task-v1") || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; }
}
function newDraft(clue?: HazardClue): RegistrationDraft {
  const activeTask = readActiveTask();
  const due = new Date(`${clue?.checkDate || new Date().toISOString().slice(0, 10)}T12:00:00`); due.setDate(due.getDate() + 7);
  const title = clue?.tags.join("、") || "";
  const category = /灭火器/.test(title) ? "消防设施 / 灭火器" : /消火栓|消防栓/.test(title) ? "消防设施 / 消火栓" : /通道|疏散/.test(title) ? "消防安全 / 疏散通道" : /动火|临时|接地/.test(title) ? "动火作业 / 临时用电" : "用电安全 / 配电箱及线路";
  return { tags: clue ? [...clue.tags] : [""], description: clue?.description || "", category, risk: clue?.risk && riskOptions.includes(clue.risk) ? clue.risk : "中风险", project: clue?.project || activeTask.project || "齐鲁科技园", taskName: clue?.taskName || activeTask.name || activeTask.taskName || tasks[0][1], taskId: clue?.taskId || activeTask.id || tasks[0][0], unit: clue ? `${clue.project}责任单位` : "齐鲁科技园物业", dept: "运维部", person: clue?.inspector || activeTask.inspector || "张三", deadline: due.toISOString().slice(0, 10), source: clue?.sourceDevice || activeTask.device || "AI识别", location: clue?.location || "", measure: "" };
}
function RegistrationFields({ draft, setDraft }: { draft: RegistrationDraft; setDraft: React.Dispatch<React.SetStateAction<RegistrationDraft>> }) {
  const set = (key: keyof RegistrationDraft, value: string) => setDraft(old => ({ ...old, [key]: value }));
  return <div className="form-grid"><Field label="疑似隐患 *" wide><div className="ph-editable-tags">{draft.tags.map((tag, index) => <div key={index}><input aria-label={`疑似隐患 ${index + 1}`} value={tag} onChange={event => setDraft(old => ({ ...old, tags: old.tags.map((item, i) => i === index ? event.target.value : item) }))} /><button type="button" aria-label={`移除疑似隐患 ${index + 1}`} onClick={() => setDraft(old => ({ ...old, tags: old.tags.filter((_, i) => i !== index) }))}>×</button></div>)}<Button variant="ghost" icon={Plus} onClick={() => setDraft(old => ({ ...old, tags: [...old.tags, ""] }))}>添加隐患</Button></div></Field><Field label="所属项目"><Select label="登记所属项目" value={draft.project} options={projectNames.slice(1)} onChange={value => set("project", value)} /></Field><Field label="来源任务"><Select label="登记来源任务" value={draft.taskName} options={tasks.map(item => item[1])} onChange={value => { const task = tasks.find(item => item[1] === value); setDraft(old => ({ ...old, taskName: value, taskId: task?.[0] || "", project: task?.[3] || old.project })); }} /></Field><Field label="隐患分类"><Select label="登记隐患分类" value={draft.category} options={categoryOptions} onChange={value => set("category", value)} /></Field><Field label="风险等级"><Select label="登记风险等级" value={draft.risk} options={riskOptions} onChange={value => set("risk", value)} /></Field><Field label="责任单位 *"><input value={draft.unit} onChange={event => set("unit", event.target.value)} /></Field><Field label="责任部门"><Select label="登记责任部门" value={draft.dept} options={["运维部", "工程部", "物业部", "安全管理部"]} onChange={value => set("dept", value)} /></Field><Field label="整改责任人 *"><input value={draft.person} onChange={event => set("person", event.target.value)} /></Field><Field label="整改期限 *"><input type="date" value={draft.deadline} onChange={event => { const inputValue = event.currentTarget.value; set("deadline", inputValue); }} onInput={event => { const inputValue = event.currentTarget.value; set("deadline", inputValue); }} /></Field><Field label="发现来源"><Select label="登记发现来源" value={draft.source} options={["AI识别", "aa的智能安全帽", "bb的智能安全帽", "手机端", "视频关键帧", "专家补录"]} onChange={value => set("source", value)} /></Field><Field label="现场位置"><input value={draft.location} onChange={event => set("location", event.target.value)} /></Field><Field label="隐患描述 *" wide><textarea value={draft.description} onChange={event => set("description", event.target.value)} /></Field><Field label="整改措施 *" wide><textarea value={draft.measure} onChange={event => set("measure", event.target.value)} /></Field></div>;
}
function validDraft(draft: RegistrationDraft, notify: (message: string) => void) {
  if (!draft.tags.some(item => item.trim()) || !draft.description.trim() || !draft.measure.trim() || !draft.unit.trim() || !draft.person.trim() || !draft.deadline) { notify("请补全疑似隐患、描述、整改措施、责任单位、责任人和期限"); return false; } return true;
}
function makeRecord(draft: RegistrationDraft, clue?: HazardClue, previous?: HazardLedger): HazardLedger {
  return { ...previous, id: previous?.id || `HZ${Date.now()}`, title: draft.tags.filter(item => item.trim()).join("、") || "未命名隐患草稿", project: draft.project, taskName: draft.taskName, taskId: draft.taskId, category: draft.category, risk: draft.risk, unit: draft.unit, dept: draft.dept, person: draft.person, deadline: draft.deadline, status: "待整改", foundTime: clue ? `${clue.checkDate} ${clue.foundTime}` : now(), overdueDays: 0, source: draft.source, measure: draft.measure, description: draft.description, location: draft.location, tags: draft.tags, image: clue?.image || getHazardScene(draft.tags.join("、"))?.src, logs: previous?.logs || [] };
}
const hazardClueSeed: HazardClue[] = [
  { id: "XS20250516001", taskName: "国控大厦消防安全检查", project: "国控大厦项目", checkType: "消防安全检查", inspector: "张三", checkDate: "2025-05-16", sourceDevice: "aa的智能安全帽", foundTime: "10:31:02", location: "2号楼B1层 配电室", tags: ["配电箱未关闭", "线缆防护待核查"], risk: "高风险", source: "图片识别", status: "待登记", description: "配电箱门未关闭，箱内多处线缆防护待核查，存在触电风险。", aiAdvice: "立即关闭配电箱并上锁，对裸露线缆做绝缘包扎，补贴警示标识。" },
  { id: "XS20250516002", taskName: "国控大厦消防安全检查", project: "国控大厦项目", checkType: "消防安全检查", inspector: "张三", checkDate: "2025-05-16", sourceDevice: "aa的智能安全帽", foundTime: "10:31:28", location: "东侧消防通道", tags: ["消防通道占用"], risk: "中风险", source: "视频关键帧", status: "待登记", description: "消防通道有杂物堆放，影响疏散通行。", aiAdvice: "清理消防通道杂物，设置禁止堆放标识，并纳入日常巡查。" },
  { id: "XS20250516003", taskName: "齐鲁科技园配电室专项检查", project: "齐鲁科技园", checkType: "用电安全检查", inspector: "李四", checkDate: "2025-05-16", sourceDevice: "bb的智能安全帽", foundTime: "11:08:45", location: "3号楼配电间", tags: ["线缆老化破损"], risk: "高风险", source: "人工上报", status: "待登记", description: "配电间部分线缆外皮老化破损，需要停电检修。", aiAdvice: "停用相关支路，完成绝缘检测和线缆更换后再恢复供电。" },
  { id: "XS20250516004", taskName: "鲁商广场消防通道复查", project: "鲁商广场", checkType: "复查验收", inspector: "王五", checkDate: "2025-05-16", sourceDevice: "手机端", foundTime: "14:22:10", location: "后厨通道", tags: ["灭火器压力待核查"], risk: "中风险", source: "图片识别", status: "已登记", description: "灭火器压力表低于正常范围。", aiAdvice: "更换或重新充装灭火器，并检查周边点位配置数量。" },
  { id: "XS20250516005", taskName: "高新智造产业园动火临电检查", project: "高新智造产业园", checkType: "动火临电", inspector: "赵六", checkDate: "2025-05-17", sourceDevice: "专家补录", foundTime: "09:15:33", location: "B区动火点", tags: ["临时用电不规范", "接地缺失"], risk: "重大隐患", source: "专家补录", status: "待提交", description: "临时用电箱缺少防护，动火设备接地措施不足。", aiAdvice: "暂停现场作业，补齐临电防护和接地检测记录后再复工。" },
  { id: "XS20250516006", taskName: "银座佳驿酒店后厨用电检查", project: "银座佳驿酒店", checkType: "用电安全检查", inspector: "张三", checkDate: "2025-05-15", sourceDevice: "手机端", foundTime: "16:40:20", location: "后厨操作间", tags: ["插排串接"], risk: "低风险", source: "人工上报", status: "已提交", description: "后厨存在插排串接和线缆拖地。", aiAdvice: "更换固定插座，线缆穿管固定，避免潮湿区域拖地使用。" }
];
const hazardLedgerSeed: HazardLedger[] = [
  { id: "HZ20250516001", title: "配电箱未关闭，存在触电风险", project: "齐鲁科技园", taskName: "配电室专项检查", category: "用电安全 / 配电箱及线路", risk: "高风险", unit: "山东消防技术服务中心", person: "张三", deadline: "2025-05-16", status: "待整改", foundTime: "2025-05-15 10:21", overdueDays: 7, source: "智能安全帽", measure: "关闭配电箱并上锁，整理线缆，粘贴警示标识。" },
  { id: "HZ20250516002", title: "灭火器压力待核查", project: "齐鲁科技园", taskName: "消防设施巡检", category: "消防设施 / 灭火器", risk: "中风险", unit: "齐鲁科技园物业", person: "李四", deadline: "2025-05-17", status: "整改中", foundTime: "2025-05-15 11:05", overdueDays: 0, source: "手机端", measure: "更换压力不足灭火器并重新登记台账。" },
  { id: "HZ20250516003", title: "安全通道堆物", project: "鲁商广场", taskName: "消防通道复查", category: "消防安全 / 疏散通道", risk: "高风险", unit: "鲁商广场运营部", person: "王五", deadline: "2025-05-16", status: "待复查", foundTime: "2025-05-14 09:48", overdueDays: 3, source: "视频关键帧", measure: "清理通道堆物并设置巡检责任人。" },
  { id: "HZ20250516004", title: "电缆线裸露", project: "山东国控大数据中心", taskName: "机房用电检查", category: "用电安全 / 线缆", risk: "中风险", unit: "数据中心运维部", person: "赵六", deadline: "2025-05-18", status: "企业确认", foundTime: "2025-05-13 16:20", overdueDays: 0, source: "图片识别", measure: "完成线缆绝缘包扎并上传整改后照片。" },
  { id: "HZ20250516005", title: "消防栓被遮挡", project: "高新智造产业园", taskName: "园区消防巡检", category: "消防设施 / 消火栓", risk: "低风险", unit: "高新区物业", person: "孙七", deadline: "2025-05-20", status: "专家复核", foundTime: "2025-05-12 13:30", overdueDays: 0, source: "人工上报", measure: "移除遮挡物，补充地面警示线。" },
  { id: "HZ20250516006", title: "应急灯不亮", project: "国控大厦项目", taskName: "楼宇消防检查", category: "消防设施 / 应急照明", risk: "中风险", unit: "国控大厦物业", person: "周八", deadline: "2025-05-19", status: "已销号", foundTime: "2025-05-11 08:45", overdueDays: 0, source: "手机端", measure: "更换故障灯具，复测断电照明。" },
  { id: "HZ20250516007", title: "临时电源箱防护不足", project: "高新智造产业园", taskName: "动火临电检查", category: "临时用电 / 电源箱", risk: "高风险", unit: "施工单位", person: "郑十", deadline: "2025-05-14", status: "整改中", foundTime: "2025-05-10 15:40", overdueDays: 9, source: "专家补录", measure: "补齐箱体防护、漏保和接地措施。" },
  { id: "HZ20250516008", title: "警示标识缺失", project: "银座佳驿酒店", taskName: "后厨用电检查", category: "用电安全 / 标识", risk: "低风险", unit: "酒店工程部", person: "陈八", deadline: "2025-05-22", status: "待整改", foundTime: "2025-05-15 17:10", overdueDays: 0, source: "人工上报", measure: "补贴用电安全警示标识。" },
  { id: "HZ20250516009", title: "消防通道反复占用", project: "鲁商物流园", taskName: "仓储消防巡检", category: "消防安全 / 疏散通道", risk: "高风险", unit: "仓储运营部", person: "刘一", deadline: "2025-05-12", status: "多次退回", foundTime: "2025-05-08 09:10", overdueDays: 11, source: "智能安全帽", measure: "清理堆物并建立通道保持责任制度。" },
  { id: "HZ20250516010", title: "配电室杂物堆放", project: "国控大厦项目", taskName: "B1配电间巡检", category: "用电安全 / 配电室", risk: "中风险", unit: "楼宇工程部", person: "吴九", deadline: "2025-05-23", status: "即将超期", foundTime: "2025-05-16 09:22", overdueDays: 0, source: "图片识别", measure: "清除配电室杂物，保持安全距离。" }
];
function HazardStatsPage() { return <div className="stats-layout"><div className="metric-grid compact"><MetricCard label="隐患总数" value="304" detail="较上周期下降 8.6%" icon={Target} tone="blue" /><MetricCard label="整改完成率" value="76.4%" detail="目标 85%" icon={CheckCircle2} tone="green" /><MetricCard label="高风险隐患" value="54" detail="重点督办 16 项" icon={ShieldAlert} tone="red" /><MetricCard label="平均闭环时长" value="2.8 天" detail="较上周期下降 0.6 天" icon={Clock3} tone="amber" /></div><div className="dashboard-grid two-one"><SectionCard title="风险趋势" eyebrow="RISK TREND"><div className="fake-chart trend-chart"><div className="chart-y"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="trend-lines"><i className="line blue" /><i className="line red" /><i className="line amber" /><div className="chart-x"><span>05-10</span><span>05-11</span><span>05-12</span><span>05-13</span><span>05-14</span><span>05-15</span><span>05-16</span></div></div></div></SectionCard><SectionCard title="隐患分布" eyebrow="RISK MIX"><div className="donut-wrap"><div className="donut"><strong>304</strong><span>总隐患</span></div><div className="legend-list"><div><i className="legend-dot red" />重大隐患 <b>54</b></div><div><i className="legend-dot amber" />较大隐患 <b>78</b></div><div><i className="legend-dot blue" />一般隐患 <b>172</b></div></div></div></SectionCard></div><SectionCard title="项目闭环排行" eyebrow="PROJECT BENCHMARK"><div className="rank-list">{projects.map((row, index) => <div key={row[0]}><span className="rank-no">0{index + 1}</span><strong>{row[1]}</strong><i><b style={{ width: row[5] }} /></i><span>{row[5]}</span></div>)}</div></SectionCard></div>; }

function readStore(): HazardStore {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "null") as HazardStore | null;
    if (value && Array.isArray(value.rows) && value.rows.length && value.rows.every(row => row && typeof row.id === "string" && typeof row.title === "string" && typeof row.status === "string") && Array.isArray(value.clues) && value.clues.every(row => row && typeof row.id === "string" && Array.isArray(row.tags))) return value;
  } catch { /* Keep the source demo data available if local storage is unavailable. */ }
  // Preserve follow-up records already saved by the previous prototype queue.
  const rows = hazardLedgerSeed.map(row => ({ ...row }));
  try {
    const previous = JSON.parse(localStorage.getItem("safety-demo-overdue-actions-v1") || "{}");
    prototypeHazards.forEach(original => {
      if (!Array.isArray(previous[original[0]])) return;
      const logs = previous[original[0]].filter((log: unknown): log is Log => !!log && typeof log === "object" && ["time", "action", "recipient", "note"].every(key => typeof (log as Record<string, unknown>)[key] === "string"));
      if (!logs.length) return;
      rows.push({ id: original[0], title: original[1], project: original[2], location: original[3], category: original[4], risk: original[5], person: original[6], deadline: original[7], status: original[8] === "已整改" ? "待复查" : original[8], source: original[9], unit: `${original[2]}责任单位`, taskName: "原演示预警记录", foundTime: "2025-05-16 10:30", overdueDays: 0, measure: "结合现场资料核查风险，落实整改并提交复查。", logs });
    });
  } catch { /* The original key remains untouched for recovery. */ }
  return { rows, clues: hazardClueSeed };
}
export function HazardPage({ variant, notify, navigate: externalNavigate }: { variant: string; notify: (message: string) => void; navigate?: Navigate }) {
  const [store, setStore] = useState(readStore);
  const [storageError, setStorageError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(() => newDraft());
  const [handoffFocus, setHandoffFocus] = useState("");
  const navigate: Navigate = (path, focusId) => {
    if (externalNavigate) externalNavigate(path, focusId);
    else { window.history.pushState({}, "", `/theme-prototype.html?page=${encodeURIComponent(path)}${focusId ? `&focus=${encodeURIComponent(focusId)}` : ""}`); window.dispatchEvent(new PopStateEvent("popstate")); }
  };
  const save = (next: HazardStore, message?: string) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { setStorageError("本机存储暂不可用，填写内容已保留在页面，请稍后重试。"); return false; }
    setStore(next); setStorageError(""); if (message) notify(message); return true;
  };
  useEffect(() => {
    if (variant !== "hazardRegister") return;
    try {
      const value = JSON.parse(sessionStorage.getItem(handoffKey) || "null");
      if (!value || typeof value.id !== "string" || typeof value.title !== "string") return;
      const existing = store.clues.find(clue => clue.id === value.id);
      if (existing) { setHandoffFocus(existing.id); sessionStorage.removeItem(handoffKey); return; }
      const active = readActiveTask();
      const foundTime = typeof value.foundTime === "string" ? value.foundTime : "2025-05-16 10:32:00";
      const checkType = value.checkType || (/动火|临时电|临电/.test(value.title) ? "动火临电" : /消防|灭火器|通道|疏散|应急灯/.test(value.title) ? "消防安全检查" : "用电安全检查");
      const clue: HazardClue = { id: value.id, tags: [value.title], project: value.project || active.project || "齐鲁科技园", taskName: value.taskName || active.name || active.taskName || tasks[0][1], taskId: value.taskId || active.id || tasks[0][0], checkType, inspector: value.inspector || active.inspector || "张三", checkDate: /^\d{4}-\d{2}-\d{2}/.test(foundTime) ? foundTime.slice(0, 10) : "2025-05-16", foundTime: foundTime.includes(" ") || foundTime.includes("T") ? foundTime.slice(11, 19) : foundTime, sourceDevice: value.source || "智能安全帽", source: /专家/.test(value.source || "") ? "专家审核" : "AI识别", status: "待登记", location: value.location || "现场检查点", risk: riskOptions.includes(value.risk) ? value.risk : "中风险", description: value.description || value.title, aiAdvice: value.measure || "建议核查现场状况，完成整改并补充前后对比证据。", image: value.image };
      if (save({ ...store, clues: [clue, ...store.clues] })) { setHandoffFocus(clue.id); sessionStorage.removeItem(handoffKey); }
    } catch { setStorageError("现场线索暂时无法读取，请保留当前页面并重新发起登记。"); }
  }, [variant]);
  const titles: Record<string, string> = { hazardRegister: "隐患登记", hazardRectify: "隐患整改", hazardStats: "隐患统计看板", hazardOverdue: "隐患超期预警" };
  const nav = [["hazardRegister", "/hazards"], ["hazardRectify", "/hazards/rectification"], ["hazardStats", "/hazards/statistics"], ["hazardOverdue", "/hazards/overdue"]];
  const create = () => {
    if (!validDraft(draft, notify)) return;
    const record = makeRecord(draft);
    record.logs = [{ time: now(), action: "新建登记", recipient: draft.person, note: draft.measure }];
    if (save({ ...store, rows: [record, ...store.rows] }, "隐患已登记，进入待整改台账")) { setCreateOpen(false); navigate("/hazards/rectification", record.id); }
  };
  const props = { store, save, notify, navigate };
  return <div className="page-stack ph-page"><PageHeader eyebrow="CLOSURE / 04" title={titles[variant] || "隐患闭环"} description="从识别、登记、整改、复查、企业确认、专家复核到销号归档，保留完整证据链。" actions={<><Button variant="secondary" icon={Download} onClick={() => { downloadText("隐患数据.csv", csv(store.rows), "text/csv;charset=utf-8"); notify("隐患数据已导出"); }}>导出数据</Button><Button icon={Plus} onClick={() => { setDraft(newDraft()); setCreateOpen(true); }}>登记隐患</Button></>} /><nav className="subnav">{nav.map(([id, path]) => <button className={id === variant ? "active" : ""} type="button" key={id} onClick={() => navigate(path)}>{titles[id]}<span>{id === "hazardOverdue" ? store.rows.filter(row => overdueDays(row) > 0 && row.status !== "已销号").length : id === "hazardRectify" ? store.rows.filter(row => row.status !== "已销号" && row.status !== "待提交").length : ""}</span></button>)}</nav>
    {storageError && <p className="demo-overdue-error" role="alert">{storageError}</p>}
    {variant === "hazardRegister" && <RegisterWorkspace {...props} handoffFocus={handoffFocus} />}
    {variant === "hazardRectify" && <RectifyWorkspace {...props} />}
    {variant === "hazardStats" && <HazardStatsPage />}
    {variant === "hazardOverdue" && <DemoOverdueList {...props} />}
    <Modal title="登记新隐患" open={createOpen} onClose={() => setCreateOpen(false)} wide><RegistrationFields draft={draft} setDraft={setDraft} /><p className="plain-note">演示数据仅保存在本机；登记后可继续派发整改。</p><div className="modal-foot"><Button variant="secondary" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={create}>提交隐患</Button></div></Modal>
  </div>;
}

function RegisterWorkspace({ store, save, notify, navigate, handoffFocus }: StoreActions & { handoffFocus: string }) {
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("focus") || store.clues[0].id);
  const selected = store.clues.find(clue => clue.id === selectedId) || store.clues[0];
  const [draft, setDraft] = useState(() => newDraft(selected));
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("全部项目");
  const [task, setTask] = useState("全部任务");
  const [inspector, setInspector] = useState("全部人员");
  const [source, setSource] = useState("全部来源");
  const [status, setStatus] = useState("全部状态");
  const [date, setDate] = useState("");
  const [tab, setTab] = useState("图片取证");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  useEffect(() => { if (handoffFocus) { setSelectedId(handoffFocus); setProject("全部项目"); setTask("全部任务"); setInspector("全部人员"); setSource("全部来源"); setStatus("全部状态"); setDate(""); setQuery(""); } }, [handoffFocus]);
  useEffect(() => {
    const previous = store.rows.find(row => row.id === selected.recordId);
    const base = newDraft(selected);
    setDraft(previous ? { ...base, ...previous, tags: previous.tags || selected.tags, description: previous.description || selected.description, location: previous.location || selected.location, taskId: previous.taskId || base.taskId, dept: previous.dept || base.dept } : base);
  }, [selected.id, selected.recordId]);
  const visible = store.clues.filter(clue => (project === "全部项目" || clue.project === project) && (task === "全部任务" || clue.taskName === task) && (inspector === "全部人员" || clue.inspector === inspector) && (source === "全部来源" || clue.sourceDevice === source) && (status === "全部状态" || clue.status === status) && (!date || isoDate(clue.checkDate) === date) && `${clue.id} ${clue.taskName} ${clue.project} ${clue.tags.join(" ")} ${clue.inspector}`.includes(query));
  const photos = selected.tags.flatMap(title => { const scene = getHazardScene(title); return scene ? [{ title, ...scene }] : []; });
  if (selected.image && !photos.some(photo => photo.src === selected.image)) photos.unshift({ title: selected.tags[0], src: selected.image });
  const videos = unique(photos.flatMap(photo => photo.video ? [photo.video] : []));
  const registered = store.rows;
  const submit = (mode: "draft" | "submit" | "next") => {
    if (mode !== "draft" && !validDraft(draft, notify)) return;
    const previous = store.rows.find(row => row.id === selected.recordId);
    if (previous && previous.status !== "待提交") { notify("该线索已登记，可在整改台账继续处理"); if (mode === "submit") navigate("/hazards/rectification", previous.id); return; }
    const record = makeRecord(draft, selected, previous);
    record.status = mode === "draft" ? "待提交" : "待整改";
    record.logs = [...(record.logs || []), { time: now(), action: mode === "draft" ? "保存草稿" : "提交登记", recipient: draft.person, note: draft.measure || "登记草稿待补充" }];
    const next = { rows: previous ? store.rows.map(row => row.id === previous.id ? record : row) : [record, ...store.rows], clues: store.clues.map(clue => clue.id === selected.id ? { ...clue, status: mode === "draft" ? "待提交" : "已登记", recordId: record.id } : clue) };
    if (!save(next, mode === "draft" ? "登记草稿已保存，可继续编辑提交" : "隐患已登记并写入整改台账")) return;
    if (mode === "submit") navigate("/hazards/rectification", record.id);
    if (mode === "next") { const remaining = visible.filter(clue => clue.id !== selected.id && clue.status !== "已登记" && clue.status !== "已提交"); if (remaining.length) setSelectedId(remaining[0].id); else notify("当前筛选下的线索已登记完成"); }
  };
  const reset = () => { setQuery(""); setProject("全部项目"); setTask("全部任务"); setInspector("全部人员"); setSource("全部来源"); setStatus("全部状态"); setDate(""); };
  return <><Toolbar className="ph-filters ph-register-filters">
      <Field label="搜索线索"><div className="search-field"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="编号 / 任务 / 责任人" aria-label="搜索登记线索" /></div></Field>
      <Field label="所属项目"><Select label="线索项目" value={project} options={["全部项目", ...store.clues.map(clue => clue.project)]} onChange={setProject} /></Field>
      <Field label="来源任务"><Select label="线索任务" value={task} options={["全部任务", ...store.clues.map(clue => clue.taskName)]} onChange={setTask} /></Field>
      <Field label="检查人员"><Select label="检查人员" value={inspector} options={["全部人员", ...store.clues.map(clue => clue.inspector)]} onChange={setInspector} /></Field>
      <Field label="来源设备"><Select label="来源设备" value={source} options={["全部来源", ...store.clues.map(clue => clue.sourceDevice)]} onChange={setSource} /></Field>
      <Field label="线索状态"><Select label="线索状态" value={status} options={["全部状态", "待登记", "待提交", "已登记", "已提交"]} onChange={setStatus} /></Field>
      <Field label="检查日期"><input type="date" aria-label="线索检查日期" value={date} onChange={event => setDate(event.currentTarget.value)} onInput={event => setDate(event.currentTarget.value)} /></Field>
      <div className="ph-filter-actions"><Button icon={Filter} onClick={() => notify(`当前查询到 ${visible.length} 条线索`)}>查询</Button><Button variant="secondary" onClick={reset}>重置</Button></div>
    </Toolbar>
    <div className="register-workspace"><SectionCard title="待登记线索" eyebrow="CLUE QUEUE" action={<span className="table-count">共 {visible.length} 条</span>}><div className="clue-list">{visible.map(clue => <button type="button" key={clue.id} className={cx("clue-card", clue.id === selected.id && "active")} onClick={() => setSelectedId(clue.id)}><span className="clue-card-main"><strong>{clue.tags.join("、")}</strong><small>{clue.id} · {clue.project} · {clue.location}</small></span><span className="clue-card-meta"><span>{clue.sourceDevice} · {clue.status}</span><small>{clue.foundTime} · {clue.inspector}</small></span><Pill tone={riskTone(clue.risk)}>{clue.risk}</Pill></button>)}{!visible.length && <p className="empty-state">暂无匹配线索，请调整筛选条件。</p>}</div></SectionCard>
    <SectionCard title="现场证据" eyebrow="EVIDENCE CHAIN" action={<Button variant="ghost" onClick={() => { downloadText(`${selected.id}-证据材料清单.txt`, JSON.stringify({ clue: selected, images: photos, videos, voice: ["现场描述录音", "巡检补充说明"] }, null, 2)); notify("证据材料清单已下载"); }}>下载材料包</Button>}><div className="subtabs">{["图片取证", "视频关键帧", "语音记录", "位置轨迹"].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === "图片取证" && <div className="evidence-grid compact">{photos.map((photo, index) => <button className="evidence-card" type="button" key={`${photo.src}-${index}`} onClick={() => setPreview({ title: photo.title, src: photo.src, type: "image" })}><img src={photo.src} alt={photo.title} /><div><Pill tone="info">参考材料</Pill><strong>{photo.title}</strong><span>{selected.sourceDevice} · {selected.foundTime}</span></div></button>)}{!photos.length && <p className="empty-state">暂无对应参考图，待补充现场证据。</p>}</div>}
      {tab === "视频关键帧" && <div className="ph-video-list">{videos.map((src, index) => <button key={src} onClick={() => setPreview({ title: `视频参考片段 ${index + 1}`, src, type: "video" })}><video src={src} preload="metadata" muted /><span><Play size={16} /> 参考片段 {index + 1} · 图片轮播演示</span></button>)}{!videos.length && <p className="empty-state">暂无对应视频材料。</p>}</div>}
      {tab === "语音记录" && <div className="voice-list">{[["现场描述录音", "/demo-media/audio/audio_hazard_description.mp3", "现场发现配电箱门未关闭，线缆防护待核查，请尽快安排整改。"], ["巡检补充说明", "/demo-media/audio/audio_patrol_note.mp3", "本次巡检覆盖配电室、消防通道和设备间，发现问题已全部记录。"]].map(([title, src, transcript]) => <button type="button" key={title} onClick={() => setPreview({ title, src, transcript, type: "audio" })}><Play size={16} /><strong>{title}</strong><span>{transcript}</span></button>)}</div>}
      {tab === "位置轨迹" && <div className="trace-panel"><div className="trace-map"><span className="trace-point p1" /><span className="trace-point p2" /><span className="trace-point p3" /><span className="trace-line" /></div><div><strong><MapPin size={15} /> 安全帽移动轨迹</strong><p>起点 → 配电室入口 → {selected.location} → 终点</p><Button variant="secondary" onClick={() => setPreview({ title: "位置轨迹回放", src: sceneVideos.locationReplay, type: "video" })}>回放轨迹</Button></div></div>}
      <div className="event-timeline ph-evidence-timeline">{["图片取证", "视频关键帧", "语音记录", "位置轨迹"].map((item, index) => <button key={item} onClick={() => setTab(item)}><time>10:3{index}</time><span>{item}</span><small>{selected.location}</small></button>)}</div>
    </SectionCard>
    <SectionCard title="隐患登记信息" eyebrow="REGISTER FORM" action={<Button variant="ghost" onClick={() => setTaskOpen(true)}>查看来源任务</Button>}><RegistrationFields draft={draft} setDraft={setDraft} /><div className="ph-ai-advice"><div><strong>AI 整改建议</strong><Button variant="ghost" onClick={() => setDraft(old => ({ ...old, measure: selected.aiAdvice }))}>引用建议</Button></div><p>{selected.aiAdvice}</p></div><div className="form-actions"><Button variant="secondary" onClick={() => submit("draft")}>保存草稿</Button><Button onClick={() => submit("submit")}>提交隐患</Button><Button variant="ghost" onClick={() => submit("next")}>提交并下一条</Button></div></SectionCard></div>
    <SectionCard title="已登记隐患列表" eyebrow="REGISTERED LEDGER" action={<span className="table-count">共 {registered.length} 条</span>}><DataTable headers={["隐患编号", "任务名称", "隐患描述", "风险等级", "责任单位", "责任人", "整改期限", "状态"]} rows={registered.map(row => [row.id, row.taskName, row.title, row.risk, row.unit, row.person, row.deadline, row.status])} onAction={values => { const clue = store.clues.find(item => item.recordId === values[0]); const row = store.rows.find(item => item.id === values[0]); if (row?.status === "待提交" && clue) setSelectedId(clue.id); else navigate("/hazards/rectification", values[0]); }} actionLabel="查看" />{!registered.length && <p className="empty-state">本任务暂无登记记录，保存草稿或提交后将在此显示。</p>}</SectionCard>
    <Modal title="来源任务详情" open={taskOpen} onClose={() => setTaskOpen(false)}><DetailPairs rows={[["任务名称", selected.taskName], ["任务编号", selected.taskId || tasks.find(task => task[1] === selected.taskName)?.[0] || selected.id.replace("XS", "RW")], ["所属项目", selected.project], ["检查模板", `${selected.checkType}模板`], ["检查人员", selected.inspector], ["来源设备", selected.sourceDevice], ["检查日期", selected.checkDate], ["现场位置", selected.location]]} /><div className="modal-foot"><Button variant="secondary" onClick={() => setTaskOpen(false)}>关闭</Button><Button onClick={() => navigate("/tasks", selected.taskId || tasks.find(task => task[1] === selected.taskName)?.[0])}>打开检查任务</Button></div></Modal><MediaModal preview={preview} close={() => setPreview(null)} />
  </>;
}

type RectifyForm = { person: string; deadline: string; measure: string; note: string; reviewPerson: string; reviewTime: string; reviewResult: string; reviewNote: string; companyPerson: string; companyTime: string; companyNote: string; signature: string; seal: string; letter: string; expertPerson: string; expertResult: string; expertNote: string };
function rectifyForm(row: HazardLedger): RectifyForm { return { person: row.person, deadline: row.deadline, measure: row.measure, note: row.note || "", reviewPerson: row.review?.person || "李四", reviewTime: row.review?.time || localDateTime(), reviewResult: row.review?.result || "通过", reviewNote: row.review?.note || "已核对整改要求和现场证据，建议按复查结果继续流转。", companyPerson: row.company?.person || "王磊", companyTime: row.company?.time || localDateTime(), companyNote: row.company?.note || "企业已核对整改记录和现场证据，确认整改结果。", signature: row.company?.signature || "", seal: row.company?.seal || row.unit, letter: row.company?.letter || "", expertPerson: row.expert?.person || "赵工", expertResult: row.expert?.result || "通过", expertNote: row.expert?.note || "建议结合整改资料和现场复查结果完成闭环。" }; }
type RectifyFilters = { query: string; project: string; risk: string; status: string; foundStart: string; dueEnd: string };
const emptyRectifyFilters: RectifyFilters = { query: "", project: "全部项目", risk: "全部等级", status: "全部状态", foundStart: "", dueEnd: "" };
const rectifyPhase = (row: HazardLedger) => ["多次退回", "即将超期", "已超期"].includes(row.status) ? "整改中" : row.status;
const handlingTab = (row: HazardLedger) => ({ "整改中": "整改照片", "待复查": "复查验收", "企业确认": "企业确认", "专家复核": "专家复核", "待销号归档": "销号归档", "已销号": "销号归档" }[rectifyPhase(row)] || "整改信息");
function RectifyWorkspace(props: StoreActions) {
  const { store, notify } = props;
  const rows = store.rows.filter(row => row.status !== "待提交");
  const focusId = new URLSearchParams(window.location.search).get("focus");
  const [selectedId, setSelectedId] = useState<string | null>(() => rows.some(row => row.id === focusId) ? focusId : null);
  const [initialTab, setInitialTab] = useState("整改信息");
  const [filters, setFilters] = useState<RectifyFilters>(emptyRectifyFilters);
  const [applied, setApplied] = useState<RectifyFilters>(emptyRectifyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const current = rows.find(row => row.id === selectedId);
  useEffect(() => { if (focusId && rows.some(row => row.id === focusId)) { setSelectedId(focusId); setInitialTab("整改信息"); } }, [focusId]);
  const setFilter = (key: keyof RectifyFilters, value: string) => setFilters(old => ({ ...old, [key]: value }));
  const filtered = rows.filter(row => (applied.project === "全部项目" || row.project === applied.project) && (applied.risk === "全部等级" || row.risk === applied.risk) && matchesDateRange(row.foundTime, applied.foundStart) && matchesDateRange(row.deadline, "", applied.dueEnd) && `${row.id} ${row.title} ${row.project} ${row.taskName} ${row.unit} ${row.person}`.includes(applied.query.trim()));
  const visible = filtered.filter(row => applied.status === "全部状态" || rectifyPhase(row) === applied.status);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const reset = () => { setFilters(emptyRectifyFilters); setApplied(emptyRectifyFilters); setPage(1); };
  const selectStage = (status: string) => { setFilter("status", status); setApplied(old => ({ ...old, status })); setPage(1); };
  const openDetail = (row: HazardLedger, handle = false) => { setSelectedId(row.id); setInitialTab(handle ? handlingTab(row) : "整改信息"); };
  const closeDetail = () => { setSelectedId(null); const url = new URL(window.location.href); url.searchParams.delete("focus"); window.history.replaceState({}, "", url); };
  return <>
    <form className="toolbar ph-rectify-filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); setPage(1); }}>
      <Field label="搜索整改单"><div className="search-field"><Search size={16} /><input aria-label="搜索整改隐患" placeholder="隐患编号 / 描述 / 任务 / 责任人" value={filters.query} onChange={event => setFilter("query", event.target.value)} /></div></Field>
      <Field label="所属项目"><Select label="整改项目" value={filters.project} options={["全部项目", ...rows.map(row => row.project)]} onChange={value => setFilter("project", value)} /></Field>
      <Field label="风险等级"><Select label="整改风险等级" value={filters.risk} options={["全部等级", ...riskOptions]} onChange={value => setFilter("risk", value)} /></Field>
      <Field label="流程状态"><Select label="整改当前状态" value={filters.status} options={["全部状态", ...statuses]} onChange={value => setFilter("status", value)} /></Field>
      <Field label="发现日期起"><input type="date" aria-label="发现开始日期" value={filters.foundStart} onChange={event => setFilter("foundStart", event.currentTarget.value)} onInput={event => setFilter("foundStart", event.currentTarget.value)} /></Field>
      <Field label="整改期限止"><input type="date" aria-label="整改期限截止日期" value={filters.dueEnd} onChange={event => setFilter("dueEnd", event.currentTarget.value)} onInput={event => setFilter("dueEnd", event.currentTarget.value)} /></Field>
      <div className="ph-rectify-filter-actions"><Button type="submit" icon={Search}>查询</Button><Button variant="secondary" onClick={reset}>重置</Button></div>
    </form>
    <section className="section-card ph-rectify-list" aria-label="整改单列表">
      <div className="section-card-head"><div><div className="eyebrow">RECTIFICATION ORDERS</div><h2>整改单列表 <span>{rows.length} 条</span></h2><p>集中查看各项目整改单，选择一单继续办理。</p></div><Button variant="secondary" icon={Download} onClick={() => { downloadText("隐患整改清单.csv", csv(visible), "text/csv;charset=utf-8"); notify(`已导出 ${visible.length} 条整改单`); }}>导出当前列表</Button></div>
      <div className="ph-rectify-stage-tabs" role="group" aria-label="按流程状态筛选">
        {["全部状态", ...statuses].map(stage => <button type="button" key={stage} aria-pressed={applied.status === stage} className={applied.status === stage ? "active" : ""} onClick={() => selectStage(stage)}>{stage === "全部状态" ? "全部整改单" : stage}<span>{filtered.filter(row => stage === "全部状态" || rectifyPhase(row) === stage).length}</span></button>)}
      </div>
      <div className="table-wrap"><table className="data-table ph-orders-table" aria-label="整改单台账">
        <colgroup><col style={{ width: "24%" }} /><col style={{ width: "17%" }} /><col style={{ width: "9%" }} /><col style={{ width: "16%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} /><col style={{ width: "12%" }} /></colgroup>
        <thead><tr>{["整改单 / 隐患内容", "项目 / 来源任务", "风险等级", "责任单位 / 责任人", "整改期限", "当前状态", "操作"].map(head => <th key={head} scope="col">{head}</th>)}</tr></thead>
        <tbody>{pageRows.map(row => <tr key={row.id} className={row.id === selectedId ? "selected" : ""}>
          <td><button type="button" className="ph-order-title" title={row.title} onClick={() => openDetail(row)}>{row.title}</button><span className="ph-order-secondary">{row.id}</span></td>
          <td><span className="table-text" title={row.project}>{row.project}</span><span className="ph-order-secondary" title={row.taskName}>{row.taskName}</span></td>
          <td><Pill tone={riskTone(row.risk)}>{row.risk}</Pill></td>
          <td><span className="table-text" title={row.unit}>{row.unit}</span><span className="ph-order-secondary">{row.person}</span></td>
          <td><span>{row.deadline}</span>{overdueDays(row) > 0 && <span className="ph-order-secondary ph-order-overdue">超期 {overdueDays(row)} 天</span>}</td>
          <td><Pill tone={statusTone(row.status)}>{row.status}</Pill></td>
          <td><div className="ph-order-actions"><Button variant="ghost" onClick={() => openDetail(row)}>查看详情</Button>{rectifyPhase(row) !== "已销号" && <Button variant="ghost" onClick={() => openDetail(row, true)}>办理</Button>}</div></td>
        </tr>)}{!pageRows.length && <tr><td colSpan={7}><div className="ph-orders-empty"><Search size={24} /><strong>暂无匹配的整改单</strong><p>调整筛选条件，或重置后查看全部记录。</p><Button variant="secondary" onClick={reset}>重置筛选</Button></div></td></tr>}</tbody>
      </table></div>
      <div className="ph-orders-pagination"><span role="status">共 {visible.length} 条{visible.length > 0 ? ` · 当前显示 ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, visible.length)} 条` : ""}</span><div><select aria-label="每页整改单数量" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map(size => <option key={size} value={size}>{size} 条 / 页</option>)}</select><Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>上一页</Button><span>{currentPage} / {pageCount}</span><Button variant="secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>下一页</Button></div></div>
      <p className="ph-orders-footnote">演示数据 · 超期天数以 2025-05-23 为演示基准；已销号记录保留在列表中供追溯。</p>
    </section>
    <div className="ph-rectify-dialog"><Drawer title="整改单详情" open={!!current} onClose={closeDetail}>{current && <RectifyDetail key={current.id} {...props} current={current} initialTab={initialTab} />}</Drawer></div>
  </>;
}

function RectifyDetail({ current, initialTab, store, save, notify, navigate }: StoreActions & { current: HazardLedger; initialTab: string }) {
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState(() => rectifyForm(current));
  const [modal, setModal] = useState<"dispatch" | "upload" | "complete" | "recheck" | "company" | "sign" | "expert" | "archive" | "flow" | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [uploadSource, setUploadSource] = useState("");
  const [uploadTitle, setUploadTitle] = useState("整改后补充参考照片");
  const [adviceIndex, setAdviceIndex] = useState(0);
  const set = (key: keyof RectifyForm, value: string) => setForm(old => ({ ...old, [key]: value }));
  const phase = rectifyPhase(current);
  const phaseIndex = statuses.indexOf(phase);
  const photos = defaultPhotos(current);
  const photo = photos.find(item => item.id === selectedPhoto) || photos[photos.length - 1];
  const patch = (update: Partial<HazardLedger>, action: string, note: string, recipient = form.person) => save({ ...store, rows: store.rows.map(row => row.id === current.id ? { ...row, ...update, logs: [...(row.logs || []), { time: now(), action, note, recipient }] } : row) }, action);
  const companyPatch = () => ({ person: form.companyPerson, time: form.companyTime, note: form.companyNote, signature: form.signature, seal: form.seal, letter: form.letter });
  const reviewPatch = () => ({ person: form.reviewPerson, time: form.reviewTime, result: form.reviewResult, note: form.reviewNote });
  const expertPatch = () => ({ person: form.expertPerson, result: form.expertResult, note: form.expertNote });
  const confirmAction = () => {
    let done = false;
    if (modal === "dispatch" && phase === "待整改") {
      if (!form.person.trim() || !form.deadline || !form.measure.trim()) { notify("请填写责任人、整改期限和整改要求"); return; }
      done = patch({ person: form.person, deadline: form.deadline, overdueDays: overdueDays({ ...current, deadline: form.deadline }), measure: form.measure, status: "整改中" }, "整改任务已派发", form.measure);
      if (done) setTab("整改照片");
    }
    if (modal === "upload" && phase === "整改中") {
      if (!uploadSource || !uploadTitle.trim()) { notify("请选择参考图片并填写证据名称"); return; }
      const nextPhoto = { id: `photo-${Date.now()}`, title: uploadTitle.trim(), src: uploadSource, stage: "整改后", inReport: true };
      done = patch({ photos: [...photos, nextPhoto] }, "整改参考照片已加入", nextPhoto.title);
      if (done) setSelectedPhoto(nextPhoto.id);
    }
    if (modal === "complete" && phase === "整改中") {
      if (!form.note.trim()) { notify("请填写整改说明"); return; }
      if (!photos.some(item => item.stage === "整改后")) { notify("请先添加整改后参考照片"); return; }
      done = patch({ note: form.note, status: "待复查" }, "整改完成，进入待复查", form.note); if (done) setTab("复查验收");
    }
    if (modal === "recheck" && phase === "待复查") {
      if (!form.reviewPerson.trim() || !form.reviewTime || !form.reviewNote.trim()) { notify("请填写复查人、时间和意见"); return; }
      const next = form.reviewResult === "通过" ? "企业确认" : "整改中";
      done = patch({ review: reviewPatch(), status: next }, form.reviewResult === "通过" ? "复查通过，进入企业确认" : "复查不通过，退回整改", form.reviewNote, form.reviewPerson); if (done) setTab(next === "企业确认" ? "企业确认" : "整改照片");
    }
    if (modal === "sign" && phase === "企业确认") {
      if (!form.signature.trim() || !form.seal.trim()) { notify("请填写签署姓名和企业章名称"); return; }
      done = patch({ company: companyPatch() }, "企业演示签名已保存", `签署人：${form.signature}；电子章：${form.seal}`, form.companyPerson);
    }
    if (modal === "company" && phase === "企业确认") {
      if (!form.companyPerson.trim() || !form.companyTime || !form.signature.trim() || !form.seal.trim() || !form.companyNote.trim()) { notify("请补全确认人、时间、意见和企业电子签名/章"); return; }
      done = patch({ company: companyPatch(), status: "专家复核" }, "企业已确认，进入专家复核", form.companyNote, form.companyPerson); if (done) setTab("专家复核");
    }
    if (modal === "expert" && phase === "专家复核") {
      if (!form.expertPerson.trim() || !form.expertNote.trim()) { notify("请填写专家和复核意见"); return; }
      const next = form.expertResult === "通过" ? "待销号归档" : "待复查";
      done = patch({ expert: expertPatch(), status: next }, form.expertResult === "通过" ? "专家复核通过，等待销号归档" : form.expertResult === "需补充材料" ? "需补充材料，退回复查" : "专家复核不通过，退回复查", form.expertNote, form.expertPerson); if (done) setTab(next === "待销号归档" ? "销号归档" : "复查验收");
    }
    if (modal === "archive" && phase === "待销号归档") {
      done = patch({ status: "已销号", archiveId: `ARCH${current.id}`, archiveTime: now(), overdueDays: 0 }, "隐患已销号归档", "归档材料包括登记、整改、复查、企业确认及专家复核记录。");
    }
    if (done) setModal(null);
  };
  const openUpload = () => { setUploadSource(/配电箱|配电柜/.test(current.title) ? sceneImages.rectificationAfter : current.image || getHazardScene(current.title)?.src || ""); setUploadTitle("整改后补充参考照片"); setModal("upload"); };
  const previewPhoto = (item: Photo) => { setSelectedPhoto(item.id); setPreview({ title: item.title, src: item.src, type: "image" }); };
  const stageNote = (expected: string) => phase !== expected ? <p className="ph-stage-note">当前流程：{current.status}。本页可查看记录，办理操作将在对应阶段开放。</p> : null;
  const modalTitle = { dispatch: "派发整改", upload: "上传整改照片（本地演示）", complete: "提交整改完成", recheck: "提交复查结果", company: "企业确认", sign: "企业电子签名", expert: "专家复核", archive: "销号归档", flow: "流程时间线" };
  return <div className="ph-rectify-detail">
    <div className="rectify-summary"><div><Pill tone={statusTone(current.status)}>{current.status}</Pill><h2>{current.title}</h2><p>{current.id} · {current.project} · {current.location || current.taskName}</p></div><div className="rectify-summary-actions"><Button variant="secondary" onClick={() => { exportRecord(current, "整改任务单"); notify("整改任务单已下载"); }}>下载任务单</Button><Button variant="secondary" onClick={() => setModal("flow")}>查看流程</Button></div></div>
    <div className="rectify-layout"><section className="rectify-main"><nav className="rectify-tabs">{rectifyTabs.map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{item === "整改照片" && <span>{photos.length}</span>}</button>)}</nav>
      {tab === "整改信息" && <div className="rectify-content"><DetailPairs rows={[["整改要求", current.measure], ["责任单位", current.unit], ["责任部门", current.dept || "工程部"], ["责任人", current.person], ["整改期限", current.deadline], ["来源任务", current.taskName], ["发现来源", current.source], ["当前阶段", current.status]]} /><SectionCard title="AI 整改建议" eyebrow="ASSISTED PLAN" action={<Button variant="ghost" onClick={() => setAdviceIndex(index => (index + 1) % 2)}>换一组</Button>}><div className="suggestion-list">{(adviceIndex === 0 ? [current.measure, "建议按原始取证角度补充整改前后对比材料。", "整改完成后提交复查，并保留责任人员和时间记录。"] : ["建议核查现场风险是否消除及措施是否落实。", "高风险隐患建议安排对应专业专家复核。", "建议复查人员核对照片、整改说明及责任单位反馈。"]).map((item, index) => <div key={index}><span>0{index + 1}</span><p>{item}</p><Pill tone="info">整改建议</Pill></div>)}</div></SectionCard><SectionCard title="整改说明" eyebrow="RECTIFICATION NOTE"><textarea aria-label="整改说明" value={form.note} onChange={event => set("note", event.target.value)} readOnly={phase !== "整改中"} /><div className="form-actions">{phase === "待整改" && <Button onClick={() => setModal("dispatch")}>派发整改</Button>}{phase === "整改中" && <><Button variant="secondary" onClick={() => patch({ note: form.note }, "整改说明已保存", form.note || "暂无补充说明")}>保存说明</Button><Button onClick={() => setTab("整改照片")}>补充整改证据</Button></>}<Button variant="ghost" onClick={() => { exportRecord(current, "隐患详情"); notify("隐患详情已导出"); }}>打印详情</Button></div></SectionCard></div>}
      {tab === "整改照片" && <div className="rectify-content"><div className="photo-stat-grid">{["整改前", "整改中", "整改后", "报告证据"].map(item => <div className="photo-stat" key={item}><span>{item}</span><strong>{photos.filter(photo => item === "报告证据" ? photo.inReport : photo.stage === item).length} 张</strong></div>)}</div><div className="photo-manager"><div className="evidence-wall">{photos.map(item => <button type="button" key={item.id} className={photo?.id === item.id ? "active" : ""} onClick={() => previewPhoto(item)}><img src={item.src} alt={item.title} /><Pill tone={item.stage === "整改后" ? "success" : "info"}>{item.stage}</Pill><strong>{item.title}</strong><small>{item.inReport ? "已加入报告" : "未加入报告"} · 参考材料</small></button>)}{!photos.length && <p className="empty-state">暂无对应照片，待补充现场材料。</p>}</div><aside className="photo-detail"><h3>证据详情</h3><p>当前照片：{photo?.title || "未选择"}</p><p>上传人：{current.person}</p><p>关联隐患：{current.id}</p>{photo && <label><input type="checkbox" checked={photo.inReport} onChange={event => patch({ photos: photos.map(item => item.id === photo.id ? { ...item, inReport: event.target.checked } : item) }, "报告证据选择已保存", photo.title)} />作为闭环报告证据</label>}<div className="detail-actions-stack">{phase === "整改中" && <Button variant="secondary" icon={Upload} onClick={openUpload}>上传整改照片</Button>}{photo && <Button variant="ghost" onClick={() => previewPhoto(photo)}>查看大图</Button>}</div></aside></div>{phase === "整改中" && <><Field label="整改完成说明"><textarea value={form.note} onChange={event => set("note", event.target.value)} /></Field><div className="form-actions"><Button onClick={() => setModal("complete")}>提交整改完成</Button></div></>}{stageNote("整改中")}</div>}
      {tab === "复查验收" && <div className="rectify-content"><div className="form-grid"><Field label="复查结果"><Select label="复查结果" value={form.reviewResult} options={["通过", "不通过"]} onChange={value => set("reviewResult", value)} /></Field><Field label="复查人"><input value={form.reviewPerson} onChange={event => set("reviewPerson", event.target.value)} /></Field><Field label="复查时间"><input type="datetime-local" value={form.reviewTime} onChange={event => { const inputValue = event.currentTarget.value; set("reviewTime", inputValue); }} onInput={event => { const inputValue = event.currentTarget.value; set("reviewTime", inputValue); }} /></Field><Field label="复查方式"><input readOnly value="现场复查 + 图片核验（演示）" /></Field><Field label="复查意见" wide><textarea value={form.reviewNote} onChange={event => set("reviewNote", event.target.value)} /></Field></div><DataTable headers={["复查资料", "内容", "状态"]} rows={[["整改要求", current.measure, "待核查"], ["整改照片", `${photos.length} 张参考材料`, photos.some(photo => photo.stage === "整改后") ? "已补充" : "待补充"], ["整改说明", current.note || "待填写", current.note ? "已填写" : "待补充"]]} />{phase === "待复查" && <div className="form-actions"><Button variant="secondary" onClick={() => patch({ review: reviewPatch() }, "复查记录已保存", form.reviewNote, form.reviewPerson)}>保存复查记录</Button><Button onClick={() => setModal("recheck")}>提交复查结果</Button></div>}{stageNote("待复查")}</div>}
      {tab === "企业确认" && <div className="rectify-content"><div className="form-grid"><Field label="确认人"><input value={form.companyPerson} onChange={event => set("companyPerson", event.target.value)} /></Field><Field label="确认时间"><input type="datetime-local" value={form.companyTime} onChange={event => { const inputValue = event.currentTarget.value; set("companyTime", inputValue); }} onInput={event => { const inputValue = event.currentTarget.value; set("companyTime", inputValue); }} /></Field><Field label="确认意见" wide><textarea value={form.companyNote} onChange={event => set("companyNote", event.target.value)} /></Field></div><SectionCard title="企业确认材料" eyebrow="COMPANY CONFIRMATION"><p className="plain-note">{form.letter || "确认函待补充"}</p><div className="signature-area"><div><span>企业电子签名（演示）</span><strong>{form.signature || "待签名"}</strong></div><div><span>企业电子章（演示）</span><strong>{form.seal}</strong></div></div>{phase === "企业确认" && <div className="form-actions"><Button variant="secondary" onClick={() => { const letter = `${current.unit}整改确认函（演示）.pdf`; set("letter", letter); patch({ company: { ...companyPatch(), letter } }, "企业确认函已加入", letter, form.companyPerson); }}>上传确认函</Button><Button variant="secondary" onClick={() => setModal("sign")}>电子签名</Button><Button onClick={() => setModal("company")}>企业确认</Button><Button variant="ghost" onClick={() => { if (patch({ status: "待复查", company: companyPatch() }, "企业退回复查", form.companyNote, form.companyPerson)) setTab("复查验收"); }}>退回复查</Button></div>}</SectionCard>{stageNote("企业确认")}</div>}
      {tab === "专家复核" && <div className="rectify-content"><div className="form-grid"><Field label="专家姓名"><Select label="复核专家" value={form.expertPerson} options={["赵工", "王工", "孙工"]} onChange={value => set("expertPerson", value)} /></Field><Field label="复核结论"><Select label="专家复核结论" value={form.expertResult} options={["通过", "不通过", "需补充材料"]} onChange={value => set("expertResult", value)} /></Field><Field label="复核意见" wide><textarea value={form.expertNote} onChange={event => set("expertNote", event.target.value)} /></Field></div><DataTable headers={["资料清单", "说明", "完整性"]} rows={[["原始隐患资料", current.title, "已登记"], ["整改前后照片", `${photos.length} 张参考材料`, photos.some(photo => photo.stage === "整改后") ? "已补充" : "待补充"], ["复查验收记录", current.review?.person || "未提交", current.review?.result || "待复查"], ["企业电子签名", current.company?.signature || "待签署", current.company?.signature ? "已完成" : "待补充"], ["企业确认函", current.company?.letter || "未上传", current.company?.letter ? "已补充" : "待补充"]]} />{phase === "专家复核" && <div className="form-actions"><Button variant="secondary" onClick={() => patch({ expert: expertPatch() }, "专家意见已暂存", form.expertNote, form.expertPerson)}>暂存意见</Button><Button onClick={() => setModal("expert")}>提交专家复核</Button></div>}{stageNote("专家复核")}</div>}
      {tab === "销号归档" && <div className="rectify-content"><div className="archive-hero"><CheckCircle2 size={28} /><div><strong>{phase === "已销号" ? "隐患已完成销号归档" : phase === "待销号归档" ? "专家已通过，等待确认销号" : "全流程材料持续归集中"}</strong><span>归档编号 {current.archiveId || "待销号后生成"} · 归档时间 {current.archiveTime || "待办理"}</span></div></div><DataTable headers={["闭环材料", "说明", "状态"]} rows={[["隐患登记记录", current.id, "已登记"], ["整改照片和说明", `${photos.length} 张照片`, current.note ? "已补充" : "待补充"], ["复查验收记录", current.review?.note || "待复查", current.review?.result || "待处理"], ["企业确认材料", current.company?.signature || "待签署", current.company?.signature ? "已签署" : "待处理"], ["专家复核意见", current.expert?.note || "待复核", current.expert?.result || "待处理"]]} /><div className="form-actions"><Button variant="secondary" onClick={() => { exportRecord(current, "闭环报告"); notify("闭环演示报告已生成并下载"); }}>生成闭环报告</Button>{phase === "待销号归档" && <Button onClick={() => setModal("archive")}>销号归档</Button>}<Button variant="ghost" onClick={() => { exportRecord(current, "归档材料清单"); notify("归档材料清单已下载"); }}>下载归档包</Button><Button variant="ghost" onClick={() => navigate("/reports", current.id)}>打开报告中心</Button></div></div>}
    </section><aside className="rectify-side"><SectionCard title="整改任务信息" eyebrow="TASK SNAPSHOT"><div className="side-facts">{[["责任单位", current.unit], ["责任部门", current.dept || "工程部"], ["责任人", current.person], ["整改期限", current.deadline], ["现场位置", current.location || current.project], ["来源设备", current.source], ["是否超期", overdueDays(current) ? `超期 ${overdueDays(current)} 天` : "未超期"], ["超期计算基准", "2025-05-23（演示）"]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div></SectionCard><SectionCard title="证据快照" eyebrow="EVIDENCE PREVIEW"><div className="side-evidence">{photos.slice(0, 3).map(item => <button key={item.id} onClick={() => previewPhoto(item)}><img src={item.src} alt={item.title} /><span>{item.stage}</span></button>)}</div><Button variant="secondary" onClick={() => setTab("整改照片")}>管理全部证据</Button></SectionCard><SectionCard title="流程跟踪" eyebrow="CLOSURE FLOW"><div className="mini-flow">{["登记完成", "整改执行", "复查验收", "企业确认", "专家复核", "销号归档"].map((item, index) => <div key={item} className={index < phaseIndex || phase === "已销号" ? "done" : ""}><i /><span>{item}</span><small>{index < phaseIndex || phase === "已销号" ? "已完成" : index === phaseIndex ? "当前阶段" : "待处理"}</small></div>)}</div></SectionCard></aside></div>
    <Modal title={modal ? modalTitle[modal] : "操作确认"} open={!!modal} onClose={() => setModal(null)} wide={modal === "flow"}>{modal === "flow" ? <Timeline row={current} /> : <><p className="plain-note">{current.id} · {current.title}</p>
      {modal === "dispatch" && <div className="form-grid"><Field label="责任人 *"><input value={form.person} onChange={event => set("person", event.target.value)} /></Field><Field label="整改期限 *"><input type="date" value={form.deadline} onChange={event => { const inputValue = event.currentTarget.value; set("deadline", inputValue); }} onInput={event => { const inputValue = event.currentTarget.value; set("deadline", inputValue); }} /></Field><Field label="整改要求 *" wide><textarea value={form.measure} onChange={event => set("measure", event.target.value)} /></Field></div>}
      {modal === "upload" && <div className="ph-upload-panel"><Field label="证据名称"><input value={uploadTitle} onChange={event => setUploadTitle(event.target.value)} /></Field><p className="plain-note">选择已有参考图片加入本地演示记录。</p><div className="ph-upload-choices">{unique([current.image || "", getHazardScene(current.title)?.src || "", ...(/配电箱|配电柜/.test(current.title) ? [sceneImages.rectificationAfter] : [])]).map(src => <button type="button" key={src} className={uploadSource === src ? "active" : ""} onClick={() => setUploadSource(src)}><img src={src} alt="整改参考图片" /><span>{uploadSource === src ? "已选择" : "选择参考图"}</span></button>)}</div>{!uploadSource && <p className="plain-note">该隐患暂无相符参考图片，请先补充对应现场材料。</p>}</div>}
      {modal === "complete" && <><DetailPairs rows={[["整改说明", form.note || "尚未填写"], ["整改照片", `${photos.length} 张，其中整改后 ${photos.filter(item => item.stage === "整改后").length} 张`], ["下一阶段", "待复查"]]} /><p className="plain-note">提交后保留整改说明和证据，进入复查验收。</p></>}
      {modal === "recheck" && <><DetailPairs rows={[["复查人", form.reviewPerson], ["复查时间", form.reviewTime], ["复查意见", form.reviewNote]]} /><Field label="复查结果"><Select label="确认复查结果" value={form.reviewResult} options={["通过", "不通过"]} onChange={value => set("reviewResult", value)} /></Field><p className="plain-note">通过后进入企业确认；不通过退回整改。</p></>}
      {modal === "sign" && <div className="form-grid"><Field label="签署人姓名 *"><input value={form.signature} onChange={event => set("signature", event.target.value)} placeholder="输入企业确认人姓名" /></Field><Field label="企业电子章名称 *"><input value={form.seal} onChange={event => set("seal", event.target.value)} /></Field><p className="plain-note">本地演示签名与电子章预览，仅用于演示企业确认资料。</p></div>}
      {modal === "company" && <DetailPairs rows={[["企业确认人", form.companyPerson], ["确认时间", form.companyTime], ["电子签名", form.signature || "待签署"], ["企业电子章", form.seal], ["确认意见", form.companyNote], ["下一阶段", "专家复核"]]} />}
      {modal === "expert" && <><DetailPairs rows={[["复核专家", form.expertPerson], ["复核意见", form.expertNote]]} /><Field label="复核结论"><Select label="确认专家结论" value={form.expertResult} options={["通过", "不通过", "需补充材料"]} onChange={value => set("expertResult", value)} /></Field><p className="plain-note">通过后进入销号归档；不通过或需补充材料退回复查。</p></>}
      {modal === "archive" && <DetailPairs rows={[["归档编号", `ARCH${current.id}`], ["专家意见", current.expert?.note || ""], ["资料范围", "登记、整改、照片、复查、企业确认、专家意见"], ["确认后状态", "已销号"]]} />}
      <div className="modal-foot"><Button variant="secondary" onClick={() => setModal(null)}>取消</Button><Button onClick={confirmAction}>{modal === "dispatch" ? "确认派发" : modal === "archive" ? "确认销号" : modal === "upload" ? "确认上传" : modal === "sign" ? "确认签名" : "确认提交"}</Button></div></>}</Modal><MediaModal preview={preview} close={() => setPreview(null)} />
  </div>;
}


function overdueDays(row: HazardLedger) {
  if (row.status === "已销号") return 0;
  const elapsed = Date.parse("2025-05-23") - Date.parse(isoDate(row.deadline));
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 86400000)) : 0;
}
function warningType(row: HazardLedger) { return row.status === "多次退回" ? "多次退回" : overdueDays(row) > 0 ? "已超期" : "即将超期"; }
function DemoOverdueList({ store, save, notify, navigate }: StoreActions) {
  const rows = store.rows.filter(row => row.status !== "已销号" && row.status !== "待提交" && (overdueDays(row) > 0 || matchesDateRange(row.deadline, "", "2025-05-26")));
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("全部级别");
  const [project, setProject] = useState("全部项目");
  const [risk, setRisk] = useState("全部等级");
  const [type, setType] = useState("全部预警");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [minDays, setMinDays] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<{ type: "催办" | "派发专家" | "升级预警"; ids: string[] } | null>(null);
  const [note, setNote] = useState("");
  const [expert, setExpert] = useState("王工");
  const [flowOpen, setFlowOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const selected = rows.find(row => row.id === selectedId);
  const selectedLogs = selected?.logs || [];
  const expertLog = [...selectedLogs].reverse().find(log => log.action === "派发专家");
  const severity = (row: HazardLedger) => row.warningLevel || (/高风险|重大/.test(row.risk) ? "严重预警" : "重点提醒");
  const followup = (row: HazardLedger) => { const logs = row.logs || []; return logs.some(log => log.action === "升级预警") ? "已升级" : logs.some(log => log.action === "派发专家") ? "专家已派发" : logs.some(log => log.action === "催办") ? "已催办" : "待跟进"; };
  const visible = rows.filter(row => `${row.id} ${row.title} ${row.project} ${row.person}`.includes(query) && (project === "全部项目" || row.project === project) && (risk === "全部等级" || row.risk === risk) && (level === "全部级别" || severity(row) === level) && (type === "全部预警" || warningType(row) === type) && matchesDateRange(row.deadline, start, end) && overdueDays(row) >= minDays);
  const actionRows = action ? rows.filter(row => action.ids.includes(row.id)) : [];
  const openAction = (nextType: "催办" | "派发专家" | "升级预警", ids: string[]) => {
    if (!ids.length) return;
    setAction({ type: nextType, ids });
    setNote(nextType === "催办" ? "请责任单位在 24 小时内反馈整改进展并补充整改证据。" : nextType === "派发专家" ? "请结合现场资料核查风险并给出整改建议。" : "该隐患超期未闭环，建议提高关注级别并安排专项跟进。");
    const lastExpert = [...(rows.find(row => row.id === ids[0])?.logs || [])].reverse().find(log => log.action === "派发专家");
    setExpert(lastExpert?.recipient || "王工");
  };
  const submitAction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action || !note.trim() || !actionRows.length) return;
    const time = now();
    const next = { ...store, rows: store.rows.map(row => action.ids.includes(row.id) ? { ...row, warningLevel: action.type === "升级预警" ? "严重预警" : row.warningLevel, logs: [...(row.logs || []), { time, action: action.type, recipient: action.type === "派发专家" ? expert : action.type === "升级预警" ? `${row.project}安全负责人` : row.person === "待指派" ? `${row.project}项目负责人` : row.person, note: note.trim() }] } : row) };
    if (save(next, `${actionRows.length} 条${action.type}演示记录已保存`)) setAction(null);
  };
  const reset = () => { setQuery(""); setLevel("全部级别"); setProject("全部项目"); setRisk("全部等级"); setType("全部预警"); setStart(""); setEnd(""); setMinDays(0); };
  const scene = selected ? selected.image || getHazardScene(selected.title)?.src : undefined;
  return <div className="demo-overdue"><div className="alert-banner"><AlertCircle size={18} /><div><strong>{rows.length} 条隐患需要关注</strong><span>逐项查看、催办或派发专家，跟进记录保留在本机。</span></div><Button variant="secondary" disabled={!visible.length} onClick={() => openAction("催办", visible.map(row => row.id))}>批量催办（{visible.length}）</Button></div>
    <SectionCard title="超期隐患列表" eyebrow="OVERDUE QUEUE" action={<span className="table-count">共 {visible.length} 条 · 演示数据</span>}><Toolbar className="ph-filters ph-overdue-filters">
      <Field label="搜索隐患"><div className="search-field"><Search size={16} /><input aria-label="搜索超期隐患" value={query} onChange={event => setQuery(event.target.value)} placeholder="隐患编号 / 描述 / 责任人" /></div></Field>
      <Field label="所属项目"><Select label="预警项目" value={project} options={["全部项目", ...rows.map(row => row.project)]} onChange={setProject} /></Field>
      <Field label="预警级别"><Select label="预警级别" value={level} options={["全部级别", "严重预警", "重点提醒"]} onChange={setLevel} /></Field>
      <Field label="风险等级"><Select label="预警风险等级" value={risk} options={["全部等级", ...riskOptions]} onChange={setRisk} /></Field>
      <Field label="预警类型"><Select label="预警类型" value={type} options={["全部预警", "即将超期", "已超期", "多次退回"]} onChange={setType} /></Field>
      <Field label="整改期限起"><input type="date" aria-label="整改期限开始日期" value={start} onChange={event => setStart(event.currentTarget.value)} onInput={event => setStart(event.currentTarget.value)} /></Field>
      <Field label="整改期限止"><input type="date" aria-label="整改期限结束日期" value={end} onChange={event => setEnd(event.currentTarget.value)} onInput={event => setEnd(event.currentTarget.value)} /></Field>
      <Field label="超期天数"><Select label="超期天数" value={minDays === 0 ? "全部天数" : `超期${minDays}天以上`} options={["全部天数", "超期3天以上", "超期7天以上"]} onChange={value => setMinDays(value.includes("3") ? 3 : value.includes("7") ? 7 : 0)} /></Field>
      <div className="ph-filter-actions"><Button variant="secondary" onClick={reset}>重置</Button><Button variant="secondary" icon={Download} onClick={() => { downloadText("隐患超期预警列表.csv", csv(visible), "text/csv;charset=utf-8"); notify("当前筛选预警列表已导出"); }}>导出</Button></div>
    </Toolbar>
    <div className="table-wrap" role="region" aria-label="超期隐患列表" tabIndex={0}><table className="data-table demo-overdue-table"><colgroup>{[145, 140, 170, 82, 68, 105, 65, 90, 135].map((width, index) => <col key={index} style={{ width }} />)}</colgroup><thead><tr>{["隐患编号", "项目 / 位置", "隐患描述", "风险等级", "责任人", "整改期限", "超期", "跟进状态", "操作"].map(head => <th key={head} scope="col">{head}</th>)}</tr></thead><tbody>{visible.map(row => <tr key={row.id}><td>{row.id}</td><td><span className="table-text" title={row.project}>{row.project}</span><small className="table-text" title={row.location || row.taskName}>{row.location || row.taskName}</small></td><td><span className="table-primary-text" title={row.title}>{row.title}</span></td><td><Pill tone={riskTone(row.risk)}>{row.risk}</Pill></td><td>{row.person}</td><td>{row.deadline}</td><td className="danger-text">{overdueDays(row)} 天</td><td><Pill tone={followup(row) === "待跟进" ? "neutral" : "info"}>{followup(row)}</Pill></td><td><div className="demo-overdue-actions"><Button variant="ghost" onClick={() => setSelectedId(row.id)}>查看</Button><Button variant="ghost" onClick={() => openAction("催办", [row.id])}>催办</Button><Button variant="ghost" onClick={() => openAction("派发专家", [row.id])}>专家</Button></div></td></tr>)}</tbody></table>{!visible.length && <p className="empty-state">没有匹配的隐患，请调整条件或重置筛选。</p>}</div><p className="demo-overdue-note">演示基准日：2025-05-23 · 操作仅保存演示跟进记录，不发送真实通知。</p></SectionCard>
    <Drawer title="超期隐患详情" open={!!selected} onClose={() => setSelectedId(null)}>{selected && <div className="demo-overdue-detail detail-stack"><h3>{selected.title}</h3><DetailPairs rows={[["隐患编号", selected.id], ["所属项目", selected.project], ["任务名称", selected.taskName], ["现场位置", selected.location || selected.project], ["隐患分类", selected.category], ["风险等级", selected.risk], ["责任单位", selected.unit], ["责任人", selected.person], ["发现时间", selected.foundTime], ["整改期限", selected.deadline], ["当前流程节点", selected.status], ["发现来源", selected.source], ["超期天数", `${overdueDays(selected)} 天`], ["预警类型", warningType(selected)], ["预警级别", severity(selected)], ["跟进状态", followup(selected)], ["复核专家", expertLog?.recipient || "未派发"], ["企业反馈", selected.feedback || selected.company?.note || "待责任单位反馈"], ["整改 / 专家建议", selected.expert?.note || selected.measure]]} />{scene ? <figure><button type="button" className="ph-preview-button" onClick={() => setPreview({ title: `${selected.title}参考场景`, src: scene, type: "image" })}><img src={scene} alt={`${selected.title}参考场景`} /></button><figcaption>参考场景 · 非项目实地证据</figcaption></figure> : <p className="demo-overdue-note">暂无对应参考图片，待补充现场证据。</p>}<section><h3>历史整改 / 复查 / 催办记录（{selectedLogs.length}）</h3><Timeline row={selected} /></section><div className="ph-drawer-actions"><Button variant="secondary" onClick={() => openAction("催办", [selected.id])}>催办</Button><Button onClick={() => openAction("派发专家", [selected.id])}>派发专家</Button><Button variant="secondary" onClick={() => setFlowOpen(true)}>查看流程</Button><Button variant="secondary" onClick={() => openAction("升级预警", [selected.id])}>升级预警</Button><Button variant="ghost" onClick={() => navigate("/hazards/rectification", selected.id)}>打开整改记录</Button></div></div>}</Drawer>
    <Modal title={action?.type === "派发专家" ? "派发专家" : action?.type === "升级预警" ? "升级预警" : actionRows.length > 1 ? "批量催办" : "催办说明"} open={!!action} onClose={() => setAction(null)}><form className="demo-overdue-form" onSubmit={submitAction}><div className="demo-overdue-targets">{actionRows.map(row => <p key={row.id}><strong>{row.title}</strong><span>{row.id} · {row.project}</span><span>责任人：{row.person === "待指派" ? "项目负责人（待指派整改责任人）" : row.person}</span></p>)}</div>{action?.type === "派发专家" && <Field label="选择专家"><select value={expert} onChange={event => setExpert(event.target.value)}><option value="王工">王工 · 电气安全专家</option><option value="赵工">赵工 · 消防安全专家</option><option value="孙工">孙工 · 注册安全工程师</option></select></Field>}<Field label={action?.type === "派发专家" ? "复核要求" : action?.type === "升级预警" ? "升级原因" : "催办说明"}><textarea required maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></Field><p className="demo-overdue-note">提交后更新本条隐患的跟进状态，并保存说明、对象和时间。</p><div className="modal-foot"><Button variant="secondary" onClick={() => setAction(null)}>取消</Button><Button type="submit">{action?.type === "派发专家" ? "确认派发" : action?.type === "升级预警" ? "确认升级" : "发送催办"}</Button></div></form></Modal>
    <Modal title="流程时间线" open={flowOpen && !!selected} onClose={() => setFlowOpen(false)} wide>{selected && <><DetailPairs rows={[["当前流程", selected.status], ["责任人", selected.person], ["整改期限", selected.deadline]]} /><Timeline row={selected} /></>}</Modal><MediaModal preview={preview} close={() => setPreview(null)} />
  </div>;
}

