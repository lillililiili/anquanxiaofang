import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Download, Expand, Layers3, Maximize, Minus, Network, Plus, Search, X } from "lucide-react";
import { graphCategories, graphEdges, graphNodes, relationRows, relatedKnowledge, riskAssessment, similarCases, topHazards, type GraphNode } from "../data/modelCenterHazardGraphMock";
import "./theme-prototype-graph.css";

type Filters = { project: string; type: string; risk: string; scene: string; date: string; keyword: string };
type Relation = typeof relationRows[number];
type AnalysisTab = "knowledge" | "cases" | "risk";
const defaultFilters: Filters = { project: "全部项目", type: "全部类型", risk: "全部等级", scene: "全部场景", date: "2025-05-16", keyword: "" };
const nodeTypes: Record<GraphNode["type"], string> = { center: "核心隐患", risk: "可能后果", hazard: "关联隐患", factor: "风险因素", basis: "检查依据", action: "治理措施" };
const positions: Record<string, [number, number]> = { center: [50, 46], fire: [83, 17], shock: [83, 39], cable: [83, 62], ground: [50, 16], door: [50, 82], duty: [17, 61], system: [17, 39], suggestion: [83, 84], basis: [17, 84], fault: [17, 17] };

function GraphButton({ children, onClick, icon: Icon, primary = false, disabled = false }: { children: ReactNode; onClick: () => void; icon?: ElementType; primary?: boolean; disabled?: boolean }) {
  return <button type="button" className={`ui-button ${primary ? "primary" : "secondary"}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={15} />}<span>{children}</span></button>;
}
function RiskBadge({ risk }: { risk: string }) {
  return <span className={`status-pill ${risk === "高风险" ? "danger" : risk === "中风险" ? "warning" : "success"}`}>{risk}</span>;
}
function downloadRelations(filename: string, rows: string[][]) {
  const csv = [["节点名称", "关系类型", "关联对象", "依据", "风险等级"], ...rows].map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function HazardGraphCompletePage({ notify }: { notify: (message: string) => void }) {
  const [selectedNode, setSelectedNode] = useState<GraphNode>(graphNodes[0]);
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [scale, setScale] = useState(1);
  const [category, setCategory] = useState("用电安全");
  const [indexOpen, setIndexOpen] = useState(() => window.innerWidth >= 1600);
  const [tab, setTab] = useState<AnalysisTab>("knowledge");
  const [relationType, setRelationType] = useState("全部关系");
  const [tableMode, setTableMode] = useState<"compact" | "expanded" | "collapsed">("compact");
  const [fullscreen, setFullscreen] = useState<"graph" | "table" | null>(null);
  const [modal, setModal] = useState<{ title: string; kind: "knowledge" | "case" | "missing" | "review" | "create"; text?: string } | null>(null);
  const [references, setReferences] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [graphName, setGraphName] = useState("配电室隐患关联图谱");
  const [newName, setNewName] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const inspectorRef = useRef<HTMLElement>(null);
  const graphRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1600px)");
    const update = () => setIndexOpen(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setModal(null); setFullscreen(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // This existing graph belongs to the electrical inspection example; unmatched contexts show an empty state.
  const matchesContext = ["全部项目", "齐鲁科技园"].includes(filters.project) && ["全部类型", "用电安全"].includes(filters.type) && ["全部场景", "配电室巡检"].includes(filters.scene) && (!filters.date || filters.date === "2025-05-16");
  const visibleNodes = graphNodes.filter((node) => matchesContext && (filters.risk === "全部等级" || node.risk === filters.risk) && (!filters.keyword.trim() || node.label.includes(filters.keyword.trim())));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graphEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target) && (relationType === "全部关系" || edge.relation === relationType));
  const visibleRows = relationRows.filter((row) => matchesContext && (filters.risk === "全部等级" || row[4] === filters.risk) && (!filters.keyword.trim() || row.slice(0, 3).some((value) => value.includes(filters.keyword.trim()))) && (relationType === "全部关系" || row[1] === relationType));
  const relationCounts = graphEdges.reduce<Record<string, number>>((counts, edge) => ({ ...counts, [edge.relation]: (counts[edge.relation] || 0) + 1 }), {});
  const selectedIsVisible = visibleIds.has(selectedNode.id);
  const setFilter = (key: keyof Filters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setSelectedRelation(null); setQueryMessage(""); };
  const selectNode = (node: GraphNode) => { setSelectedNode(node); setSelectedRelation(null); };
  const locate = (label: string, row?: Relation) => {
    const node = graphNodes.find((item) => item.label === label);
    if (!node) { setModal({ title: label, kind: "missing", text: "该高频隐患尚未纳入当前图谱，暂无关联明细。现有图谱与数据保持完整。" }); return; }
    setFilters(defaultFilters); setCategory("用电安全"); setRelationType("全部关系"); setScale(1);
    setSelectedNode(node); setSelectedRelation(row ?? null); setFullscreen(null);
    requestAnimationFrame(() => graphRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  const selectRelation = (row: Relation) => {
    setSelectedRelation(row);
    setSelectedNode(graphNodes.find((node) => node.label === row[2]) ?? graphNodes[0]);
    setTab("knowledge");
    requestAnimationFrame(() => inspectorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  const reset = () => { setFilters(defaultFilters); setCategory("用电安全"); setSelectedNode(graphNodes[0]); setSelectedRelation(null); setScale(1); setRelationType("全部关系"); setQueryMessage("已恢复默认筛选"); };
  const addReference = (item: string) => { setReferences((current) => current.includes(item) ? current : [...current, item]); };
  const exportRows = () => { downloadRelations("隐患关系明细.csv", visibleRows); notify(`已导出 ${visibleRows.length} 条关系`); };
  const selectedHint = selectedNode.id === "center" ? riskAssessment.hint : `${selectedNode.label}属于${nodeTypes[selectedNode.type]}，请结合当前关联关系、现场证据和检查依据进行复核。`;
  const selectedSuggestion = selectedNode.id === "center" ? riskAssessment.suggestion : `建议核查“${selectedNode.label}”及其与配电箱未关闭的关联，补充对应现场照片和检查记录后交由专家复核。`;

  const graphCanvas = <div className="gw-canvas" aria-label="隐患关系图谱">
    {visibleNodes.length ? <div className="gw-scene" style={{ transform: `scale(${scale})` }}>
      <svg className="gw-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {visibleEdges.map((edge) => { const from = positions[edge.source], to = positions[edge.target]; const active = selectedNode.id === edge.source || selectedNode.id === edge.target; return <line key={edge.id} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} className={active ? "active" : ""} />; })}
      </svg>
      {visibleNodes.map((node) => <button type="button" key={node.id} aria-label={`图谱节点：${node.label}`} aria-pressed={selectedNode.id === node.id} className={`gw-node ${node.type} ${selectedNode.id === node.id ? "selected" : ""} ${relationType !== "全部关系" && !visibleEdges.some((edge) => edge.source === node.id || edge.target === node.id) ? "muted" : ""}`} style={{ left: `${positions[node.id][0]}%`, top: `${positions[node.id][1]}%` }} onClick={() => selectNode(node)}><small>{nodeTypes[node.type]}</small><span>{node.label}</span></button>)}
    </div> : <div className="gw-empty"><Search size={26} /><strong>暂无匹配的图谱节点</strong><p>可调整筛选条件，或恢复现有图谱。</p><GraphButton onClick={reset}>重置筛选</GraphButton></div>}
    <div className="gw-canvas-caption"><i />{visibleNodes.length} 个节点 · {visibleEdges.length} 条关系<span>点击节点联动右侧详情</span></div>
  </div>;
  const graphControls = <div className="gw-controls"><button type="button" aria-label="放大图谱" disabled={scale >= 1.5} onClick={() => setScale((value) => Math.min(1.5, value + .1))}><Plus size={16} /></button><span>{Math.round(scale * 100)}%</span><button type="button" aria-label="缩小图谱" disabled={scale <= .7} onClick={() => setScale((value) => Math.max(.7, value - .1))}><Minus size={16} /></button><button type="button" onClick={() => setScale(1)}>适配</button><button type="button" aria-label={fullscreen === "graph" ? "退出图谱全屏" : "图谱全屏"} onClick={() => setFullscreen(fullscreen === "graph" ? null : "graph")}>{fullscreen === "graph" ? <X size={16} /> : <Maximize size={16} />}</button></div>;
  const relationTable = <div className={`gw-table-scroll ${tableMode === "expanded" ? "expanded" : ""}`} key={tableMode}>
    <table className="gw-table"><colgroup><col style={{ width: "16%" }} /><col style={{ width: "10%" }} /><col style={{ width: "16%" }} /><col /><col style={{ width: 90 }} /><col style={{ width: 164 }} /></colgroup><thead><tr>{["节点名称", "关系类型", "关联对象", "依据", "风险等级", "操作"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>
      {visibleRows.map((row) => <tr key={row.join("|")} className={selectedRelation === row ? "selected" : row.slice(0, 3).includes(selectedNode.label) ? "related" : ""} onClick={() => selectRelation(row)}>
        <td><button type="button" className="gw-text-action" onClick={(event) => { event.stopPropagation(); selectRelation(row); }}>{row[0]}</button></td><td>{row[1]}</td><td><span className="gw-cell-text" title={row[2]}>{row[2]}</span></td>
        <td><button type="button" className="gw-basis-link" title={row[3]} onClick={(event) => { event.stopPropagation(); selectRelation(row); setModal({ title: "检查依据", kind: "knowledge", text: row[3] }); }}>{row[3].replace(/^《[^》]+》\s*/, "")}</button></td><td><RiskBadge risk={row[4]} /></td>
        <td><div className="gw-row-actions"><button type="button" onClick={(event) => { event.stopPropagation(); selectRelation(row); setFullscreen(null); }}>查看详情</button><button type="button" onClick={(event) => { event.stopPropagation(); locate(row[2], row); }}>定位图谱</button></div></td>
      </tr>)}
      {!visibleRows.length && <tr><td colSpan={6} className="gw-table-empty">暂无匹配关系，可切换关系类型或重置筛选。</td></tr>}
    </tbody></table>
  </div>;

  return <div className="page-stack graph-workbench-page">
    <div className="page-header"><div><div className="eyebrow">AI PLATFORM / 08</div><h1>隐患图谱</h1><p>查看隐患、风险、依据与整改之间的关联，点击节点联动分析。</p></div><div className="page-actions"><GraphButton icon={Download} onClick={() => { downloadRelations(`${graphName}.csv`, relationRows); notify("图谱关系已导出"); }}>导出图谱</GraphButton><GraphButton primary icon={Plus} onClick={() => { setNewName(""); setModal({ title: "新建图谱", kind: "create" }); }}>新建图谱</GraphButton></div></div>
    <form className="gw-filters" onSubmit={(event) => { event.preventDefault(); setQueryMessage(`已查询：${visibleNodes.length} 个节点、${visibleRows.length} 条明细`); }}>
      <label className="gw-search"><span>搜索节点</span><div><Search size={16} /><input value={filters.keyword} onChange={(event) => setFilter("keyword", event.target.value)} placeholder="隐患名称或节点名称" /></div></label>
      <label><span>项目</span><select value={filters.project} onChange={(event) => setFilter("project", event.target.value)}>{["全部项目", "齐鲁科技园", "国控大厦项目"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>隐患类型</span><select value={filters.type} onChange={(event) => { setFilter("type", event.target.value); setCategory(event.target.value === "全部类型" ? "用电安全" : event.target.value); }}>{["全部类型", ...graphCategories.map(([name]) => name)].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>风险等级</span><select value={filters.risk} onChange={(event) => setFilter("risk", event.target.value)}>{["全部等级", "高风险", "中风险", "低风险"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>适用场景</span><select value={filters.scene} onChange={(event) => setFilter("scene", event.target.value)}>{["全部场景", "配电室巡检", "动火临电"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>检查时间</span><input type="date" value={filters.date} onChange={(event) => setFilter("date", event.target.value)} /></label>
      <div className="gw-filter-actions"><button type="submit" className="ui-button primary">查询</button><GraphButton onClick={reset}>重置</GraphButton></div>
      {queryMessage && <span className="gw-query-result" role="status">{queryMessage}</span>}
    </form>
    <div className="gw-workspace-toolbar"><button type="button" className="gw-index-toggle" aria-expanded={indexOpen} onClick={() => setIndexOpen(!indexOpen)}><Layers3 size={16} />{indexOpen ? "收起分类" : "分类与高频隐患"}{indexOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button><span>{graphName}<small>齐鲁科技园 · 配电室巡检</small></span><span className="gw-source-note">已引用 {references.length} 项</span></div>
    <div className={`gw-workspace ${indexOpen ? "index-open" : ""}`}>
      {indexOpen && <aside className="gw-index" aria-label="图谱分类与高频隐患"><header><h2>图谱分类</h2><button type="button" aria-label="收起分类面板" onClick={() => setIndexOpen(false)}><X size={16} /></button></header><div className="gw-category-list">{graphCategories.map(([name, count]) => <button type="button" key={name} className={category === name ? "active" : ""} onClick={() => { setCategory(name); setFilter("type", name); }}><span>{name}</span><small>{count}</small></button>)}</div><h3>高频隐患 <span>TOP 10</span></h3><div className="gw-top-list">{topHazards.map((name, index) => <button type="button" key={name} className={selectedNode.label === name ? "active" : ""} onClick={() => locate(name)}><em>{index + 1}</em><span>{name}</span></button>)}</div></aside>}
      <section className="gw-graph-card" ref={graphRef}><header className="gw-panel-head"><h2><Network size={17} />图谱画布</h2>{graphControls}</header>{graphCanvas}<div className="gw-relation-filters" aria-label="关系类型筛选"><button type="button" className={relationType === "全部关系" ? "active" : ""} onClick={() => setRelationType("全部关系")}>全部关系 <span>{graphEdges.length}</span></button>{Object.entries(relationCounts).map(([name, count]) => <button type="button" key={name} aria-pressed={relationType === name} className={relationType === name ? "active" : ""} onClick={() => { setRelationType(name); setSelectedRelation(null); }}>{name} <span>{count}</span></button>)}</div></section>
      <aside className="gw-inspector" ref={inspectorRef} aria-label="节点详情与分析">
        <div className="gw-selected-summary"><div className="gw-summary-caption"><span>{selectedRelation ? "已选关系" : "当前节点"}</span><RiskBadge risk={selectedRelation?.[4] ?? selectedNode.risk} /></div><h2>{selectedNode.label}</h2><p>{selectedIsVisible ? nodeTypes[selectedNode.type] : "当前筛选未包含此节点"} · {graphEdges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length} 条直接关联</p>{selectedRelation && <div className="gw-selected-relation"><span>{selectedRelation[0]}</span><small>{selectedRelation[1]} <ArrowRight size={12} /></small><span>{selectedRelation[2]}</span></div>}</div>
        <div className="gw-tabs" role="tablist" aria-label="节点分析">{([["knowledge", "知识依据"], ["cases", "相似案例"], ["risk", "风险评估"]] as const).map(([id, label]) => <button type="button" role="tab" id={`graph-tab-${id}`} aria-controls={`graph-panel-${id}`} aria-selected={tab === id} key={id} onClick={() => setTab(id)}>{label}</button>)}</div>
        <div className="gw-inspector-body" key={`${tab}-${selectedNode.id}-${selectedRelation?.[3] ?? ""}`} role="tabpanel" id={`graph-panel-${tab}`} aria-labelledby={`graph-tab-${tab}`}>
          {tab === "knowledge" && <>{selectedRelation && <article className="gw-selected-basis"><small>当前关系依据</small><p>{selectedRelation[3]}</p><button type="button" className="gw-text-action" onClick={() => setModal({ title: "检查依据", kind: "knowledge", text: selectedRelation[3] })}>查看完整依据 <ArrowRight size={13} /></button></article>}<p className="gw-context-label">当前图谱关联知识 · {relatedKnowledge.length} 项</p>{relatedKnowledge.map((item, index) => <article className="gw-analysis-item" key={item}><span className="gw-item-index">{index + 1}</span><div><p>{item}</p><div className="gw-item-actions"><button type="button" onClick={() => setModal({ title: "检查依据", kind: "knowledge", text: item })}>查看条款</button><button type="button" disabled={references.includes(item)} onClick={() => addReference(item)}>{references.includes(item) ? "已引用" : "加入引用"}</button></div></div></article>)}</>}
          {tab === "cases" && <><p className="gw-context-label">当前图谱相似案例 · {similarCases.length} 项</p>{similarCases.map((item, index) => <article className="gw-analysis-item" key={item}><span className="gw-item-index">{index + 1}</span><div><p>{item}</p><div className="gw-item-actions"><button type="button" onClick={() => setModal({ title: "相似案例", kind: "case", text: item })}>查看案例</button><button type="button" disabled={references.includes(item)} onClick={() => addReference(item)}>{references.includes(item) ? "已引用" : "引用案例"}</button></div></div></article>)}</>}
          {tab === "risk" && <><div className="gw-risk-score"><strong>{riskAssessment.score}</strong><span>/ 100<br />当前图谱风险评分</span><RiskBadge risk={riskAssessment.level} /></div><h3>风险提示</h3><p>{selectedHint}</p><h3>建议措施</h3><p>{selectedSuggestion}</p><div className="gw-risk-actions"><GraphButton primary onClick={() => setSuggestions((items) => items.includes(selectedNode.id) ? items : [...items, selectedNode.id])}>{suggestions.includes(selectedNode.id) ? "更新整改建议" : "生成整改建议"}</GraphButton><GraphButton onClick={() => setModal({ title: "建议专家复核", kind: "review", text: selectedNode.label })}>建议专家复核</GraphButton></div>{suggestions.includes(selectedNode.id) && <div className="gw-result-card"><Check size={16} /><div><strong>整改建议已生成</strong><p>{selectedSuggestion}</p></div></div>}{reviewed.includes(selectedNode.id) && <div className="gw-result-card"><Check size={16} /><span>已加入本地图谱专家复核清单</span></div>}</>}
        </div>
        <footer className="gw-inspector-foot"><BookOpen size={14} />已引用 {references.length} 项 · 已生成 {suggestions.length} 条建议</footer>
      </aside>
    </div>
    <section className="gw-relations-card" aria-label="关系明细表"><header className="gw-panel-head"><div><h2>关系明细表 <span>{visibleRows.length} 条</span></h2><p>选择明细联动图谱与右侧依据</p></div><div className="gw-table-actions"><button type="button" onClick={exportRows}><Download size={14} />导出表格</button><button type="button" onClick={() => setTableMode(tableMode === "expanded" ? "compact" : "expanded")}><Expand size={14} />{tableMode === "expanded" ? "紧凑显示" : "展开表格"}</button><button type="button" onClick={() => setFullscreen("table")}><Maximize size={14} />全屏</button><button type="button" aria-expanded={tableMode !== "collapsed"} onClick={() => setTableMode(tableMode === "collapsed" ? "compact" : "collapsed")}><ChevronDown size={14} />{tableMode === "collapsed" ? "显示表格" : "收起表格"}</button></div></header>{tableMode !== "collapsed" && <>{relationTable}<footer className="gw-table-foot"><span>依据显示编号与条款，点击可查看完整内容</span><span>拖动右下角可调整表格高度</span></footer></>}</section>
    {fullscreen && <div className="gw-fullscreen" role="dialog" aria-modal="true" aria-label={fullscreen === "graph" ? "图谱全屏查看" : "关系表全屏查看"}><header className="gw-panel-head"><h2>{fullscreen === "graph" ? graphName : "关系明细表"}</h2>{fullscreen === "graph" ? graphControls : <div className="gw-table-actions"><button type="button" onClick={exportRows}>导出表格</button><button type="button" onClick={() => setFullscreen(null)}><X size={17} />退出全屏</button></div>}</header>{fullscreen === "graph" ? graphCanvas : relationTable}<p className="gw-fullscreen-note">按 Esc 退出全屏{fullscreen === "graph" ? ` · 当前选择：${selectedNode.label}` : ""}</p></div>}
    {modal && <div className="modal-backdrop gw-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="graph-modal-title"><header className="modal-head"><h2 id="graph-modal-title">{modal.title}</h2><button type="button" aria-label="关闭弹窗" onClick={() => setModal(null)}><X size={18} /></button></header>
      {modal.kind === "create" ? <><label className="field"><span>图谱名称</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="请输入新图谱名称" maxLength={40} /></label><p>基于当前图谱创建本地副本，保留 {graphNodes.length} 个节点、{graphEdges.length} 条关系和全部关联资料。</p></> : <><h3>{modal.text}</h3>{modal.kind === "knowledge" && <><p>关联隐患：{selectedRelation?.[0] ?? "配电箱未关闭"}</p><p>用途：支持当前图谱的现场核查与整改复核。</p><p className="gw-modal-note">当前原型保留规范名称和条款索引，未收录条款全文。</p></>}{modal.kind === "case" && <><p>关联节点：配电箱未关闭、线缆裸露、接地异常。</p><p>复核关注：箱门状态、线缆防护、接地情况及整改后照片。</p><p className="gw-modal-note">当前原型提供案例索引，可加入本次分析引用。</p></>}{modal.kind === "review" && <p>将该节点、相关关系及已引用的 {references.length} 项资料加入本地专家复核清单。</p>}</>}
      <footer className="modal-foot"><GraphButton onClick={() => setModal(null)}>关闭</GraphButton>{modal.kind === "create" && <GraphButton primary disabled={!newName.trim()} onClick={() => { setGraphName(newName.trim()); setModal(null); reset(); }}>创建图谱</GraphButton>}{["knowledge", "case"].includes(modal.kind) && <GraphButton primary disabled={references.includes(modal.text!)} onClick={() => { addReference(modal.text!); setModal(null); }}>{references.includes(modal.text!) ? "已引用" : "加入引用"}</GraphButton>}{modal.kind === "review" && <GraphButton primary onClick={() => { setReviewed((items) => items.includes(selectedNode.id) ? items : [...items, selectedNode.id]); setModal(null); }}>确认加入复核</GraphButton>}</footer>
    </div></div>}
  </div>;
}
