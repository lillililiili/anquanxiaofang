import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowRight, CheckCircle2, Settings2 } from "lucide-react";
import type { OperationWarning, WarningStatus } from "../../data/operationsData";
import { RMBadge, RMHeader, RMStats } from "../resources/ResourceUI";
import { defaultFilter, exportWarnings, matchesFilter, type OperationsContext, type OperationsFilter } from "./OperationsModules";

type Draft = { owner: string; deadline: string; note: string; stage: WarningStatus };
type View = { filter: OperationsFilter; risk: string; search: string; tab: string; selected: string | null };
const defaultView: View = { filter: { ...defaultFilter }, risk: "全部等级", search: "", tab: "全部预警", selected: null };
const draftKey = "safety-prototype-warning-drafts-v1";
const viewKey = "safety-prototype-warning-view-v1";
function readDrafts(): Record<string, Draft> {
  try { const value = JSON.parse(localStorage.getItem(draftKey) || "{}"); return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, Draft] => { const d = entry[1] as Draft; return !!d && [d.owner, d.deadline, d.note, d.stage].every(v => typeof v === "string"); })); } catch { return {}; }
}
function readView(): View {
  try { const v = JSON.parse(sessionStorage.getItem(viewKey) || "null"); if (v && v.filter && [v.filter.project, v.filter.start, v.filter.end, v.risk, v.search, v.tab].every(x => typeof x === "string")) return v; } catch { /* Use the default view if browser storage is unavailable. */ }
  return defaultView;
}
const freshDraft = (w: OperationWarning): Draft => ({ owner: w.status === "待响应" ? "李四" : w.owner, deadline: w.deadline, note: "", stage: w.status });

export default function WarningWorkspace({ context: { data, notify }, focusId, clearFocus, openRules, onBatch, onProcess }: {
  context: OperationsContext; focusId: string | null; clearFocus: () => void; openRules: () => void; onBatch: (ids: string[]) => void;
  onProcess: (ids: string[], status: WarningStatus, owner: string, deadline: string, note: string) => void;
}) {
  const [view, setView] = useState(readView);
  const [drafts, setDrafts] = useState(readDrafts);
  const [storageError, setStorageError] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const patchView = (patch: Partial<View>) => { setView(v => ({ ...v, ...patch })); setChecked([]); };
  useEffect(() => { try { sessionStorage.setItem(viewKey, JSON.stringify(view)); } catch { /* Filters remain usable in this session. */ } }, [view]);
  useEffect(() => {
    if (!focusId) return;
    setView({ ...defaultView, filter: { project: "全部项目", start: "", end: "" }, selected: focusId });
    clearFocus();
  }, [focusId, clearFocus]);
  const base = data.warnings.filter(w => matchesFilter(w, view.filter) && (view.risk === "全部等级" || w.risk === view.risk) && [w.id, w.title, w.project, w.owner].join(" ").toLowerCase().includes(view.search.trim().toLowerCase()));
  const rows = base.filter(w => view.tab === "全部预警" || (view.tab === "超期未处理" ? w.status !== "已处理" && w.deadline < "2026-09-24" : w.status === view.tab));
  const current = rows.find(w => w.id === view.selected);
  const pending = rows.filter(w => checked.includes(w.id) && w.status === "待响应");
  const draft = current ? (drafts[current.id]?.stage === current.status ? drafts[current.id] : freshDraft(current)) : null;
  const persistDrafts = (next: Record<string, Draft>) => {
    setDrafts(next);
    try { localStorage.setItem(draftKey, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("草稿暂存失败，请保留此页；离开后可能丢失。"); }
  };
  const changeDraft = (patch: Partial<Draft>) => { if (current && draft) persistDrafts({ ...drafts, [current.id]: { ...draft, ...patch } }); };
  function submit(next: boolean) {
    if (!current || !draft || !draft.note.trim()) return;
    const status = current.status === "待响应" ? "处理中" : "已处理";
    onProcess([current.id], status, draft.owner, draft.deadline, draft.note.trim());
    const updated = { ...drafts }; delete updated[current.id]; persistDrafts(updated);
    const nextRow = rows.find((w, i) => i > rows.indexOf(current) && w.status !== "已处理") || rows.find(w => w.id !== current.id && w.status !== "已处理");
    setFeedback(`${current.id} ${status === "处理中" ? "已指派给 " + draft.owner : "已完成处置"}。${next ? nextRow ? "已切换下一条待办。" : "当前筛选下没有下一条待办。" : "处置记录已更新。"}`);
    if (next) setView(v => ({ ...v, selected: nextRow?.id || null }));
  }
  return <div className="warning-workspace">
    <RMHeader eyebrow="RISK RESPONSE / 预警中心" title="风险预警与处置" description="选中一条预警，在同一工作区完成核查、指派与处置。" actions={<><button className="rm-button" onClick={openRules}><Settings2 size={16} />预警规则</button><button className="rm-button rm-primary" onClick={() => { exportWarnings(rows); notify(`已导出 ${rows.length} 条预警`); }}><ArrowDownToLine size={16} />导出台账</button></>} />
    <RMStats items={["待响应", "处理中", "超期未处理", "已处理"].map((s, i) => ({ label: s, value: base.filter(w => s === "超期未处理" ? w.status !== "已处理" && w.deadline < "2026-09-24" : w.status === s).length, hint: s === "超期未处理" ? "演示基准日 2026-09-24" : "随项目、日期与搜索同步", tone: ["orange", "blue", "red", "green"][i], onClick: () => patchView({ tab: s }) }))} />
    <div className="warning-filter-panel"><div className="warning-filters">
      <label>搜索预警<input placeholder="编号、隐患、责任人" value={view.search} onChange={e => patchView({ search: e.target.value })} /></label>
      <label>项目范围<select value={view.filter.project} onChange={e => patchView({ filter: { ...view.filter, project: e.target.value } })}><option>全部项目</option>{[...new Set(data.warnings.map(w => w.project))].map(p => <option key={p}>{p}</option>)}</select></label>
      <label>风险等级<select value={view.risk} onChange={e => patchView({ risk: e.target.value })}>{["全部等级", "高风险", "中风险", "低风险"].map(s => <option key={s}>{s}</option>)}</select></label>
      <label>触发日期起<input type="date" max={view.filter.end || undefined} value={view.filter.start} onChange={e => patchView({ filter: { ...view.filter, start: e.target.value } })} /></label>
      <label>触发日期止<input type="date" min={view.filter.start || undefined} value={view.filter.end} onChange={e => patchView({ filter: { ...view.filter, end: e.target.value } })} /></label>
      <button className="rm-button" onClick={() => patchView({ ...defaultView, selected: view.selected })}>重置筛选</button>
    </div><div className="active-filter-summary" aria-live="polite"><strong>匹配 {rows.length} 条</strong><span>{view.filter.project} · {view.risk} · {view.filter.start || "不限起始"} — {view.filter.end || "不限结束"}{view.search && ` · 搜索：${view.search}`}</span></div></div>
    {feedback && <div className="warning-feedback" role="status"><CheckCircle2 size={18} />{feedback}</div>}
    <div className="warning-split"><section className="warning-list" aria-label="预警列表">
      <div className="warning-list-tabs">{["全部预警", "待响应", "处理中", "已处理"].map(s => <button key={s} aria-pressed={view.tab === s} onClick={() => patchView({ tab: s })}>{s}<b>{base.filter(w => s === "全部预警" || w.status === s).length}</b></button>)}</div>
      <div className="warning-list-tools"><span>{view.tab} · {rows.length} 条</span><button className="rm-link" disabled={!pending.length} onClick={() => onBatch(pending.map(w => w.id))}>批量指派 {pending.length || ""}</button></div>
      <div className="warning-records">{rows.map(w => <article className={current?.id === w.id ? "active" : ""} key={w.id}>
        <input type="checkbox" aria-label={`选择${w.id}`} disabled={w.status !== "待响应"} checked={checked.includes(w.id)} onChange={e => setChecked(ids => e.target.checked ? [...ids, w.id] : ids.filter(id => id !== w.id))} />
        <button aria-label={`查看预警 ${w.id} ${w.title}`} aria-pressed={current?.id === w.id} onClick={() => setView(v => ({ ...v, selected: w.id }))}><span className="warning-record-top"><RMBadge>{w.risk}</RMBadge><small>{w.status}</small></span><strong>{w.title}</strong><span>{w.project} · {w.owner}</span><small>{w.id} · 期限 {w.deadline}</small>{drafts[w.id]?.stage === w.status && <em>有暂存草稿</em>}</button>
      </article>)}{!rows.length && <p className="premium-empty">暂无匹配预警，请调整筛选条件。</p>}</div>
    </section><section className="warning-detail" aria-label="预警详情与处理">{current && draft ? <>
      <header><div><span className="rm-eyebrow">{current.id}</span><h2>{current.title}</h2><p>{current.project} · {current.location}</p></div><RMBadge>{current.risk}</RMBadge><RMBadge>{current.status}</RMBadge></header>
      <div className="warning-detail-body"><div className="warning-evidence"><img src={current.image} alt={`${current.title}现场证据`} /><div><span className="rm-eyebrow">现场证据与建议</span><p>{current.suggestion}</p><dl><div><dt>触发日期</dt><dd>{current.date}</dd></div><div><dt>责任人</dt><dd>{current.owner}</dd></div><div><dt>处置期限</dt><dd>{current.deadline}</dd></div></dl></div></div>
      {current.status !== "已处理" ? <form className="warning-process-form" onSubmit={e => { e.preventDefault(); submit((e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-next") === "true"); }}>
        <div className="warning-form-title"><h3>{current.status === "待响应" ? "指派核查" : "记录处置结果"}</h3><span role="status">{storageError || (drafts[current.id]?.stage === current.status ? "草稿已暂存到本机" : "切换记录时自动保留草稿")}</span></div>
        <div className="warning-form-grid"><label>责任人<select value={draft.owner} disabled={current.status !== "待响应"} onChange={e => changeDraft({ owner: e.target.value })}>{[...new Set([draft.owner, "李四", "王工", "赵工", "孙工"])].map(p => <option key={p}>{p}</option>)}</select></label><label>处置期限<input type="date" required min={current.date} value={draft.deadline} disabled={current.status !== "待响应"} onChange={e => changeDraft({ deadline: e.target.value })} /></label></div>
        <label>{current.status === "待响应" ? "指派说明" : "处置意见"}<textarea required maxLength={1000} placeholder="请填写现场核查要求或处置结果" value={draft.note} onChange={e => changeDraft({ note: e.target.value })} /></label><small className="warning-process-note">仅记录预警响应与处理情况；隐患销号仍需完成复查流程。</small>
        <footer><button type="button" className="rm-button" onClick={() => { persistDrafts({ ...drafts, [current.id]: draft }); }}>保存草稿</button><button type="submit" className="rm-button" disabled={!draft.note.trim()}>{current.status === "待响应" ? "确认指派" : "确认完成处置"}</button><button type="submit" data-next="true" className="rm-button rm-primary" disabled={!draft.note.trim()}>{current.status === "待响应" ? "指派并处理下一条" : "完成并处理下一条"}<ArrowRight size={15} /></button></footer>
      </form> : <div className="warning-feedback"><CheckCircle2 size={18} />该预警已处理，可在下方查看完整处置记录。</div>}
      <details className="warning-history" open><summary>处置记录 <span>{current.logs.length} 条</span></summary><ol className="op-timeline">{current.logs.map((log, i) => <li key={i}><time>{log.time}</time><p>{log.text}</p></li>)}</ol></details></div>
    </> : <div className="warning-empty-detail"><div>选择一条预警，开始处理</div><p>{view.selected && !current ? "所选记录已不在当前筛选结果中。草稿已保留，可调整筛选后继续。" : "左侧查看待办，右侧核查证据、填写处理结果。"}</p><span>切换或返回页面，继续上次的草稿。</span></div>}</section></div>
  </div>;
}
