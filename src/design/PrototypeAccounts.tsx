import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, LockKeyhole, Plus, Save, Search, ShieldCheck, Users } from "lucide-react";
import { makeId, useResources } from "../features/resources/ResourceContext";
import { RMBadge, RMDialog, RMEmpty, RMPanel, RMTable, RMTabs, ResourceDataNote } from "../features/resources/ResourceUI";
import type { ResourceMember, ResourcePageProps, ResourceProject, ResourceRole, ResourceRule, ResourceState, RMColumn } from "../features/resources/resourceTypes";
import "../features/resources/SettingsPage.css";

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

export default function PrototypeAccounts({ focusId }: ResourcePageProps) {
  const { state, change, storageError } = useResources();
  const [tab, setTab] = useState("members");
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [memberDraft, setMemberDraft] = useState<ResourceMember | null>(null);
  const [memberToggle, setMemberToggle] = useState<ResourceMember | null>(null);
  const [roleId, setRoleId] = useState("");
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
  const selectedRole = state.roles.find(role => role.id === roleId);
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

  return <div className="prototype-resources prototype-account-workflows"><div className="rm-page settings-page">
    <RMTabs items={[{ key: "members", label: "成员与组织", count: state.members.length }, { key: "roles", label: "角色与数据范围", count: state.roles.length }]} value={tab} onChange={value => { setTab(value); setFeedback(""); }} />
    {feedback && <div className="settings-feedback" role="status">{feedback}</div>}
    {tab === "members" && <>
      <div className="settings-org-strip" aria-label="按部门筛选成员">{departments.map(name => <button className={`settings-org-item${department === name ? " active" : ""}`} key={name} onClick={() => setDepartment(department === name ? "" : name)} aria-pressed={department === name}><Building2 size={18} /><span>{name}<small>{state.members.filter(member => member.department === name && member.status === "启用").length} 位启用成员</small></span><span className="settings-org-count">{state.members.filter(member => member.department === name).length}</span></button>)}</div>
      <RMPanel title="成员台账" subtitle={`当前显示 ${rows.length} 位成员，成员与角色配置关联。`} actions={<button className="rm-button rm-primary" onClick={() => setMemberDraft({ id: makeId("U"), name: "", department: "现场检查组", roleId: state.roles.find(role => role.id !== ADMIN_ROLE)?.id || ADMIN_ROLE, phone: "", status: "启用", projectIds: [], lastLogin: "尚未演示登录" })}><Plus size={16} />新增成员</button>}>
        <div className="rm-filters settings-member-filters"><label className="rm-field"><span>成员搜索</span><div className="settings-search"><Search size={16} /><input aria-label="成员搜索" placeholder="姓名、手机号或角色" value={keyword} onChange={event => setKeyword(event.target.value)} /></div></label><label className="rm-field"><span>所属部门</span><select value={department} onChange={event => setDepartment(event.target.value)}><option value="">全部部门</option>{departments.map(name => <option key={name}>{name}</option>)}</select></label><label className="rm-field"><span>成员状态</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">全部状态</option><option>启用</option><option>停用</option></select></label><button className="rm-button" onClick={resetMembers}>重置筛选</button></div>
        <RMTable columns={columns} rows={rows} rowKey={member => member.id} empty={<RMEmpty text="没有匹配的成员，可调整姓名、部门或状态条件。" onReset={resetMembers} />} />
        <div className="settings-panel-note"><LockKeyhole size={14} />当前演示管理员保留启用状态；成员资料及启停均仅在本机演示数据中生效。</div>
      </RMPanel>
    </>}
    {tab === "roles" && <RMPanel title="角色列表" subtitle="点击角色查看权限矩阵、数据范围与关联成员" className="settings-role-list"><RMTable rows={state.roles} rowKey={role => role.id} onRow={role => setRoleId(role.id)} columns={[
      { key: "name", label: "角色名称", width: "20%", render: role => <button className="rm-link" onClick={() => setRoleId(role.id)}>{role.name}</button> },
      { key: "description", label: "角色说明", width: "32%", render: role => <span title={role.description}>{role.description}</span> },
      { key: "scope", label: "数据范围", width: "15%", render: role => role.scope },
      { key: "permissions", label: "演示权限", width: "11%", render: role => `${role.permissions.length} 项` },
      { key: "members", label: "关联成员", width: "11%", render: role => `${state.members.filter(member => member.roleId === role.id).length} 人` },
      { key: "action", label: "操作", width: "11%", render: role => <button className="rm-link" onClick={() => setRoleId(role.id)}>查看配置</button> },
    ]} /></RMPanel>}
    {tab === "roles" && selectedRole && <RMDialog drawer title={`角色配置 · ${selectedRole.name}`} onClose={() => setRoleId("")}><RoleEditor key={selectedRole.id} role={selectedRole} members={state.members.filter(member => member.roleId === selectedRole.id)} projects={state.projects} change={change} onSaved={report} />{feedback && <div className="settings-feedback" role="status">{feedback}</div>}</RMDialog>}
    <ResourceDataNote error={storageError} />
    {memberDraft && <MemberEditor member={memberDraft} state={state} canDisable={canDisable(memberDraft)} onClose={() => setMemberDraft(null)} onSave={saveMember} />}
    {memberToggle && <RMDialog title={`${memberToggle.status === "启用" ? "停用" : "启用"}演示成员`} onClose={() => setMemberToggle(null)} footer={<><button className="rm-button" onClick={() => setMemberToggle(null)}>取消</button><button className="rm-button rm-primary" onClick={toggleMember}>确认{memberToggle.status === "启用" ? "停用" : "启用"}</button></>}><p>将{memberToggle.status === "启用" ? "停用" : "启用"}“{memberToggle.name}”的本地演示成员记录。</p><div className="rm-note">成员资料、项目关联和历史操作记录会保留。此操作不影响任何真实账号。</div></RMDialog>}
  </div></div>;
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

