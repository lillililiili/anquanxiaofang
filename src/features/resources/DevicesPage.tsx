import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpCircle, Battery, Building2, Cable, Camera, CheckCircle2, ClipboardCheck, Cpu, Download, HardHat, Link2, Pencil, Plus, Radio, RotateCcw, Search, ShieldCheck, Trash2, Unlink, Wifi, Wrench } from "lucide-react";
import { makeId, useResources } from "./ResourceContext";
import { RMBadge, RMDialog, RMEmpty, RMHeader, RMPanel, RMProgress, RMStats, RMTable, RMTabs, downloadCsv } from "./ResourceUI";
import type { ResourceDevice, ResourcePageProps, RMColumn } from "./resourceTypes";
import "./DevicesPage.css";

const deviceTypes: ResourceDevice["type"][] = ["智能安全帽", "摄像设备", "传感器设备", "网关"];
const statusTone = (status: ResourceDevice["status"]) => status === "在线" ? "green" : status === "离线" ? "red" : "orange";
const today = () => new Date().toLocaleDateString("sv-SE");
const localTime = () => new Date().toLocaleString("sv-SE").slice(0, 16);
const nextFirmware = (firmware: string) => {
  const match = firmware.match(/^(V?\d+\.\d+\.)(\d+)$/i);
  return match ? `${match[1]}${Number(match[2]) + 1}` : `${firmware || "V1.0.0"}-demo.1`;
};
const DeviceIcon = ({ type }: { type: ResourceDevice["type"] }) => type === "智能安全帽" ? <HardHat size={20} /> : type === "摄像设备" ? <Camera size={20} /> : type === "网关" ? <Cable size={20} /> : <Radio size={20} />;

type DeviceForm = Omit<ResourceDevice, "id" | "lastSeen"> & { id: string };
type Dialog = { kind: "form"; device?: ResourceDevice } | { kind: "bind" | "unbind" | "delete" | "restart" | "upgrade" | "finish" | "inspect"; device: ResourceDevice };

export default function DevicesPage({ navigate, focusId, recordView = false }: ResourcePageProps) {
  const { state, change, storageError } = useResources();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("全部类型");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState(focusId ?? "");
  const [detailTab, setDetailTab] = useState("overview");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [form, setForm] = useState<DeviceForm | null>(null);
  const [bindProject, setBindProject] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const resetFilters = () => { setKeyword(""); setType("全部类型"); setProject(""); setStatus(""); setTab("all"); };
  useEffect(() => {
    if (!focusId) return;
    resetFilters();
    setDetailTab("overview");
    if (focusId.startsWith("project:")) {
      setProject(focusId.slice(8));
      setSelectedId("");
    } else {
      setSelectedId(focusId);
    }
  }, [focusId]);

  const projectName = (device: ResourceDevice) => state.projects.find((item) => item.id === device.projectId)?.name ?? (device.legacyProjectName && !device.projectId ? "原关联项目未建档" : "未绑定项目");
  const needsAttention = (device: ResourceDevice) => device.status !== "在线" || (device.powerSource !== "市电" && device.battery < 30) || !device.projectId;
  const overdueMaintenance = (device: ResourceDevice) => Boolean(device.maintenanceDate && device.maintenanceDate <= today());
  const filtered = useMemo(() => state.devices.filter((device) => {
    const deviceProject = state.projects.find((item) => item.id === device.projectId);
    const text = `${device.id} ${device.name} ${device.model} ${device.user} ${deviceProject?.name ?? ""} ${device.legacyProjectName ?? ""}`.toLowerCase();
    return (!keyword.trim() || text.includes(keyword.trim().toLowerCase())) && (type === "全部类型" || device.type === type)
      && (!project || (project === "unbound" ? !device.projectId : device.projectId === project)) && (!status || device.status === status)
      && (tab === "all" || (tab === "attention" ? needsAttention(device) : tab === "battery" ? device.powerSource !== "市电" && device.battery < 30 : overdueMaintenance(device)));
  }), [state.devices, state.projects, keyword, type, project, status, tab]);
  // Demo 详情只绑定明确打开的记录；列表筛选不能把详情切到另一台设备。
  const selected = recordView ? state.devices.find(device => device.id === selectedId) : filtered.find(device => device.id === selectedId) ?? filtered[0];
  const deviceLogs = selected ? state.logs.filter((log) => log.target === selected.id) : [];
  const online = state.devices.filter((device) => device.status === "在线").length;
  const offline = state.devices.filter((device) => device.status === "离线").length;
  const maintenance = state.devices.filter((device) => device.status === "维护中").length;
  const unbound = state.devices.filter((device) => !device.projectId).length;
  const lowBattery = state.devices.filter((device) => device.powerSource !== "市电" && device.battery < 30).length;

  function openForm(device?: ResourceDevice) {
    setForm(device ? { ...device } : { id: makeId("DEV"), name: "", type: "智能安全帽", model: "SHM-01 Pro", status: "离线", battery: 100, powerSource: "电池", projectId: "", user: "", firmware: "V2.3.1", network: "4G", purchasedDate: today(), maintenanceDate: today() });
    setFormError(""); setDialog({ kind: "form", device });
  }
  function updateForm<K extends keyof DeviceForm>(key: K, value: DeviceForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : null);
  }
  function saveDevice() {
    if (!form) return;
    if (![form.id, form.name, form.model, form.user, form.firmware].every((value) => value.trim())) { setFormError("请填写设备编号、名称、型号、保管人和固件版本。"); return; }
    if (!form.purchasedDate || !form.maintenanceDate || form.maintenanceDate < form.purchasedDate) { setFormError("请填写日期，计划维护日期不能早于采购日期。"); return; }
    const editing = dialog?.kind === "form" ? dialog.device : undefined;
    if (state.devices.some((device) => device.id === form.id.trim() && device.id !== editing?.id)) { setFormError("设备编号已存在，请使用唯一编号。"); return; }
    const device: ResourceDevice = { ...form, id: form.id.trim(), name: form.name.trim(), model: form.model.trim(), user: form.user.trim(), firmware: form.firmware.trim(), battery: form.powerSource === "市电" ? 100 : Math.min(100, Math.max(0, Number(form.battery) || 0)), lastSeen: editing?.lastSeen ?? "尚未接入（演示）" };
    change(editing ? "编辑设备档案" : "新增设备档案（演示）", device.id, (current) => ({ ...current, devices: editing ? current.devices.map((item) => item.id === editing.id ? device : item) : [device, ...current.devices] }));
    resetFilters(); setSelectedId(device.id); setDetailTab("overview"); setDialog(null); setNotice(`${device.name}的档案已保存到本地演示台账。`);
  }
  function openAction(kind: Exclude<Dialog["kind"], "form">, device: ResourceDevice) {
    setBindProject(device.projectId); setFormError(""); setDialog({ kind, device });
  }
  function pendingJob(device: ResourceDevice) {
    const job = device.maintenanceTask;
    return job ? { ...job, action: `${job.id} · ${job.kind}演示工单${job.targetFirmware ? ` · 目标版本 ${job.targetFirmware}` : ""}` } : undefined;
  }
  function runAction() {
    if (!dialog || dialog.kind === "form" || dialog.kind === "inspect") return;
    const device = state.devices.find((item) => item.id === dialog.device.id);
    if (!device) { setDialog(null); return; }
    if (dialog.kind === "bind") {
      if (!bindProject) { setFormError("请选择要绑定的项目。"); return; }
      const target = state.projects.find((item) => item.id === bindProject);
      if (!target || target.status === "已归档") { setFormError("请选择一个未归档项目。"); return; }
      change(`绑定项目：${target.name}`, device.id, (current) => ({ ...current, devices: current.devices.map((item) => item.id === device.id ? { ...item, projectId: bindProject, legacyProjectName: undefined } : item) }));
      setNotice(`已将${device.name}绑定到${target.name}，项目档案同步更新。`);
    } else if (dialog.kind === "unbind") {
      change(`解绑项目：${projectName(device)}`, device.id, (current) => ({ ...current, devices: current.devices.map((item) => item.id === device.id ? { ...item, projectId: "", legacyProjectName: undefined } : item) }));
      setNotice(`${device.name}已解绑，可重新分配项目。`);
    } else if (dialog.kind === "delete") {
      change(`删除设备档案：${device.name}`, device.id, (current) => ({ ...current, devices: current.devices.filter((item) => item.id !== device.id) }));
      setSelectedId(""); setNotice(`${device.name}的演示档案已删除，历史审计仍保留。`);
    } else if (dialog.kind === "restart" || dialog.kind === "upgrade") {
      const jobId = makeId("WO");
      const action = dialog.kind === "upgrade" ? `设备管理 / 创建演示固件升级工单 ${jobId}：${device.firmware} → ${nextFirmware(device.firmware)}` : `设备管理 / 创建演示重启工单 ${jobId}`;
      const maintenanceTask: NonNullable<ResourceDevice["maintenanceTask"]> = { id: jobId, kind: dialog.kind === "upgrade" ? "固件升级" : "重启", ...(dialog.kind === "upgrade" ? { targetFirmware: nextFirmware(device.firmware) } : {}) };
      change(action, device.id, (current) => ({ ...current, devices: current.devices.map((item) => item.id === device.id ? { ...item, status: "维护中" as const, maintenanceTask } : item) }));
      setDetailTab("maintenance"); setNotice(`${jobId}已创建，台账状态更新为维护中。点击“完成演示维护”可结束本地流程。`);
    } else {
      const job = pendingJob(device);
      const upgrading = job?.kind === "固件升级";
      const firmware = upgrading && job.targetFirmware ? job.targetFirmware : device.firmware;
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 90);
      change(`设备管理 / 完成演示维护${upgrading ? `：固件 ${firmware}` : job ? "：状态恢复在线" : "：例行保养验收"}（无真实硬件指令）`, device.id, (current) => ({ ...current, devices: current.devices.map((item) => item.id === device.id ? { ...item, status: "在线" as const, firmware, lastSeen: `${localTime()}（模拟）`, maintenanceDate: nextDate.toLocaleDateString("sv-SE"), maintenanceTask: undefined } : item) }));
      setNotice(`${device.name}的本地演示维护已完成，已更新台账和审计记录。`);
    }
    setDialog(null);
  }
  function exportDevices() {
    downloadCsv("设备台账-当前筛选.csv", ["设备编号", "设备名称", "类型", "型号", "状态（演示）", "项目", "原项目或任务", "保管人", "供电", "电量", "网络", "固件", "最近上报", "采购日期", "计划维护日期"], filtered.map((device) => [device.id, device.name, device.type, device.model, device.status, projectName(device), device.legacyProjectName ?? "", device.user, device.powerSource ?? "电池", device.powerSource === "市电" ? "市电" : `${device.battery}%`, device.network, device.firmware, device.lastSeen, device.purchasedDate, device.maintenanceDate]));
    change(`导出筛选设备台账（${filtered.length}台）`, "设备管理", (current) => current); setNotice(`已生成包含${filtered.length}台设备的 CSV 台账。`);
  }
  const columns: RMColumn<ResourceDevice>[] = [
    { key: "name", label: "设备 / 编号", width: 226, render: (device) => <div className="rd-device-cell"><span className="rd-small-icon"><DeviceIcon type={device.type} /></span><div><span className="rd-cell-name" title={device.name}>{device.name}</span><span className="rm-table-sub">{device.id}</span></div></div> },
    { key: "type", label: "类型 / 型号", width: 152, render: (device) => <><span>{device.type}</span><span className="rm-table-sub">{device.model}</span></> },
    { key: "project", label: "所属项目 / 保管人", width: 184, render: (device) => <><span className="rd-ellipsis" title={projectName(device)}>{projectName(device)}</span><span className="rm-table-sub">{device.user}</span></> },
    { key: "status", label: "在线状态", width: 92, render: (device) => <RMBadge tone={statusTone(device.status)}>{device.status}</RMBadge> },
    { key: "battery", label: "供电 / 电量", width: 112, render: (device) => device.powerSource === "市电" ? <span className="rd-power"><Cable size={14} />市电供电</span> : <div className={device.battery < 30 ? "rd-battery rd-low" : "rd-battery"}><span>{device.battery}%</span><RMProgress value={device.battery} /></div> },
    { key: "firmware", label: "固件 / 网络", width: 112, render: (device) => <><span>{device.firmware}</span><span className="rm-table-sub">{device.network}</span></> },
    { key: "actions", label: "操作", width: 80, render: (device) => <button className="rm-link" onClick={(event) => { event.stopPropagation(); setSelectedId(device.id); setDetailTab("overview"); }}>查看详情</button> },
  ];
  const activeDialogDevice = dialog && dialog.kind !== "form" ? state.devices.find((device) => device.id === dialog.device.id) ?? dialog.device : undefined;
  const dialogTitles = { bind: "绑定项目", unbind: "确认解绑项目", delete: "确认删除设备档案", restart: "创建重启演示工单", upgrade: "创建固件升级演示工单", finish: "完成演示维护", inspect: "设备检查（演示）" };

  const detailContent = <div className="rd-detail-column">
        {!selected ? <RMPanel title="设备详情"><RMEmpty text="当前筛选没有设备，详情随筛选结果清空。" onReset={resetFilters} /></RMPanel> : <>
          <RMPanel className="rd-detail-panel">
            <div className="rd-detail-heading"><span className="rd-hero-icon"><DeviceIcon type={selected.type} /></span><div><h2>{selected.name}</h2><span className="rm-muted">{selected.id}</span></div><RMBadge tone={statusTone(selected.status)}>{selected.status}</RMBadge></div>
            <RMTabs value={detailTab} onChange={setDetailTab} items={[{ key: "overview", label: "设备概览" }, { key: "maintenance", label: "维护记录", count: deviceLogs.length }]} />
            {detailTab === "overview" ? <>
              <div className="rd-metrics"><div><Wifi size={17} /><span>连接方式</span><em>{selected.network}</em></div><div><Battery size={17} /><span>供电状态</span><em>{selected.powerSource === "市电" ? "市电" : `${selected.battery}%`}</em></div><div><Cpu size={17} /><span>固件版本</span><em>{selected.firmware}</em></div></div>
              <dl className="rm-detail-grid rd-detail-grid"><div><dt>设备类型</dt><dd>{selected.type}</dd></div><div><dt>设备型号</dt><dd>{selected.model}</dd></div><div><dt>设备保管人</dt><dd>{selected.user}</dd></div><div><dt>采购日期</dt><dd>{selected.purchasedDate}</dd></div><div><dt>计划维护日期</dt><dd className={overdueMaintenance(selected) ? "rd-warning-text" : ""}>{selected.maintenanceDate}{overdueMaintenance(selected) ? " · 已到期" : ""}</dd></div><div><dt>最近上报快照</dt><dd>{selected.lastSeen}</dd></div></dl>
              {selected.legacyStatus === "任务中" && <p className="rd-inline-note">原台账状态为“任务中”，本页归入在线设备；任务记录仍保留原关联名称。</p>}
              <div className="rd-binding"><div className="rd-section-label"><Building2 size={15} /><span>项目配属</span></div><div>{selected.projectId ? <button className="rm-link rd-project-link" onClick={() => navigate("projects", selected.projectId)}>{projectName(selected)}</button> : <span className="rm-muted">{projectName(selected)}</span>}</div>{selected.legacyProjectName && <p className="rd-inline-note">原项目 / 任务：{selected.legacyProjectName}</p>}<div className="rm-actions"><button className="rm-button" onClick={() => openAction("bind", selected)}><Link2 size={14} />{selected.projectId ? "调整绑定" : "绑定项目"}</button>{selected.projectId && <button className="rm-link" onClick={() => openAction("unbind", selected)}><Unlink size={14} />解绑</button>}</div></div>
              {(selected.status === "离线" || (selected.powerSource !== "市电" && selected.battery < 30)) && <div className="rd-attention-note">{selected.status === "离线" ? "当前演示快照为离线，建议先核查现场网络与供电。" : "电池电量偏低，建议在下次检查前补充电量。"}</div>}
            </> : <div className="rd-maintenance-content">
              {selected.status === "维护中" && <div className="rd-job"><Wrench size={18} /><div><span>维护流程待确认</span><p>{pendingJob(selected)?.action ?? "历史台账记录为维护中，可完成一次演示维护验收。"}</p></div></div>}
              <div className="rd-section-label"><ClipboardCheck size={15} /><span>操作与维护审计</span><small>{deviceLogs.length} 条</small></div>
              {deviceLogs.length ? <ol className="rd-history">{deviceLogs.map((log) => <li key={log.id}><span>{log.action}</span><small>{log.time} · {log.actor}</small></li>)}</ol> : <div className="rd-empty-history"><ClipboardCheck size={24} /><span>暂无本地操作记录</span><p>设备检查、绑定及演示维护完成后，将在这里形成可追踪的记录。</p></div>}
            </div>}
            <div className="rd-device-actions"><button className="rm-button rm-primary" onClick={() => openAction("inspect", selected)}><ShieldCheck size={15} />设备检查</button><button className="rm-button" onClick={() => openForm(selected)}><Pencil size={14} />编辑档案</button>{selected.status === "维护中" ? <button className="rm-button rd-full-action" onClick={() => openAction("finish", selected)}><CheckCircle2 size={15} />完成演示维护</button> : <><button className="rm-button" onClick={() => openAction("restart", selected)}><RotateCcw size={14} />演示重启</button><button className="rm-button" onClick={() => openAction("upgrade", selected)}><ArrowUpCircle size={14} />演示升级</button></>}<button className="rm-link rd-delete rd-full-action" onClick={() => openAction("delete", selected)}><Trash2 size={14} />删除档案</button></div>
          </RMPanel>
          <RMPanel title="设备使用建议" className="rd-advice"><div className="rd-advice-row"><span>01</span><p>出发前核查电量、镜头及网络，确保现场检查资料可完整采集。</p></div><div className="rd-advice-row"><span>02</span><p>项目结束后及时调整配属，避免新任务引用已归档项目。</p></div><div className="rd-advice-row"><span>03</span><p>升级与重启以本地演示工单呈现，生产接入后再核验真实回执。</p></div></RMPanel>
        </>}
      </div>;

  return <div className={`rm-page rd-page${recordView ? " rm-record-page" : ""}`}>
    <RMHeader eyebrow="资源管理 / 设备资产" title="设备管理" description="统一管理现场采集设备、项目配属和维护计划，连接每一次安全检查。" actions={<><button className="rm-button" onClick={exportDevices}><Download size={15} />导出台账</button><button className="rm-button rm-primary" onClick={() => openForm()}><Plus size={16} />新增设备</button></>} />
    <div className="rd-demo-note"><ShieldCheck size={15} /><span>本地演示台账 · 在线、电量及上报时间为演示快照；维护操作仅更新本地记录，不向硬件下发指令。</span></div>
    {storageError && <div className="rm-note" role="alert">{storageError}</div>}
    {notice && <div className="rd-notice" role="status"><CheckCircle2 size={15} /><span>{notice}</span><button className="rm-link" onClick={() => setNotice("")}>收起</button></div>}
    <RMStats items={[
      { label: "设备总量", value: state.devices.length, hint: "全部入库设备", onClick: resetFilters },
      { label: "在线设备", value: online, hint: `在线率 ${state.devices.length ? Math.round(online / state.devices.length * 100) : 0}%`, tone: "green", onClick: () => { resetFilters(); setStatus("在线"); } },
      { label: "离线设备", value: offline, hint: "建议核查网络与供电", tone: "red", onClick: () => { resetFilters(); setStatus("离线"); } },
      { label: "维护中", value: maintenance, hint: "本地维护流程", tone: "orange", onClick: () => { resetFilters(); setStatus("维护中"); } },
      { label: "低电量设备", value: lowBattery, hint: "电池电量低于 30%", tone: "orange", onClick: () => { resetFilters(); setTab("battery"); } },
      { label: "未绑定档案", value: unbound, hint: "含原关联项目待建档", onClick: () => { resetFilters(); setProject("unbound"); } },
    ]} />
    <RMPanel className="rd-filter-panel">
      <div className="rm-filters rd-filters">
        <label className="rm-field rd-search-field"><span>设备查询</span><div className="rd-search"><Search size={15} /><input aria-label="设备查询" placeholder="设备名称、编号、保管人" value={keyword} onChange={(event) => setKeyword(event.target.value)} /></div></label>
        <label className="rm-field"><span>设备类型</span><select value={type} onChange={(event) => setType(event.target.value)}><option>全部类型</option>{deviceTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="rm-field"><span>所属项目</span><select value={project} onChange={(event) => setProject(event.target.value)}><option value="">全部项目</option><option value="unbound">未绑定项目档案</option>{state.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="rm-field"><span>在线状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option>在线</option><option>离线</option><option>维护中</option></select></label>
        <button className="rm-button" onClick={resetFilters}><RotateCcw size={14} />重置</button>
      </div>
    </RMPanel>
    <div className="rd-workspace">
      <RMPanel title="设备资产台账" subtitle={`当前筛选 ${filtered.length} 台 / 共 ${state.devices.length} 台`} className="rd-table-panel">
        <RMTabs value={tab} onChange={setTab} items={[{ key: "all", label: "全部设备", count: state.devices.length }, { key: "attention", label: "需关注", count: state.devices.filter(needsAttention).length }, { key: "battery", label: "低电量", count: lowBattery }, { key: "maintenance", label: "到期待维护", count: state.devices.filter(overdueMaintenance).length }]} />
        <RMTable columns={columns} rows={filtered} rowKey={(device) => device.id} selectedId={selected?.id} onRow={(device) => { setSelectedId(device.id); setDetailTab("overview"); }} empty={<RMEmpty text="没有符合条件的设备，请调整类型、项目或状态筛选。" onReset={resetFilters} />} />
        <div className="rd-table-foot"><Activity size={14} /><span>点击设备查看档案；所有统计随台账变更即时更新。</span></div>
      </RMPanel>
      {!recordView && detailContent}
    </div>
    {recordView && selected && <RMDialog drawer title="设备档案" onClose={() => setSelectedId("")}>{detailContent}</RMDialog>}
    {dialog?.kind === "form" && form && <RMDialog title={dialog.device ? "编辑设备档案" : "新增设备入库"} onClose={() => setDialog(null)} footer={<><button className="rm-button" onClick={() => setDialog(null)}>取消</button><button className="rm-button rm-primary" onClick={saveDevice}>保存档案</button></>}><div className="rm-form-grid rd-form">
      <label className="rm-field"><span>设备编号 *</span><input value={form.id} disabled={Boolean(dialog.device)} onChange={(event) => updateForm("id", event.target.value)} /></label><label className="rm-field"><span>设备名称 *</span><input value={form.name} placeholder="请输入设备名称" onChange={(event) => updateForm("name", event.target.value)} /></label>
      <label className="rm-field"><span>设备类型</span><select value={form.type} onChange={(event) => updateForm("type", event.target.value as ResourceDevice["type"])}>{deviceTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label className="rm-field"><span>设备型号 *</span><input value={form.model} onChange={(event) => updateForm("model", event.target.value)} /></label>
      <label className="rm-field"><span>设备保管人 *</span><input value={form.user} placeholder="姓名或责任部门" onChange={(event) => updateForm("user", event.target.value)} /></label><label className="rm-field"><span>项目配属{dialog.device ? "（请在详情中调整）" : ""}</span><select value={form.projectId} disabled={Boolean(dialog.device)} onChange={(event) => updateForm("projectId", event.target.value)}><option value="">暂不绑定</option>{state.projects.map((item) => <option key={item.id} value={item.id} disabled={item.status === "已归档"}>{item.name}{item.status === "已归档" ? "（已归档）" : ""}</option>)}</select></label>
      <label className="rm-field"><span>网络类型</span><select value={form.network} onChange={(event) => updateForm("network", event.target.value)}>{["4G", "5G", "Wi-Fi", "有线", "以太网", "NB-IoT", "LoRa"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="rm-field"><span>固件版本 *</span><input value={form.firmware} disabled={Boolean(dialog.device && pendingJob(dialog.device))} onChange={(event) => updateForm("firmware", event.target.value)} /></label>
      <label className="rm-field"><span>供电方式</span><select value={form.powerSource ?? "电池"} onChange={(event) => updateForm("powerSource", event.target.value as "电池" | "市电")}><option>电池</option><option>市电</option></select></label><label className="rm-field"><span>电池电量（%）</span><input type="number" min={0} max={100} disabled={form.powerSource === "市电"} value={form.battery} onChange={(event) => updateForm("battery", Number(event.target.value))} /></label>
      <label className="rm-field"><span>采购日期 *</span><input type="date" value={form.purchasedDate} onChange={(event) => updateForm("purchasedDate", event.target.value)} /></label><label className="rm-field"><span>计划维护日期 *</span><input type="date" value={form.maintenanceDate} min={form.purchasedDate} onChange={(event) => updateForm("maintenanceDate", event.target.value)} /></label>
      <div className="rm-note rm-full">{dialog.device ? "在线状态由台账与演示维护流程管理。项目绑定与解绑请使用详情中的配属操作，解绑时会再次确认。" : "新设备以离线状态入库，未生成任何真实遥测数据。可通过演示维护流程体验状态变化。"}</div>{formError && <p className="rd-form-error rm-full" role="alert">{formError}</p>}
    </div></RMDialog>}
    {dialog && dialog.kind !== "form" && activeDialogDevice && <RMDialog title={dialogTitles[dialog.kind]} onClose={() => setDialog(null)} footer={dialog.kind === "inspect" ? <><button className="rm-button" onClick={() => setDialog(null)}>关闭</button><button className="rm-button rm-primary" onClick={() => { change(`记录设备检查（演示）：${activeDialogDevice.status} / ${activeDialogDevice.network} / ${activeDialogDevice.powerSource === "市电" ? "市电" : `${activeDialogDevice.battery}%`}`, activeDialogDevice.id, (current) => current); setNotice(`${activeDialogDevice.name}的检查快照已写入维护记录。`); setDetailTab("maintenance"); setDialog(null); }}>写入检查记录</button></> : <><button className="rm-button" onClick={() => setDialog(null)}>取消</button><button className={`rm-button ${dialog.kind === "delete" ? "rd-danger-button" : "rm-primary"}`} onClick={runAction}>{dialog.kind === "bind" ? "确认绑定" : dialog.kind === "unbind" ? "确认解绑" : dialog.kind === "delete" ? "删除档案" : dialog.kind === "finish" ? "确认完成演示" : "创建演示工单"}</button></>}>
      <div className="rd-dialog-device"><DeviceIcon type={activeDialogDevice.type} /><div><span>{activeDialogDevice.name}</span><small>{activeDialogDevice.id}</small></div><RMBadge tone={statusTone(activeDialogDevice.status)}>{activeDialogDevice.status}</RMBadge></div>
      {dialog.kind === "bind" && <><label className="rm-field"><span>选择项目</span><select value={bindProject} onChange={(event) => setBindProject(event.target.value)}><option value="">请选择项目</option>{state.projects.filter((item) => item.status !== "已归档").map((item) => <option key={item.id} value={item.id}>{item.name} · {item.manager}</option>)}</select></label><p className="rd-inline-note">绑定后，设备将在该项目的资源档案中展示；原项目的绑定将同步解除。</p>{formError && <p className="rd-form-error" role="alert">{formError}</p>}</>}
      {dialog.kind === "unbind" && <p className="rd-dialog-description">将解除与“{projectName(activeDialogDevice)}”的关联。设备档案与历史维护记录保留，可在之后重新绑定。</p>}
      {dialog.kind === "delete" && <p className="rd-dialog-description">将从本地演示台账移除这台设备，并解除项目关联。历史操作日志继续保留。此操作不能直接撤销，请确认设备编号。</p>}
      {(dialog.kind === "restart" || dialog.kind === "upgrade") && <div className="rd-simulation-plan"><div className="rm-note">仅演示维护流程，不发送硬件命令、不下载真实固件，也不代表设备已重启。</div>{dialog.kind === "upgrade" && <div className="rd-version-change"><span>{activeDialogDevice.firmware}</span><span>→</span><span>{nextFirmware(activeDialogDevice.firmware)}</span></div>}<ol><li>创建本地{dialog.kind === "upgrade" ? "升级" : "重启"}工单，设备状态转为“维护中”。</li><li>工单进入设备维护记录，保留操作人和时间。</li><li>点击“完成演示维护”后更新演示状态{dialog.kind === "upgrade" ? "及固件版本" : ""}。</li></ol></div>}
      {dialog.kind === "finish" && <><p className="rd-dialog-description">确认结束本地维护流程后，演示状态将更新为“在线”，下次维护日期顺延 90 天。</p><div className="rm-note">{pendingJob(activeDialogDevice)?.action ?? "历史维护记录验收"}。本次完成记录为模拟回执，不代表真实设备连接或维护结果。</div></>}
      {dialog.kind === "inspect" && <div className="rd-inspection"><div className="rm-note">以下结果从当前演示台账派生，没有执行真实网络探测或硬件检测。</div>{[
        { label: "连接状态", value: `${activeDialogDevice.status} · ${activeDialogDevice.network}`, pass: activeDialogDevice.status === "在线", detail: activeDialogDevice.lastSeen },
        { label: "供电检查", value: activeDialogDevice.powerSource === "市电" ? "市电供电" : `${activeDialogDevice.battery}%`, pass: activeDialogDevice.powerSource === "市电" || activeDialogDevice.battery >= 30, detail: activeDialogDevice.powerSource === "市电" ? "固定电源设备" : "建议出发前电量不低于 30%" },
        { label: "项目归属", value: projectName(activeDialogDevice), pass: Boolean(activeDialogDevice.projectId), detail: `设备保管人：${activeDialogDevice.user}` },
        { label: "维护计划", value: activeDialogDevice.maintenanceDate, pass: !overdueMaintenance(activeDialogDevice), detail: `当前固件：${activeDialogDevice.firmware}` },
      ].map((check) => <div className="rd-check-row" key={check.label}><div><span>{check.label}</span><p>{check.value}</p><small>{check.detail}</small></div><RMBadge tone={check.pass ? "green" : "orange"}>{check.pass ? "快照正常" : "建议核查"}</RMBadge></div>)}</div>}
    </RMDialog>}
  </div>;
}
