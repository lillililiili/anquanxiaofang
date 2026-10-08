import PrototypeAccounts from "./PrototypeAccounts";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Bell, BellRing, Check, ChevronLeft, ChevronRight, Download, FileClock, Info, Plus, Save, Search, Settings2, ShieldCheck, UsersRound, X } from "lucide-react";
import { defaultSystemParameters } from "../data/mockData";
import { makeId, useResources } from "../features/resources/ResourceContext";
import { downloadCsv } from "../features/resources/ResourceUI";
import { isSystemParameters } from "../features/resources/resourceValidation";
import type { ResourceLog, ResourceRole, ResourceRule, SystemParameters } from "../features/resources/resourceTypes";
import "./theme-prototype-settings.css";

const tabs = [
  { id: "accounts", label: "账号与权限", description: "成员与角色范围", icon: UsersRound },
  { id: "notifications", label: "通知策略", description: "触发条件与接收人", icon: Bell },
  { id: "parameters", label: "系统参数", description: "基础信息与默认值", icon: Settings2 },
  { id: "audit", label: "审计日志", description: "操作记录与追溯", icon: FileClock },
] as const;
type SettingsTab = typeof tabs[number]["id"];
const triggers: Record<string, { unit: string; max: number; describe: (n: number) => string }> = {
  整改期限临近: { unit: "小时", max: 720, describe: n => `距整改期限不超过 ${n} 小时且尚未闭环` },
  设备持续离线: { unit: "分钟", max: 1440, describe: n => `设备持续离线达到 ${n} 分钟` },
  服务期限临近: { unit: "天", max: 365, describe: n => `距服务结束日期不超过 ${n} 天` },
  待复核事项积压: { unit: "项", max: 1000, describe: n => `待专家复核事项达到 ${n} 项` },
};

function Panel({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="ps-panel"><header className="ps-panel-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions && <div className="ps-actions">{actions}</div>}</header>{children}</section>;
}
function Badge({ enabled }: { enabled: boolean }) { return <span className={`ps-badge ${enabled ? "enabled" : "disabled"}`}>{enabled ? "已启用" : "已停用"}</span>; }
function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className="ps-dialog" ref={ref} aria-labelledby={id} onCancel={onClose}><header><div><span className="eyebrow">SYSTEM SETTINGS</span><h2 id={id}>{title}</h2></div><button type="button" className="ps-icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={20} /></button></header>{children}</dialog>;
}
function Empty({ text = "暂无符合条件的记录" }: { text?: string }) { return <div className="ps-empty"><Search size={26} /><p>{text}</p><span>请调整筛选条件后重试</span></div>; }

function NotificationPreview({ rule }: { rule: ResourceRule }) {
  const { state } = useResources();
  const role = state.roles.find(item => item.id === rule.recipientRoleId);
  const recipients = state.members.filter(member => member.status === "启用" && member.roleId === rule.recipientRoleId);
  return <div className="ps-notification-preview"><div className="ps-preview-label"><BellRing size={17} />站内提醒预览<span>演示</span></div><h3>{rule.name || "未命名规则"}</h3><p>{triggers[rule.trigger]?.describe(rule.threshold) || rule.trigger}时，提醒{role?.name || "所选角色"}跟进处理。</p><dl><dt>接收成员</dt><dd>{recipients.map(item => item.name).join("、") || "暂无启用成员"}</dd><dt>规则状态</dt><dd>{rule.enabled ? "已启用" : "已停用 · 不参与提醒"}</dd></dl></div>;
}

function RuleEditor({ rule, isNew, onClose, onSaved }: { rule: ResourceRule; isNew: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const { state, change } = useResources();
  const [draft, setDraft] = useState({ ...rule }); const [error, setError] = useState("");
  const config = triggers[draft.trigger];
  const currentRule = state.rules.find(item => item.id === rule.id);
  const externalChange = !isNew && JSON.stringify(currentRule) !== JSON.stringify(rule);
  function submit(event: FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name || name.length > 30) return setError("请填写 1–30 字的规则名称。");
    if (state.rules.some(item => item.id !== draft.id && item.name === name)) return setError("已有同名规则，请使用不同的名称。");
    if (!config || !Number.isInteger(draft.threshold) || draft.threshold < 1 || draft.threshold > config.max) return setError(`触发阈值需为 1–${config?.max || 720} 的整数。`);
    if (!state.roles.some(item => item.id === draft.recipientRoleId)) return setError("请选择有效的接收角色。");
    if (draft.enabled && !state.members.some(item => item.roleId === draft.recipientRoleId && item.status === "启用")) return setError("该角色暂无启用成员，请更换接收角色或将规则设为停用。");
    if (externalChange) return setError("此规则已在另一页面更新，请关闭后重新编辑最新规则。");
    const next = { ...draft, name };
    const detail = `${name}；${triggers[next.trigger].describe(next.threshold)}；${state.roles.find(item => item.id === next.recipientRoleId)?.name}；${next.enabled ? "启用" : "停用"}`;
    change(`系统管理 / ${isNew ? "新增" : "保存"}通知规则`, detail, current => ({ ...current, rules: isNew ? [...current.rules, next] : current.rules.map(item => item.id === next.id ? next : item) }));
    onSaved(`已${isNew ? "新增" : "保存"}“${name}”的演示规则`); onClose();
  }
  return <Dialog title={isNew ? "新增通知规则" : "编辑通知规则"} onClose={onClose}><form onSubmit={submit} noValidate><div className="ps-dialog-body">
    <div className="ps-form-grid"><label className="ps-field ps-span"><span>规则名称</span><input maxLength={30} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="请输入规则名称" autoFocus /></label>
      <label className="ps-field"><span>触发条件</span><select value={draft.trigger} onChange={e => setDraft({ ...draft, trigger: e.target.value, threshold: Math.min(draft.threshold, triggers[e.target.value].max) })}>{Object.keys(triggers).map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="ps-field"><span>触发阈值（{config?.unit || "数值"}）</span><input type="number" min={1} max={config?.max} step={1} value={draft.threshold || ""} onChange={e => setDraft({ ...draft, threshold: Number(e.target.value) })} /><small>支持 1–{config?.max} {config?.unit}</small></label>
      <label className="ps-field"><span>接收角色</span><select value={draft.recipientRoleId} onChange={e => setDraft({ ...draft, recipientRoleId: e.target.value })}>{state.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="ps-field"><span>规则状态</span><select value={draft.enabled ? "启用" : "停用"} onChange={e => setDraft({ ...draft, enabled: e.target.value === "启用" })}><option>启用</option><option>停用</option></select></label></div>
    <NotificationPreview rule={draft} /><p className="ps-note">仅保存和预览演示规则，不触发真实消息发送。</p>{error && <p className="ps-error" role="alert">{error}</p>}
    </div><footer className="ps-dialog-foot"><button type="button" className="ps-button" onClick={onClose}>取消</button><button className="ps-button primary" type="submit"><Save size={15} />保存规则</button></footer></form></Dialog>;
}

function Notifications({ onSaved }: { onSaved: (message: string) => void }) {
  const { state, change } = useResources();
  const [keyword, setKeyword] = useState(""); const [status, setStatus] = useState("全部状态");
  const [editing, setEditing] = useState<{ rule: ResourceRule; isNew: boolean } | null>(null);
  const [preview, setPreview] = useState<ResourceRule | null>(null);
  const [error, setError] = useState("");
  const rows = state.rules.filter(rule => `${rule.name} ${rule.trigger}`.includes(keyword.trim()) && (status === "全部状态" || rule.enabled === (status === "已启用")));
  function toggle(rule: ResourceRule) {
    if (!rule.enabled && !state.members.some(item => item.roleId === rule.recipientRoleId && item.status === "启用")) { setError("该规则暂无可接收提醒的启用成员，请先编辑接收角色。"); return; }
    change(`系统管理 / ${rule.enabled ? "停用" : "启用"}通知规则`, rule.name, current => ({ ...current, rules: current.rules.map(item => item.id === rule.id ? { ...item, enabled: !rule.enabled } : item) }));
    setError(""); onSaved(`${rule.name}已${rule.enabled ? "停用" : "启用"}`);
  }
  return <><div className="ps-stats"><div><span>通知规则</span><strong>{state.rules.length}<small>项</small></strong></div><div><span>已启用</span><strong className="ps-green">{state.rules.filter(item => item.enabled).length}<small>项</small></strong></div><div><span>覆盖接收角色</span><strong>{new Set(state.rules.filter(item => item.enabled).map(item => item.recipientRoleId)).size}<small>类</small></strong></div></div>
    <Panel title="通知策略" description="设置什么时候提醒、提醒谁，统一管理业务通知。" actions={<button className="ps-button primary" onClick={() => setEditing({ isNew: true, rule: { id: makeId("N"), name: "", trigger: "整改期限临近", threshold: 24, recipientRoleId: state.roles[0]?.id || "", enabled: true } })}><Plus size={16} />新增规则</button>}>
      <div className="ps-filter"><label className="ps-search"><Search size={16} /><input aria-label="搜索通知规则" placeholder="搜索规则名称、触发条件" value={keyword} onChange={e => setKeyword(e.target.value)} /></label><select aria-label="通知规则状态" value={status} onChange={e => setStatus(e.target.value)}>{["全部状态", "已启用", "已停用"].map(item => <option key={item}>{item}</option>)}</select><button className="ps-button" onClick={() => { setKeyword(""); setStatus("全部状态"); }}>重置</button></div>
      {error && <p role="alert" className="ps-error ps-inset">{error}</p>}
      <div className="ps-table-scroll"><table className="ps-table ps-rule-table"><colgroup><col style={{ width: "24%" }} /><col style={{ width: "26%" }} /><col style={{ width: "18%" }} /><col style={{ width: "12%" }} /><col style={{ width: "20%" }} /></colgroup><thead><tr><th>规则名称</th><th>触发条件</th><th>接收角色</th><th>状态</th><th>操作</th></tr></thead><tbody>{rows.map(rule => <tr key={rule.id}><td><span className="ps-ellipsis" title={rule.name}>{rule.name}</span><small>站内提醒 · 演示</small></td><td><span className="ps-clamp" title={triggers[rule.trigger]?.describe(rule.threshold)}>{triggers[rule.trigger]?.describe(rule.threshold) || rule.trigger}</span></td><td>{state.roles.find(item => item.id === rule.recipientRoleId)?.name || "角色已移除"}<small>{state.members.filter(item => item.roleId === rule.recipientRoleId && item.status === "启用").length} 位启用成员</small></td><td><Badge enabled={rule.enabled} /></td><td><div className="ps-row-actions"><button onClick={() => setEditing({ rule, isNew: false })} aria-label={`编辑${rule.name}`}>编辑</button><button onClick={() => setPreview(rule)} aria-label={`预览${rule.name}`}>预览</button><button onClick={() => toggle(rule)} aria-label={`${rule.enabled ? "停用" : "启用"}${rule.name}`}>{rule.enabled ? "停用" : "启用"}</button></div></td></tr>)}</tbody></table>{!rows.length && <Empty />}</div>
      <div className="ps-panel-foot"><span>共 {rows.length} 条规则</span><span>规则调整会记录到审计日志</span></div>
    </Panel><div className="ps-info"><Info size={17} /><span>通知渠道：站内提醒（演示）。配置保存在当前浏览器，可预览接收成员与提醒内容。</span></div>
    {editing && <RuleEditor key={editing.rule.id} {...editing} onClose={() => setEditing(null)} onSaved={onSaved} />}{preview && <Dialog title="通知内容预览" onClose={() => setPreview(null)}><div className="ps-dialog-body"><NotificationPreview rule={preview} /><p className="ps-note">此预览不会发送真实通知。</p></div><footer className="ps-dialog-foot"><button className="ps-button primary" onClick={() => setPreview(null)}>关闭预览</button></footer></Dialog>}</>;
}

function Parameters({ onSaved }: { onSaved: (message: string) => void }) {
  const { state, change } = useResources();
  const saved = state.systemParameters || defaultSystemParameters;
  const source = JSON.stringify(saved);
  const [baseline, setBaseline] = useState(source);
  const [draft, setDraft] = useState<SystemParameters>({ ...saved }); const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== baseline;
  useEffect(() => { if (!dirty && source !== baseline) { setDraft(JSON.parse(source)); setBaseline(source); } }, [source, baseline, dirty]);
  function save(event: FormEvent) {
    event.preventDefault();
    const next = { ...draft, platformName: draft.platformName.trim() };
    if (!isSystemParameters(next)) { setError("请检查参数：平台名称 1–60 字，整改期限 1–90 天，AI 置信度 50–99%，数值须为整数。"); return; }
    if (source !== baseline) { setError("另一页面已更新系统参数，请先点击撤销修改载入最新配置。"); return; }
    const labels: Record<keyof SystemParameters, string> = { platformName: "平台名称", inspectionCycle: "检查周期", rectificationDays: "整改期限（天）", aiConfidence: "AI置信度（%）", logPageSize: "日志每页条数" };
    const changes = (Object.keys(labels) as (keyof SystemParameters)[]).filter(key => next[key] !== saved[key]).map(key => `${labels[key]}：${saved[key]} → ${next[key]}`).join("；");
    if (!changes) { setDraft(next); setError(""); return; }
    change("系统管理 / 保存系统参数", changes, current => ({ ...current, systemParameters: next }));
    setDraft(next); setBaseline(JSON.stringify(next)); setError(""); onSaved("系统参数已保存，变更已记录到审计日志");
  }
  return <form className="ps-content" onSubmit={save} noValidate><Panel title="系统参数" description="维护平台基本信息和业务默认值，保存后可再次查看与调整。" actions={<span className={`ps-draft-state ${dirty ? "dirty" : ""}`}><i />{dirty ? "有未保存的修改" : "当前配置已载入"}</span>}>
    <div className="ps-parameter-section"><div className="ps-section-label"><h3>基础信息</h3><p>平台展示与记录查询</p></div><div className="ps-form-grid"><label className="ps-field ps-span"><span>平台名称</span><input maxLength={60} value={draft.platformName} onChange={e => setDraft({ ...draft, platformName: e.target.value })} /><small>在下方配置预览中展示</small></label><label className="ps-field"><span>审计日志每页条数</span><select value={draft.logPageSize} onChange={e => setDraft({ ...draft, logPageSize: Number(e.target.value) })}>{[5, 10, 20, 50].map(value => <option key={value} value={value}>{value} 条 / 页</option>)}</select><small>保存后应用到审计日志列表</small></label></div></div>
    <div className="ps-parameter-section"><div className="ps-section-label"><h3>业务默认值</h3><p>检查与整改配置</p></div><div className="ps-form-grid"><label className="ps-field"><span>默认检查周期</span><select value={draft.inspectionCycle} onChange={e => setDraft({ ...draft, inspectionCycle: e.target.value as SystemParameters["inspectionCycle"] })}>{["每日", "每周", "每月"].map(item => <option key={item}>{item}</option>)}</select></label><label className="ps-field"><span>隐患默认整改期限（天）</span><input type="number" min={1} max={90} step={1} value={draft.rectificationDays || ""} onChange={e => setDraft({ ...draft, rectificationDays: Number(e.target.value) })} /><small>支持 1–90 天</small></label><label className="ps-field"><span>AI 置信度阈值（%）</span><input type="number" min={50} max={99} step={1} value={draft.aiConfidence || ""} onChange={e => setDraft({ ...draft, aiConfidence: Number(e.target.value) })} /><small>支持 50–99%，低于阈值建议人工核查</small></label></div></div>
    <div className="ps-parameter-preview"><span className="eyebrow">CONFIGURATION PREVIEW</span><h3>{draft.platformName || "请输入平台名称"}</h3><p>{draft.inspectionCycle}检查 · 整改期限 {draft.rectificationDays || "—"} 天 · AI 置信度阈值 {draft.aiConfidence || "—"}% · 日志每页 {draft.logPageSize} 条</p><small>检查、整改、AI 默认值用于本页配置演示，尚未自动应用到业务表单。</small></div>
    {error && <p className="ps-error ps-inset" role="alert">{error}</p>}
    <div className="ps-save-bar"><button type="button" className="ps-button" onClick={() => { setDraft({ ...defaultSystemParameters }); setError(""); }}>载入默认值</button><div className="ps-actions"><button type="button" className="ps-button" disabled={!dirty && source === baseline} onClick={() => { setDraft({ ...saved }); setBaseline(source); setError(""); }}>撤销修改</button><button className="ps-button primary" type="submit" disabled={!dirty}><Save size={16} />保存参数</button></div></div>
    </Panel><p className="ps-note">“载入默认值”只更新表单，点击“保存参数”后才会保存。</p></form>;
}

function AuditLogs() {
  const { state, change } = useResources();
  const [keyword, setKeyword] = useState(""); const [module, setModule] = useState("全部模块");
  const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ResourceLog | null>(null); const [exported, setExported] = useState("");
  const invalidDate = !!start && !!end && start > end;
  const getModule = (log: ResourceLog) => log.action.split(" / ")[0];
  const modules = Array.from(new Set(state.logs.map(getModule)));
  const rows = invalidDate ? [] : state.logs.filter(log => [log.id, log.actor, log.action, log.target].join(" ").toLowerCase().includes(keyword.trim().toLowerCase()) && (module === "全部模块" || getModule(log) === module) && (!start || log.time.slice(0, 10) >= start) && (!end || log.time.slice(0, 10) <= end)).sort((a, b) => b.time.localeCompare(a.time));
  const pageSize = state.systemParameters?.logPageSize || defaultSystemParameters.logPageSize;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize)); const currentPage = Math.min(page, pageCount);
  const reset = () => { setKeyword(""); setModule("全部模块"); setStart(""); setEnd(""); setPage(1); setExported(""); };
  const exportLogs = () => { const count = rows.length; downloadCsv("系统审计日志.csv", ["日志编号", "操作时间", "操作人", "操作行为", "操作对象 / 变更摘要"], rows.map(item => [item.id, item.time, item.actor, item.action, item.target])); change("系统管理 / 导出审计日志", `${count} 条记录；${start || "不限"} 至 ${end || "不限"}；关键词：${keyword || "无"}；模块：${module}`, current => current); setExported(`已生成 ${count} 条筛选记录的 CSV 文件（不含本次导出操作）。`); };
  return <><Panel title="审计日志" description="追溯资源配置操作，支持按日期、模块和关键词筛选。" actions={<button className="ps-button primary" disabled={invalidDate || !rows.length} onClick={exportLogs}><Download size={16} />导出筛选结果</button>}>
    <div className="ps-audit-filter"><label className="ps-field ps-search-filter"><span>关键词</span><input placeholder="搜索操作人、操作或对象" aria-label="搜索审计日志" value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} /></label><label className="ps-field"><span>操作模块</span><select value={module} onChange={e => { setModule(e.target.value); setPage(1); }}><option>全部模块</option>{modules.map(item => <option key={item}>{item}</option>)}</select></label><label className="ps-field"><span>开始日期</span><input type="date" value={start} max={end || undefined} onInput={e => { setStart(e.currentTarget.value); setPage(1); }} onChange={e => { setStart(e.target.value); setPage(1); }} /></label><label className="ps-field"><span>结束日期</span><input type="date" value={end} min={start || undefined} onInput={e => { setEnd(e.currentTarget.value); setPage(1); }} onChange={e => { setEnd(e.target.value); setPage(1); }} /></label><button className="ps-button" onClick={reset}>重置</button></div>
    {invalidDate && <p className="ps-error ps-inset" role="alert">开始日期不能晚于结束日期，请调整日期范围。</p>}{exported && <p className="ps-success ps-inset" role="status"><Check size={15} />{exported}</p>}
    <div className="ps-table-scroll"><table className="ps-table ps-audit-table"><colgroup><col style={{ width: 155 }} /><col style={{ width: 100 }} /><col style={{ width: "25%" }} /><col /><col style={{ width: 65 }} /></colgroup><thead><tr><th>操作时间</th><th>操作人</th><th>操作行为</th><th>操作对象 / 变更摘要</th><th>操作</th></tr></thead><tbody>{rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(log => <tr key={log.id}><td><time>{log.time}</time></td><td>{log.actor}</td><td><span className="ps-clamp" title={log.action}>{log.action}</span></td><td><span className="ps-clamp" title={log.target}>{log.target}</span></td><td><button className="ps-text-button" aria-label={`查看日志 ${log.id}`} onClick={() => setSelected(log)}>详情</button></td></tr>)}</tbody></table>{!rows.length && <Empty text={invalidDate ? "请设置有效的日期范围" : "暂无符合条件的操作记录"} />}</div>
    <div className="ps-panel-foot"><span>共 {rows.length} 条 · 每页 {pageSize} 条</span><div className="ps-actions"><button className="ps-icon-button" aria-label="上一页日志" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>第 {currentPage} / {pageCount} 页</span><button className="ps-icon-button" aria-label="下一页日志" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></div>
    </Panel><div className="ps-info"><ShieldCheck size={17} /><span>本地演示操作记录 · 最多保留最近 300 条 · 新增、修改、启停及导出操作自动留痕。</span></div>
    {selected && <Dialog title="操作日志详情" onClose={() => setSelected(null)}><div className="ps-dialog-body"><dl className="ps-detail"><dt>日志编号</dt><dd>{selected.id}</dd><dt>操作时间</dt><dd>{selected.time}</dd><dt>操作人</dt><dd>{selected.actor}</dd><dt>操作行为</dt><dd>{selected.action}</dd><dt>操作对象 / 变更摘要</dt><dd>{selected.target}</dd></dl><p className="ps-note">记录来自当前浏览器的演示操作。</p></div><footer className="ps-dialog-foot"><button className="ps-button primary" onClick={() => setSelected(null)}>关闭详情</button></footer></Dialog>}</>;
}

export default function ThemePrototypeSettings() {
  const { storageError } = useResources();
  const [tab, setTab] = useState<SettingsTab>(() => { const initial = new URLSearchParams(window.location.search).get("section"); return tabs.some(item => item.id === initial) ? initial as SettingsTab : "notifications"; });
  const [message, setMessage] = useState("");
  function switchTab(next: SettingsTab) { setTab(next); setMessage(""); const url = new URL(window.location.href); url.searchParams.set("section", next); window.history.replaceState({}, "", url); }
  return <div className="page-stack prototype-settings"><header className="page-header"><div><div className="eyebrow">RESOURCES / 17</div><h1>系统管理</h1><p>维护平台配置、通知规则与操作记录，让每一次设置有据可查。</p></div><span className="ps-demo-label"><ShieldCheck size={15} />演示配置 · 本机保存</span></header>
    <div className="ps-layout"><nav className="ps-nav" aria-label="系统管理分类"><span className="ps-nav-label">管理设置</span>{tabs.map(item => { const Icon = item.icon; return <button type="button" aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""} key={item.id} onClick={() => switchTab(item.id)}><Icon size={18} /><span>{item.label}<small>{item.description}</small></span><ChevronRight size={15} /></button>; })}<div className="ps-nav-note"><ShieldCheck size={18} /><p>配置变更自动留痕<br />支持筛选与导出追溯</p></div></nav>
      <div className="ps-content"><p className={storageError ? "ps-error ps-feedback" : message ? "ps-success ps-feedback" : "ps-feedback empty"} role={storageError ? "alert" : "status"}>{storageError || message}</p>
        {tab === "accounts" && <PrototypeAccounts navigate={() => {}} />}{tab === "notifications" && <Notifications onSaved={setMessage} />}<div hidden={tab !== "parameters"}><Parameters onSaved={setMessage} /></div>{tab === "audit" && <AuditLogs />}
      </div></div></div>;
}
