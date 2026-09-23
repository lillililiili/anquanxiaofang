import { BookOpen, CheckCircle2, ChevronDown, Download, FileText, GitBranch, Network, Plus, RefreshCw, Search, Settings, ShieldAlert, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { knowledgeCategories as knowledgeSeed, knowledgeDocuments as knowledgeDocsSeed, recentKnowledgeUpdates, type KnowledgeCategory, type KnowledgeDocument } from "../data/modelCenterKnowledgeMock";
import { graphCategories, graphEdges, graphNodes, relatedKnowledge, relationRows, riskAssessment, similarCases, topHazards, type GraphNode } from "../data/modelCenterHazardGraphMock";
import { expertRules as expertRuleSeed, ruleCategories, ruleVersions, testResultMock, type ExpertRule } from "../data/modelCenterExpertRulesMock";

type ToastSetter = (message: string) => void;

function LocalModal({ title, children, footer, onClose }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="mc-modal-backdrop">
      <section className="mc-modal">
        <header><h3>{title}</h3><button onClick={onClose}><X size={18} /></button></header>
        <div className="mc-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

function CenterTopbar({ section }: { section: string }) {
  return (
    <header className="mc-topbar">
      <div><span>首页 / 大模型中台 / {section}</span><h1>{section}</h1></div>
      <label><input placeholder="搜索知识、隐患、依据、案例" /><Search size={18} /></label>
      <button><ShieldAlert size={18} /><em>8</em></button>
      <button><BookOpen size={18} />帮助中心</button>
      <button>系统管理员<ChevronDown size={16} /></button>
      <time>2025-05-16 15:30:00</time>
    </header>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="mc-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="mc-field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function MiniBadge({ label }: { label: string }) {
  const cls = label.includes("高") ? "danger" : label.includes("中") ? "warning" : label.includes("停用") || label.includes("待") ? "muted" : "success";
  return <span className={`mc-badge ${cls}`}>{label}</span>;
}

export function KnowledgePage({ setToast }: { setToast: ToastSetter }) {
  const [categories, setCategories] = useState<KnowledgeCategory[]>(knowledgeSeed);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(knowledgeDocsSeed);
  const [selectedCategory, setSelectedCategory] = useState(knowledgeSeed[0].name);
  const [selectedId, setSelectedId] = useState(knowledgeDocsSeed[0].id);
  const [keyword, setKeyword] = useState("");
  const [kbType, setKbType] = useState("全部");
  const [docType, setDocType] = useState("全部");
  const [updateStatus, setUpdateStatus] = useState("全部");
  const [scene, setScene] = useState("全部");
  const [modal, setModal] = useState<null | "create" | "upload" | "preview" | "edit" | "hazard" | "graph">(null);
  const [moreId, setMoreId] = useState("");
  const [newKbName, setNewKbName] = useState("");
  const [newDocType, setNewDocType] = useState("标准规范");
  const filteredDocs = useMemo(() => documents.filter((item) => {
    const text = `${item.title}${item.category}${item.keywords.join("")}${item.scene}`;
    return item.category === selectedCategory
      && (updateStatus === "全部" || item.status === updateStatus)
      && (scene === "全部" || item.scene.includes(scene))
      && (!keyword.trim() || text.includes(keyword.trim()))
      && (docType === "全部" || item.title.includes(docType) || item.keywords.includes(docType));
  }), [documents, selectedCategory, keyword, docType, updateStatus, scene]);
  const selectedDoc = documents.find((item) => item.id === selectedId) ?? filteredDocs[0] ?? documents[0];

  const query = () => {
    if (filteredDocs[0]) setSelectedId(filteredDocs[0].id);
    setToast("查询完成");
  };
  const reset = () => {
    setSelectedCategory(knowledgeSeed[0].name);
    setKeyword("");
    setKbType("全部");
    setDocType("全部");
    setUpdateStatus("全部");
    setScene("全部");
    setSelectedId(knowledgeDocsSeed[0].id);
    setToast("筛选条件已重置");
  };
  const sync = () => {
    setCategories((items) => items.map((item) => item.name === selectedCategory ? { ...item, status: "同步中" } : item));
    window.setTimeout(() => {
      setCategories((items) => items.map((item) => item.name === selectedCategory ? { ...item, status: "已更新" } : item));
      setToast("知识库同步完成");
    }, 1000);
  };
  const upload = () => {
    const doc: KnowledgeDocument = { ...knowledgeDocsSeed[0], id: `KD-${Date.now()}`, title: `${selectedCategory}补充${newDocType} ${documents.length + 1}`, category: selectedCategory, version: "2025版", updatedAt: "2025-05-16 15:30:00", status: "已更新", citations: 0 };
    setDocuments((items) => [doc, ...items]);
    setSelectedId(doc.id);
    setModal(null);
    setToast("文档已上传");
  };
  const deleteDoc = (id: string) => {
    if (!window.confirm("确认删除该知识文档？")) return;
    setDocuments((items) => items.filter((item) => item.id !== id));
    setSelectedId(documents.find((item) => item.id !== id)?.id ?? "");
    setToast("文档已删除");
  };

  return (
    <section className="mc-page knowledge-page">
      <CenterTopbar section="知识库" />
      <div className="mc-filterbar">
        <SelectField label="知识库类型" value={kbType} options={["全部", "消防安全", "用电安全", "物业安全", "工贸企业"]} onChange={setKbType} />
        <SelectField label="文档类型" value={docType} options={["全部", "标准规范", "典型案例", "检查依据", "整改方案"]} onChange={setDocType} />
        <SelectField label="更新状态" value={updateStatus} options={["全部", "已更新", "有效", "待更新"]} onChange={setUpdateStatus} />
        <SelectField label="适用场景" value={scene} options={["全部", "配电", "消防", "巡检", "验收"]} onChange={setScene} />
        <TextField label="关键词" value={keyword} placeholder="请输入关键词" onChange={setKeyword} />
        <button className="primary-btn" onClick={query}>查询</button><button className="secondary-btn" onClick={reset}>重置</button>
        <button className="primary-btn" onClick={() => setModal("create")}>新建知识库</button><button className="secondary-btn" onClick={sync}><RefreshCw size={16} />同步知识库</button><button className="primary-btn" onClick={() => setModal("upload")}><Upload size={16} />上传文档</button>
      </div>
      <div className="mc-stat-grid">{[["知识库总数", "6 个"], ["文档总数", "6,421 篇"], ["标准规范", "1,286 条"], ["典型案例", "2,340 条"], ["今日检索", "856 次"], ["命中率", "92.3%"]].map(([label, value]) => <article key={label}><BookOpen size={28} /><span>{label}</span><strong>{value}</strong></article>)}</div>
      <div className="knowledge-layout">
        <aside className="mc-card knowledge-tree"><header><h3><BookOpen size={18} />知识库分类</h3></header>{categories.map((item) => <button key={item.id} className={selectedCategory === item.name ? "active" : ""} onClick={() => { setSelectedCategory(item.name); const first = documents.find((doc) => doc.category === item.name); if (first) setSelectedId(first.id); }}><span>{item.name}</span><b>{item.count.toLocaleString()}</b><MiniBadge label={item.status} /></button>)}</aside>
        <section className="mc-card knowledge-table"><header><h3><FileText size={18} />知识文档</h3><Settings size={18} /></header><div className="mc-table-wrap"><table><thead><tr>{["文档标题", "所属分类", "关键词", "版本", "更新时间", "状态", "操作"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{filteredDocs.map((doc) => <tr key={doc.id} className={selectedId === doc.id ? "selected" : ""}><td>{doc.title}</td><td>{doc.category}</td><td>{doc.keywords.join("、")}</td><td>{doc.version}</td><td>{doc.updatedAt}</td><td><MiniBadge label={doc.status} /></td><td className="table-actions"><button onClick={() => setSelectedId(doc.id)}>查看</button><button onClick={() => setToast("已加入引用列表")}>引用</button><button onClick={() => setMoreId(moreId === doc.id ? "" : doc.id)}>更多</button>{moreId === doc.id && <div className="row-menu"><button onClick={() => { setSelectedId(doc.id); setModal("edit"); }}>编辑</button><button onClick={() => setModal("hazard")}>关联隐患</button><button onClick={() => setToast("文档已下载")}>下载</button><button onClick={() => deleteDoc(doc.id)}>删除</button></div>}</td></tr>)}</tbody></table></div></section>
        <aside className="mc-card knowledge-detail"><header><h3><BookOpen size={18} />知识详情</h3></header><dl><dt>文档名称</dt><dd>{selectedDoc.title}</dd><dt>所属分类</dt><dd>{selectedDoc.category}</dd><dt>版本</dt><dd>{selectedDoc.version}</dd><dt>发布单位</dt><dd>{selectedDoc.publisher}</dd><dt>适用场景</dt><dd>{selectedDoc.scene}</dd><dt>关键条款</dt><dd>{selectedDoc.clauses}</dd><dt>命中隐患标签</dt><dd>{selectedDoc.hazardTags.map((tag) => <em key={tag}>{tag}</em>)}</dd><dt>引用次数</dt><dd>{selectedDoc.citations} 次</dd><dt>最近更新时间</dt><dd>{selectedDoc.updatedAt}</dd></dl><p>{selectedDoc.summary}</p><footer><button className="primary-btn" onClick={() => setModal("preview")}>查看原文</button><button className="secondary-btn" onClick={() => setToast("已加入当前检查依据引用")}>加入引用</button><button className="secondary-btn" onClick={() => setModal("graph")}>关联隐患图谱</button></footer></aside>
      </div>
      <section className="mc-card update-table"><header><h3>最近更新记录</h3><button>查看更多</button></header><div className="mc-table-wrap"><table><thead><tr>{["更新时间", "文档标题", "所属分类", "更新内容", "操作人"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{recentKnowledgeUpdates.map((row) => <tr key={row.join("")}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></section>
      {modal === "create" && <LocalModal title="新建知识库" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { const name = newKbName || "新增安全检查知识库"; setCategories((items) => [...items, { id: `kb-${Date.now()}`, name, count: 0, status: "已更新", type: "安全检查", scene: "综合巡检" }]); setSelectedCategory(name); setModal(null); setToast("知识库已新建"); }}>确认新建</button></>}><div className="mc-form-grid"><TextField label="知识库名称" value={newKbName} onChange={setNewKbName} /><SelectField label="类型" value={kbType} options={["消防安全", "用电安全", "物业安全"]} onChange={setKbType} /><SelectField label="适用场景" value={scene} options={["配电室巡检", "消防巡检", "企业自查"]} onChange={setScene} /><TextField label="负责人" value="系统管理员" onChange={() => null} /><label className="mc-field wide"><span>描述</span><textarea defaultValue="用于安全检查依据检索、AI识别校验和整改建议生成。" /></label></div></LocalModal>}
      {modal === "upload" && <LocalModal title="上传文档" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={upload}>确认上传</button></>}><div className="mc-form-grid"><SelectField label="文档类型" value={newDocType} options={["标准规范", "典型案例", "检查依据", "整改方案"]} onChange={setNewDocType} /><SelectField label="所属知识库" value={selectedCategory} options={categories.map((item) => item.name)} onChange={setSelectedCategory} /><button className="upload-box"><Upload />选择本地文件</button></div></LocalModal>}
      {modal === "preview" && <LocalModal title="原文预览" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => setModal(null)}>关闭</button>}><article className="doc-preview"><h2>{selectedDoc.title}</h2><p>{selectedDoc.summary}</p><p>{selectedDoc.clauses}</p></article></LocalModal>}
      {["edit", "hazard", "graph"].includes(modal ?? "") && <LocalModal title={modal === "edit" ? "编辑文档" : modal === "hazard" ? "关联隐患" : "关联隐患图谱"} onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => { setModal(null); setToast("操作已保存"); }}>确认</button>}><p className="modal-note">当前文档：{selectedDoc.title}</p></LocalModal>}
    </section>
  );
}

export function HazardGraphPage({ setToast }: { setToast: ToastSetter }) {
  const [selectedNode, setSelectedNode] = useState<GraphNode>(graphNodes[0]);
  const [scale, setScale] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [modal, setModal] = useState<null | "create" | "fullscreen" | "relation" | "knowledge" | "case">(null);
  const [activeCategory, setActiveCategory] = useState("用电安全");
  const nodes = graphNodes.filter((node) => !keyword.trim() || node.label.includes(keyword.trim()) || node.id === "center");
  const locate = (label: string) => {
    const node = graphNodes.find((item) => item.label === label) ?? graphNodes[0];
    setSelectedNode(node);
    setKeyword("");
    setToast(`已定位：${node.label}`);
  };
  return (
    <section className="mc-page graph-page">
      <CenterTopbar section="隐患图谱" />
      <div className="mc-filterbar">
        <SelectField label="项目" value="全部项目" options={["全部项目", "齐鲁科技园", "国控大厦项目"]} onChange={() => null} />
        <SelectField label="隐患类型" value="全部类型" options={["全部类型", "用电安全", "消防设施", "临时用电"]} onChange={() => null} />
        <SelectField label="风险等级" value="全部等级" options={["全部等级", "高风险", "中风险", "低风险"]} onChange={() => null} />
        <SelectField label="适用场景" value="全部场景" options={["全部场景", "配电室巡检", "动火临电"]} onChange={() => null} />
        <label className="mc-field"><span>检查时间</span><input type="date" defaultValue="2025-05-16" /></label>
        <TextField label="隐患名称或节点名称" value={keyword} placeholder="请输入隐患名称或节点名称" onChange={setKeyword} />
        <button className="primary-btn" onClick={() => setToast("查询完成")}>查询</button><button className="secondary-btn" onClick={() => { setKeyword(""); setSelectedNode(graphNodes[0]); setScale(1); setToast("已恢复默认中心节点"); }}>重置</button><button className="primary-btn" onClick={() => setModal("create")}>新建图谱</button><button className="secondary-btn" onClick={() => setToast("图谱已导出")}><Download size={16} />导出图谱</button>
      </div>
      <div className="graph-layout">
        <aside className="mc-card graph-left"><section><h3><Network size={18} />图谱分类</h3>{graphCategories.map(([name, count]) => <button key={name} className={activeCategory === name ? "active" : ""} onClick={() => { setActiveCategory(name); locate(name === "消防设施" ? "灭火器压力不足" : "配电箱未关闭"); }}><span>{name}</span><b>{count}</b></button>)}</section><section><h3><ShieldAlert size={18} />高频隐患 TOP10</h3>{topHazards.map((name, index) => <button key={name} onClick={() => locate(name)}><em>{index + 1}</em>{name}</button>)}</section></aside>
        <main className="graph-center">
          <section className="mc-card graph-canvas-card"><header><h3>图谱画布</h3><div><button onClick={() => setScale((value) => Math.min(1.4, value + 0.1))}>放大</button><button onClick={() => setScale((value) => Math.max(0.7, value - 0.1))}>缩小</button><button onClick={() => setScale(1)}>适配</button><button onClick={() => setModal("fullscreen")}>全屏</button></div></header><div className="graph-canvas" style={{ transform: `scale(${scale})` }}><svg viewBox="0 0 100 100" preserveAspectRatio="none">{graphEdges.map((edge) => { const s = graphNodes.find((node) => node.id === edge.source)!; const t = graphNodes.find((node) => node.id === edge.target)!; return <line key={edge.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y} className={selectedNode.id === edge.target || selectedNode.id === edge.source ? "active" : ""} />; })}</svg>{nodes.map((node) => <button key={node.id} className={`graph-node ${node.type} ${selectedNode.id === node.id ? "active" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelectedNode(node)}>{node.label}</button>)}</div><footer>{graphEdges.slice(0, 7).map((edge) => <span key={edge.id}>{edge.relation}</span>)}</footer></section>
          <section className="mc-card relation-table"><header><h3>关系明细表</h3><button onClick={() => setToast("表格已导出")}>导出表格</button></header><div className="mc-table-wrap"><table><thead><tr>{["节点名称", "关系类型", "关联对象", "依据", "风险等级", "操作"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{relationRows.map((row) => <tr key={row.join("")}>{row.map((cell, index) => <td key={index}>{index === 4 ? <MiniBadge label={cell} /> : cell}</td>)}<td><button onClick={() => setModal("relation")}>查看详情</button><button onClick={() => locate(row[2])}>定位图谱</button></td></tr>)}</tbody></table></div></section>
        </main>
        <aside className="graph-right"><section className="mc-card"><h3><BookOpen size={18} />关联知识</h3>{relatedKnowledge.map((item) => <p key={item}><FileText size={15} />{item}<button onClick={() => setModal("knowledge")}>查看条款</button><button onClick={() => setToast("已加入引用")}>加入引用</button></p>)}</section><section className="mc-card"><h3>相似案例</h3>{similarCases.map((item) => <p key={item}><FileText size={15} />{item}<button onClick={() => setModal("case")}>查看案例</button><button onClick={() => setToast("案例已引用")}>引用案例</button></p>)}</section><section className="mc-card risk-hint"><h3>风险提示</h3><strong>{riskAssessment.score}<small>/100</small></strong><p>风险等级：<b>{riskAssessment.level}</b></p><p>{riskAssessment.hint}</p><p>{riskAssessment.suggestion}</p><footer><button className="primary-btn" onClick={() => setToast("整改建议已生成")}>生成整改建议</button><button className="secondary-btn" onClick={() => setToast("已建议专家复核")}>建议专家复核</button></footer></section></aside>
      </div>
      {modal && <LocalModal title={modal === "create" ? "新建图谱" : modal === "fullscreen" ? "图谱全屏查看" : modal === "relation" ? "关系详情" : modal === "knowledge" ? "条款详情" : "案例详情"} onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => setModal(null)}>确认</button>}><p className="modal-note">当前节点：{selectedNode.label}</p>{modal === "fullscreen" && <div className="graph-full-preview">配电箱未关闭 · 隐患—风险—依据—整改建议—案例</div>}</LocalModal>}
    </section>
  );
}

export function ExpertRulesPage({ setToast }: { setToast: ToastSetter }) {
  const [rules, setRules] = useState<ExpertRule[]>(expertRuleSeed);
  const [selectedId, setSelectedId] = useState(expertRuleSeed[0].id);
  const [category, setCategory] = useState("全部规则");
  const [keyword, setKeyword] = useState("");
  const [risk, setRisk] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [editing, setEditing] = useState(false);
  const [moreId, setMoreId] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [modal, setModal] = useState<null | "create" | "test" | "version" | "compare">(null);
  const filteredRules = rules.filter((rule) => (category === "全部规则" || rule.category === category) && (risk === "全部" || rule.risk === risk) && (status === "全部" || rule.status === status) && (!keyword.trim() || `${rule.id}${rule.name}${rule.condition}`.includes(keyword.trim())));
  const selected = rules.find((rule) => rule.id === selectedId) ?? rules[0];
  const updateSelected = (patch: Partial<ExpertRule>, message: string) => {
    setRules((items) => items.map((rule) => rule.id === selected.id ? { ...rule, ...patch } : rule));
    setToast(message);
  };
  const copyRule = (rule: ExpertRule) => {
    const next = { ...rule, id: `EX-RULE-${String(rules.length + 1).padStart(4, "0")}`, name: `${rule.name}副本`, status: "草稿" as const };
    setRules((items) => [next, ...items]);
    setSelectedId(next.id);
    setToast("规则已复制为草稿");
  };
  const deleteRule = (id: string) => {
    if (!window.confirm("确认删除该专家规则？")) return;
    setRules((items) => items.filter((rule) => rule.id !== id));
    setSelectedId(rules.find((rule) => rule.id !== id)?.id ?? "");
    setToast("规则已删除");
  };
  return (
    <section className="mc-page rules-page">
      <CenterTopbar section="专家规则库" />
      <div className="mc-filterbar">
        <SelectField label="规则类别" value={category} options={ruleCategories.map(([name]) => name)} onChange={setCategory} /><SelectField label="适用场景" value="全部" options={["全部", "配电室巡检", "消防设施巡检", "动火临电检查"]} onChange={() => null} /><SelectField label="风险等级" value={risk} options={["全部", "高风险", "中风险", "低风险"]} onChange={setRisk} /><SelectField label="状态" value={status} options={["全部", "已发布", "已停用", "草稿"]} onChange={setStatus} /><TextField label="关键词" value={keyword} placeholder="请输入规则名称/编号/命中条件" onChange={setKeyword} />
        <button className="primary-btn" onClick={() => setToast("查询完成")}>查询</button><button className="secondary-btn" onClick={() => { setCategory("全部规则"); setRisk("全部"); setStatus("全部"); setKeyword(""); setToast("筛选条件已重置"); }}>重置</button><button className="primary-btn" onClick={() => setModal("create")}><Plus size={16} />新增规则</button><button className="secondary-btn" onClick={() => setBatchOpen((v) => !v)}>批量操作<ChevronDown size={16} /></button><button className="secondary-btn" onClick={() => setAdvanced((v) => !v)}>筛选</button>{batchOpen && <div className="batch-menu"><button onClick={() => { setRules((items) => items.map((rule) => ({ ...rule, status: "已发布" }))); setToast("已批量启用"); }}>批量启用</button><button onClick={() => { setRules((items) => items.map((rule) => ({ ...rule, status: "已停用" }))); setToast("已批量停用"); }}>批量停用</button><button onClick={() => setToast("已批量发布")}>批量发布</button></div>}
      </div>
      {advanced && <div className="advanced-filter">高级筛选：命中来源、更新时间、专家组、是否重点整改。</div>}
      <div className="rules-layout">
        <aside className="mc-card rule-tree"><h3>规则分类</h3>{ruleCategories.map(([name, count]) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}><span>{name}</span><b>{count}</b></button>)}</aside>
        <section className="mc-card rule-table"><header><h3>规则列表 <small>共 {filteredRules.length} 条规则</small></h3><Settings size={18} /></header><div className="mc-table-wrap"><table><thead><tr>{["规则编号", "规则名称", "规则类别", "命中条件", "风险等级", "状态", "更新时间", "操作"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{filteredRules.map((rule) => <tr key={rule.id} className={selected.id === rule.id ? "selected" : ""}><td>{rule.id}</td><td>{rule.name}</td><td>{rule.category}</td><td>{rule.condition}</td><td><MiniBadge label={rule.risk} /></td><td><MiniBadge label={rule.status} /></td><td>{rule.updatedAt}</td><td className="table-actions"><button onClick={() => { setSelectedId(rule.id); setEditing(false); }}>查看</button><button onClick={() => { setSelectedId(rule.id); setEditing(true); }}>编辑</button><button onClick={() => { setSelectedId(rule.id); updateSelected({ status: rule.status === "已停用" ? "已发布" : "已停用" }, rule.status === "已停用" ? "规则已启用" : "规则已停用"); }}>{rule.status === "已停用" ? "启用" : "停用"}</button><button onClick={() => setMoreId(moreId === rule.id ? "" : rule.id)}>更多</button>{moreId === rule.id && <div className="row-menu"><button onClick={() => copyRule(rule)}>复制规则</button><button onClick={() => { setSelectedId(rule.id); setModal("test"); }}>测试规则</button><button onClick={() => setModal("version")}>查看版本</button><button onClick={() => deleteRule(rule.id)}>删除</button></div>}</td></tr>)}</tbody></table></div></section>
        <aside className="mc-card rule-detail"><header><h3>规则详情</h3><button onClick={() => setEditing((value) => !value)}>{editing ? "退出编辑" : "当前编辑"}</button></header><div className="rule-detail-form"><TextField label="规则编号" value={selected.id} onChange={() => null} /><TextField label="规则名称" value={selected.name} onChange={(value) => updateSelected({ name: value }, "规则名称已更新")} /><SelectField label="适用场景" value={selected.scene} options={["配电室巡检", "消防设施巡检", "动火临电检查"]} onChange={(value) => updateSelected({ scene: value }, "适用场景已更新")} /><SelectField label="风险等级" value={selected.risk} options={["高风险", "中风险", "低风险"]} onChange={(value) => updateSelected({ risk: value as ExpertRule["risk"] }, "风险等级已更新")} /><label className="switch-row"><span>状态开关</span><input type="checkbox" checked={selected.status === "已发布"} onChange={(event) => updateSelected({ status: event.target.checked ? "已发布" : "已停用" }, "状态已更新")} />已启用</label><label><span>判断要点</span><textarea value={selected.points} onChange={(event) => updateSelected({ points: event.target.value }, "判断要点已保存")} /></label><label><span>触发条件</span><textarea value={selected.condition} onChange={(event) => updateSelected({ condition: event.target.value }, "触发条件已保存")} /></label><label><span>整改建议</span><textarea value={selected.suggestion} onChange={(event) => updateSelected({ suggestion: event.target.value }, "整改建议已保存")} /></label><TextField label="关联依据" value={selected.basis} onChange={(value) => updateSelected({ basis: value }, "关联依据已更新")} /><p>{selected.tags.map((tag) => <em key={tag}>{tag}</em>)}</p><label className="radio-line"><input type="checkbox" checked={selected.needExpert} onChange={(e) => updateSelected({ needExpert: e.target.checked }, "专家复核条件已更新")} />是否需要专家复核</label><label className="radio-line"><input type="checkbox" checked={selected.keyRectify} onChange={(e) => updateSelected({ keyRectify: e.target.checked }, "重点整改条件已更新")} />是否建议纳入重点整改</label></div><footer><button className="primary-btn" onClick={() => updateSelected({}, "规则已保存")}>保存规则</button><button className="primary-btn" onClick={() => updateSelected({ status: "已发布" }, "规则已发布")}>发布规则</button><button className="secondary-btn" onClick={() => setModal("test")}>测试规则</button><button className="secondary-btn" onClick={() => setModal("version")}>查看版本</button></footer></aside>
      </div>
      <section className="mc-card version-table"><header><h3>版本记录</h3></header><div className="mc-table-wrap"><table><thead><tr>{["版本号", "版本说明", "更新人", "更新时间", "状态", "变更内容摘要", "操作"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{ruleVersions.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 4 ? <MiniBadge label={cell} /> : cell}</td>)}<td><button onClick={() => setModal("compare")}>版本对比</button><button onClick={() => window.confirm("确认回滚到该版本？") && setToast("当前版本已变更")}>回滚版本</button><button onClick={() => setModal("version")}>查看</button></td></tr>)}</tbody></table></div></section>
      {modal === "create" && <LocalModal title="新增规则" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { const next = { ...expertRuleSeed[0], id: `EX-RULE-${String(rules.length + 1).padStart(4, "0")}`, name: "新增专家判断规则", status: "草稿" as const }; setRules((items) => [next, ...items]); setSelectedId(next.id); setModal(null); setToast("规则已新增"); }}>确认新增</button></>}><div className="mc-form-grid"><TextField label="规则名称" value="新增专家判断规则" onChange={() => null} /><SelectField label="规则类别" value="用电安全规则" options={ruleCategories.slice(1).map(([name]) => name)} onChange={() => null} /><label className="mc-field wide"><span>触发条件</span><textarea defaultValue="请输入规则触发条件" /></label></div></LocalModal>}
      {modal === "test" && <LocalModal title="规则测试" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => setToast("测试完成")}>开始测试</button>}><label className="mc-field wide"><span>测试隐患描述</span><textarea defaultValue="配电箱门未关闭，内部线路裸露，存在触电风险。" /></label><button className="upload-box"><Upload />上传测试图片</button><div className="test-result"><p>是否命中：<b>{testResultMock.hit}</b></p><p>命中规则：<b>{testResultMock.rule}</b></p><p>风险等级：<b>{testResultMock.risk}</b></p><p>建议动作：<b>{testResultMock.action}</b></p></div></LocalModal>}
      {["version", "compare"].includes(modal ?? "") && <LocalModal title={modal === "compare" ? "版本对比" : "版本详情"} onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => setModal(null)}>关闭</button>}><p className="modal-note">{selected.name} · {ruleVersions[0][0]} 当前版本</p></LocalModal>}
    </section>
  );
}
