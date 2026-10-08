import { useEffect, useState } from "react";
import { ArrowDownToLine, FileCheck2, FileText, Plus, Printer } from "lucide-react";
import { operationsPeriod, operationsProjects, reportTemplates } from "../../data/mockData";
import type { OperationReport, OperationWarning } from "../../data/operationsData";
import { downloadCsv, RMBadge, RMEmpty, RMHeader, RMPanel, RMStats, RMTable, RMTabs } from "../resources/ResourceUI";
import { defaultFilter, FilterBar, matchesFilter, OperationsDialog, Pager, type OperationsContext } from "./OperationsModules";
import { downloadReport, localTimestamp, printReport, reportHtml } from "./operationsStore";

export function ReportsPage({ context: { data, save, notify }, initialProject, clearInitial }: { context: OperationsContext; initialProject: string | null; clearInitial: () => void }) {
  const [filter, setFilter] = useState({ ...defaultFilter, start: "", end: "" });
  const [tab, setTab] = useState("全部报告");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [generator, setGenerator] = useState<{ template: string; project: string } | null>(window.location.pathname.endsWith("/generate") ? { template: reportTemplates[0].name, project: operationsProjects[0] } : null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const preview = data.reports.find(r => r.id === previewId);
  const base = data.reports.filter(r => matchesFilter({ project: r.project, date: r.createdAt.slice(0, 10) }, filter) && `${r.id}${r.title}${r.author}`.includes(search.trim()));
  const rows = base.filter(r => tab === "全部报告" || r.status === tab);
  const safePage = Math.min(page, Math.max(1, Math.ceil(rows.length / 8)));
  useEffect(() => { setPage(1); }, [filter, tab, search]);
  useEffect(() => { if (initialProject) { setGenerator({ project: initialProject, template: reportTemplates[0].name }); clearInitial(); } }, [initialProject, clearInitial]);
  function generate(report: OperationReport) {
    save({ ...data, reports: [report, ...data.reports] }); setGenerator(null); setPreviewId(report.id); setTab("全部报告"); setFilter({ ...defaultFilter, start: "", end: "" }); setSearch(""); notify("报告已生成，已保存证据快照并进入待复核状态");
  }
  function review() {
    if (!reviewNote.trim()) return;
    save({ ...data, reports: data.reports.map(r => r.id === reviewId && r.status === "待复核" ? { ...r, status: "已复核", reviewNote: `演示专家复核 · ${localTimestamp()}：${reviewNote.trim()}` } : r) });
    setReviewId(null); setReviewNote(""); notify("报告复核意见已保存");
  }
  return <>
    <RMHeader eyebrow="智能分析 / 报告中心" title="检查成果与报告交付" description="汇集检查记录与现场证据，从报告编制到复核归档完成交付。" actions={<><button className="rm-button" onClick={() => { downloadCsv("报告台账.csv", ["报告编号", "报告名称", "项目", "模板", "生成时间", "状态", "证据数量"], rows.map(r => [r.id, r.title, r.project, r.template, r.createdAt, r.status, r.evidence.length])); notify("报告台账已导出"); }}><ArrowDownToLine size={16} />导出台账</button><button className="rm-button rm-primary" onClick={() => setGenerator({ template: reportTemplates[0].name, project: operationsProjects[0] })}><Plus size={16} />新建报告</button></>} />
    <RMStats items={[
      { label: "报告总数", value: base.length, hint: "当前项目与生成日期范围", tone: "blue", onClick: () => setTab("全部报告") },
      { label: "待专家复核", value: base.filter(r => r.status === "待复核").length, hint: "建议复核证据与整改意见", tone: "orange", onClick: () => setTab("待复核") },
      { label: "已复核待归档", value: base.filter(r => r.status === "已复核").length, hint: "复核通过后可归档交付", tone: "green", onClick: () => setTab("已复核") },
      { label: "已归档报告", value: base.filter(r => r.status === "已归档").length, hint: "保留生成时的证据与状态快照", tone: "blue", onClick: () => setTab("已归档") },
    ]} />
    <div className="op-template-grid">{reportTemplates.map((template, i) => <button className="op-template" key={template.name} onClick={() => setGenerator({ template: template.name, project: filter.project === "全部项目" ? operationsProjects[0] : filter.project })}><span className={`op-template-icon op-template-icon-${i}`}><FileText size={22} /></span><span><strong>{template.name}</strong><small>{template.description}</small><em>{template.sections}</em></span><Plus size={18} /></button>)}</div>
    <RMPanel title="报告台账" subtitle="按项目归集检查成果，支持预览、复核、归档及下载"><RMTabs value={tab} onChange={setTab} items={["全部报告", "待复核", "已复核", "已归档"].map(key => ({ key, label: key, count: base.filter(r => key === "全部报告" || r.status === key).length }))} />
      <FilterBar value={filter} dateLabel="生成日期" onChange={f => { setFilter(f); setSearch(""); }}><label className="rm-field">搜索报告<input value={search} onChange={e => setSearch(e.target.value)} placeholder="报告名称、编号、编制人" /></label></FilterBar>
      <RMTable rows={rows.slice((safePage - 1) * 8, safePage * 8)} rowKey={r => r.id} columns={[
        { key: "name", label: "报告名称 / 编号", width: "30%", render: r => <><span className="rm-table-name" title={r.title}>{r.title}</span><small className="rm-table-sub">{r.id} · {r.evidence.length} 项证据</small></> },
        { key: "project", label: "所属项目", width: "16%", render: r => <span className="rm-ellipsis" title={r.project}>{r.project}</span> },
        { key: "date", label: "生成时间 / 编制人", width: "18%", render: r => <>{r.createdAt}<small className="rm-table-sub">{r.author}</small></> },
        { key: "status", label: "状态", width: "11%", render: r => <RMBadge tone={r.status === "待复核" ? "orange" : r.status === "已归档" ? "blue" : "green"}>{r.status}</RMBadge> },
        { key: "actions", label: "操作", width: "25%", render: r => <div className="rm-actions"><button className="rm-link" onClick={() => setPreviewId(r.id)}>预览</button><button className="rm-link" onClick={() => { downloadReport(r); notify("HTML 报告已导出"); }}>下载</button>{r.status === "待复核" && <button className="rm-link" onClick={() => { setReviewId(r.id); setReviewNote(""); }}>复核</button>}{r.status === "已复核" && <button className="rm-link" onClick={() => setArchiveId(r.id)}>归档</button>}</div> },
      ]} empty={<RMEmpty text="暂无匹配报告，请调整筛选或新建报告" />} />
      <Pager count={rows.length} page={safePage} onChange={setPage} />
    </RMPanel>
    <div className="op-delivery-note"><FileCheck2 size={21} /><div><strong>证据随报告留存，交付过程可追溯</strong><p>报告采用生成时的演示数据快照，支持 HTML 下载与浏览器打印 / 另存为 PDF。疑似隐患与建议须经现场核查。</p></div></div>
    {generator && <ReportGenerator warnings={data.warnings} initial={generator} onClose={() => setGenerator(null)} onGenerate={generate} />}
    {preview && <OperationsDialog title="报告预览" onClose={() => setPreviewId(null)} footer={<><RMBadge>{preview.status}</RMBadge><button className="rm-button" onClick={() => { downloadReport(preview); notify("HTML 报告已导出"); }}><ArrowDownToLine size={15} />下载 HTML</button><button className="rm-button rm-primary" onClick={() => printReport(preview)}><Printer size={15} />打印 / 另存 PDF</button></>}><iframe className="op-report-preview" title="检查报告正文" sandbox="" srcDoc={reportHtml(preview)} /></OperationsDialog>}
    {reviewId && <OperationsDialog title="报告专家复核（演示）" onClose={() => setReviewId(null)}><form className="rm-form-grid" onSubmit={e => { e.preventDefault(); review(); }}><div className="rm-note rm-full">请先预览报告，核对证据、风险描述和整改建议。复核通过后可归档。</div><label className="rm-full">复核意见<textarea aria-label="复核意见" required maxLength={1000} value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="记录证据完整性、整改建议及后续关注事项" /></label><div className="rm-form-footer"><button className="rm-button" type="button" onClick={() => { setPreviewId(reviewId); setReviewId(null); }}>返回预览</button><button type="submit" className="rm-button rm-primary" disabled={!reviewNote.trim()}>通过复核</button></div></form></OperationsDialog>}
    {archiveId && <OperationsDialog title="确认报告归档" onClose={() => setArchiveId(null)} footer={<><button className="rm-button" onClick={() => setArchiveId(null)}>取消</button><button className="rm-button rm-primary" onClick={() => { save({ ...data, reports: data.reports.map(r => r.id === archiveId && r.status === "已复核" ? { ...r, status: "已归档" } : r) }); setArchiveId(null); notify("报告已归档，可在已归档列表中查看"); }}>确认归档</button></>}><p>将归档「{data.reports.find(r => r.id === archiveId)?.title}」。归档后保留当前证据快照和复核意见，可继续预览、下载与打印。</p></OperationsDialog>}
  </>;
}
function ReportGenerator({ warnings, initial, onClose, onGenerate }: { warnings: OperationWarning[]; initial: { template: string; project: string }; onClose: () => void; onGenerate: (report: OperationReport) => void }) {
  const [project, setProject] = useState(initial.project);
  const [template, setTemplate] = useState(initial.template);
  const [start, setStart] = useState(operationsPeriod.start);
  const [end, setEnd] = useState(operationsPeriod.end);
  const [summary, setSummary] = useState("本次检查覆盖项目消防设施、疏散通道及用电环境，针对发现的疑似隐患，建议安排责任人核查并持续跟进整改。 ");
  const [selected, setSelected] = useState<string[]>(warnings.filter(w => w.project === initial.project && w.date >= start && w.date <= end).map(w => w.id));
  const candidates = warnings.filter(w => w.project === project && w.date >= start && w.date <= end);
  const evidence = candidates.filter(w => selected.includes(w.id));
  function changeScope(nextProject: string, nextStart: string, nextEnd: string) {
    setProject(nextProject); setStart(nextStart); setEnd(nextEnd);
    setSelected(warnings.filter(w => w.project === nextProject && w.date >= nextStart && w.date <= nextEnd).map(w => w.id));
  }
  return <OperationsDialog title="编制检查报告" onClose={onClose}><form className="rm-form-grid" onSubmit={e => { e.preventDefault(); if (!evidence.length || !summary.trim() || start > end) return; onGenerate({ id: `BG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, title: `${project}${template}`, project, template, start, end, summary: summary.trim(), createdAt: localTimestamp(), author: "当前演示用户", status: "待复核", evidence: JSON.parse(JSON.stringify(evidence)) }); }}>
    <label>报告模板<select aria-label="报告模板" value={template} onChange={e => setTemplate(e.target.value)}>{reportTemplates.map(t => <option key={t.name}>{t.name}</option>)}</select></label>
    <label>检查项目<select aria-label="检查项目" value={project} onChange={e => changeScope(e.target.value, start, end)}>{operationsProjects.map(p => <option key={p}>{p}</option>)}</select></label>
    <label>检查周期开始<input required type="date" value={start} max={end} onChange={e => changeScope(project, e.target.value, end)} /></label><label>检查周期结束<input required type="date" value={end} min={start} onChange={e => changeScope(project, start, e.target.value)} /></label>
    <label className="rm-full">检查概况 / 交付说明<textarea aria-label="检查概况 / 交付说明" required maxLength={1500} value={summary} onChange={e => setSummary(e.target.value)} /></label>
    <div className="rm-full"><div className="op-evidence-heading"><h3>纳入报告的证据</h3><span>已选 {evidence.length} / {candidates.length} 项</span><button type="button" className="rm-link" onClick={() => setSelected(evidence.length === candidates.length ? [] : candidates.map(w => w.id))}>{evidence.length === candidates.length ? "取消全选" : "全选"}</button></div>
      <div className="op-evidence-options">{candidates.map(w => <label key={w.id}><input type="checkbox" checked={selected.includes(w.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, w.id] : ids.filter(id => id !== w.id))} /><img src={w.image} alt={w.title} /><span>{w.title}<small>{w.id} · {w.date}</small></span><RMBadge>{w.risk}</RMBadge></label>)}</div>{!candidates.length && <RMEmpty text="该项目与检查周期没有可选证据，请调整条件" />}
    </div><p className="rm-note rm-full">生成后将保存所选证据快照并进入待复核状态。至少选择一项证据，所有材料均为演示数据。</p><div className="rm-form-footer"><button type="button" className="rm-button" onClick={onClose}>取消</button><button className="rm-button rm-primary" type="submit" disabled={!evidence.length || !summary.trim() || !start || !end || start > end}>生成并预览</button></div>
  </form></OperationsDialog>;
}
