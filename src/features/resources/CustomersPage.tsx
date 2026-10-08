import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, CalendarClock, Download, Pencil, Plus, ShieldCheck } from "lucide-react";
import { makeId, useResources } from "./ResourceContext";
import { downloadCsv, RMBadge, RMDialog, RMEmpty, RMHeader, RMPanel, RMStats, RMTable, RMTabs } from "./ResourceUI";
import type { ResourceCustomer, ResourcePageProps, Risk } from "./resourceTypes";

export function remainingDays(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const now = new Date();
  // 按本地日历日期比较，以 UTC 表示日期序号，避免时刻和夏令时影响天数。
  return (Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
}
function serviceLabel(customer: ResourceCustomer) { if (customer.serviceStatus === "已暂停") return customer.serviceStatus; const days = remainingDays(customer.serviceEnd); return days < 0 ? "服务已到期" : days === 0 ? "今日到期" : days <= 30 ? `${days}天后到期` : customer.serviceStatus; }

export default function CustomersPage({ navigate, focusId }: ResourcePageProps) {
  const { state, change } = useResources();
  const [query, setQuery] = useState(""); const [risk, setRisk] = useState("全部"); const [kind, setKind] = useState("全部"); const [filter, setFilter] = useState("全部");
  const [detailId, setDetailId] = useState<string | null>(null); const [tab, setTab] = useState("base"); const [editing, setEditing] = useState<ResourceCustomer | "new" | null>(null); const [error, setError] = useState("");
  const expiring = state.customers.filter(c => remainingDays(c.serviceEnd) <= 30 && c.serviceStatus !== "已暂停");
  const filtered = state.customers.filter(c => `${c.name} ${c.contact} ${c.creditCode} ${c.owner}`.toLowerCase().includes(query.trim().toLowerCase()) && (risk === "全部" || c.risk === risk) && (kind === "全部" || c.type === kind) && (filter === "全部" || (filter === "即将到期" ? remainingDays(c.serviceEnd) <= 30 && c.serviceStatus !== "已暂停" : c.serviceStatus === filter)));
  const selected = state.customers.find(c => c.id === detailId);
  const relatedProjects = selected ? state.projects.filter(p => p.customerId === selected.id) : [];
  useEffect(() => { if (focusId && state.customers.some(c => c.id === focusId)) { setDetailId(focusId); setTab("base"); } }, [focusId]);
  function reset() { setQuery(""); setKind("全部"); setRisk("全部"); setFilter("全部"); }
  function edit(customer: ResourceCustomer | "new") { setError(""); setDetailId(null); setEditing(customer); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const get = (key: string) => String(data.get(key) || "").trim();
    const old = editing && editing !== "new" ? editing : null;
    if (["name", "area", "contact", "phone", "address", "owner"].some(key => !get(key))) { setError("请填写客户名称、所在地区、联系人、联系电话、企业地址和服务负责人，不能仅输入空格。"); return; }
    if (get("serviceEnd") < get("serviceStart")) { setError("服务结束日期不能早于开始日期。"); return; }
    if (state.customers.some(c => c.id !== old?.id && (c.name === get("name") || (get("creditCode") && c.creditCode === get("creditCode"))))) { setError("客户名称或信用代码已存在，请检查后保存。"); return; }
    const customer: ResourceCustomer = { ...(old || {}), id: old?.id || makeId("C"), name: get("name"), type: get("type"), area: get("area"), risk: get("risk") as Risk, contact: get("contact"), phone: get("phone"), creditCode: get("creditCode"), address: get("address"), email: get("email"), tags: get("tags").split(/[,，]/).map(t => t.trim()).filter(Boolean), owner: get("owner"), serviceStart: get("serviceStart"), serviceEnd: get("serviceEnd"), serviceStatus: get("serviceStatus") as ResourceCustomer["serviceStatus"] };
    change(`客户管理 / ${old ? "更新客户服务档案" : "新增客户"}`, customer.id, s => ({ ...s, customers: old ? s.customers.map(c => c.id === old.id ? customer : c) : [customer, ...s.customers] }));
    setEditing(null); reset(); setDetailId(customer.id); setTab("base");
  }
  return <section className="rm-page">
    <RMHeader title="客户管理" description="围绕客户服务周期，统一管理企业档案、服务范围和项目关系。" actions={<><button className="rm-button" onClick={() => downloadCsv("客户资源台账.csv", ["客户名称", "类型", "联系人", "服务负责人", "服务到期日", "关联项目数"], filtered.map(c => [c.name, c.type, c.contact, c.owner, c.serviceEnd, state.projects.filter(p => p.customerId === c.id).length]))}><Download size={16} />导出台账</button><button className="rm-button rm-primary" onClick={() => edit("new")}><Plus size={16} />新增客户</button></>} />
    <RMStats items={[{ label: "客户档案", value: state.customers.length, hint: "全部已建档企业", onClick: reset }, { label: "服务中客户", value: state.customers.filter(c => c.serviceStatus === "服务中").length, hint: "按服务状态统计", tone: "green", onClick: () => { reset(); setFilter("服务中"); } }, { label: "已关联项目", value: state.projects.filter(p => state.customers.some(c => c.id === p.customerId)).length, hint: "本台账已建立关联的项目" }, { label: "到期需跟进", value: expiring.length, hint: "30天内到期或已到期", tone: "orange", onClick: () => { reset(); setFilter("即将到期"); } }]} />
    <div className="rm-split">
      <RMPanel title="客户服务台账" subtitle="客户档案与项目数量实时关联">
        <RMTabs value={filter} onChange={setFilter} items={[{ key: "全部", label: "全部客户", count: state.customers.length }, { key: "服务中", label: "服务中" }, { key: "待跟进", label: "待跟进" }, { key: "即将到期", label: "到期关注" }]} />
        <div className="rm-filters"><label className="rm-field">搜索客户<input value={query} onChange={e => setQuery(e.target.value)} placeholder="名称 / 联系人 / 信用代码" /></label><label className="rm-field">客户类型<select value={kind} onChange={e => setKind(e.target.value)}><option>全部</option>{[...new Set(state.customers.map(c => c.type))].map(v => <option key={v}>{v}</option>)}</select></label><label className="rm-field">风险等级<select value={risk} onChange={e => setRisk(e.target.value)}>{["全部", "高风险", "中风险", "低风险"].map(v => <option key={v}>{v}</option>)}</select></label><button className="rm-button" onClick={reset}>重置</button></div>
        <RMTable rows={filtered} rowKey={c => c.id} empty={<RMEmpty text="暂无符合条件的客户" onReset={reset} />} columns={[
          { key: "name", label: "客户 / 联系人", width: "33%", render: c => <><button className="rm-link rm-ellipsis" title={c.name} onClick={() => { setDetailId(c.id); setTab("base"); }}>{c.name}</button><span className="rm-table-sub">{c.contact} · {c.phone}</span></> },
          { key: "type", label: "客户类型", width: "15%", render: c => <>{c.type}<span className="rm-table-sub">{state.projects.filter(p => p.customerId === c.id).length} 个项目</span></> },
          { key: "risk", label: "风险等级", width: "13%", render: c => <RMBadge>{c.risk}</RMBadge> },
          { key: "service", label: "服务周期", width: "23%", render: c => <><RMBadge>{serviceLabel(c)}</RMBadge><span className="rm-table-sub">截至 {c.serviceEnd}</span></> },
          { key: "action", label: "操作", width: "16%", render: c => <button className="rm-link" onClick={() => { setDetailId(c.id); setTab("base"); }}>查看档案<ArrowRight size={13} /></button> }
        ]} /><div className="rm-footer"><span>共 {filtered.length} 家客户 · 项目数按本资源台账计算</span><span>演示联系人已脱敏</span></div>
      </RMPanel>
      <aside className="rm-stack"><RMPanel title="服务跟进" subtitle="按到期时间优先安排回访"><div className="rm-list">{expiring.length ? expiring.sort((a,b) => a.serviceEnd.localeCompare(b.serviceEnd)).map(c => <div key={c.id}><div className="rm-inline-between"><CalendarClock size={17} /><RMBadge tone="orange">{serviceLabel(c)}</RMBadge></div><button className="rm-link" style={{ marginTop: 10 }} onClick={() => { setDetailId(c.id); setTab("service"); }}>{c.name}</button><p>负责人：{c.owner} · {c.serviceEnd}</p><p>建议核查续期安排与未完成的服务事项。</p></div>) : <RMEmpty text="暂无到期需跟进的客户" />}</div></RMPanel><RMPanel title="客户类型分布"><div className="rm-list">{[...new Set(state.customers.map(c => c.type))].map(t => <div key={t} className="rm-inline-between"><button className="rm-link" onClick={() => { reset(); setKind(t); }}>{t}</button><span>{state.customers.filter(c => c.type === t).length} 家</span></div>)}</div></RMPanel><div className="rm-note"><ShieldCheck size={18} /><span>先建立客户档案，再在项目管理中关联检查范围、负责人和检查方案。</span></div></aside>
    </div>
    {selected && <RMDialog title={selected.name} onClose={() => setDetailId(null)} footer={<><button className="rm-button" onClick={() => edit(selected)}><Pencil size={15} />编辑档案</button><button className="rm-button rm-primary" onClick={() => navigate("projects", `customer:${selected.id}`)}>管理关联项目<ArrowRight size={15} /></button></>}>
      <div className="rm-detail-hero"><span className="rm-detail-symbol"><Building2 size={25} /></span><div><h3>{selected.type} · {selected.area}</h3><p>{selected.id} · 服务负责人 {selected.owner}</p></div></div>
      <div className="rm-service-strip"><div><strong>{relatedProjects.length}</strong><span>关联项目</span></div><div><strong>{state.devices.filter(d => relatedProjects.some(p => p.id === d.projectId)).length}</strong><span>绑定设备</span></div><div><strong>{relatedProjects.reduce((sum,p) => sum + p.hazards,0)}</strong><span>项目待跟进隐患（示例）</span></div></div>
      <RMTabs value={tab} onChange={setTab} items={[{ key:"base", label:"基本档案" },{ key:"projects",label:"关联项目",count:relatedProjects.length },{ key:"service",label:"服务与记录" }]} />
      {tab === "base" && <><dl className="rm-detail-grid">{[["统一社会信用代码",selected.creditCode || "未填写"],["安全联系人",`${selected.contact} · ${selected.phone}`],["服务负责人",selected.owner],["联系邮箱",selected.email || "未填写"],["企业地址",selected.address],["企业规模",selected.scale || "未填写"]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="rm-pills rm-panel-pad">{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div></>}
      {tab === "projects" && <div className="rm-list">{relatedProjects.length ? relatedProjects.map(p => <div key={p.id}><div className="rm-inline-between"><button className="rm-link" onClick={() => navigate("projects",p.id)}>{p.name}<ArrowRight size={13} /></button><RMBadge>{p.status}</RMBadge></div><p>{p.region} · 负责人 {p.manager} · {p.points.length} 个检查点位</p></div>) : <RMEmpty text="该客户尚未关联项目，可前往项目管理新建。" />}</div>}
      {tab === "service" && <div className="rm-stack rm-panel-pad"><dl className="rm-detail-grid" style={{ padding:0 }}><div><dt>服务周期</dt><dd>{selected.serviceStart} 至 {selected.serviceEnd}</dd></div><div><dt>服务状态</dt><dd><RMBadge>{selected.serviceStatus}</RMBadge></dd></div></dl><div className="rm-note">服务范围：{selected.tags.join("、") || "请在客户档案中补充服务范围"}</div><h3>档案操作记录</h3><div className="rm-list">{state.logs.filter(l => l.target === selected.id).length ? state.logs.filter(l => l.target === selected.id).map(l => <div key={l.id}><span>{l.action}</span><p>{l.time} · {l.actor}</p></div>) : <p className="rm-muted">暂无新增操作记录。保存档案后会记录修改动作。</p>}</div></div>}
    </RMDialog>}
    {editing && <RMDialog title={editing === "new" ? "新增客户" : "编辑客户档案"} onClose={() => setEditing(null)}><form className="rm-form-grid" onSubmit={save}>
      {error && <p className="rm-full rm-text-red" role="alert">{error}</p>}
      <label className="rm-full">客户名称<input name="name" required pattern=".*\S.*" maxLength={60} defaultValue={editing === "new" ? "" : editing.name} placeholder="企业完整名称" /></label>
      <label>客户类型<select name="type" defaultValue={editing === "new" ? "科技园区" : editing.type}>{["科技园区","数据中心","商业综合体","酒店宾馆","物业公司","工业企业","其他"].map(x => <option key={x}>{x}</option>)}</select></label><label>所在地区<input name="area" required pattern=".*\S.*" defaultValue={editing === "new" ? "山东省济南市" : editing.area} /></label>
      <label>安全联系人<input name="contact" required pattern=".*\S.*" defaultValue={editing === "new" ? "" : editing.contact} /></label><label>联系电话<input name="phone" required pattern=".*\S.*" defaultValue={editing === "new" ? "" : editing.phone} /></label>
      <label>信用代码<input name="creditCode" maxLength={30} defaultValue={editing === "new" ? "" : editing.creditCode} /></label><label>联系邮箱<input name="email" type="email" defaultValue={editing === "new" ? "" : editing.email} /></label>
      <label className="rm-full">企业地址<input name="address" required pattern=".*\S.*" defaultValue={editing === "new" ? "" : editing.address} /></label>
      <label>服务负责人<input name="owner" required pattern=".*\S.*" defaultValue={editing === "new" ? "" : editing.owner} /></label><label>风险等级<select name="risk" defaultValue={editing === "new" ? "低风险" : editing.risk}>{["低风险","中风险","高风险"].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>服务开始<input name="serviceStart" type="date" required defaultValue={editing === "new" ? new Date().toLocaleDateString("sv-SE") : editing.serviceStart} /></label><label>服务结束<input name="serviceEnd" type="date" required defaultValue={editing === "new" ? "" : editing.serviceEnd} /></label>
      <label>服务状态<select name="serviceStatus" defaultValue={editing === "new" ? "待跟进" : editing.serviceStatus}>{["服务中","待跟进","已暂停"].map(x => <option key={x}>{x}</option>)}</select></label><label>服务范围标签<input name="tags" defaultValue={editing === "new" ? "" : editing.tags.join("，")} placeholder="用中文逗号分隔" /></label>
      <div className="rm-form-footer"><button type="button" className="rm-button" onClick={() => setEditing(null)}>取消</button><button className="rm-button rm-primary" type="submit">保存客户档案</button></div>
    </form></RMDialog>}
  </section>;
}
