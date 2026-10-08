import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, Check, ClipboardCheck, Copy, Download, Eye, FileCheck2, FilePlus2, FileText, GitBranch, Layers3, ListChecks, LockKeyhole, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useResources, makeId } from "./ResourceContext";
import type { ResourceCheckItem, ResourcePageProps, ResourceTemplate, Risk } from "./resourceTypes";
import { RMBadge, RMDialog, RMEmpty, RMHeader, RMPanel, RMStats, RMTable, downloadCsv } from "./ResourceUI";
import "./TemplatesPage.css";

type Modal = "new" | "metadata" | "item" | "preview" | "publish" | "disable" | "delete" | null;
const baseCategories = ["消防设施", "用电安全", "动火临电", "仓储物流", "酒店物业", "隐患复查"];
const today = () => new Date().toLocaleDateString("sv-SE");
const blankMeta = { name: "", category: "消防设施", description: "" };
const blankItem = (): ResourceCheckItem => ({ id: makeId("I"), name: "", standard: "", risk: "中风险", evidence: "", required: true });
function publishErrors(template: ResourceTemplate) {
  const errors: string[] = [];
  if (!template.name.trim()) errors.push("请填写模板名称。");
  if (!template.description.trim()) errors.push("请补充适用场景与检查范围。");
  if (!template.items.length) errors.push("至少添加 1 个检查项。");
  if (template.items.length && !template.items.some(item => item.required)) errors.push("至少设定 1 个必检项。");
  const names = new Set<string>();
  template.items.forEach((item, index) => {
    const label = `第 ${index + 1} 项`;
    if (!item.name.trim()) errors.push(`${label}缺少检查项名称。`);
    if (!item.standard.trim()) errors.push(`${label}缺少检查要点。`);
    if (!item.evidence.trim()) errors.push(`${label}缺少证据要求。`);
    if (names.has(item.name.trim())) errors.push(`${label}与其他检查项重名，请调整。`);
    names.add(item.name.trim());
  });
  return errors;
}

export default function TemplatesPage({ navigate, focusId, recordView = false }: ResourcePageProps) {
  const { state, change, storageError } = useResources();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部模板");
  const [status, setStatus] = useState("全部状态");
  const [selectedId, setSelectedId] = useState<string | null>(recordView ? null : state.templates[0]?.id || null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [meta, setMeta] = useState(blankMeta);
  const [itemDraft, setItemDraft] = useState<ResourceCheckItem>(blankItem);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const categories = [...new Set([...baseCategories, ...state.templates.map(template => template.category)])];
  const filtered = useMemo(() => state.templates.filter(template => (category === "全部模板" || template.category === category) && (status === "全部状态" || template.status === status) && `${template.name} ${template.id} ${template.description} ${template.author}`.toLowerCase().includes(query.trim().toLowerCase())), [state.templates, category, status, query]);
  const selected = (recordView ? state.templates : filtered).find(template => template.id === selectedId);
  const usedProjects = selected ? state.projects.filter(project => project.templateId === selected.id) : [];
  const currentItems = selected?.items.filter(item => `${item.name} ${item.standard} ${item.evidence}`.toLowerCase().includes(itemQuery.trim().toLowerCase())) || [];
  const currentItem = currentItems.find(item => item.id === selectedItemId) || currentItems[0];
  const editable = selected?.status === "草稿";
  const errors = selected ? publishErrors(selected) : [];
  const versions = selected ? state.templates.filter(template => template.name === selected.name).sort((a, b) => b.version - a.version) : [];
  const published = state.templates.filter(template => template.status === "已发布");
  const coveredProjects = state.projects.filter(project => state.templates.some(template => template.id === project.templateId)).length;

  useEffect(() => {
    if (!focusId) return;
    setQuery(""); setCategory("全部模板"); setStatus("全部状态"); setItemQuery("");
    setSelectedId(focusId); setSelectedItemId(null);
    setNotice(state.templates.some(template => template.id === focusId) ? "" : "指定模板不存在，可能已被移除，请从模板库重新选择。");
  }, [focusId]);

  const choose = (template: ResourceTemplate) => { setSelectedId(template.id); setSelectedItemId(null); setItemQuery(""); setNotice(""); };
  const resetFilters = () => { setQuery(""); setCategory("全部模板"); setStatus("全部状态"); setItemQuery(""); setSelectedId(recordView ? null : state.templates[0]?.id || null); setNotice(""); };
  const selectCategory = (value: string) => { setCategory(value); setSelectedId(null); setItemQuery(""); };
  const closeModal = () => { setModal(null); setFormError(""); };
  const beginNew = () => { setMeta(blankMeta); setFormError(""); setModal("new"); };
  const beginMetadata = () => { if (!selected || !editable) return; setMeta({ name: selected.name, category: selected.category, description: selected.description }); setFormError(""); setModal("metadata"); };
  const beginItem = (item?: ResourceCheckItem) => { if (!editable) return; setItemDraft(item ? { ...item } : blankItem()); setFormError(""); setModal("item"); };
  const saveMetadata = (event: FormEvent) => {
    event.preventDefault();
    const value = { name: meta.name.trim(), category: meta.category, description: meta.description.trim() };
    if (!value.name || !value.description) { setFormError("请填写模板名称和适用场景。"); return; }
    if (modal === "new") {
      const template: ResourceTemplate = { ...value, id: makeId("T"), version: 1, status: "草稿", updatedAt: today(), author: "当前操作员", items: [] };
      change("新建检查模板", template.name, source => ({ ...source, templates: [template, ...source.templates] }));
      resetFilters(); setSelectedId(template.id); setNotice("新模板已创建为草稿，请添加检查项后发布。");
    } else if (selected && editable) {
      change("编辑模板信息", selected.name, source => ({ ...source, templates: source.templates.map(template => template.id === selected.id && template.status === "草稿" ? { ...template, ...value, updatedAt: today() } : template) }));
      setQuery(""); setCategory("全部模板"); setStatus("全部状态"); setNotice("模板信息已保存。");
    }
    closeModal();
  };
  const saveItem = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !editable) return;
    const item = { ...itemDraft, name: itemDraft.name.trim(), standard: itemDraft.standard.trim(), evidence: itemDraft.evidence.trim() };
    if (!item.name || !item.standard || !item.evidence) { setFormError("检查项名称、检查要点和证据要求均为必填。"); return; }
    if (selected.items.some(existing => existing.id !== item.id && existing.name === item.name)) { setFormError("当前模板已有同名检查项，请使用不同名称。"); return; }
    const exists = selected.items.some(existing => existing.id === item.id);
    change(exists ? "编辑模板检查项" : "新增模板检查项", `${selected.name} / ${item.name}`, source => ({ ...source, templates: source.templates.map(template => template.id === selected.id && template.status === "草稿" ? { ...template, updatedAt: today(), items: exists ? template.items.map(existing => existing.id === item.id ? item : existing) : [...template.items, item] } : template) }));
    setSelectedItemId(item.id); setItemQuery(""); setNotice(`检查项“${item.name}”已保存。`); closeModal();
  };
  const copyTemplate = (newVersion: boolean) => {
    if (!selected) return;
    const version = newVersion ? Math.max(...versions.map(template => template.version)) + 1 : 1;
    let name = selected.name;
    if (!newVersion) {
      name = `${selected.name}（副本）`;
      let suffix = 2;
      while (state.templates.some(template => template.name === name)) name = `${selected.name}（副本 ${suffix++}）`;
    }
    const template: ResourceTemplate = { ...selected, id: makeId("T"), name, version, status: "草稿", updatedAt: today(), author: "当前操作员", items: selected.items.map(item => ({ ...item, id: makeId("I") })) };
    change(newVersion ? "创建模板新版本" : "复制检查模板", `${template.name} · V${version}.0`, source => ({ ...source, templates: [template, ...source.templates] }));
    resetFilters(); setSelectedId(template.id); setNotice(newVersion ? `V${version}.0 草稿已创建，原版本和已有项目的关联保持不变。` : "模板已复制为独立草稿，可以继续调整检查项。");
  };
  const publish = () => {
    if (!selected || !editable || errors.length) return;
    change("发布检查模板", `${selected.name} · V${selected.version}.0`, source => ({ ...source, templates: source.templates.map(template => template.id === selected.id && template.status === "草稿" && !publishErrors(template).length ? { ...template, status: "已发布", updatedAt: today() } : template) }));
    setStatus("全部状态"); setNotice(`V${selected.version}.0 已发布，可在项目档案中选择为检查方案。`); closeModal();
  };
  const toggleActive = () => {
    if (!selected) return;
    if (selected.status === "已发布" && usedProjects.length) { setFormError("该模板仍被项目引用，请先到项目档案更换检查方案后再停用。"); return; }
    const nextStatus = selected.status === "已停用" ? "已发布" : "已停用";
    change(nextStatus === "已发布" ? "恢复检查模板" : "停用检查模板", selected.name, source => ({ ...source, templates: source.templates.map(template => template.id === selected.id && (nextStatus === "已发布" || !source.projects.some(project => project.templateId === selected.id)) ? { ...template, status: nextStatus, updatedAt: today() } : template) }));
    setStatus("全部状态"); setNotice(nextStatus === "已发布" ? "模板已恢复，可继续用于项目检查方案。" : "模板已停用，将不再出现在项目可选检查方案中。"); closeModal();
  };
  const removeItem = () => {
    if (!selected || !editable) return;
    change("删除模板检查项", `${selected.name} / ${itemDraft.name}`, source => ({ ...source, templates: source.templates.map(template => template.id === selected.id && template.status === "草稿" ? { ...template, updatedAt: today(), items: template.items.filter(item => item.id !== itemDraft.id) } : template) }));
    setSelectedItemId(null); setNotice(`检查项“${itemDraft.name}”已删除。`); closeModal();
  };
  const exportSelected = () => {
    if (!selected) return;
    downloadCsv(`${selected.name}_V${selected.version}.0.csv`, ["模板编号", "模板名称", "版本", "状态", "适用场景", "序号", "检查项", "风险等级", "是否必检", "检查要点", "证据要求"], selected.items.length ? selected.items.map((item, index) => [selected.id, selected.name, `V${selected.version}.0`, selected.status, selected.description, index + 1, item.name, item.risk, item.required ? "是" : "否", item.standard, item.evidence]) : [[selected.id, selected.name, `V${selected.version}.0`, selected.status, selected.description, "", "暂无检查项", "", "", "", ""]]);
    setNotice(`已导出“${selected.name}”的检查项与证据要求。`);
  };

  const templateContent = selected ? <>
        <div className="rm-stack rtm-editor">
          <section className="rm-panel rtm-template-overview"><div className="rtm-template-kicker"><span>{selected.category} / {selected.id}</span><RMBadge>{selected.status}</RMBadge></div><h3>{selected.name}<span>V{selected.version}.0</span></h3><p>{selected.description}</p><div className="rtm-overview-footer"><span><ListChecks size={14} />{selected.items.length} 项 · {selected.items.filter(item => item.required).length} 项必检</span><div className="rm-actions">{editable && <button className="rm-link" onClick={beginMetadata}><Pencil size={13} />编辑信息</button>}<button className="rm-link" onClick={() => setModal("preview")}><Eye size={14} />预览</button></div></div></section>
          <RMPanel title="检查项配置" subtitle={editable ? "逐项定义检查要点、风险等级与取证标准" : "已发布内容保持只读，修改请创建新版本"} actions={editable ? <button className="rm-button rm-primary" onClick={() => beginItem()}><Plus size={14} />添加检查项</button> : <LockKeyhole size={17} className="rm-muted" />} className="rtm-items-panel">
            <div className="rtm-item-toolbar"><label className="rtm-search"><Search size={15} /><input value={itemQuery} onChange={event => setItemQuery(event.target.value)} placeholder="筛选当前模板检查项" aria-label="筛选当前模板检查项" /></label><span className="rm-muted">{currentItems.length} 项</span></div>
            <div className="rtm-check-list">{currentItems.map(item => <article key={item.id} className={`rtm-check-card ${currentItem?.id === item.id ? "selected" : ""}`}><button className="rtm-check-main" onClick={() => setSelectedItemId(item.id)} aria-pressed={currentItem?.id === item.id}><span className="rtm-check-number">{String(selected.items.indexOf(item) + 1).padStart(2, "0")}</span><span className="rtm-check-content"><span className="rtm-check-heading"><span>{item.name}</span><span className="rtm-check-tags"><RMBadge>{item.risk}</RMBadge><span className={item.required ? "rtm-required" : "rm-muted"}>{item.required ? "必检" : "选检"}</span></span></span><span className="rtm-check-standard">{item.standard}</span><span className="rtm-check-evidence"><ClipboardCheck size={12} />{item.evidence}</span></span></button>{editable && <div className="rtm-check-actions"><button className="rm-link" onClick={() => beginItem(item)}><Pencil size={13} />编辑</button><button className="rm-link rtm-delete" onClick={() => { setItemDraft({ ...item }); setModal("delete"); }}><Trash2 size={13} />删除</button></div>}</article>)}{!currentItems.length && <RMEmpty text={selected.items.length ? "没有匹配的检查项，请调整筛选词" : "草稿尚未配置检查项，点击“添加检查项”开始编制"} />}</div>
            {editable && <div className="rtm-editor-footer"><div><span>{errors.length ? `还有 ${errors.length} 项发布校验待处理` : "检查项与证据要求已完整"}</span><small>发布后即可在项目档案选择此检查方案</small></div><button className="rm-button rm-primary" onClick={() => setModal("publish")}><FileCheck2 size={15} />发布检查模板</button></div>}
          </RMPanel>
        </div>
        <aside className="rm-stack rtm-inspector">
          <RMPanel title="版本与发布" actions={<GitBranch size={16} className="rm-muted" />}><dl className="rtm-properties"><div><dt>当前版本</dt><dd>V{selected.version}.0<RMBadge>{selected.status}</RMBadge></dd></div><div><dt>维护人员</dt><dd>{selected.author}</dd></div><div><dt>更新日期</dt><dd>{selected.updatedAt}</dd></div><div><dt>同名版本</dt><dd>{versions.length} 个</dd></div></dl><div className="rtm-version-actions"><button className="rm-button" onClick={() => copyTemplate(true)}><GitBranch size={14} />创建新版本</button><button className="rm-button" onClick={() => copyTemplate(false)}><Copy size={14} />复制模板</button></div>{versions.length > 1 && <div className="rtm-version-list">{versions.map(template => <button key={template.id} disabled={template.id === selected.id} onClick={() => { setCategory("全部模板"); setStatus("全部状态"); setQuery(""); choose(template); }}><span>V{template.version}.0</span><RMBadge>{template.status}</RMBadge><ArrowRight size={12} /></button>)}</div>}{selected.status !== "草稿" && <div className="rtm-status-action"><button className="rm-link" onClick={() => { setFormError(""); setModal("disable"); }}>{selected.status === "已停用" ? "恢复此版本" : "停用此版本"}<ArrowRight size={12} /></button></div>}</RMPanel>
          <RMPanel title="使用此版本的项目" subtitle={`${usedProjects.length} 个项目已关联检查方案`}><div className="rtm-project-list">{usedProjects.map(project => <button key={project.id} onClick={() => navigate("projects", project.id)}><span><span>{project.name}</span><small>{project.type} · {project.manager}</small></span><ArrowRight size={14} /></button>)}{!usedProjects.length && <p className="rtm-inline-empty">{editable ? "草稿发布后可供项目选择。" : "暂无项目使用此版本。"}</p>}</div><p className="rtm-footnote">新版本发布后，已有项目仍保留原版本；请在项目档案按需更换检查方案。</p></RMPanel>
          <RMPanel title="证据要求" subtitle={currentItem?.name || "选择检查项查看取证标准"} actions={<ShieldCheck size={16} className="rm-muted" />}><div className="rtm-evidence-detail">{currentItem ? <><span className="rtm-evidence-label"><ClipboardCheck size={14} />现场取证清单</span><p>{currentItem.evidence}</p><span className="rtm-evidence-label">检查要点</span><p>{currentItem.standard}</p><span className="rtm-evidence-label">异常处理</span><p>记录疑似隐患并提出核查建议；存在争议或需专业判断时，建议专家复核。</p></> : <p className="rm-muted">当前没有可展示的检查项。</p>}</div></RMPanel>
          <RMPanel title="检查编制参考"><div className="rtm-reference-links"><button onClick={() => navigate("knowledge")}><BookOpen size={15} /><span>查阅知识库</span><ArrowRight size={13} /></button><button onClick={() => navigate("hazardGraph")}><Layers3 size={15} /><span>浏览隐患图谱</span><ArrowRight size={13} /></button><button onClick={() => navigate("expertRules")}><ShieldCheck size={15} /><span>查看专家规则</span><ArrowRight size={13} /></button></div><p className="rtm-footnote">打开相应资料库，辅助检查项编制。</p></RMPanel>
        </aside>
      </> : <div className="rm-panel rtm-no-selection"><FilePlus2 size={36} /><h3>{filtered.length ? "选择一个模板开始查看" : "当前筛选下暂无模板"}</h3><p>从左侧模板库选择版本，查看检查项、证据标准和使用项目。</p><button className="rm-button" onClick={filtered.length ? () => choose(filtered[0]) : resetFilters}>{filtered.length ? "查看首个匹配模板" : "重置筛选"}</button></div>;

  return <div className={`rm-page rtm-page${recordView ? " rm-record-page" : ""}`}>
    <RMHeader title="检查模板" description="沉淀场景标准，管理检查项与证据要求，让项目检查方案有据可循。" actions={<><button className="rm-button" disabled={!recordView && !selected} onClick={recordView ? () => downloadCsv("检查模板清单.csv", ["模板编号", "模板名称", "分类", "版本", "状态", "检查项", "维护人", "更新时间"], filtered.map(template => [template.id, template.name, template.category, `V${template.version}.0`, template.status, template.items.length, template.author, template.updatedAt])) : exportSelected}><Download size={15} />{recordView ? "导出清单" : "导出模板"}</button><button className="rm-button rm-primary" onClick={beginNew}><Plus size={16} />新建模板</button></>} />
    <RMStats items={[
      { label: "模板版本总数", value: state.templates.length, hint: `${categories.filter(value => state.templates.some(template => template.category === value)).length} 类检查场景`, onClick: resetFilters },
      { label: "已发布版本", value: published.length, hint: "可用于项目检查方案", tone: "green", onClick: () => { setStatus("已发布"); setCategory("全部模板"); setQuery(""); setSelectedId(null); } },
      { label: "检查项总数", value: state.templates.reduce((sum, template) => sum + template.items.length, 0), hint: `${state.templates.reduce((sum, template) => sum + template.items.filter(item => item.required).length, 0)} 项必检内容` },
      { label: "已配置方案项目", value: coveredProjects, hint: `${state.projects.length - coveredProjects} 个项目尚未关联有效模板`, onClick: () => navigate("projects") },
    ]} />
    {storageError && <div className="rtm-alert" role="alert">{storageError}</div>}
    {notice && <div className="rtm-feedback" role="status"><Check size={15} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}
    <div className="rm-filters rtm-filters"><label className="rtm-search"><Search size={16} /><input aria-label="搜索模板" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索模板名称、编号、场景或作者" /></label><select aria-label="模板状态" value={status} onChange={event => { setStatus(event.target.value); setSelectedId(null); }}><option>全部状态</option><option>已发布</option><option>草稿</option><option>已停用</option></select><button className="rm-button" onClick={resetFilters}>重置筛选</button><span className="rm-muted rtm-result-count">当前 {filtered.length} 个模板版本</span></div>
    <div className="rtm-workspace">
      <RMPanel title="模板库" subtitle="按业务场景选择检查标准" className="rtm-library">
        <div className="rtm-category-list"><button className={category === "全部模板" ? "active" : ""} onClick={() => selectCategory("全部模板")}><Layers3 size={14} />全部模板<span>{state.templates.length}</span></button>{categories.map(value => <button key={value} className={category === value ? "active" : ""} onClick={() => selectCategory(value)}>{value}<span>{state.templates.filter(template => template.category === value).length}</span></button>)}</div>
        {!recordView && <><div className="rtm-library-title"><span>模板清单</span><span>{filtered.length}</span></div>
        <div className="rtm-template-list">{filtered.map(template => <button className={`rtm-template-card ${template.id === selectedId ? "selected" : ""}`} key={template.id} onClick={() => choose(template)} aria-pressed={template.id === selectedId}><div className="rtm-template-icon"><FileText size={18} /></div><div className="rtm-template-text"><span className="rtm-template-name">{template.name}</span><span className="rtm-template-meta">V{template.version}.0 · {template.items.length} 个检查项</span><span className="rtm-template-bottom"><RMBadge>{template.status}</RMBadge><span>{state.projects.filter(project => project.templateId === template.id).length} 个项目</span></span></div></button>)}{!filtered.length && <RMEmpty text="没有符合条件的模板" onReset={resetFilters} />}</div></>}
      </RMPanel>
      {recordView && <RMPanel title="模板清单" subtitle={`共 ${filtered.length} 个版本 · 点击模板查看检查项、版本与使用项目`} className="rtm-record-list"><RMTable rows={filtered} rowKey={template => template.id} onRow={choose} empty={<RMEmpty text="没有符合条件的模板" onReset={resetFilters} />} columns={[
        { key: "name", label: "模板名称 / 编号", width: 240, render: template => <><button className="rm-link rm-ellipsis" title={template.name} onClick={() => choose(template)}>{template.name}</button><span className="rm-table-sub">{template.id}</span></> },
        { key: "category", label: "适用分类", width: 90, render: template => template.category },
        { key: "version", label: "版本", width: 70, render: template => `V${template.version}.0` },
        { key: "status", label: "状态", width: 80, render: template => <RMBadge>{template.status}</RMBadge> },
        { key: "items", label: "检查项", width: 75, render: template => `${template.items.length} 项` },
        { key: "projects", label: "使用项目", width: 85, render: template => `${state.projects.filter(project => project.templateId === template.id).length} 个` },
        { key: "author", label: "维护人", width: 80, render: template => template.author },
        { key: "updated", label: "更新日期", width: 110, render: template => template.updatedAt },
        { key: "action", label: "操作", width: 90, render: template => <button className="rm-link" onClick={() => choose(template)}>查看详情</button> },
      ]} /></RMPanel>}
      {!recordView && templateContent}
    </div>
    {recordView && selected && <RMDialog drawer title="检查模板详情" onClose={() => { setSelectedId(null); setSelectedItemId(null); setItemQuery(""); }} footer={<button className="rm-button" onClick={exportSelected}><Download size={14} />导出当前模板</button>}><div className="rtm-record-content">{templateContent}</div></RMDialog>}
    <p className="rtm-data-caption">演示资源档案 · 本机保存 · 检查模板供项目检查方案选择，后续任务执行以任务模块实际配置为准。</p>

    {(modal === "new" || modal === "metadata") && <RMDialog title={modal === "new" ? "新建检查模板" : "编辑模板信息"} onClose={closeModal} footer={<><button className="rm-button" onClick={closeModal}>取消</button><button className="rm-button rm-primary" type="submit" form="rtm-meta-form">{modal === "new" ? "创建草稿" : "保存信息"}</button></>}><form id="rtm-meta-form" onSubmit={saveMetadata} className="rm-form-grid"><label className="rm-field rm-full">模板名称<input value={meta.name} onChange={event => setMeta({ ...meta, name: event.target.value })} required maxLength={60} placeholder="例如：消防设施与疏散专项检查" /></label><label className="rm-field rm-full">适用分类<select value={meta.category} onChange={event => setMeta({ ...meta, category: event.target.value })}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><label className="rm-field rm-full">适用场景与检查范围<textarea rows={4} value={meta.description} onChange={event => setMeta({ ...meta, description: event.target.value })} required maxLength={600} placeholder="说明适用场所、检查范围及需要专业人员配合的事项" /></label>{formError && <p className="rtm-form-error rm-full" role="alert">{formError}</p>}<p className="rm-note rm-full">草稿可编辑。发布后检查项只读，需复制或创建新版本调整。</p></form></RMDialog>}
    {modal === "item" && selected && <RMDialog title={selected.items.some(item => item.id === itemDraft.id) ? "编辑检查项" : "添加检查项"} onClose={closeModal} footer={<><button className="rm-button" onClick={closeModal}>取消</button><button className="rm-button rm-primary" type="submit" form="rtm-item-form">保存检查项</button></>}><form id="rtm-item-form" onSubmit={saveItem} className="rm-form-grid"><label className="rm-field rm-full">检查项名称<input value={itemDraft.name} onChange={event => setItemDraft({ ...itemDraft, name: event.target.value })} required maxLength={80} /></label><label className="rm-field">风险等级<select value={itemDraft.risk} onChange={event => setItemDraft({ ...itemDraft, risk: event.target.value as Risk })}><option>高风险</option><option>中风险</option><option>低风险</option></select></label><label className="rm-field">检查要求<select value={itemDraft.required ? "required" : "optional"} onChange={event => setItemDraft({ ...itemDraft, required: event.target.value === "required" })}><option value="required">必检项</option><option value="optional">选检项</option></select></label><label className="rm-field rm-full">检查要点<textarea rows={4} value={itemDraft.standard} onChange={event => setItemDraft({ ...itemDraft, standard: event.target.value })} required maxLength={1000} placeholder="说明核查对象、检查方法和异常处置建议" /></label><label className="rm-field rm-full">证据要求<textarea rows={3} value={itemDraft.evidence} onChange={event => setItemDraft({ ...itemDraft, evidence: event.target.value })} required maxLength={600} placeholder="说明照片视角、点位编号、检测或维护记录等取证要求" /></label>{formError && <p className="rtm-form-error rm-full" role="alert">{formError}</p>}</form></RMDialog>}
    {modal === "delete" && selected && <RMDialog title="删除检查项" onClose={closeModal} footer={<><button className="rm-button" onClick={closeModal}>保留检查项</button><button className="rm-button rm-primary" onClick={removeItem}>确认删除</button></>}><p className="rtm-confirm-text">确认从“{selected.name}”草稿中删除“{itemDraft.name}”？该项的检查要点与证据要求将一并移除。</p></RMDialog>}
    {modal === "publish" && selected && <RMDialog title={`发布 V${selected.version}.0 检查模板`} onClose={closeModal} footer={<><button className="rm-button" onClick={closeModal}>{errors.length ? "返回完善" : "继续编辑"}</button><button className="rm-button rm-primary" disabled={!!errors.length} onClick={publish}>确认发布</button></>}><div className="rtm-publish-summary"><FileCheck2 size={25} /><div><h3>{selected.name}</h3><p>{selected.items.length} 个检查项 · {selected.items.filter(item => item.required).length} 项必检 · {selected.category}</p></div></div>{errors.length ? <div className="rtm-validation"><h4>发布前请完善以下内容</h4><ul>{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul></div> : <div className="rtm-publish-checks"><p><Check size={16} />适用场景、检查要点及证据要求已完整</p><p><Check size={16} />已设置必检项，无重复检查项名称</p></div>}<p className="rm-note">发布后该版本只读，可在项目档案中选择为检查方案。发布不会自动替换已有项目关联的版本，也不会自动创建或派发检查任务。</p></RMDialog>}
    {modal === "disable" && selected && <RMDialog title={selected.status === "已停用" ? "恢复模板版本" : "停用模板版本"} onClose={closeModal} footer={<><button className="rm-button" onClick={closeModal}>取消</button>{selected.status === "已发布" && usedProjects.length ? <button className="rm-button rm-primary" onClick={() => { closeModal(); navigate("projects", usedProjects[0].id); }}>前往更换项目方案</button> : <button className="rm-button rm-primary" onClick={toggleActive}>{selected.status === "已停用" ? "确认恢复" : "确认停用"}</button>}</>}><p className="rtm-confirm-text">{selected.status === "已停用" ? `恢复“${selected.name}” V${selected.version}.0 后，项目可重新选择此版本。` : usedProjects.length ? `有 ${usedProjects.length} 个项目正在使用此版本，暂不可直接停用。请先在项目档案更换检查方案。` : `停用“${selected.name}” V${selected.version}.0 后，该版本将从项目可选检查方案中移除，历史检查项仍保留。`}</p>{usedProjects.length > 0 && <ul className="rtm-confirm-projects">{usedProjects.map(project => <li key={project.id}>{project.name}</li>)}</ul>}{formError && <p className="rtm-form-error" role="alert">{formError}</p>}</RMDialog>}
    {modal === "preview" && selected && <RMDialog title="检查模板预览" onClose={closeModal} footer={<><button className="rm-button" onClick={closeModal}>关闭预览</button><button className="rm-button rm-primary" onClick={exportSelected}><Download size={14} />导出检查清单</button></>}><div className="rtm-preview"><div className="rtm-preview-heading"><span>{selected.category} · V{selected.version}.0</span><RMBadge>{selected.status}</RMBadge><h3>{selected.name}</h3><p>{selected.description}</p><small>{selected.items.length} 个检查项 · 维护人 {selected.author} · 更新于 {selected.updatedAt}</small></div>{selected.items.map((item, index) => <section key={item.id}><h4>{String(index + 1).padStart(2, "0")}　{item.name}<RMBadge>{item.risk}</RMBadge></h4><dl><dt>检查要求</dt><dd>{item.required ? "必检项" : "选检项"}</dd><dt>检查要点</dt><dd>{item.standard}</dd><dt>证据要求</dt><dd>{item.evidence}</dd></dl></section>)}{!selected.items.length && <RMEmpty text="模板尚无检查项" />}<p className="rtm-footnote">演示检查清单；输出使用疑似隐患、建议核查、建议整改及建议专家复核等表述。</p></div></RMDialog>}
  </div>;
}
