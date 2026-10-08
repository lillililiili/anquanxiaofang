import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BellRing, Building2, Download, LockKeyhole, Plus, Save, Search, ShieldCheck, Users } from "lucide-react";
import { makeId, useResources } from "./ResourceContext";
import { downloadCsv, RMBadge, RMDialog, RMEmpty, RMHeader, RMPanel, RMStats, RMTable, RMTabs, ResourceDataNote } from "./ResourceUI";
import type { ResourceMember, ResourcePageProps, ResourceProject, ResourceRole, ResourceRule, ResourceState, RMColumn } from "./resourceTypes";
import "./SettingsPage.css";

const ADMIN_ROLE = "R001";
const CURRENT_MEMBER = "U001";
const modules = [
  { key: "customers", label: "客户档案", description: "客户资料与服务档案" },
  { key: "projects", label: "项目管理", description: "项目资料与检查点位" },
  { key: "devices", label: "设备管理", description: "设备台账与维护信息" },
  { key: "templates", label: "检查模板", description: "模板内容与发布状态" },
  { key: "settings", label: "系统管理", description: "成员、配置与操作日志" },
];
const permissionActions = [{ key: "view", label: "查看" }, { key: "edit", label: "维护" }, { key: "export", label: "导出" }];
const triggerOptions: Record<string, { unit: string; max: number; description: (value: number) => string }> = {
  "整改期限临近": { unit: "小时", max: 720, description: value => `整改期限剩余不超过 ${value} 小时，且事项尚未闭环` },
  "设备持续离线": { unit: "分钟", max: 1440, description: value => `设备连续离线达到 ${value} 分钟` },
  "服务期限临近": { unit: "天", max: 365, description: value => `客户服务期限剩余不超过 ${value} 天` },
  "待复核事项积压": { unit: "项", max: 1000, description: value => `待专家复核事项达到 ${value} 项` },
};

type Change = (action: string, target: string, recipe: (state: ResourceState) => ResourceState) => void;
const scopeText = (member: ResourceMember, state: ResourceState) => state.roles.find(role => role.id === member.roleId)?.scope === "全部项目" ? `全部 ${state.projects.length} 个项目` : `指定 ${member.projectIds.filter(id => state.projects.some(project => project.id === id)).length} 个项目`;

export default function SettingsPage({ focusId }: ResourcePageProps) {
  const { state, change, storageError } = useResources();
  const [tab, setTab] = useState("members");
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [memberDraft, setMemberDraft] = useState<ResourceMember | null>(null);
  const [memberToggle, setMemberToggle] = useState<ResourceMember | null>(null);
  const [roleId, setRoleId] = useState(state.roles[0]?.id || "");
  const [ruleId, setRuleId] = useState(state.rules[0]?.id || "");
  const [feedback, setFeedback] = useState("");
  const [logKeyword, setLogKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  useEffect(() => {
    if (!focusId) return;
    if (state.roles.some(role => role.id === focusId)) { setTab("roles"); setRoleId(focusId); }
    else if (state.rules.some(rule => rule.id === focusId)) { setTab("rules"); setRuleId(focusId); }
    else if (state.members.some(member => member.id === focusId)) { setTab("members"); setKeyword(state.members.find(member => member.id === focusId)?.name || ""); }
  }, [focusId]);
  const departments = [...new Set(state.members.map(member => member.department))];
  const enabledMembers = state.members.filter(member => member.status === "启用");
  const rows = state.members.filter(member => {
    const role = state.roles.find(item => item.id === member.roleId);
    return (!department || member.department === department) && (!status || member.status === status) && (!keyword.trim() || `${member.id} ${member.name} ${member.phone} ${role?.name}`.toLowerCase().includes(keyword.trim().toLowerCase()));
  });
  const selectedRole = state.roles.find(role => role.id === roleId) || state.roles[0];
  const selectedRule = state.rules.find(rule => rule.id === ruleId) || state.rules[0];
  const dateError = Boolean(startDate && endDate && startDate > endDate);
  const logRows = useMemo(() => state.logs.filter(log => {
    const date = log.time.slice(0, 10);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate) && (!logKeyword.trim() || `${log.actor} ${log.action} ${log.target}`.toLowerCase().includes(logKeyword.trim().toLowerCase()));
  }).sort((a, b) => b.time.localeCompare(a.time)), [state.logs, logKeyword, startDate, endDate]);
  const resetMembers = () => { setKeyword(""); setDepartment(""); setStatus(""); };
  const report = (message: string) => setFeedback(message);
  const canDisable = (member: ResourceMember) => member.id !== CURRENT_MEMBER && (member.roleId !== ADMIN_ROLE || enabledMembers.filter(item => item.roleId === ADMIN_ROLE).length > 1);
  const saveMember = (member: ResourceMember) => {
    const exists = state.members.some(item => item.id === member.id);
    change(`系统管理 / ${exists ? "编辑" : "新增"}成员`, `${member.name}（${member.id}）`, current => ({ ...current, members: exists ? current.members.map(item => item.id === member.id ? member : item) : [...current.members, member] }));
    setMemberDraft(null); report(`已保存成员“${member.name}”，组织统计与角色关联已更新。`);
  };
  const toggleMember = () => {
    if (!memberToggle || (memberToggle.status === "启用" && !canDisable(memberToggle))) return;
    const nextStatus: ResourceMember["status"] = memberToggle.status === "启用" ? "停用" : "启用";
    change(`系统管理 / ${nextStatus}成员`, `${memberToggle.name}（${memberToggle.id}）`, current => ({ ...current, members: current.members.map(member => member.id === memberToggle.id ? { ...member, status: nextStatus } : member) }));
    report(`成员“${memberToggle.name}”已${nextStatus}。此状态仅用于本地演示。`); setMemberToggle(null);
  };
  const columns: RMColumn<ResourceMember>[] = [
    { key: "name", label: "成员", width: "19%", render: member => <div className="settings-member-cell"><span className="settings-avatar">{member.name.slice(0, 1)}</span><span><span>{member.name}{member.id === CURRENT_MEMBER && <small className="settings-current">当前</small>}</span><span className="rm-table-sub">{member.phone}</span></span></div> },
    { key: "department", label: "所属部门", width: "15%", render: member => member.department },
    { key: "role", label: "关联角色", width: "13%", render: member => <button className="rm-link" onClick={() => { setRoleId(member.roleId); setTab("roles"); }}>{state.roles.find(role => role.id === member.roleId)?.name || "未关联"}</button> },
    { key: "scope", label: "数据范围", width: "15%", render: member => <span title={member.projectIds.map(id => state.projects.find(project => project.id === id)?.name).filter(Boolean).join("、")}>{scopeText(member, state)}</span> },
    { key: "status", label: "状态", width: "9%", render: member => <RMBadge>{member.status}</RMBadge> },
    { key: "lastLogin", label: "最近演示登录", width: "17%", render: member => <span className="settings-date">{member.lastLogin}</span> },
    { key: "actions", label: "操作", width: "12%", render: member => <div className="rm-actions"><button className="rm-link" onClick={() => setMemberDraft({ ...member, projectIds: [...member.projectIds] })}>编辑</button>{member.status === "停用" || canDisable(member) ? <button className="rm-link" onClick={() => setMemberToggle(member)}>{member.status === "启用" ? "停用" : "启用"}</button> : <span className="settings-protected" title="保留当前演示管理员，不能停用"><LockKeyhole size={13} />保护</span>}</div> },
  ];

  return <div className="rm-page settings-page">
    <RMHeader eyebrow="平台配置" title="系统管理" description="维护组织成员、角色配置与提醒规则，追溯资源台账的演示操作。" actions={<span className="settings-demo-label"><ShieldCheck size={16} /> 本地演示配置</span>} />
    <RMStats items={[
      { label: "启用成员", value: enabledMembers.length, hint: `共 ${state.members.length} 位成员 · ${departments.length} 个部门`, tone: "blue", onClick: () => { setTab("members"); resetMembers(); setStatus("启用"); } },
      { label: "角色配置", value: state.roles.length, hint: "权限矩阵与项目数据范围", onClick: () => setTab("roles") },
      { label: "已启用提醒", value: state.rules.filter(rule => rule.enabled).length, hint: `共 ${state.rules.length} 条站内提醒规则`, tone: "green", onClick: () => setTab("rules") },
      { label: "操作记录", value: state.logs.length, hint: "汇集五类资源管理操作", onClick: () => { setTab("logs"); setLogKeyword(""); setStartDate(""); setEndDate(""); } },
    ]} />
    <RMTabs items={[{ key: "members", label: "成员与组织", count: state.members.length }, { key: "roles", label: "角色与数据范围", count: state.roles.length }, { key: "rules", label: "通知规则", count: state.rules.length }, { key: "logs", label: "操作日志", count: state.logs.length }]} value={tab} onChange={value => { setTab(value); setFeedback(""); }} />
    {feedback && <div className="settings-feedback" role="status">{feedback}</div>}
    {tab === "members" && <>
      <div className="settings-org-strip" aria-label="按部门筛选成员">{departments.map(name => <button className={`settings-org-item${department === name ? " active" : ""}`} key={name} onClick={() => setDepartment(department === name ? "" : name)} aria-pressed={department === name}><Building2 size={18} /><span>{name}<small>{state.members.filter(member => member.department === name && member.status === "启用").length} 位启用成员</small></span><span className="settings-org-count">{state.members.filter(member => member.department === name).length}</span></button>)}</div>
      <RMPanel title="成员台账" subtitle={`当前显示 ${rows.length} 位成员，成员与角色配置关联。`} actions={<button className="rm-button rm-primary" onClick={() => setMemberDraft({ id: makeId("U"), name: "", department: "现场检查组", roleId: state.roles.find(role => role.id !== ADMIN_ROLE)?.id || ADMIN_ROLE, phone: "", status: "启用", projectIds: [], lastLogin: "尚未演示登录" })}><Plus size={16} />新增成员</button>}>
        <div className="rm-filters settings-member-filters"><label className="rm-field"><span>成员搜索</span><div className="settings-search"><Search size={16} /><input aria-label="成员搜索" placeholder="姓名、手机号或角色" value={keyword} onChange={event => setKeyword(event.target.value)} /></div></label><label className="rm-field"><span>所属部门</span><select value={department} onChange={event => setDepartment(event.target.value)}><option value="">全部部门</option>{departments.map(name => <option key={name}>{name}</option>)}</select></label><label className="rm-field"><span>成员状态</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">全部状态</option><option>启用</option><option>停用</option></select></label><button className="rm-button" onClick={resetMembers}>重置筛选</button></div>
        <RMTable columns={columns} rows={rows} rowKey={member => member.id} empty={<RMEmpty text="没有匹配的成员，可调整姓名、部门或状态条件。" onReset={resetMembers} />} />
        <div className="settings-panel-note"><LockKeyhole size={14} />当前演示管理员保留启用状态；成员资料及启停均仅在本机演示数据中生效。</div>
      </RMPanel>
    </>}
    {tab === "roles" && <div className="settings-config-grid"><RMPanel title="角色列表" subtitle="成员数量随台账实时计算"><div className="settings-choice-list">{state.roles.map(role => <button className={`settings-choice${role.id === selectedRole?.id ? " active" : ""}`} key={role.id} onClick={() => setRoleId(role.id)} aria-pressed={role.id === selectedRole?.id}><ShieldCheck size={20} /><span>{role.name}<small>{role.scope} · {role.permissions.length} 项演示权限</small></span><span className="settings-role-count">{state.members.filter(member => member.roleId === role.id).length} 人</span></button>)}</div><div className="settings-panel-note">已分配角色保留关联，避免成员失去角色。可通过右侧矩阵调整配置。</div></RMPanel>{selectedRole ? <RoleEditor key={selectedRole.id} role={selectedRole} members={state.members.filter(member => member.roleId === selectedRole.id)} projects={state.projects} change={change} onSaved={report} /> : <RMEmpty text="尚无角色配置" />}</div>}
    {tab === "rules" && <div className="settings-config-grid settings-rules-grid"><RMPanel title="站内提醒规则" subtitle="选择规则，配置触发阈值与接收角色"><div className="settings-choice-list">{state.rules.map(rule => <button className={`settings-choice${rule.id === selectedRule?.id ? " active" : ""}`} key={rule.id} onClick={() => setRuleId(rule.id)} aria-pressed={rule.id === selectedRule?.id}><BellRing size={20} /><span>{rule.name}<small>{rule.trigger} · {rule.threshold} {triggerOptions[rule.trigger]?.unit || ""}</small></span><RMBadge tone={rule.enabled ? "green" : "gray"}>{rule.enabled ? "启用" : "停用"}</RMBadge></button>)}</div><div className="settings-panel-note">演示仅保存站内提醒规则，不连接消息服务，也不发送真实通知。</div></RMPanel>{selectedRule ? <RuleEditor key={selectedRule.id} rule={selectedRule} state={state} change={change} onSaved={report} /> : <RMEmpty text="尚无通知规则" />}</div>}
    {tab === "logs" && <RMPanel title="资源操作日志" subtitle="客户、项目、设备、模板与系统配置的本地操作留痕。" actions={<button className="rm-button" disabled={!logRows.length || dateError} onClick={() => { downloadCsv(`资源操作日志-${new Date().toISOString().slice(0, 10)}.csv`, ["时间", "操作人", "操作", "对象"], logRows.map(log => [log.time, log.actor, log.action, log.target])); change("系统管理 / 导出操作日志", `${logRows.length} 条记录`, current => current); report(`已导出当前筛选的 ${logRows.length} 条日志。`); }}><Download size={15} />导出筛选结果</button>}>
      <div className="rm-filters settings-log-filters"><label className="rm-field"><span>检索日志</span><div className="settings-search"><Search size={16} /><input aria-label="检索日志" placeholder="操作人、操作或对象" value={logKeyword} onChange={event => setLogKeyword(event.target.value)} /></div></label><label className="rm-field"><span>开始日期</span><input type="date" value={startDate} max={endDate || undefined} onChange={event => setStartDate(event.target.value)} /></label><label className="rm-field"><span>结束日期</span><input type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} /></label><button className="rm-button" onClick={() => { setLogKeyword(""); setStartDate(""); setEndDate(""); }}>重置筛选</button></div>
      {dateError && <p className="settings-error" role="alert">结束日期不能早于开始日期，请调整日期范围。</p>}
      <div className="settings-result-count">共 {state.logs.length} 条记录，当前匹配 {logRows.length} 条<span>时间为本机演示时间</span></div>
      <RMTable columns={[{ key: "time", label: "操作时间", width: "20%", render: log => <span className="settings-date">{log.time.replace("T", " ").slice(0, 19)}</span> }, { key: "actor", label: "操作人", width: "15%", render: log => log.actor }, { key: "action", label: "操作内容", width: "29%", render: log => <span title={log.action}>{log.action}</span> }, { key: "target", label: "操作对象", width: "36%", render: log => <span title={log.target}>{log.target}</span> }]} rows={logRows} rowKey={log => log.id} empty={<RMEmpty text={dateError ? "请先修正日期范围。" : "没有符合条件的操作记录；资源管理中的修改会自动记录在这里。"} onReset={() => { setLogKeyword(""); setStartDate(""); setEndDate(""); }} />} />
    </RMPanel>}
    <ResourceDataNote error={storageError} />
    {memberDraft && <MemberEditor member={memberDraft} state={state} canDisable={canDisable(memberDraft)} onClose={() => setMemberDraft(null)} onSave={saveMember} />}
    {memberToggle && <RMDialog title={`${memberToggle.status === "启用" ? "停用" : "启用"}演示成员`} onClose={() => setMemberToggle(null)} footer={<><button className="rm-button" onClick={() => setMemberToggle(null)}>取消</button><button className="rm-button rm-primary" onClick={toggleMember}>确认{memberToggle.status === "启用" ? "停用" : "启用"}</button></>}><p>将{memberToggle.status === "启用" ? "停用" : "启用"}“{memberToggle.name}”的本地演示成员记录。</p><div className="rm-note">成员资料、项目关联和历史操作记录会保留。此操作不影响任何真实账号。</div></RMDialog>}
  </div>;
}

function MemberEditor({ member, state, canDisable, onClose, onSave }: { member: ResourceMember; state: ResourceState; canDisable: boolean; onClose: () => void; onSave: (member: ResourceMember) => void }) {
  const [draft, setDraft] = useState(member);
  const [error, setError] = useState("");
  const selectedRole = state.roles.find(role => role.id === draft.roleId);
  const isCurrent = member.id === CURRENT_MEMBER;
  const editing = state.members.some(item => item.id === member.id);
  const patch = <K extends keyof ResourceMember>(key: K, value: ResourceMember[K]) => { setDraft(current => ({ ...current, [key]: value })); setError(""); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.department.trim()) { setError("请填写成员姓名和所属部门。"); return; }
    if (!selectedRole) { setError("请选择有效的关联角色。"); return; }
    if (state.members.some(item => item.id !== draft.id && item.phone === draft.phone.trim())) { setError("此手机号已关联其他成员，请核对。"); return; }
    if (selectedRole.scope !== "全部项目" && !draft.projectIds.some(id => state.projects.some(project => project.id === id))) { setError("指定项目范围至少需要选择一个项目。"); return; }
    const next = { ...draft, name: draft.name.trim(), department: draft.department.trim(), phone: draft.phone.trim(), projectIds: draft.projectIds.filter(id => state.projects.some(project => project.id === id)) };
    if (isCurrent) { next.status = "启用"; next.roleId = ADMIN_ROLE; }
    onSave(next);
  };
  return <RMDialog title={editing ? `编辑成员 · ${member.name}` : "新增演示成员"} onClose={onClose} footer={<><button type="button" className="rm-button" onClick={onClose}>取消</button><button className="rm-button rm-primary" type="submit" form="settings-member-form"><Save size={15} />保存成员</button></>}><form id="settings-member-form" className="rm-form-grid" onSubmit={submit}>
    <label className="rm-field"><span>成员姓名 <em>*</em></span><input required maxLength={20} value={draft.name} onChange={event => patch("name", event.target.value)} placeholder="输入成员姓名" /></label>
    <label className="rm-field"><span>手机号 <em>*</em></span><input required type="tel" pattern="1[3-9][0-9]{9}" title="请输入 11 位手机号" value={draft.phone} onChange={event => patch("phone", event.target.value)} placeholder="11 位演示手机号" maxLength={11} /></label>
    <label className="rm-field"><span>所属部门 <em>*</em></span><select required value={draft.department} onChange={event => patch("department", event.target.value)}>{[...new Set([...state.members.map(item => item.department), draft.department])].map(name => <option key={name}>{name}</option>)}</select></label>
    <label className="rm-field"><span>关联角色 <em>*</em></span><select disabled={isCurrent} value={draft.roleId} onChange={event => patch("roleId", event.target.value)}>{state.roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
    <label className="rm-field"><span>成员状态</span><select disabled={isCurrent || (member.status === "启用" && !canDisable)} value={draft.status} onChange={event => patch("status", event.target.value as ResourceMember["status"])}><option>启用</option><option>停用</option></select></label>
    <div className="settings-form-summary"><span>角色数据范围</span><span>{selectedRole?.scope || "未设置"}</span></div>
    <fieldset className="settings-projects rm-full"><legend>{selectedRole?.scope === "全部项目" ? "全部项目访问范围" : "指定项目（至少选择一个）"}</legend>{selectedRole?.scope === "全部项目" ? <p className="rm-muted">该角色的演示范围覆盖全部 {state.projects.length} 个项目，无需逐项分配。</p> : <div className="settings-project-grid">{state.projects.map(project => <label className="settings-check" key={project.id}><input type="checkbox" checked={draft.projectIds.includes(project.id)} onChange={event => patch("projectIds", event.target.checked ? [...draft.projectIds, project.id] : draft.projectIds.filter(id => id !== project.id))} /><span title={project.name}>{project.name}</span></label>)}</div>}</fieldset>
    <div className="rm-note rm-full">仅维护演示成员资料与范围配置，不创建真实账号、不发送邀请，也不变更实际权限。{isCurrent && "当前演示管理员的角色和启用状态受到保护。"}</div>
    {error && <p className="settings-error rm-full" role="alert">{error}</p>}
  </form></RMDialog>;
}

function RoleEditor({ role, members, projects, change, onSaved }: { role: ResourceRole; members: ResourceMember[]; projects: ResourceProject[]; change: Change; onSaved: (message: string) => void }) {
  const [draft, setDraft] = useState<ResourceRole>({ ...role, permissions: [...role.permissions] });
  const sourceProjects = Object.fromEntries(members.map(member => [member.id, member.projectIds]));
  const [memberProjects, setMemberProjects] = useState<Record<string, string[]>>(sourceProjects);
  const [error, setError] = useState("");
  const sourceSnapshot = JSON.stringify({ role, memberProjects: sourceProjects });
  const [baseline, setBaseline] = useState(sourceSnapshot);
  const dirty = JSON.stringify({ role: draft, memberProjects }) !== baseline;
  const externalChange = dirty && sourceSnapshot !== baseline;
  useEffect(() => {
    if (!dirty && sourceSnapshot !== baseline) {
      setDraft({ ...role, permissions: [...role.permissions] });
      setMemberProjects(sourceProjects); setBaseline(sourceSnapshot); setError("");
    }
  }, [sourceSnapshot, baseline, dirty]);
  const protectedPermission = (permission: string) => role.id === ADMIN_ROLE && ["settings.view", "settings.edit"].includes(permission);
  const togglePermission = (permission: string, checked: boolean) => {
    if (protectedPermission(permission)) return;
    const [module, action] = permission.split(".");
    setDraft(current => {
      let permissions = checked ? [...new Set([...current.permissions, permission, `${module}.view`])] : current.permissions.filter(item => item !== permission);
      if (!checked && action === "view") permissions = permissions.filter(item => !item.startsWith(`${module}.`));
      return { ...current, permissions };
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.description.trim()) { setError("请填写角色名称与角色说明。"); return; }
    const next = { ...draft, name: draft.name.trim(), description: draft.description.trim(), scope: role.id === ADMIN_ROLE ? "全部项目" : draft.scope };
    if (next.scope === "指定项目" && members.some(member => !(memberProjects[member.id] || []).some(id => projects.some(project => project.id === id)))) { setError("请在下方指定项目配置中，为每位关联成员至少分配一个有效项目。"); return; }
    change("系统管理 / 保存角色演示配置", `${next.name}（${next.permissions.length} 项权限）`, current => ({ ...current, roles: current.roles.map(item => item.id === next.id ? next : item), members: current.members.map(member => member.roleId === next.id ? { ...member, projectIds: memberProjects[member.id] || member.projectIds } : member) }));
    setDraft(next); setBaseline(JSON.stringify({ role: next, memberProjects })); setError(""); onSaved(`角色“${next.name}”的本地演示配置已保存，实际用户权限未改变。`);
  };
  return <RMPanel title="角色与数据范围" subtitle={`${role.name} · 已关联 ${members.length} 位成员`}><form className="settings-editor" onSubmit={submit}>
    <div className="settings-local-note"><LockKeyhole size={18} /><span>权限矩阵仅作为本地演示配置，保存后不会启用真实鉴权或更改任何实际用户权限。</span></div>
    {externalChange && <div className="settings-local-note" role="status">另一页面已更新此角色或关联成员的项目范围。本页未保存草稿已保留；“重置修改”可载入最新配置，继续保存将应用本页草稿。</div>}
    <div className="rm-form-grid"><label className="rm-field"><span>角色名称</span><input required maxLength={24} value={draft.name} onChange={event => { setDraft(current => ({ ...current, name: event.target.value })); setError(""); }} /></label><label className="rm-field"><span>项目数据范围</span><select disabled={role.id === ADMIN_ROLE} value={draft.scope} onChange={event => { setDraft(current => ({ ...current, scope: event.target.value })); setError(""); }}><option>全部项目</option><option>指定项目</option></select></label><label className="rm-field rm-full"><span>角色说明</span><textarea required maxLength={160} rows={2} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></label></div>
    {draft.scope === "指定项目" && members.length > 0 && <fieldset className="settings-projects"><legend>成员的指定项目配置</legend><div className="settings-scope-members">{members.map(member => <details key={member.id}><summary>{member.name}<span>已选 {(memberProjects[member.id] || []).length} 个项目</span></summary><div className="settings-project-grid">{projects.map(project => <label className="settings-check" key={project.id}><input type="checkbox" checked={(memberProjects[member.id] || []).includes(project.id)} onChange={event => { const checked = event.target.checked; setMemberProjects(current => ({ ...current, [member.id]: checked ? [...(current[member.id] || []), project.id] : (current[member.id] || []).filter(id => id !== project.id) })); setError(""); }} /><span title={project.name}>{project.name}</span></label>)}</div></details>)}</div></fieldset>}
    <div className="settings-matrix-heading"><h4>演示权限矩阵</h4><span>维护或导出自动包含查看权限</span></div>
    <div className="settings-matrix-scroll"><table className="settings-matrix"><colgroup><col style={{ width: "49%" }} />{permissionActions.map(action => <col key={action.key} style={{ width: "17%" }} />)}</colgroup><thead><tr><th>业务模块</th>{permissionActions.map(action => <th key={action.key}>{action.label}</th>)}</tr></thead><tbody>{modules.map(module => <tr key={module.key}><td>{module.label}<span className="rm-table-sub">{module.description}</span></td>{permissionActions.map(action => { const permission = `${module.key}.${action.key}`; return <td key={permission}><label className="settings-matrix-check"><input type="checkbox" aria-label={`${module.label}${action.label}权限`} checked={draft.permissions.includes(permission)} disabled={protectedPermission(permission)} onChange={event => togglePermission(permission, event.target.checked)} />{protectedPermission(permission) && <LockKeyhole size={12} aria-label="管理员保留权限" />}</label></td>; })}</tr>)}</tbody></table></div>
    <div className="settings-role-members"><span><Users size={14} />关联成员</span><div>{members.length ? members.map(member => <span className="settings-member-chip" key={member.id}>{member.name}<i className={member.status === "启用" ? "" : "inactive"} title={member.status} /></span>) : <span className="rm-muted">暂无成员关联</span>}</div></div>
    {error && <p className="settings-error" role="alert">{error}</p>}
    <div className="settings-save-bar"><span className="rm-muted">{dirty ? "有尚未保存的修改" : `已保存 ${role.permissions.length} 项演示权限`}</span><div className="rm-actions"><button type="button" className="rm-button" disabled={!dirty} onClick={() => { setDraft({ ...role, permissions: [...role.permissions] }); setMemberProjects(sourceProjects); setBaseline(sourceSnapshot); setError(""); }}>重置修改</button><button className="rm-button rm-primary" disabled={!dirty} type="submit"><Save size={15} />保存演示配置</button></div></div>
  </form></RMPanel>;
}

function RuleEditor({ rule, state, change, onSaved }: { rule: ResourceRule; state: ResourceState; change: Change; onSaved: (message: string) => void }) {
  const [draft, setDraft] = useState({ ...rule });
  const [error, setError] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);
  const sourceSnapshot = JSON.stringify(rule);
  const [baseline, setBaseline] = useState(sourceSnapshot);
  const dirty = JSON.stringify(draft) !== baseline;
  const externalChange = dirty && sourceSnapshot !== baseline;
  useEffect(() => {
    if (!dirty && sourceSnapshot !== baseline) {
      setDraft({ ...rule }); setBaseline(sourceSnapshot); setError(""); setConfirmDisable(false);
    }
  }, [sourceSnapshot, baseline, dirty]);
  const trigger = triggerOptions[draft.trigger] || triggerOptions["整改期限临近"];
  const recipients = state.members.filter(member => member.roleId === draft.recipientRoleId && member.status === "启用");
  const recipientRole = state.roles.find(role => role.id === draft.recipientRoleId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !recipientRole || !Number.isFinite(draft.threshold) || draft.threshold < 1 || draft.threshold > trigger.max || !Number.isInteger(draft.threshold)) { setError("请填写规则名称、有效阈值及接收角色。"); return; }
    if (draft.enabled && !recipients.length) { setError("所选角色暂无启用成员，请先关联启用成员或将规则设为停用。"); return; }
    const next = { ...draft, name: draft.name.trim() };
    change("系统管理 / 保存通知规则", next.name, current => ({ ...current, rules: current.rules.map(item => item.id === next.id ? next : item) }));
    setDraft(next); setBaseline(JSON.stringify(next)); setError(""); onSaved(`已保存“${next.name}”的站内提醒演示规则，未发送真实通知。`);
  };
  const toggleRule = () => {
    const next = { ...rule, enabled: !rule.enabled };
    const activeRecipients = state.members.filter(member => member.roleId === next.recipientRoleId && member.status === "启用");
    if (next.enabled && !activeRecipients.length) { setError("该规则的接收角色暂无启用成员，请先调整接收角色。"); return; }
    change(`系统管理 / ${next.enabled ? "启用" : "停用"}通知规则`, next.name, current => ({ ...current, rules: current.rules.map(item => item.id === next.id ? next : item) }));
    setDraft(next); setBaseline(JSON.stringify(next)); setConfirmDisable(false); setError(""); onSaved(`“${next.name}”已${next.enabled ? "启用" : "停用"}，仅保存演示规则。`);
  };
  return <RMPanel title="提醒条件设置" subtitle={`${rule.name} · ${rule.enabled ? "启用" : "停用"}`} actions={<button className="rm-button" disabled={dirty} title={dirty ? "请先保存或重置修改" : undefined} onClick={() => rule.enabled ? setConfirmDisable(true) : toggleRule()}>{rule.enabled ? "停用规则" : "启用规则"}</button>}><form className="settings-editor" onSubmit={submit}>
    {externalChange && <div className="settings-local-note" role="status">另一页面已更新此通知规则。本页未保存草稿已保留；“重置修改”可载入最新配置，继续保存将应用本页草稿。</div>}
    <div className="rm-form-grid"><label className="rm-field"><span>规则名称</span><input required maxLength={30} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><label className="rm-field"><span>提醒渠道</span><select value="站内提醒（演示）" disabled><option>站内提醒（演示）</option></select></label><label className="rm-field"><span>触发条件</span><select value={draft.trigger} onChange={event => { const value = event.target.value; setDraft(current => ({ ...current, trigger: value, threshold: Math.min(current.threshold, triggerOptions[value].max) })); setError(""); }}>{Object.keys(triggerOptions).map(name => <option key={name}>{name}</option>)}</select></label><label className="rm-field"><span>触发阈值（{trigger.unit}）</span><input required type="number" min={1} max={trigger.max} step={1} value={draft.threshold || ""} onChange={event => setDraft(current => ({ ...current, threshold: Number(event.target.value) }))} /></label><label className="rm-field"><span>接收角色</span><select value={draft.recipientRoleId} onChange={event => { setDraft(current => ({ ...current, recipientRoleId: event.target.value })); setError(""); }}>{state.roles.map(role => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label><label className="rm-field"><span>规则状态</span><select value={draft.enabled ? "启用" : "停用"} onChange={event => setDraft(current => ({ ...current, enabled: event.target.value === "启用" }))}><option>启用</option><option>停用</option></select></label></div>
    <div className="settings-notification-preview"><div className="settings-preview-title"><BellRing size={17} /><span>站内提醒内容预览</span><RMBadge tone="blue">演示</RMBadge></div><h4>{draft.name || "未命名提醒"}</h4><p>{trigger.description(draft.threshold || 0)}时，向“{recipientRole?.name || "未选择角色"}”生成站内提醒。</p><div className="settings-preview-recipient">接收成员：{recipients.length ? recipients.map(member => member.name).join("、") : "暂无启用成员"}</div></div>
    <div className="settings-local-note"><BellRing size={17} /><span>当前页面仅保存通知配置并预览提醒内容，未运行通知调度，也不会发送短信、邮件或真实站内消息。</span></div>
    {error && <p className="settings-error" role="alert">{error}</p>}
    <div className="settings-save-bar"><span className="rm-muted">{dirty ? "有尚未保存的修改" : `${recipients.length} 位启用成员可接收演示提醒`}</span><div className="rm-actions"><button type="button" className="rm-button" disabled={!dirty} onClick={() => { setDraft({ ...rule }); setBaseline(sourceSnapshot); setError(""); }}>重置修改</button><button className="rm-button rm-primary" disabled={!dirty} type="submit"><Save size={15} />保存规则</button></div></div>
  </form>{confirmDisable && <RMDialog title="停用站内提醒规则" onClose={() => setConfirmDisable(false)} footer={<><button className="rm-button" onClick={() => setConfirmDisable(false)}>取消</button><button className="rm-button rm-primary" onClick={toggleRule}>确认停用</button></>}><p>停用“{rule.name}”后，规则保留在台账中，可再次启用。</p><div className="rm-note">仅修改本地演示配置，不影响任何真实通知服务。</div></RMDialog>}</RMPanel>;
}
