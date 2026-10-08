import { useEffect, useState } from "react";
import { ArrowDownToLine, Bell, Clock3, Settings2, ShieldCheck } from "lucide-react";
import type { OperationRule, OperationWarning, WarningStatus } from "../../data/operationsData";
import { RMBadge, RMEmpty, RMHeader, RMPanel, RMStats, RMTable, RMTabs } from "../resources/ResourceUI";
import { exportWarnings, FilterBar, matchesFilter, OperationsDialog, Pager, type OperationsContext, type OperationsFilter } from "./OperationsModules";
import { localTimestamp } from "./operationsStore";

export function WarningsPage({ context: { data, save, notify }, filter, setFilter, focusId, clearFocus }: { context: OperationsContext; filter: OperationsFilter; setFilter: (f: OperationsFilter) => void; focusId: string | null; clearFocus: () => void }) {
  const [tab, setTab] = useState("全部预警");
  const [risk, setRisk] = useState("全部等级");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [actionIds, setActionIds] = useState<string[]>([]);
  const [rule, setRule] = useState<OperationRule | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const base = data.warnings.filter(w => matchesFilter(w, filter) && (risk === "全部等级" || w.risk === risk) && `${w.id}${w.title}${w.project}${w.owner}`.toLowerCase().includes(search.trim().toLowerCase()));
  const rows = base.filter(w => tab === "全部预警" || w.status === tab);
  const safePage = Math.min(page, Math.max(1, Math.ceil(rows.length / 8)));
  const visible = rows.slice((safePage - 1) * 8, safePage * 8);
  const current = data.warnings.find(w => w.id === detail);
  const selectedRows = data.warnings.filter(w => actionIds.includes(w.id));
  const pendingSelected = rows.filter(w => selected.includes(w.id) && w.status === "待响应");
  const asOf = "2026-09-24";
  useEffect(() => { setPage(1); setSelected([]); }, [filter, risk, search, tab]);
  useEffect(() => { if (focusId) { setDetail(focusId); clearFocus(); } }, [focusId, clearFocus]);
  function process(ids: string[], status: WarningStatus, owner: string, deadline: string, note: string) {
    const next = data.warnings.map(w => ids.includes(w.id) ? { ...w, status, owner, deadline, logs: [...w.logs, { time: localTimestamp(), text: `${status === "处理中" ? "指派处理" : "完成预警处置"} · ${owner}：${note}` }] } : w);
    save({ ...data, warnings: next }); setActionIds([]); setSelected([]); notify(`已更新 ${ids.length} 条预警处置记录`);
  }
  return <>
    <RMHeader eyebrow="智能分析 / 预警中心" title="风险预警与处置" description="分级响应、责任到人，持续跟进每一条风险信号。" actions={<><button className="rm-button" onClick={() => setRulesOpen(true)}><Settings2 size={16} />预警规则</button><button className="rm-button rm-primary" onClick={() => { exportWarnings(rows); notify("已导出当前筛选预警"); }}><ArrowDownToLine size={16} />导出台账</button></>} />
    <RMStats items={[
      { label: "待响应预警", value: base.filter(w => w.status === "待响应").length, hint: "等待责任人核查与接收", tone: "orange", onClick: () => setTab("待响应") },
      { label: "处理中", value: base.filter(w => w.status === "处理中").length, hint: "已指派 · 正在跟进处置", tone: "blue", onClick: () => setTab("处理中") },
      { label: "超期未处理", value: base.filter(w => w.status !== "已处理" && w.deadline < asOf).length, hint: `演示基准日 ${asOf}`, tone: "red" },
      { label: "已处理预警", value: base.filter(w => w.status === "已处理").length, hint: "处置意见已记录，可追溯查看", tone: "green", onClick: () => setTab("已处理") },
    ]} />
    <div className="op-workflow-strip"><span><Bell size={18} />发现风险<small>AI 疑似隐患 / 检查记录</small></span><i>→</i><span><Clock3 size={18} />指派响应<small>责任人 / 处置期限</small></span><i>→</i><span><ShieldCheck size={18} />记录处置<small>核查意见 / 跟进记录</small></span></div>
    <RMPanel><RMTabs value={tab} onChange={setTab} items={["全部预警", "待响应", "处理中", "已处理"].map(key => ({ key, label: key, count: base.filter(w => key === "全部预警" || w.status === key).length }))} />
      <FilterBar value={filter} onChange={f => { setFilter(f); setRisk("全部等级"); setSearch(""); }}><label className="rm-field">风险等级<select aria-label="风险等级" value={risk} onChange={e => setRisk(e.target.value)}><option>全部等级</option><option>高风险</option><option>中风险</option><option>低风险</option></select></label><label className="rm-field">搜索预警<input placeholder="编号、隐患、责任人" value={search} onChange={e => setSearch(e.target.value)} /></label></FilterBar>
      <div className="op-table-toolbar"><span>当前匹配 <b>{rows.length}</b> 条预警 <small>· 勾选待响应记录可批量指派</small></span><button className="rm-button" disabled={!pendingSelected.length} onClick={() => setActionIds(pendingSelected.map(w => w.id))}>批量指派{pendingSelected.length ? ` (${pendingSelected.length})` : ""}</button></div>
      <RMTable rows={visible} rowKey={w => w.id} columns={[
        { key: "select", label: "选择", width: "6%", render: w => <input type="checkbox" aria-label={`选择${w.id}`} disabled={w.status !== "待响应"} checked={selected.includes(w.id)} onChange={e => setSelected(list => e.target.checked ? [...list, w.id] : list.filter(id => id !== w.id))} /> },
        { key: "title", label: "疑似隐患 / 编号", width: "22%", render: w => <><span className="rm-table-name" title={w.title}>{w.title}</span><small className="rm-table-sub">{w.id}</small></> },
        { key: "project", label: "项目 / 类型", width: "17%", render: w => <><span className="rm-ellipsis" title={w.project}>{w.project}</span><small className="rm-table-sub">{w.category}</small></> },
        { key: "risk", label: "风险等级", width: "10%", render: w => <RMBadge>{w.risk}</RMBadge> },
        { key: "deadline", label: "处置期限", width: "13%", render: w => <><span className={w.status !== "已处理" && w.deadline < asOf ? "rm-text-red" : ""}>{w.deadline}</span><small className="rm-table-sub">{w.status !== "已处理" && w.deadline < asOf ? "已超期 · 建议优先跟进" : `触发 ${w.date}`}</small></> },
        { key: "owner", label: "责任人", width: "9%", render: w => w.owner },
        { key: "status", label: "状态", width: "10%", render: w => <RMBadge tone={w.status === "已处理" ? "green" : w.status === "待响应" ? "orange" : "blue"}>{w.status}</RMBadge> },
        { key: "action", label: "操作", width: "13%", render: w => <div className="rm-actions"><button className="rm-link" onClick={() => setDetail(w.id)}>详情</button>{w.status !== "已处理" && <button className="rm-link" onClick={() => setActionIds([w.id])}>{w.status === "待响应" ? "指派" : "处置"}</button>}</div> },
      ]} empty={<RMEmpty text="当前条件下暂无预警，可调整日期或风险等级" />} />
      <Pager count={rows.length} page={safePage} onChange={setPage} />
    </RMPanel>
    {current && <OperationsDialog title="预警详情与处置记录" onClose={() => setDetail(null)} footer={<>{current.status !== "已处理" && <button className="rm-button rm-primary" onClick={() => { setActionIds([current.id]); setDetail(null); }}>{current.status === "待响应" ? "指派处理" : "完成处置"}</button>}<button className="rm-button" onClick={() => setDetail(null)}>关闭</button></>}>
      <div className="op-detail-heading"><h3>{current.title}</h3><RMBadge>{current.risk}</RMBadge><RMBadge tone={current.status === "已处理" ? "green" : "blue"}>{current.status}</RMBadge></div>
      <dl className="rm-detail-grid">{[["预警编号", current.id], ["所属项目", current.project], ["发现位置", current.location], ["责任人", current.owner], ["触发日期", current.date], ["处置期限", current.deadline]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="op-evidence-detail"><img src={current.image} alt={current.title} /><div><h3>现场证据与建议</h3><p>{current.suggestion}</p><small>疑似隐患需现场核查，预警处置不自动销号。</small></div></div>
      <h3 className="op-section-title">处置时间线</h3><ol className="op-timeline">{current.logs.map((log, i) => <li key={i}><time>{log.time}</time><p>{log.text}</p></li>)}</ol>
    </OperationsDialog>}
    {selectedRows.length > 0 && <WarningAction rows={selectedRows} onClose={() => setActionIds([])} onSave={process} />}
    {rulesOpen && <OperationsDialog title="预警规则配置" onClose={() => setRulesOpen(false)}><div className="rm-note">规则用于演示响应时限与接收角色配置；不会执行定时任务或向人员发送真实消息。</div><div className="op-rule-list">{data.rules.map(item => <article key={item.id}><div><h3>{item.name}</h3><p>{item.description}</p><small>{item.hours} 小时 · {item.recipient}</small></div><div className="rm-actions"><RMBadge tone={item.enabled ? "green" : "gray"}>{item.enabled ? "启用" : "停用"}</RMBadge><button className="rm-link" onClick={() => { setRule({ ...item }); setRulesOpen(false); }}>配置</button></div></article>)}</div></OperationsDialog>}
    {rule && <OperationsDialog title={`配置 · ${rule.name}`} onClose={() => setRule(null)}><form className="rm-form-grid" onSubmit={e => { e.preventDefault(); save({ ...data, rules: data.rules.map(r => r.id === rule.id ? rule : r) }); setRule(null); setRulesOpen(true); notify("演示规则配置已保存"); }}><label>响应时限（小时）<input type="number" required min={1} max={168} value={rule.hours} onChange={e => setRule({ ...rule, hours: Number(e.target.value) })} /></label><label>接收角色<select aria-label="接收角色" value={rule.recipient} onChange={e => setRule({ ...rule, recipient: e.target.value })}>{["项目安全员", "项目负责人", "专家组"].map(v => <option key={v}>{v}</option>)}</select></label><label>规则状态<select aria-label="规则状态" value={rule.enabled ? "启用" : "停用"} onChange={e => setRule({ ...rule, enabled: e.target.value === "启用" })}><option>启用</option><option>停用</option></select></label><div className="rm-form-footer"><button type="button" className="rm-button" onClick={() => setRule(null)}>取消</button><button className="rm-button rm-primary" type="submit">保存配置</button></div></form></OperationsDialog>}
  </>;
}
function WarningAction({ rows, onClose, onSave }: { rows: OperationWarning[]; onClose: () => void; onSave: (ids: string[], status: WarningStatus, owner: string, deadline: string, note: string) => void }) {
  const assigning = rows.every(w => w.status === "待响应");
  const [owner, setOwner] = useState(assigning ? "李四" : rows[0].owner);
  const [deadline, setDeadline] = useState(rows.reduce((latest, w) => w.deadline > latest ? w.deadline : latest, rows[0].deadline));
  const [note, setNote] = useState("");
  const minDate = rows.map(w => w.date).sort()[rows.length - 1];
  return <OperationsDialog title={assigning ? `指派处理 · ${rows.length} 条预警` : "完成预警处置"} onClose={onClose}><form className="rm-form-grid" onSubmit={e => { e.preventDefault(); if (!note.trim()) return; onSave(rows.map(w => w.id), assigning ? "处理中" : "已处理", owner, deadline, note.trim()); }}><div className="rm-note rm-full">{rows.map(w => w.title).join("、")}。{assigning ? "指定责任人并明确核查要求。" : "请记录实际核查情况与后续措施，此操作仅完成预警处理。"}</div><label>责任人<select aria-label="责任人" value={owner} disabled={!assigning} onChange={e => setOwner(e.target.value)}>{[...new Set([owner, "李四", "王工", "赵工", "孙工"])].map(v => <option key={v}>{v}</option>)}</select></label><label>处置期限<input type="date" required min={minDate} value={deadline} disabled={!assigning} onChange={e => setDeadline(e.target.value)} /></label><label className="rm-full">{assigning ? "指派说明" : "处置意见"}<textarea required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder={assigning ? "请填写核查要求、重点部位与协同事项" : "请填写核查结果、已采取措施及后续跟进安排"} /></label><div className="rm-form-footer"><button type="button" className="rm-button" onClick={onClose}>取消</button><button type="submit" className="rm-button rm-primary" disabled={!note.trim()}>{assigning ? "确认指派" : "确认完成处置"}</button></div></form></OperationsDialog>;
}
