import { useState } from "react";
import OperationsModules, { OperationsDialog, type OperationsContext } from "../features/operations/OperationsModules";
import WarningWorkspace from "../features/operations/WarningWorkspace";
import { useOperationsStore, localTimestamp } from "../features/operations/operationsStore";
import type { OperationWarning, WarningStatus } from "../data/operationsData";
import { Button } from "./PrototypeUI";

export default function PrototypeOperations({ page, notify, navigate, focusId }: {
  page: "warnings" | "reports";
  notify: (message: string) => void;
  navigate: (path: string, focusId?: string) => void;
  focusId?: string;
}) {
  const operations = useOperationsStore();
  const [batch, setBatch] = useState<string[]>([]);
  const [rules, setRules] = useState(false);
  const context: OperationsContext = { data: operations.data, save: operations.save, notify };
  const process = (ids: string[], status: WarningStatus, owner: string, deadline: string, note: string) => {
    operations.save({ ...operations.data, warnings: operations.data.warnings.map(w => ids.includes(w.id) ? { ...w, status, owner, deadline, logs: [...w.logs, { time: localTimestamp(), text: `${status === "处理中" ? "指派处理" : "完成预警处置"} · ${owner}：${note}` }] } : w) });
    notify(`已更新 ${ids.length} 条预警处置记录`);
  };
  return <div className="prototype-resources prototype-operations">
    {focusId && <div className="prototype-operation-context"><span>来源检查任务：<strong>{focusId}</strong> · 请在编制报告中选择对应项目与证据。</span><Button variant="ghost" onClick={() => navigate("/tasks", focusId)}>返回任务</Button></div>}
    {page === "warnings" ? <WarningWorkspace context={context} focusId={focusId || null} clearFocus={() => undefined} openRules={() => setRules(true)} onBatch={setBatch} onProcess={process} /> : <OperationsModules page={page} notify={notify} navigate={next => navigate(`/${next}`)} />}
    {batch.length > 0 && <BatchAction warnings={operations.data.warnings.filter(w => batch.includes(w.id))} onClose={() => setBatch([])} onSave={(owner, deadline, note) => { process(batch, "处理中", owner, deadline, note); setBatch([]); }} />}
    {rules && <OperationsDialog title="预警规则配置" onClose={() => setRules(false)}><div className="rm-note">规则用于演示响应时限与接收角色配置；不会执行定时任务或发送真实消息。</div>{operations.data.rules.map(rule => <article className="op-rule-list" key={rule.id}><strong>{rule.name}</strong><span>{rule.description} · {rule.hours} 小时 · {rule.recipient}</span></article>)}<footer className="rm-actions"><Button variant="secondary" onClick={() => setRules(false)}>关闭</Button></footer></OperationsDialog>}
  </div>;
}

function BatchAction({ warnings, onClose, onSave }: { warnings: OperationWarning[]; onClose: () => void; onSave: (owner: string, deadline: string, note: string) => void }) {
  const [owner, setOwner] = useState("李四"); const [deadline, setDeadline] = useState(warnings.reduce((x, w) => x > w.deadline ? x : w.deadline, warnings[0]?.deadline || "")); const [note, setNote] = useState("");
  return <OperationsDialog title={`批量指派 · ${warnings.length} 条预警`} onClose={onClose}><form className="rm-form-grid" onSubmit={e => { e.preventDefault(); if (note.trim()) onSave(owner, deadline, note.trim()); }}><div className="rm-note rm-full">{warnings.map(w => w.title).join("、")}。将统一进入处理中状态。</div><label>责任人<select value={owner} onChange={e => setOwner(e.target.value)}>{["李四", "王工", "赵工", "孙工"].map(v => <option key={v}>{v}</option>)}</select></label><label>处置期限<input type="date" required value={deadline} onChange={e => setDeadline(e.target.value)} /></label><label className="rm-full">指派说明<textarea required value={note} onChange={e => setNote(e.target.value)} placeholder="填写统一核查要求" /></label><div className="rm-form-footer"><Button variant="secondary" onClick={onClose}>取消</Button><Button type="submit" disabled={!note.trim()}>确认批量指派</Button></div></form></OperationsDialog>;
}
