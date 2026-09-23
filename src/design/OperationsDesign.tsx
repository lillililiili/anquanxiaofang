import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, BookOpen, Building2, CalendarDays,
  Check, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3, FileBarChart2,
  HardHat, LayoutDashboard, MapPin, Menu, PanelLeftClose, Plus, Search, Settings2,
  ShieldCheck, ShieldAlert, Sparkles, TrendingUp, UsersRound, Video, X,
  type LucideIcon
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  designPreviewTasks, designPreviewHazards, designPreviewTrend, designPreviewCategories,
  type DesignPreviewTask, type DesignPreviewHazard
} from "../data/mockData";

const demoDate = "2026-09-20";
type PreviewTask = DesignPreviewTask & { date?: string };
type Detail = { type: "task"; item: PreviewTask } | { type: "hazard"; item: DesignPreviewHazard } | { type: "create" } | null;
const groups: { title: string; items: { label: string; icon: LucideIcon; href: string; current?: boolean }[] }[] = [
  { title: "工作空间", items: [
    { label: "运营工作台", icon: LayoutDashboard, href: "/design-preview.html", current: true },
    { label: "客户与项目", icon: Building2, href: "/customers/enterprise" },
    { label: "检查任务", icon: ClipboardCheck, href: "/tasks" },
  ] },
  { title: "智能检查", items: [
    { label: "安全帽现场端", icon: HardHat, href: "/helmet-live" },
    { label: "大模型中台", icon: Sparkles, href: "/model-center" },
    { label: "隐患闭环", icon: ShieldCheck, href: "/hazards" },
    { label: "远程专家", icon: UsersRound, href: "/expert" },
  ] },
  { title: "分析与管理", items: [
    { label: "报告中心", icon: FileBarChart2, href: "/reports" },
    { label: "风险画像", icon: TrendingUp, href: "/analytics" },
    { label: "设备管理", icon: Video, href: "/devices" },
    { label: "知识与模板", icon: BookOpen, href: "/templates" },
  ] },
];

function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: string }) {
  return <span className={`dp-badge dp-${tone}`}><span aria-hidden="true" />{children}</span>;
}

function Metric({ title, value, unit, icon: Icon, tone, children }: {
  title: string; value: string | number; unit: string; icon: LucideIcon; tone: string; children: ReactNode;
}) {
  return <article className="dp-metric">
    <div className="dp-metric-top"><span>{title}</span><span className={`dp-metric-icon dp-${tone}`}><Icon size={19} strokeWidth={1.7} /></span></div>
    <div className="dp-metric-value">{value}<span>{unit}</span></div>
    <div className="dp-metric-foot">{children}</div>
  </article>;
}

function Dialog({ detail, onClose, onCreate }: { detail: NonNullable<Detail>; onClose: () => void; onCreate: (event: FormEvent<HTMLFormElement>) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const title = detail.type === "create" ? "新建检查任务" : detail.type === "task" ? "检查任务详情" : "疑似隐患详情";
  return <dialog ref={ref} className="dp-dialog" aria-labelledby="dp-dialog-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dp-dialog-head"><div><span className="dp-eyebrow">演示预览</span><h2 id="dp-dialog-title">{title}</h2></div><button className="dp-icon-button" aria-label="关闭详情" onClick={onClose}><X size={20} /></button></div>
    {detail.type === "create" ? <form onSubmit={onCreate} className="dp-create-form">
      <p className="dp-muted">新任务将加入本页演示清单，刷新页面后恢复初始数据。</p>
      <label>任务名称<input name="title" required pattern=".*\S.*" title="请输入至少一个非空白字符" maxLength={48} placeholder="例如：配电室专项检查" autoFocus /></label>
      <div className="dp-form-grid"><label>所属项目<select name="project">{Array.from(new Set(designPreviewTasks.map(t => t.project))).map(p => <option key={p}>{p}</option>)}</select></label><label>检查类型<select name="kind"><option>消防检查</option><option>用电检查</option><option>综合检查</option></select></label></div>
      <label>检查位置<input name="location" required pattern=".*\S.*" title="请输入至少一个非空白字符" maxLength={60} placeholder="例如：1 号楼地下配电室" /></label>
      <div className="dp-form-grid"><label>检查人员<select name="inspector"><option>张三</option><option>李四</option><option>王工</option><option>赵工</option></select></label><label>计划时间<input name="scheduled" type="datetime-local" defaultValue={`${demoDate}T16:00`} required /></label></div>
      <div className="dp-dialog-actions"><button className="dp-button" type="button" onClick={onClose}>取消</button><button className="dp-button dp-primary" type="submit"><Plus size={16} />创建演示任务</button></div>
    </form> : detail.type === "task" ? <div className="dp-detail-body">
      <Badge tone={detail.item.status === "已完成" ? "green" : detail.item.status === "检查中" ? "blue" : "gray"}>{detail.item.status}</Badge>
      <h3>{detail.item.title}</h3><p className="dp-muted">{detail.item.id}</p>
      <dl className="dp-detail-grid"><div><dt>所属项目</dt><dd>{detail.item.project}</dd></div><div><dt>检查位置</dt><dd>{detail.item.location}</dd></div><div><dt>检查人员</dt><dd>{detail.item.inspector}</dd></div><div><dt>检查类型</dt><dd>{detail.item.kind}</dd></div><div><dt>计划时间</dt><dd>{detail.item.date || demoDate} {detail.item.scheduledTime}</dd></div><div><dt>检查进度</dt><dd>{detail.item.progress}%</dd></div></dl>
      <div className="dp-note"><ClipboardCheck size={18} /><p>检查完成后，建议核查识别结果，补充现场证据，并生成检查报告。</p></div>
      <div className="dp-dialog-actions"><button className="dp-button" onClick={onClose}>关闭</button><a className="dp-button dp-primary" href="/tasks">进入任务管理<ArrowRight size={16} /></a></div>
    </div> : <div className="dp-detail-body">
      <img className="dp-evidence" src={detail.item.image} alt={`${detail.item.title}的演示现场证据`} />
      <div className="dp-evidence-caption">现场证据示例 · 演示素材</div><Badge tone={detail.item.risk === "高风险" ? "red" : "orange"}>{detail.item.risk}</Badge>
      <h3>{detail.item.title}</h3><p className="dp-muted">{detail.item.project} · {detail.item.location}</p>
      <dl className="dp-detail-grid"><div><dt>记录编号</dt><dd>{detail.item.id}</dd></div><div><dt>跟进人员</dt><dd>{detail.item.owner}</dd></div></dl>
      <div className="dp-note"><ShieldAlert size={18} /><div><strong>建议核查</strong><p>{detail.item.suggestion}</p></div></div>
      <div className="dp-dialog-actions"><button className="dp-button" onClick={onClose}>关闭</button><a className="dp-button dp-primary" href="/hazards">进入隐患闭环<ArrowRight size={16} /></a></div>
    </div>}
  </dialog>;
}

export default function OperationsDesign() {
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState<PreviewTask[]>(designPreviewTasks);
  const [status, setStatus] = useState("全部任务");
  const [project, setProject] = useState("全部项目");
  const [date, setDate] = useState(demoDate);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Detail>(null);
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState("本周");
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 5000); return () => window.clearTimeout(timer); }, [notice]);
  const todaysTasks = tasks.filter(t => (t.date || demoDate) === demoDate);
  const visibleTasks = tasks.filter(t => (status === "全部任务" || t.status === status) && (project === "全部项目" || t.project === project) && (!date || (t.date || demoDate) === date) && `${t.title} ${t.project} ${t.id} ${t.inspector}`.toLowerCase().includes(query.trim().toLowerCase()));
  const completedToday = todaysTasks.filter(t => t.status === "已完成").length;
  const categoryTotal = designPreviewCategories.reduce((n, c) => n + c.value, 0);
  const liveTrend = designPreviewTrend.map((point, index) => {
    const pointDate = `2026-09-${14 + index}`;
    const extraTasks = tasks.filter(t => t.date === pointDate);
    return { ...point, planned: point.planned + extraTasks.length };
  });
  const weeklyCompleted = liveTrend.reduce((n, c) => n + c.completed, 0);
  const weeklyPlanned = liveTrend.reduce((n, c) => n + c.planned, 0);
  const chartData = period === "本周" ? liveTrend : liveTrend.slice(-3);
  const highRiskCount = designPreviewHazards.filter(h => h.risk === "高风险").length;
  function resetFilters() { setStatus("全部任务"); setProject("全部项目"); setDate(demoDate); setQuery(""); }
  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const location = String(form.get("location") || "").trim();
    if (!title || !location) { setNotice("请填写任务名称和检查位置。"); return; }
    const scheduled = String(form.get("scheduled"));
    const inspector = String(form.get("inspector"));
    const task: PreviewTask = { id: `DEMO-${Date.now()}`, title, location, project: String(form.get("project")), inspector, initials: inspector.slice(0, 1), kind: String(form.get("kind")), scheduledTime: scheduled.slice(11, 16), date: scheduled.slice(0, 10), status: "待执行", progress: 0 };
    setTasks(current => [task, ...current]); resetFilters(); setDate(task.date!); setStatus("待执行"); setDetail(null); setNotice("演示任务已创建，已加入待执行清单。");
  }
  function exportTasks() {
    const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [["任务编号", "任务名称", "项目", "检查人员", "日期", "计划时间", "状态"], ...visibleTasks.map(t => [t.id, t.title, t.project, t.inspector, t.date || demoDate, t.scheduledTime, t.status])];
    const blob = new Blob(["\ufeff" + rows.map(row => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `检查任务-演示-${date || "全部日期"}.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`已导出当前筛选的 ${visibleTasks.length} 条演示任务。`);
  }
  return <div className={`dp-shell${collapsed ? " dp-collapsed" : ""}`}>
    <a className="dp-skip" href="#dp-main">跳转到主要内容</a>
    <aside className="dp-sidebar">
      <a className="dp-brand" href="/design-preview.html" aria-label="国控安全运营工作台"><span className="dp-brand-symbol"><ShieldCheck size={25} strokeWidth={1.7} /></span><span className="dp-brand-copy"><strong>国控安全</strong><span>消防与用电智能检查</span></span></a>
      <div className="dp-workspace"><span className="dp-org-symbol"><Building2 size={16} /></span><span>山东国控企管</span></div>
      <nav aria-label="主导航">{groups.map(group => <div className="dp-nav-group" key={group.title}><p>{group.title}</p>{group.items.map(({ label, icon: Icon, href, current }) => <a key={label} className={`dp-nav-link${current ? " is-active" : ""}`} href={href} aria-current={current ? "page" : undefined} title={label}><Icon size={18} strokeWidth={1.65} /><span>{label}</span>{current && <span className="dp-nav-active-mark" />}</a>)}</div>)}</nav>
      <div className="dp-sidebar-bottom"><a className="dp-nav-link" href="/settings" title="系统设置"><Settings2 size={18} /><span>系统设置</span></a><a className="dp-support" href="/model-center/knowledge"><span className="dp-support-icon"><CircleHelp size={19} /></span><span>需要帮助？<small>查看检查指南与知识库</small></span><ArrowUpRight size={15} /></a><button className="dp-collapse" onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? "展开导航" : "收起导航"}>{collapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}<span>收起导航</span></button></div>
    </aside>
    <div className="dp-body">
      <header className="dp-topbar"><div className="dp-breadcrumb"><LayoutDashboard size={16} /><span>工作空间</span><ChevronRight size={13} /><strong>运营工作台</strong></div><div className="dp-top-actions"><span className="dp-preview-tag">设计预览 V1</span><a className="dp-icon-button dp-notifications" href="/warnings" aria-label="查看预警中心"><Bell size={18} /><i /></a><span className="dp-top-divider" /><a className="dp-profile" href="/settings"><span className="dp-avatar">管</span><span>系统管理员</span><ChevronDown size={13} /></a></div></header>
      <main id="dp-main" className="dp-main">
        <div className="dp-page-heading"><div><div className="dp-title-row"><h1>运营工作台</h1><span className="dp-demo-label">演示数据</span></div><p>聚焦今日检查，跟进每一项安全风险。</p></div><div className="dp-heading-actions"><span className="dp-date"><CalendarDays size={15} />2026 年 9 月 20 日 · 周日</span><button className="dp-button dp-primary" onClick={() => setDetail({ type: "create" })}><Plus size={16} />新建检查任务</button></div></div>
        <section className="dp-metrics" aria-label="运营关键指标">
          <Metric title="今日检查任务" value={String(todaysTasks.length).padStart(2, "0")} unit="项" icon={ClipboardCheck} tone="blue"><span><span className="dp-text-green">{completedToday} 项</span>已完成</span><span>{todaysTasks.filter(t => t.status === "检查中").length} 项检查中</span></Metric>
          <Metric title="待跟进疑似隐患" value={categoryTotal} unit="项" icon={ShieldAlert} tone="orange"><span><span className="dp-text-red">{designPreviewHazards.length} 项</span>重点关注</span><a href="#dp-priority">查看详情<ArrowUpRight size={13} /></a></Metric>
          <Metric title="在线安全帽" value="28" unit="/ 36 顶" icon={HardHat} tone="green"><span><i className="dp-live-dot" />设备在线率 77.8%</span><a href="/devices">管理设备<ArrowUpRight size={13} /></a></Metric>
          <Metric title="本周任务完成率" value={Math.round(weeklyCompleted / weeklyPlanned * 100)} unit="%" icon={TrendingUp} tone="blue"><span>已完成 {weeklyCompleted} / {weeklyPlanned} 项</span><span className="dp-mini-progress"><i style={{ width: `${weeklyCompleted / weeklyPlanned * 100}%` }} /></span></Metric>
        </section>
        <div className="dp-attention"><span className="dp-attention-icon"><ShieldAlert size={17} /></span><p><strong>{highRiskCount} 项高风险疑似隐患待核查</strong><span>建议优先安排现场核查与专家复核。</span></p><button onClick={() => setDetail({ type: "hazard", item: designPreviewHazards.find(h => h.risk === "高风险") || designPreviewHazards[0] })}>立即查看<ArrowRight size={15} /></button></div>
        <section className="dp-chart-grid" aria-label="检查趋势与隐患分布">
          <article className="dp-card dp-trend-card"><div className="dp-card-heading"><div><h2>检查任务趋势</h2><p>9 月 {period === "本周" ? "14" : "18"} 日—20 日</p></div><div className="dp-segmented" role="group" aria-label="趋势时间范围">{["本周", "近三日"].map(p => <button key={p} aria-pressed={period === p} className={period === p ? "is-selected" : ""} onClick={() => setPeriod(p)}>{p}</button>)}</div></div>
            <div className="dp-chart-legend"><span><i style={{ background: "#3874ec" }} />已完成</span><span><i style={{ background: "#b9c8e1" }} />计划任务</span><span className="dp-chart-unit">单位：项</span></div>
            <div className="dp-area-chart" role="img" aria-label={`${period}检查任务趋势，完成 ${chartData.reduce((sum, row) => sum + row.completed, 0)} 项，计划 ${chartData.reduce((sum, row) => sum + row.planned, 0)} 项`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 9, right: 12, left: -22, bottom: 0 }}><defs><linearGradient id="dp-completed-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3874ec" stopOpacity={0.18} /><stop offset="100%" stopColor="#3874ec" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f5" strokeDasharray="3 4" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#8692a3", fontSize: 11 }} dy={7} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#8692a3", fontSize: 11 }} tickCount={4} /><Tooltip contentStyle={{ border: "1px solid #e7ebf2", borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="planned" name="计划任务" stroke="#b9c8e1" strokeWidth={2} strokeDasharray="4 4" fill="transparent" isAnimationActive={false} /><Area type="monotone" dataKey="completed" name="已完成" stroke="#3874ec" strokeWidth={2.5} fill="url(#dp-completed-fill)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
          </article>
          <article className="dp-card dp-distribution-card"><div className="dp-card-heading"><div><h2>疑似隐患分布</h2><p>当前待跟进事项 · 按类型统计</p></div><a className="dp-text-link" href="/analytics" aria-label="查看风险画像"><ArrowUpRight size={18} /></a></div><div className="dp-distribution"><div className="dp-donut" role="img" aria-label={designPreviewCategories.map(c => `${c.name}${c.value}项`).join("，")}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={designPreviewCategories} dataKey="value" innerRadius="72%" outerRadius="94%" paddingAngle={4} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>{designPreviewCategories.map(c => <Cell key={c.name} fill={c.color} />)}</Pie></PieChart></ResponsiveContainer><div className="dp-donut-label"><strong>{categoryTotal}</strong><span>待跟进隐患</span></div></div><div className="dp-category-list">{designPreviewCategories.map(c => <div key={c.name}><span><i style={{ background: c.color }} />{c.name}</span><strong>{c.value}<small>项</small></strong></div>)}</div></div><a className="dp-closure-flow" href="/hazards"><ShieldCheck size={15} /><span>智能识别<ChevronRight size={11} />现场核查<ChevronRight size={11} />整改复查<ChevronRight size={11} />销号归档</span><ArrowUpRight size={14} /></a></article>
        </section>
        <section className="dp-work-grid" aria-label="任务与优先核查事项">
          <article className="dp-card dp-tasks-card"><div className="dp-card-heading"><div className="dp-inline-title"><h2>检查任务</h2><span className="dp-count">{tasks.length}</span></div><button className="dp-text-link" onClick={exportTasks}><ArrowDownToLine size={15} />导出清单</button></div>
            <div className="dp-task-tabs" role="group" aria-label="任务状态">{["全部任务", "待执行", "检查中", "已完成"].map(s => <button key={s} aria-pressed={status === s} className={status === s ? "is-selected" : ""} onClick={() => setStatus(s)}>{s}<span>{tasks.filter(t => (s === "全部任务" || t.status === s) && (!date || (t.date || demoDate) === date)).length}</span></button>)}</div>
            <div className="dp-task-filters"><label className="dp-search"><Search size={15} /><input aria-label="搜索检查任务" value={query} placeholder="搜索任务、人员" onChange={e => setQuery(e.target.value)} /></label><select aria-label="筛选项目" value={project} onChange={e => setProject(e.target.value)}><option>全部项目</option>{Array.from(new Set(tasks.map(t => t.project))).map(p => <option key={p}>{p}</option>)}</select><input type="date" aria-label="筛选任务日期" value={date} onChange={e => setDate(e.target.value)} /><button className="dp-text-link" onClick={resetFilters}>重置</button></div>
            <div className="dp-table-scroll"><table><caption className="dp-sr-only">检查任务清单</caption><colgroup><col style={{ width: "36%" }} /><col style={{ width: "18%" }} /><col style={{ width: "13%" }} /><col style={{ width: "18%" }} /><col style={{ width: "15%" }} /></colgroup><thead><tr><th scope="col">任务 / 所属项目</th><th scope="col">检查人员</th><th scope="col">计划时间</th><th scope="col">任务状态</th><th scope="col">操作</th></tr></thead><tbody>{visibleTasks.map(t => <tr key={t.id}><td><span className="dp-task-name" title={t.title}>{t.title}</span><span className="dp-task-project" title={`${t.project} · ${t.location}`}>{t.project} · {t.location}</span></td><td><span className="dp-inspector"><span className="dp-person-avatar">{t.initials}</span>{t.inspector}</span></td><td className="dp-tabular">{t.scheduledTime}</td><td><Badge tone={t.status === "已完成" ? "green" : t.status === "检查中" ? "blue" : "gray"}>{t.status}</Badge></td><td><button className="dp-text-link" aria-label={`查看${t.title}`} onClick={() => setDetail({ type: "task", item: t })}>查看<ChevronRight size={13} /></button></td></tr>)}</tbody></table>{visibleTasks.length === 0 && <div className="dp-empty"><Search size={28} /><strong>暂无符合条件的任务</strong><p>试试更换项目、日期或搜索关键词。</p><button className="dp-button" onClick={resetFilters}>重置筛选</button></div>}</div><div className="dp-table-footer"><span>显示 {visibleTasks.length} 条任务 · 演示清单</span><a className="dp-text-link" href="/tasks">进入任务管理<ArrowRight size={14} /></a></div>
          </article>
          <article className="dp-card dp-priority-card" id="dp-priority"><div className="dp-card-heading"><div className="dp-inline-title"><h2>优先核查</h2><span className="dp-count dp-count-warm">{designPreviewHazards.length}</span></div><a className="dp-text-link" href="/hazards">全部<ChevronRight size={14} /></a></div><p className="dp-priority-subtitle">及时跟进重点疑似隐患</p><div className="dp-priority-list">{designPreviewHazards.map(h => <button key={h.id} className="dp-risk-item" onClick={() => setDetail({ type: "hazard", item: h })}><div className="dp-risk-top"><Badge tone={h.risk === "高风险" ? "red" : "orange"}>{h.risk}</Badge><span><Clock3 size={12} />{h.dueLabel}</span></div><div className="dp-risk-content"><img src={h.image} alt={h.title} /><div><h3>{h.title}</h3><p><MapPin size={12} />{h.project}</p><span>查看证据与核查建议<ArrowRight size={12} /></span></div></div></button>)}</div><div className="dp-expert-strip"><span><UsersRound size={18} /></span><div><strong>让专业判断回到现场</strong><p>远程专家协同，辅助隐患核查</p></div><a href="/expert" aria-label="进入远程专家端"><ArrowUpRight size={19} /></a></div></article>
        </section>
        <footer className="dp-page-footer"><span><ShieldCheck size={13} />山东省国控企业管理有限公司</span><span>消防与用电安全智能检查服务平台 · 交互设计预览</span><a href="/">返回当前系统<ArrowUpRight size={13} /></a></footer>
      </main>
    </div>
    {detail && <Dialog key={detail.type} detail={detail} onClose={() => setDetail(null)} onCreate={createTask} />}
    {notice && <div className="dp-toast" role="status"><Check size={17} />{notice}<button onClick={() => setNotice("")} aria-label="关闭通知"><X size={15} /></button></div>}
  </div>;
}
