import { projectNames, hazards, projects } from "./PrototypeFixtures";
import { HazardPage } from "./PrototypeHazards";
import OperationsModules from "../features/operations/OperationsModules";
import { IntelligencePage, KnowledgeCompletePage, ExpertRulesCompletePage } from "./PrototypeIntelligence";
import { TasksPage, HelmetPage } from "./PrototypeTaskHelmet";
import PrototypeOperations from "./PrototypeOperations";
import PrototypeExpert from "./PrototypeExpert";
import { IconButton, Button, Pill, PageHeader, SectionCard, MetricCard, Field, Modal, DataTable, downloadText } from "./PrototypeUI";
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { AlertCircle, Bell, BookOpen, Building2, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3, Cloud, Cpu, Download, FileBarChart, FileCheck2, HardHat, Headphones, Home, Layers3, LayoutDashboard, ListFilter, MapPin, Network, Plus, RefreshCw, Search, Settings2, ShieldAlert, ShieldCheck, Sparkles, Target, Wrench } from "lucide-react";
import { sceneImages } from "../data/demoSceneMedia";
import HazardGraphCompletePage from "./ThemePrototypeGraph";
import ThemePrototypeRegionMap from "./ThemePrototypeRegionMap";
import ThemePrototypeSettings from "./ThemePrototypeSettings";
import ExpertSceneSelector from "./ExpertSceneSelector";
import PrototypeResources, { isPrototypeResourcePage } from "./PrototypeResources";
import PrototypeLogin from "./PrototypeLogin";
import PrototypeWorkbench from "./PrototypeWorkbench";
import { ResourceProvider } from "../features/resources/ResourceContext";
import "./theme-prototype.css";
import "./theme-prototype-layout.css";
import "./theme-prototype-overdue.css";
import "./theme-prototype-retake.css";
import "./theme-prototype-resources.css";
import "./theme-prototype-audit.css";
import "./theme-prototype-premium.css";

type ThemeMode = "hybrid" | "current";
type PageId = "dashboard" | "tasks" | "helmet" | "hazardRegister" | "hazardRectify" | "hazardStats" | "hazardOverdue" | "expert" | "modelCenter" | "knowledge" | "hazardGraph" | "expertRules" | "analytics" | "warnings" | "reports" | "customers" | "projects" | "devices" | "templates" | "settings";
type PageInfo = { id: PageId; label: string; path: string; group: string; icon: React.ElementType };
const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");
const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const withAppBasePath = (route: string) => !APP_BASE_PATH ? route || "/" : route === "/" ? `${APP_BASE_PATH}/` : `${APP_BASE_PATH}${route}`;
const prototypeEntry = withAppBasePath("/theme-prototype.html");
const prototypeRoute = (path: string, focusId?: string) => `${prototypeEntry}?page=${encodeURIComponent(path)}${focusId ? `&focus=${encodeURIComponent(focusId)}` : ""}`;
const readPrototypePath = () => {
  const queryPath = new URLSearchParams(window.location.search).get("page");
  if (queryPath) return queryPath;
  const publicPath = window.location.pathname;
  if (APP_BASE_PATH && publicPath.startsWith(APP_BASE_PATH)) return publicPath.slice(APP_BASE_PATH.length) || "/";
  return publicPath;
};
const readPrototypeFocus = () => new URLSearchParams(window.location.search).get("focus") || undefined;

const pages: PageInfo[] = [
  { id: "dashboard", label: "运营工作台", path: "/", group: "监控与工作台", icon: Home },
  { id: "tasks", label: "检查任务", path: "/tasks", group: "监控与工作台", icon: ClipboardCheck },
  { id: "helmet", label: "安全帽现场端", path: "/helmet-live", group: "监控与工作台", icon: HardHat },
  { id: "hazardRegister", label: "隐患登记", path: "/hazards", group: "隐患闭环", icon: Target },
  { id: "hazardRectify", label: "隐患整改", path: "/hazards/rectification", group: "隐患闭环", icon: Wrench },
  { id: "hazardStats", label: "隐患统计看板", path: "/hazards/statistics", group: "隐患闭环", icon: FileBarChart },
  { id: "hazardOverdue", label: "隐患超期预警", path: "/hazards/overdue", group: "隐患闭环", icon: AlertCircle },
  { id: "expert", label: "远程专家", path: "/expert", group: "专家与智能分析", icon: Headphones },
  { id: "modelCenter", label: "大模型中台", path: "/model-center", group: "专家与智能分析", icon: Sparkles },
  { id: "knowledge", label: "知识库", path: "/model-center/knowledge", group: "专家与智能分析", icon: BookOpen },
  { id: "hazardGraph", label: "隐患图谱", path: "/model-center/hazard-graph", group: "专家与智能分析", icon: Network },
  { id: "expertRules", label: "专家规则库", path: "/model-center/expert-rules", group: "专家与智能分析", icon: Layers3 },
  { id: "analytics", label: "数据看板", path: "/analytics", group: "运营分析", icon: LayoutDashboard },
  { id: "warnings", label: "预警中心", path: "/warnings", group: "运营分析", icon: Bell },
  { id: "reports", label: "报告中心", path: "/reports", group: "运营分析", icon: FileBarChart },
  { id: "customers", label: "客户与项目档案", path: "/customers/enterprise", group: "资源管理", icon: Building2 },
  { id: "projects", label: "项目管理", path: "/projects", group: "资源管理", icon: MapPin },
  { id: "devices", label: "设备管理", path: "/devices", group: "资源管理", icon: Cpu },
  { id: "templates", label: "检查模板", path: "/templates", group: "资源管理", icon: FileCheck2 },
  { id: "settings", label: "系统管理", path: "/settings", group: "资源管理", icon: Settings2 }
];

function DashboardOverview({ notify, navigate }: { notify: (message: string) => void; navigate: (path: string) => void }) {
  const [evidence, setEvidence] = useState<string[] | null>(null); const [refreshed, setRefreshed] = useState("10:36:12"); const [project, setProject] = useState("全部项目"); const [date, setDate] = useState("2025-05-16");
  return <div className="page-stack"><PageHeader eyebrow="OPERATIONS / 01" title="运营工作台" description="今天的检查任务、现场风险与整改进度集中在一个工作面。" actions={<><Button icon={RefreshCw} variant="secondary" onClick={() => setRefreshed(new Date().toLocaleTimeString())}>刷新数据</Button><Button icon={Plus} onClick={() => navigate("/tasks")}>新建检查任务</Button></>} /><div className="filter-strip"><Field label="统计日期"><input type="date" value={date} onInput={e => setDate(e.currentTarget.value)} onChange={e => setDate(e.target.value)} /></Field><Field label="项目范围"><select value={project} onChange={e => setProject(e.target.value)}>{projectNames.map((name) => <option key={name}>{name}</option>)}</select></Field><div className="filter-note"><span className="live-dot" />数据更新时间 10:36:12 · 自动同步</div></div><div className="metric-grid"><MetricCard label="今日检查任务" value="48" detail="16 项已完成 · 完成率 33.33%" icon={ClipboardCheck} tone="blue" /><MetricCard label="待整改隐患" value="152" detail="98 项一般 · 54 项重大" icon={ShieldAlert} tone="amber" /><MetricCard label="超期预警" value="24" detail="12 项即将超期 · 12 项已超期" icon={Bell} tone="red" /><MetricCard label="安全帽设备" value="36" detail="28 顶在线 · 8 顶离线" icon={HardHat} tone="green" /></div><div className="dashboard-grid two-one"><SectionCard eyebrow="LIVE RISK RADAR" title="现场风险雷达" action={<Pill tone="success">实时监控</Pill>}><div className="radar-layout"><div className="radar-orbit"><div className="radar-scan" /><div className="radar-core"><ShieldCheck size={26} /><strong>92</strong><span>安全指数</span></div><span className="radar-dot d1" /><span className="radar-dot d2" /><span className="radar-dot d3" /></div><div className="radar-list"><div><span>在线检查员</span><strong>18 / 22</strong><Pill tone="success">稳定</Pill></div><div><span>AI 识别队列</span><strong>07 条</strong><Pill tone="warning">处理中</Pill></div><div><span>需专家复核</span><strong>03 条</strong><Pill tone="danger">优先</Pill></div></div></div></SectionCard><SectionCard eyebrow="CLOSURE FLOW" title="隐患状态" action={<Button variant="ghost" onClick={() => navigate("/hazards/statistics")}>查看统计 <ChevronRight size={15} /></Button>}><div className="bar-stack">{[["待整改", "152", "88%", "danger"], ["整改中", "68", "52%", "amber"], ["待复查", "30", "26%", "blue"], ["已整改", "54", "38%", "green"]].map((row) => <div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><i><b className={row[3]} style={{ width: row[2] }} /></i></div>)}</div></SectionCard></div><SectionCard eyebrow="PRIORITY QUEUE" title="重点隐患流转" action={<Button variant="ghost" onClick={() => navigate("/hazards")}>进入隐患闭环 <ChevronRight size={15} /></Button>}><DataTable headers={["隐患项", "项目 / 位置", "风险等级", "责任人", "整改期限", "状态"]} rows={hazards.filter(row => (project === "全部项目" || row[2] === project) && (!date || row[7] >= date)).slice(0, 4).map((row) => [row[1], row[2] + " · " + row[3], row[5], row[6], row[7], row[8]])} onAction={() => navigate("/hazards/rectification")} /></SectionCard><SectionCard eyebrow="EVIDENCE STREAM" title="现场证据摘要" action={<Button variant="ghost" onClick={() => navigate("/helmet-live")}>打开现场端 <ChevronRight size={15} /></Button>}><div className="evidence-grid">{[["配电箱门未关闭", "齐鲁科技园 · B1 配电室", sceneImages.electricalPanelOpen], ["消防通道占用", "国控大厦 · 东侧通道", sceneImages.fireCorridorBlocked], ["线缆防护待核查", "国控大厦 · B1 配电室", sceneImages.cableExposed], ["灭火器压力待核查", "鲁商广场 · 后厨", sceneImages.extinguisherLowPressure]].map((item) => <button className="evidence-card" type="button" key={item[0]} onClick={() => setEvidence(item)}><img src={item[2] as string} alt={item[0] as string} /><div><Pill tone="danger">高风险</Pill><strong>{item[0]}</strong><span>{item[1]}</span></div></button>)}</div></SectionCard><Modal title="现场证据摘要" open={Boolean(evidence)} onClose={() => setEvidence(null)} wide>{evidence && <><img className="preview-image" src={evidence[2]} alt={evidence[0]} /><h3>{evidence[0]}</h3><p>{evidence[1]}</p><p className="muted-note">参考素材 · 建议结合现场情况核查，在现场端采集并登记证据。</p><div className="modal-foot"><Button onClick={() => navigate("/helmet-live")}>进入现场端</Button><Button variant="secondary" onClick={() => navigate("/hazards")}>进入隐患登记</Button></div></>}</Modal></div>;
}

function DashboardPage({ notify, navigate }: { notify: (message: string) => void; navigate: (path: string) => void }) {
  return <PrototypeWorkbench navigate={navigate}><DashboardOverview notify={notify} navigate={navigate} /></PrototypeWorkbench>;
}

function AnalyticsPage({ notify, navigate }: { notify: (message: string) => void; navigate: (path: string) => void }) { const [view, setView] = useState("综合画像"); const [refreshed, setRefreshed] = useState(""); return <><div className="prototype-analysis-tabs"><button className={view === "综合画像" ? "active" : ""} onClick={() => setView("综合画像")}>综合画像</button><button className={view === "预警台账分析" ? "active" : ""} onClick={() => setView("预警台账分析")}>预警台账分析</button></div>{view === "预警台账分析" ? <div className="prototype-resources prototype-operations"><OperationsModules page="analytics" navigate={next => navigate(`/${next}`)} notify={notify} /></div> : <div className="page-stack"><PageHeader eyebrow="ANALYTICS / 10" title="数据看板" description="从项目、人员、设备和隐患四个角度观察安全运营。" actions={<><Button variant="secondary" icon={Download} onClick={() => { downloadText("安全运营画像.csv", "\uFEFF指标,数值\n检查完成率,88.6%\n隐患闭环率,76.4%\nAI识别准确率,92.6%\n平均响应时长,18min"); notify("报表已导出"); }}>导出报表</Button><Button icon={RefreshCw} onClick={() => setRefreshed(new Date().toLocaleTimeString())}>刷新看板</Button></>} />{refreshed && <p className="muted-note">示例指标已重新载入 · {refreshed}</p>}<div className="metric-grid"><MetricCard label="检查完成率" value="88.6%" detail="较上周期 ↑ 6.2%" icon={CheckCircle2} tone="green" /><MetricCard label="隐患闭环率" value="76.4%" detail="目标 85%" icon={Target} tone="blue" /><MetricCard label="AI 识别准确率" value="92.6%" detail="较上周期 ↑ 4.2%" icon={Sparkles} tone="amber" /><MetricCard label="平均响应时长" value="18 min" detail="较上周期 ↓ 7 min" icon={Clock3} tone="red" /></div><div className="analytics-grid"><SectionCard title="检查量与隐患量趋势" eyebrow="VOLUME TREND"><div className="chart-legend"><span><i className="legend-dot blue" />检查量</span><span><i className="legend-dot red" />隐患量</span></div><div className="fake-chart bar-chart"><div className="chart-y"><span>120</span><span>90</span><span>60</span><span>30</span><span>0</span></div><div className="bars">{[70, 84, 62, 102, 94, 112, 118].map((height, index) => <div key={index}><i style={{ height: height + "px" }} /><b style={{ height: height / 2 + "px" }} /><span>05-{10 + index}</span></div>)}</div></div></SectionCard><SectionCard title="项目风险分布" eyebrow="PROJECT RISK"><div className="project-risk-list">{projects.map((row) => <div key={row[0]}><strong>{row[1]}</strong><span>{row[4]}</span><i><b style={{ width: row[5] }} /></i><em>{row[5]}</em></div>)}</div></SectionCard><SectionCard title="检查类型占比" eyebrow="CHECK TYPES"><div className="donut-wrap large"><div className="donut"><strong>48</strong><span>本周期任务</span></div><div className="legend-list"><div><i className="legend-dot blue" />消防安全 <b>42%</b></div><div><i className="legend-dot amber" />用电安全 <b>35%</b></div><div><i className="legend-dot green" />复查验收 <b>23%</b></div></div></div></SectionCard><ThemePrototypeRegionMap /></div></div>}</>; }
function PrototypeApp() {
  const [globalPanel, setGlobalPanel] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [resourceFocus, setResourceFocus] = useState<string | undefined>(readPrototypeFocus);
  const [theme, setTheme] = useState<ThemeMode>("hybrid"); const [pathname, setPathname] = useState(readPrototypePath()); const [directoryOpen, setDirectoryOpen] = useState(false); const [mobileNavOpen, setMobileNavOpen] = useState(false); const [toast, setToast] = useState("");
  useEffect(() => { const sync = () => { setPathname(readPrototypePath()); setResourceFocus(readPrototypeFocus()); }; window.addEventListener("popstate", sync); return () => window.removeEventListener("popstate", sync); }, []);
  useEffect(() => { document.title = "消防与用电安全 · 独立页面设计原型"; }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); }, [toast]);
  const activePage = useMemo(() => pages.find((page) => page.path === pathname) || pages[0], [pathname]); const groups = useMemo(() => Array.from(new Set(pages.map((page) => page.group))), []);
  const notify = (message: string) => setToast(message); const navigate = (path: string, focusId?: string) => { const route = prototypeRoute(path, focusId); if (`${window.location.pathname}${window.location.search}` !== route) window.history.pushState({}, "", route); setPathname(path); setResourceFocus(focusId); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const renderPage = () => {
    if (isPrototypeResourcePage(activePage.id)) return <PrototypeResources page={activePage.id} focusId={resourceFocus} navigate={navigate} />;
    if (activePage.id === "dashboard") return <DashboardPage notify={notify} navigate={navigate} />;
    if (activePage.id === "tasks") return <TasksPage notify={notify} navigate={navigate} />;
    if (activePage.id === "helmet") return <HelmetPage notify={notify} navigate={navigate} />;
    if (activePage.id === "expert") return <PrototypeExpert notify={notify} navigate={navigate} />;
    if (["hazardRegister", "hazardRectify", "hazardStats", "hazardOverdue"].includes(activePage.id)) return <HazardPage variant={activePage.id as "hazardRegister" | "hazardRectify" | "hazardStats" | "hazardOverdue"} notify={notify} navigate={navigate} />;
    if (activePage.id === "modelCenter") return <IntelligencePage type="modelCenter" notify={notify} navigate={navigate} />;
    if (activePage.id === "knowledge") return <KnowledgeCompletePage notify={notify} navigate={navigate} />;
    if (activePage.id === "hazardGraph") return <HazardGraphCompletePage notify={notify} />;
    if (activePage.id === "expertRules") return <ExpertRulesCompletePage notify={notify} navigate={navigate} />;
    if (activePage.id === "analytics") return <AnalyticsPage notify={notify} navigate={navigate} />;
    if (activePage.id === "warnings") return <PrototypeOperations page="warnings" notify={notify} navigate={navigate} focusId={resourceFocus} />;
    if (activePage.id === "reports") return <PrototypeOperations page="reports" notify={notify} navigate={navigate} focusId={resourceFocus} />;
    return <ThemePrototypeSettings />;
  };
  if (pathname === "/login") return <PrototypeLogin onEnter={() => navigate("/")} />;
  return <div className="prototype-app" data-theme={theme} data-page={activePage.id}><aside className={cx("prototype-sidebar", mobileNavOpen && "is-open")}><div className="brand-lockup"><span className="brand-mark"><img src="/design-assets/safety-logo-v3.png" alt="" /></span><div><strong>国控安全</strong><small>SAFETY OPS / 2.0</small></div></div><div className="sidebar-status"><span className="live-dot" />系统运行正常<span>·</span><span>10:36</span></div><nav className="prototype-nav">{groups.map((group) => <div className="nav-group" key={group}><div className="nav-group-label">{group}</div>{pages.filter((page) => page.group === group).map((page) => { const Icon = page.icon; return <button type="button" className={page.id === activePage.id ? "active" : ""} key={page.id} onClick={() => { navigate(page.path); setMobileNavOpen(false); }}><Icon size={17} /><span>{page.label}</span>{page.id === "warnings" && <b>12</b>}</button>; })}</div>)}</nav><div className="sidebar-foot"><div className="sync-row"><Cloud size={15} /><span>数据已同步</span><span className="sync-time">10:36</span></div><button type="button" className="sidebar-user" onClick={() => navigate("/settings")}><span className="avatar">管</span><span><strong>系统管理员</strong><small>超级管理员</small></span><ChevronDown size={15} /></button></div></aside>{mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="关闭导航" onClick={() => setMobileNavOpen(false)} />}<main className="prototype-workspace"><header className="prototype-topbar"><button className="mobile-nav" type="button" aria-label="打开导航" onClick={() => setMobileNavOpen(true)}><ListFilter size={16} />导航</button><div className="breadcrumbs"><span>消防与用电安全</span><ChevronRight size={15} /><strong>{activePage.label}</strong></div><div className="topbar-actions"><button className="directory-toggle" type="button" aria-expanded={directoryOpen} aria-controls="prototype-page-directory" onClick={() => setDirectoryOpen((value) => !value)}><span><ListFilter size={16} />页面目录</span><small>{directoryOpen ? "收起" : "展开"}</small></button><div className="theme-switch"><span>界面主题</span><button type="button" className={theme === "hybrid" ? "active" : ""} onClick={() => setTheme("hybrid")}>深浅混合</button><button type="button" className={theme === "current" ? "active" : ""} onClick={() => setTheme("current")}>当前主题</button></div><IconButton label="全局搜索" onClick={() => { setGlobalQuery(""); setGlobalPanel("全局搜索"); }}><Search size={17} /></IconButton><IconButton label="预警中心" onClick={() => navigate("/warnings")}><Bell size={17} /><i className="icon-badge">12</i></IconButton><IconButton label="帮助" onClick={() => setGlobalPanel("使用帮助")}><CircleHelp size={17} /></IconButton></div></header><div className="prototype-ribbon"><span className="ribbon-dot" /><strong>独立页面设计原型</strong><span>演示数据 · 现有业务内容与新版交互样式</span><span className="ribbon-page">当前：{activePage.label}</span></div><section className="prototype-content">{renderPage()}</section></main><aside className={cx("directory-panel", directoryOpen && "open")}>{directoryOpen && <div className="directory-body" id="prototype-page-directory"><div className="directory-title"><span>页面导航</span><Pill tone="info">{pages.length} 页</Pill></div>{groups.map((group) => <div className="directory-group" key={group}><h3>{group}</h3>{pages.filter((page) => page.group === group).map((page) => <button type="button" className={page.id === activePage.id ? "active" : ""} key={page.id} onClick={() => { navigate(page.path); setDirectoryOpen(false); }}>{page.label}<ChevronRight size={13} /></button>)}</div>)}<p>页面内容、数据字段和操作路径按照现有系统功能重新设计。</p></div>}</aside><Modal title={globalPanel} open={Boolean(globalPanel)} onClose={() => setGlobalPanel("")}><div className="prototype-workflow-list">{globalPanel === "全局搜索" ? <><Field label="查找功能页面"><input autoFocus placeholder="输入任务、报告、知识库等关键词" value={globalQuery} onChange={e => setGlobalQuery(e.target.value)} /></Field>{pages.filter(p => `${p.label}${p.group}`.includes(globalQuery.trim())).map(p => <Button key={p.id} variant="secondary" onClick={() => { navigate(p.path); setGlobalPanel(""); }}>{p.label} · {p.group}</Button>)}{!pages.some(p => `${p.label}${p.group}`.includes(globalQuery.trim())) && <p>暂无匹配页面，请更换关键词。</p>}</> : <><article><h3>建议演示路径</h3><p>创建检查任务并绑定安全帽 → 现场检查与证据采集 → 隐患登记 → 整改派发与复查 → 专家审核 → 报告编制与归档。</p></article><article><h3>本地演示数据</h3><p>表单、审批、通知和设备操作用于原型演示，记录保存在本机浏览器。知识与报告支持预览、下载；通知和设备控制展示模拟结果。</p></article><Button onClick={() => { navigate("/tasks"); setGlobalPanel(""); }}>从检查任务开始</Button><Button variant="secondary" onClick={() => { navigate("/model-center/knowledge"); setGlobalPanel(""); }}>打开知识库</Button></>}</div></Modal>{toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span></div>}</div>;
}

const prototypeRoot = (import.meta.hot?.data.root as ReturnType<typeof ReactDOM.createRoot> | undefined) || ReactDOM.createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = prototypeRoot;
prototypeRoot.render(<React.StrictMode><ResourceProvider><PrototypeApp /></ResourceProvider></React.StrictMode>);




