import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpRight, ChartNoAxesCombined, Plus, ShieldAlert, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { operationsPeriod, operationsProjects } from "../../data/mockData";
import type { OperationWarning, OperationsState } from "../../data/operationsData";
import { downloadCsv, RMBadge, RMEmpty, RMHeader, RMPanel, RMProgress, RMStats, RMTable } from "../resources/ResourceUI";
import { useOperationsStore } from "./operationsStore";
import { WarningsPage } from "./WarningsPage";
import { ReportsPage } from "./ReportsPage";
import "./operations.css";

export type OperationsPage = "analytics" | "warnings" | "reports";
export type OperationsContext = { data: OperationsState; save: (value: OperationsState) => void; notify: (message: string) => void };
export type OperationsFilter = { project: string; start: string; end: string };
export const defaultFilter: OperationsFilter = { project: "全部项目", ...operationsPeriod };
export const riskColors = ["var(--risk-red-text)", "var(--risk-orange-text)", "var(--risk-green-text)"];

export function OperationsDialog({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="rm-dialog op-dialog" aria-labelledby={id} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><header><div><span className="rm-eyebrow">安全运营 · 演示数据</span><h2 id={id}>{title}</h2></div><button className="rm-icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={18} /></button></header><div className="rm-dialog-body">{children}</div>{footer && <footer className="rm-actions">{footer}</footer>}</dialog>;
}
export function FilterBar({ value, onChange, children, dateLabel = "触发日期" }: { value: OperationsFilter; onChange: (value: OperationsFilter) => void; children?: ReactNode; dateLabel?: string }) {
  return <div className="op-filters"><label className="rm-field">项目范围<select aria-label="项目范围" value={value.project} onChange={e => onChange({ ...value, project: e.target.value })}><option>全部项目</option>{operationsProjects.map(p => <option key={p}>{p}</option>)}</select></label><label className="rm-field">{dateLabel}起<input type="date" aria-label={`${dateLabel}起`} value={value.start} max={value.end || undefined} onChange={e => onChange({ ...value, start: e.target.value })} /></label><label className="rm-field">{dateLabel}止<input type="date" aria-label={`${dateLabel}止`} value={value.end} min={value.start || undefined} onChange={e => onChange({ ...value, end: e.target.value })} /></label>{children}<button className="rm-button" onClick={() => onChange({ ...defaultFilter })}>重置筛选</button>{value.start && value.end && value.start > value.end && <p className="rm-text-red">开始日期不能晚于结束日期</p>}</div>;
}
export function matchesFilter(row: { project: string; date: string }, filter: OperationsFilter) {
  return (filter.project === "全部项目" || row.project === filter.project) && (!filter.start || row.date >= filter.start) && (!filter.end || row.date <= filter.end);
}
export function exportWarnings(rows: OperationWarning[], name = "预警台账") {
  downloadCsv(`${name}.csv`, ["预警编号", "疑似隐患", "项目", "类型", "风险", "触发日期", "处置期限", "责任人", "预警状态"], rows.map(w => [w.id, w.title, w.project, w.category, w.risk, w.date, w.deadline, w.owner, w.status]));
}
export function Pager({ count, page, onChange, size = 8 }: { count: number; page: number; onChange: (page: number) => void; size?: number }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return <div className="op-pager"><span>共 {count} 条 · 每页 {size} 条</span><div className="rm-actions"><button className="rm-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>上一页</button><span>{page} / {pages}</span><button className="rm-button" disabled={page >= pages} onClick={() => onChange(page + 1)}>下一页</button></div></div>;
}
export default function OperationsModules({ page, navigate, notify }: { page: OperationsPage; navigate: (page: OperationsPage) => void; notify: (message: string) => void }) {
  const { data, save, error } = useOperationsStore();
  const [filter, setFilter] = useState<OperationsFilter>({ ...defaultFilter });
  const [warningFocus, setWarningFocus] = useState<string | null>(null);
  const [reportProject, setReportProject] = useState<string | null>(null);
  const context = { data, save, notify };
  const openWarnings = (project: string, id?: string) => { setFilter(f => ({ ...f, project })); setWarningFocus(id || null); navigate("warnings"); };
  return <section className="rm-page op-page">
    {page === "analytics" && <AnalyticsPage context={context} filter={filter} setFilter={setFilter} openWarnings={openWarnings} openReport={() => { setReportProject(filter.project === "全部项目" ? operationsProjects[0] : filter.project); navigate("reports"); }} />}
    {page === "warnings" && <WarningsPage context={context} filter={filter} setFilter={setFilter} focusId={warningFocus} clearFocus={() => setWarningFocus(null)} />}
    {page === "reports" && <ReportsPage context={context} initialProject={reportProject} clearInitial={() => setReportProject(null)} />}
    <p className={`op-data-note ${error ? "rm-text-red" : ""}`}>{error || "演示数据 · 本机保存 · 统计基于当前筛选台账；预警处置不等同于隐患销号"}</p>
  </section>;
}
function AnalyticsPage({ context: { data, notify }, filter, setFilter, openWarnings, openReport }: { context: OperationsContext; filter: OperationsFilter; setFilter: (f: OperationsFilter) => void; openWarnings: (project: string, id?: string) => void; openReport: () => void }) {
  const [dimension, setDimension] = useState("风险等级");
  const [trendView, setTrendView] = useState("全部类型");
  const rows = data.warnings.filter(w => matchesFilter(w, filter));
  const active = rows.filter(w => w.status !== "已处理");
  const completed = rows.length - active.length;
  const rate = rows.length ? Math.round(completed / rows.length * 100) : 0;
  const trendRows = rows.filter(w => trendView === "全部类型" || w.category === trendView);
  const trend = [...new Set(trendRows.map(w => w.date))].sort().map(date => ({ date: date.slice(5), 新增预警: trendRows.filter(w => w.date === date).length, 已处理: trendRows.filter(w => w.date === date && w.status === "已处理").length }));
  const distribution = (dimension === "风险等级" ? ["高风险", "中风险", "低风险"] : ["用电安全", "消防安全"]).map((name, index) => ({ name, value: rows.filter(w => (dimension === "风险等级" ? w.risk : w.category) === name).length, color: dimension === "风险等级" ? riskColors[index] : ["var(--accent-blue)", "var(--risk-green-text)"][index] }));
  const ranking = operationsProjects.filter(project => filter.project === "全部项目" || project === filter.project).map(project => {
    const list = rows.filter(w => w.project === project); const high = list.filter(w => w.risk === "高风险" && w.status !== "已处理").length;
    return { project, total: list.length, high, active: list.filter(w => w.status !== "已处理").length, rate: list.length ? list.filter(w => w.status === "已处理").length / list.length * 100 : 0 };
  }).filter(r => r.total > 0).sort((a, b) => b.high - a.high || b.active - a.active);
  const attention = [...active].sort((a, b) => ["高风险", "中风险", "低风险"].indexOf(a.risk) - ["高风险", "中风险", "低风险"].indexOf(b.risk) || a.deadline.localeCompare(b.deadline)).slice(0, 3);
  const chartTooltip = { backgroundColor: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: 6, color: "var(--text-primary)", boxShadow: "0 4px 16px rgba(20, 40, 63, .08)" };
  return <>
    <RMHeader eyebrow="智能分析 / 数据看板" title="安全运营总览" description="从风险发现到预警处置，掌握各项目的安全运营进展。" actions={<><button className="rm-button" onClick={() => { exportWarnings(rows, "数据看板明细"); notify("已导出当前筛选的统计明细"); }}><ArrowDownToLine size={16} />导出明细</button><button className="rm-button rm-primary" onClick={openReport}><Plus size={16} />生成报告</button></>} />
    <FilterBar value={filter} onChange={setFilter} />
    <RMStats items={[
      { label: "纳入统计的预警", value: rows.length, hint: `覆盖 ${new Set(rows.map(w => w.project)).size} 个项目`, tone: "blue" },
      { label: "高风险待处置", value: active.filter(w => w.risk === "高风险").length, hint: "建议优先安排现场核查", tone: "red", onClick: () => openWarnings(filter.project) },
      { label: "当前待处置", value: active.length, hint: `待响应 ${active.filter(w => w.status === "待响应").length} · 处理中 ${active.filter(w => w.status === "处理中").length}`, tone: "orange", onClick: () => openWarnings(filter.project) },
      { label: "预警处置率", value: `${rate}%`, hint: `已处理 ${completed} / 共 ${rows.length} 项`, tone: "green" },
    ]} />
    <div className="op-chart-grid"><RMPanel title="预警发现与处置趋势" subtitle="按触发日期分组，展示当前处置状态" actions={<select aria-label="趋势类型" value={trendView} onChange={e => setTrendView(e.target.value)}>{["全部类型", "用电安全", "消防安全"].map(v => <option key={v}>{v}</option>)}</select>}>
      <div className="op-chart-legend"><span><i style={{ background: "var(--accent-blue)" }} />新增预警</span><span><i style={{ background: "var(--risk-green-text)" }} />已处理</span><small>单位：项</small></div>
      <div className="op-chart">{!trend.length ? <RMEmpty text="当前范围暂无趋势数据" /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 15, right: 24, bottom: 5, left: -20 }}><defs><linearGradient id="op-trend-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={.18} /><stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--border-default)" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="date" tick={{ fill: "var(--text-secondary-dark)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--text-secondary-dark)", fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={chartTooltip} /><Area type="monotone" dataKey="新增预警" stroke="var(--accent-blue)" fill="url(#op-trend-gradient)" strokeWidth={2} isAnimationActive={false} /><Area type="monotone" dataKey="已处理" stroke="var(--risk-green-text)" fill="transparent" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer>}</div>
    </RMPanel><RMPanel title="疑似隐患分布" subtitle={`当前范围共 ${rows.length} 项记录`} actions={<select aria-label="分布维度" value={dimension} onChange={e => setDimension(e.target.value)}><option>风险等级</option><option>隐患类型</option></select>}>
      {!rows.length ? <div className="op-donut-empty"><RMEmpty text="当前范围暂无分布数据" /></div> : <><div className="op-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" innerRadius={62} outerRadius={87} paddingAngle={4} stroke="none" isAnimationActive={false}>{distribution.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={chartTooltip} /></PieChart></ResponsiveContainer><div className="op-donut-center"><strong>{rows.length}</strong><span>疑似隐患</span></div></div><div className="op-distribution">{distribution.map(item => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{item.value}</b><small>{Math.round(item.value / rows.length * 100)}%</small></div>)}</div></>}
    </RMPanel></div>
    <div className="op-bottom-grid"><RMPanel title="项目风险关注排行" subtitle="按未处理高风险数量、待处置总数排序">
      <RMTable rows={ranking} rowKey={r => r.project} columns={[
        { key: "project", label: "项目名称", width: "32%", render: r => <span className="rm-ellipsis" title={r.project}>{r.project}</span> },
        { key: "total", label: "预警总数", width: "13%", render: r => r.total },
        { key: "high", label: "高风险待处置", width: "18%", render: r => <span className={r.high ? "rm-text-red" : ""}>{r.high}</span> },
        { key: "rate", label: "处置率", width: "22%", render: r => <RMProgress value={r.rate} /> },
        { key: "action", label: "操作", width: "15%", render: r => <button className="rm-link" onClick={() => openWarnings(r.project)}>查看预警<ArrowUpRight size={13} /></button> },
      ]} />
    </RMPanel><RMPanel title="优先关注" subtitle="未处理记录 · 按风险与期限排序" actions={<ShieldAlert size={18} color="var(--risk-orange-text)" />}><div className="op-attention">{attention.length ? attention.map(w => <button key={w.id} onClick={() => openWarnings(w.project, w.id)}><div className="op-attention-head"><RMBadge>{w.risk}</RMBadge><ArrowUpRight size={15} /></div><span>{w.title}</span><small>{w.project} · {w.deadline} 前处置</small></button>) : <RMEmpty text="当前范围暂无待处置预警" />}</div><div className="op-insight"><ChartNoAxesCombined size={17} /><span>项目排行仅供检查服务安排参考，建议结合现场情况评估。</span></div></RMPanel></div>
  </>;
}
