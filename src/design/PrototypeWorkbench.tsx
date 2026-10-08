import { useState, type ReactNode } from "react";
import { ArrowRight, Bell, ClipboardCheck, Cpu, RefreshCw } from "lucide-react";
import { useResources } from "../features/resources/ResourceContext";
import { useOperationsStore } from "../features/operations/operationsStore";
import { readPrototypeTasks } from "./PrototypeTaskHelmet";
import { Button, Field, Pill, SectionCard, toneFor } from "./PrototypeUI";

type Todo = { id: string; title: string; project: string; group: string; kind: string; status: string; owner: string; note: string; path: string; risk: string };
export default function PrototypeWorkbench({ navigate, children }: { navigate: (path: string, id?: string) => void; children: ReactNode }) {
  const { state } = useResources();
  const { data } = useOperationsStore();
  const [tasks, setTasks] = useState(() => readPrototypeTasks());
  const [kind, setKind] = useState("全部待办");
  const [project, setProject] = useState("全部项目");
  const [search, setSearch] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [updated, setUpdated] = useState("");
  const todos: Todo[] = [
    ...data.warnings.filter(w => w.status !== "已处理").map(w => ({ id: w.id, title: w.title, project: w.project, group: "项目预警", kind: "预警处置", status: w.status, owner: w.owner, note: `处置期限 ${w.deadline}`, path: "/warnings", risk: w.risk })),
    ...tasks.filter(t => t.status !== "已完成").map(t => ({ id: t.id, title: t.name, project: t.project, group: t.name, kind: "检查任务", status: t.status, owner: t.inspector, note: `${t.date} ${t.time} · ${t.device}`, path: "/tasks", risk: t.priority === "高" ? "高风险" : "中风险" })),
    ...state.devices.filter(d => d.status !== "在线" || (d.powerSource !== "市电" && d.battery <= 20)).map(d => {
      const task = tasks.find(t => t.device === d.name && t.status !== "已完成");
      return { id: d.id, title: d.name, project: state.projects.find(p => p.id === d.projectId)?.name || "未分配项目", group: task?.name || "设备维护", kind: "设备待办", status: d.status === "在线" ? "低电量" : d.status, owner: d.user, note: d.status === "离线" ? `最后在线 ${d.lastSeen}` : `电量 ${d.battery}% · 建议检查设备状态`, path: "/devices", risk: "中风险" };
    })
  ];
  const base = todos.filter(t => (project === "全部项目" || t.project === project) && [t.title, t.project, t.owner, t.id].join(" ").includes(search.trim()));
  const rows = base.filter(t => kind === "全部待办" || t.kind === kind);
  const groups = grouped ? [...new Set(rows.map(r => `${r.project} / ${r.group}`))] : ["全部待办"];
  return <div className="page-stack premium-workbench">
    <section className="workbench-hero"><div><span className="premium-kicker">YOUR SAFETY WORKSPACE</span><h1>运营工作台</h1><p>先处理重要的事，再掌握全局。</p><div className="hero-status"><i /> 本地演示工作空间 <span>·</span> {updated ? `已重新读取 ${updated}` : "任务、设备与预警集中管理"}</div></div><div className="hero-actions"><Button variant="secondary" icon={RefreshCw} onClick={() => { setTasks(readPrototypeTasks()); setUpdated(new Date().toLocaleTimeString("zh-CN")); }}>刷新工作台</Button><Button icon={ClipboardCheck} onClick={() => navigate("/tasks")}>检查任务 <ArrowRight size={15} /></Button></div></section>
    <section className="workbench-priorities" aria-label="待办分类">{[["全部待办", ClipboardCheck], ["预警处置", Bell], ["设备待办", Cpu], ["检查任务", ClipboardCheck]].map(([name, Icon]) => { const label = name as string; const I = Icon as typeof Bell; return <button key={label} aria-pressed={kind === label} className={kind === label ? "active" : ""} onClick={() => setKind(label)}><span><I size={18} />{label}</span><strong>{label === "全部待办" ? base.length : base.filter(t => t.kind === label).length}</strong><small>{label === "预警处置" ? "优先核查高风险记录" : label === "设备待办" ? "离线、维护与低电量" : label === "检查任务" ? "派发、执行与复查" : "当前范围内待跟进事项"}</small></button>; })}</section>
    <SectionCard eyebrow="PRIORITY QUEUE" title="我的待办" action={<label className="group-switch"><input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} />按检查任务 / 项目分组</label>}>
      <div className="workbench-filters"><Field label="搜索待办"><input placeholder="事项、编号、项目或责任人" value={search} onChange={e => setSearch(e.target.value)} /></Field><Field label="项目范围"><select value={project} onChange={e => setProject(e.target.value)}><option>全部项目</option>{[...new Set(todos.map(t => t.project))].map(p => <option key={p}>{p}</option>)}</select></Field><Button variant="secondary" onClick={() => { setKind("全部待办"); setProject("全部项目"); setSearch(""); }}>重置筛选</Button></div>
      <div className="active-filter-summary" aria-live="polite"><strong>{rows.length} 项待办</strong><span>{kind} · {project}{search && ` · 搜索：${search}`}</span></div>
      <div className="workbench-queue">{rows.length ? groups.map(group => <div key={group} className="todo-group">{grouped && <h3>{group}<span>{rows.filter(t => `${t.project} / ${t.group}` === group).length} 项</span></h3>}{rows.filter(t => !grouped || `${t.project} / ${t.group}` === group).map(t => <article key={t.id}><span className={`todo-icon ${t.kind === "预警处置" ? "warning" : ""}`}>{t.kind === "预警处置" ? <Bell size={18} /> : t.kind === "设备待办" ? <Cpu size={18} /> : <ClipboardCheck size={18} />}</span><div className="todo-title"><strong>{t.title}</strong><small>{t.id} · {t.project}</small></div><div className="todo-context"><span>{t.owner} · {t.kind}</span><small>{t.note}</small></div><Pill tone={toneFor(t.status)}>{t.status}</Pill><Button variant="ghost" onClick={() => navigate(t.path, t.id)}>去处理 <ArrowRight size={14} /></Button></article>)}</div>) : <p className="premium-empty">当前条件下没有待办，可调整或重置筛选。</p>}</div>
    </SectionCard>
    <div className="premium-shortcuts">{[["devices", "设备运行档案", "在线状态、维护与设备绑定", "/devices"], ["region", "项目检查档案", "检查点位与服务进展", "/projects"], ["knowledge", "专家知识库", "检查依据与经验沉淀", "/model-center/knowledge"]].map(([image, title, desc, path]) => <button key={image} style={{ backgroundImage: `linear-gradient(90deg,#f4f8fbee 30%,#f4f8fb00),url(/design-assets/${image}-v3.png)` }} onClick={() => navigate(path)}><span>{title}</span><small>{desc}</small><ArrowRight size={19} /></button>)}</div>
    <details className="workbench-overview"><summary>风险总览与现场证据<span>展开查看统计、隐患流转与现场证据</span></summary>{children}</details>
  </div>;
}
