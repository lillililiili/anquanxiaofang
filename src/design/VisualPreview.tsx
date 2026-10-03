import { useState, type ElementType } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  HardHat,
  Layers3,
  MapPin,
  Network,
  Radio,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert
} from "lucide-react";
import "./VisualPreview.css";

type PreviewPage = "login" | "dashboard" | "hazards" | "devices" | "reports" | "analytics" | "knowledge";

const assets = {
  mark: "/brand/brand-mark.png",
  markLight: "/brand/brand-mark-light.png",
  hero: "/ui-backgrounds/login-hero.png",
  dashboard: "/ui-backgrounds/dashboard-atmosphere.png",
  hazard: "/ui-backgrounds/hazard-amber.png",
  helmet: "/ui-backgrounds/helmet-field.png",
  report: "/ui-backgrounds/report-evidence.png",
  park: "/ui-backgrounds/park-overview.png",
  knowledge: "/ui-backgrounds/knowledge-grid.png",
  texture: "/ui-backgrounds/card-texture.png"
} as const;

const pageMeta: Record<PreviewPage, { label: string; eyebrow: string; description: string; icon: ElementType }> = {
  login: { label: "登录入口", eyebrow: "SECURE ACCESS", description: "品牌入口与演示登录状态", icon: ShieldCheck },
  dashboard: { label: "运营工作台", eyebrow: "OPERATIONS CENTER", description: "巡检、识别、整改、复核总览", icon: Activity },
  hazards: { label: "隐患闭环", eyebrow: "HAZARD CLOSURE", description: "从疑似发现到复核归档", icon: ShieldAlert },
  devices: { label: "安全帽现场端", eyebrow: "FIELD DEVICES", description: "设备在线、取证与现场协同", icon: HardHat },
  reports: { label: "报告中心", eyebrow: "REPORT CENTER", description: "证据链与检查报告归档", icon: FileText },
  analytics: { label: "数据看板", eyebrow: "RISK ANALYTICS", description: "园区风险画像与趋势分析", icon: BarChart3 },
  knowledge: { label: "知识中台", eyebrow: "KNOWLEDGE GRID", description: "检查依据、规则和专家知识网络", icon: Network }
};

const pageOrder: PreviewPage[] = ["login", "dashboard", "hazards", "devices", "reports", "analytics", "knowledge"];

function VisualPreview() {
  const [active, setActive] = useState<PreviewPage>("login");
  const [status, setStatus] = useState("演示入口已准备");
  const current = pageMeta[active];

  return (
    <div className="visual-preview">
      <header className="visual-preview-topbar">
        <div className="visual-preview-brand"><span className="visual-preview-brand-mark"><img src={assets.mark} alt="安全检查平台 Logo" /></span><span><b>消防与用电安全</b><small>全局视觉设计预览</small></span></div>
        <div className="visual-preview-topbar-meta"><span className="preview-status-dot" />A · 深海蓝琥珀安全<span className="preview-divider" />演示素材预览</div>
      </header>
      <main className="visual-preview-main">
        <div className="visual-preview-heading"><div><span className="visual-preview-kicker">{current.eyebrow}</span><h1>{current.label}</h1><p>{current.description}</p></div><div className="visual-preview-heading-note"><Eye size={15} /> 当前仅为视觉设计稿，业务数据保持演示态</div></div>
        {active === "login" ? <LoginPreview status={status} setStatus={setStatus} /> : <WorkspacePreview page={active} onNavigate={setActive} />}
      </main>
      <nav className="visual-preview-switcher" aria-label="页面设计预览切换">{pageOrder.map((page) => { const Icon = pageMeta[page].icon; return <button key={page} className={page === active ? "active" : ""} onClick={() => setActive(page)}><Icon size={15} />{pageMeta[page].label}</button>; })}</nav>
      <footer className="visual-preview-footer"><span><Sparkles size={14} /> Generated visual system · 深海蓝 / 钢蓝 / 琥珀</span><span>{status}</span></footer>
    </div>
  );
}

function LoginPreview({ status, setStatus }: { status: string; setStatus: (value: string) => void }) {
  return <section className="login-preview-shell">
    <div className="login-preview-hero">
      <img src={assets.hero} alt="夜间配电设施巡检场景" />
      <div className="login-preview-hero-overlay" />
      <div className="login-preview-hero-copy"><img className="login-preview-light-mark" src={assets.markLight} alt="安全检查平台 Logo" /><span className="visual-preview-kicker">山东国控企管 · SAFETY OPERATIONS</span><h2>每一处风险，<br /><em>都有迹可循</em></h2><p>把现场证据、智能识别与专家判断，串成一条可追溯的安全闭环。</p><div className="login-preview-chips"><span><ScanLine size={14} />现场取证</span><span><Network size={14} />智能识别</span><span><Radio size={14} />远程协同</span></div></div>
      <div className="login-preview-hero-foot"><span>深海蓝·琥珀安全 / VISUAL SYSTEM V1</span><span><MapPin size={13} />济南 · 演示环境</span></div>
    </div>
    <form className="login-preview-card" onSubmit={(event) => { event.preventDefault(); setStatus("设计预览：已触发演示登录"); }}>
      <div className="login-preview-card-head"><span className="login-preview-card-icon"><ClipboardCheck size={20} /></span><span><small>SECURE ACCESS</small><strong>进入安全运营平台</strong></span></div>
      <p className="login-preview-card-intro">登录后查看检查任务、疑似隐患、证据链与专家复核。</p>
      <label>账号<input defaultValue="demo-admin" aria-label="演示账号" /></label>
      <label>密码<input type="password" defaultValue="demo-password" aria-label="演示密码" /></label>
      <div className="login-preview-options"><label><input type="checkbox" defaultChecked />记住本次演示</label><a href="#preview-help" onClick={(event) => event.preventDefault()}>演示说明</a></div>
      <button className="login-preview-submit" type="submit">进入演示工作台<ArrowUpRight size={16} /></button>
      <div className="login-preview-note"><CheckCircle2 size={15} /><span>{status}<small>当前页面只展示视觉方向，不连接真实鉴权。</small></span></div>
      <div className="login-preview-card-foot"><span>安全检查服务平台</span><span>v1.0 Preview</span></div>
    </form>
  </section>;
}

function WorkspacePreview({ page, onNavigate }: { page: Exclude<PreviewPage, "login">; onNavigate: (page: PreviewPage) => void }) {
  const current = pageMeta[page];
  const Icon = current.icon;
  return <section className="workspace-preview-shell">
    <aside className="workspace-preview-nav"><div className="workspace-preview-nav-brand"><img src={assets.markLight} alt="" /><span><b>安全运营</b><small>消防与用电</small></span></div><div className="workspace-preview-nav-label">主菜单</div>{pageOrder.slice(1).map((item) => { const ItemIcon = pageMeta[item].icon; return <button key={item} className={item === page ? "active" : ""} onClick={() => onNavigate(item)}><ItemIcon size={16} /><span>{pageMeta[item].label}</span><ChevronRight size={13} /></button>; })}<div className="workspace-preview-nav-foot"><span className="nav-avatar">管</span><span><b>系统管理员</b><small>演示用户</small></span></div></aside>
    <div className="workspace-preview-canvas"><header className="workspace-preview-top"><div className="workspace-preview-breadcrumb"><span>安全运营平台</span><ChevronRight size={13} /><strong>{current.label}</strong></div><div className="workspace-preview-actions"><span className="preview-online"><i />系统在线</span><button aria-label="消息"><Bell size={17} /></button><span className="preview-avatar">管</span></div></header><div className="workspace-preview-body"><div className="workspace-preview-page-heading"><div><span className="visual-preview-kicker">{current.eyebrow}</span><h2>{current.label}</h2><p>{current.description} · 2025 年 5 月演示样例</p></div><div className="workspace-preview-page-actions"><button className="secondary-preview-button">导出预览</button><button className="primary-preview-button"><Icon size={15} />主要动作</button></div></div>{page === "dashboard" && <DashboardPage />}{page === "hazards" && <HazardsPage />}{page === "devices" && <DevicesPage />}{page === "reports" && <ReportsPage />}{page === "analytics" && <AnalyticsPage />}{page === "knowledge" && <KnowledgePage />}</div></div>
  </section>;
}

function MetricCard({ label, value, note, tone, image }: { label: string; value: string; note: string; tone: string; image?: string }) {
  return <article className={`preview-metric-card ${tone}`}>{image && <img src={image} alt="" aria-hidden="true" />}<div className="preview-metric-icon"><Activity size={16} /></div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function DashboardPage() {
  return <div className="page-preview-grid dashboard-preview-grid"><div className="preview-metric-row"><MetricCard label="今日检查任务" value="48" note="16 项已完成" tone="blue" image={assets.dashboard} /><MetricCard label="待整改隐患" value="152" note="54 项重点关注" tone="amber" image={assets.hazard} /><MetricCard label="安全帽在线" value="36" note="在线率 77.8%" tone="green" image={assets.helmet} /><MetricCard label="超期预警" value="24" note="12 项需要核查" tone="red" image={assets.report} /></div><section className="preview-panel preview-panel-wide"><header><div><span className="panel-kicker">ATTENTION QUEUE</span><h3>优先关注 · 4 项超期隐患</h3></div><a href="#hazards" onClick={(event) => event.preventDefault()}>查看全部 <ChevronRight size={14} /></a></header><div className="preview-risk-list"><RiskRow title="消防通道堆放杂物" project="国控大厦 · 东侧通道" risk="重大隐患" image={assets.hazard} /><RiskRow title="配电柜接线松动" project="齐鲁科技园 · 配电室" risk="重大隐患" image={assets.dashboard} /><RiskRow title="灭火器压力待核查" project="鲁商广场 · 后厨" risk="较大隐患" image={assets.report} /></div></section><section className="preview-panel preview-image-panel"><header><div><span className="panel-kicker">FIELD EVIDENCE</span><h3>现场证据速览</h3></div><span className="panel-count">演示素材 06</span></header><div className="preview-evidence-grid"><EvidenceTile title="配电箱门未关闭" image={assets.hazard} /><EvidenceTile title="现场安全帽取证" image={assets.helmet} /><EvidenceTile title="园区风险分布" image={assets.park} /></div></section><section className="preview-panel preview-chart-panel"><header><div><span className="panel-kicker">RISK TREND</span><h3>风险趋势</h3></div><span className="chart-range">近 7 日</span></header><div className="preview-line-chart"><i style={{ height: "38%" }} /><i style={{ height: "52%" }} /><i style={{ height: "48%" }} /><i style={{ height: "74%" }} /><i style={{ height: "63%" }} /><i style={{ height: "82%" }} /><i style={{ height: "66%" }} /></div><div className="preview-chart-legend"><span><i className="legend-red" />高风险</span><span><i className="legend-amber" />较高风险</span><span><i className="legend-blue" />中风险</span></div></section></div>;
}

function HazardsPage() {
  return <div className="page-preview-grid split-preview-grid"><section className="preview-panel preview-hero-image-panel"><img src={assets.hazard} alt="电气柜风险扫描场景" /><div><span className="panel-kicker">AMBER SCAN</span><h3>建议优先核查</h3><p>配电柜接线与消防通道保持状态需要现场复核。</p><button className="amber-preview-button">进入核查队列 <ArrowUpRight size={15} /></button></div></section><section className="preview-panel preview-timeline-panel"><header><div><span className="panel-kicker">CLOSURE FLOW</span><h3>隐患闭环进度</h3></div><span className="panel-count">4 个节点</span></header><div className="preview-timeline"><TimelineStep label="智能识别" note="已完成 · 10:31" state="done" /><TimelineStep label="现场核查" note="待安排 · 建议今日" state="current" /><TimelineStep label="整改复查" note="等待整改材料" state="pending" /><TimelineStep label="销号归档" note="专家复核后完成" state="pending" /></div></section><section className="preview-panel preview-panel-wide"><header><div><span className="panel-kicker">EVIDENCE CHAIN</span><h3>现场证据与整改建议</h3></div><span className="panel-count">图片 / 视频 / 语音</span></header><div className="preview-evidence-strip"><EvidenceTile title="配电箱内部" image={assets.hazard} /><EvidenceTile title="整改前后对比" image={assets.report} /><EvidenceTile title="安全帽第一视角" image={assets.helmet} /><EvidenceTile title="园区点位" image={assets.park} /></div></section></div>;
}

function DevicesPage() {
  return <div className="page-preview-grid split-preview-grid"><section className="preview-panel preview-device-hero"><img src={assets.helmet} alt="智能安全帽现场作业场景" /><div className="device-hero-overlay"><span className="panel-kicker">LIVE FIELD</span><h3>安全帽现场端</h3><p>张三 · 齐鲁科技园配电室专项检查</p><span className="device-live-badge"><i />实时接入</span></div></section><section className="preview-panel device-status-panel"><header><div><span className="panel-kicker">DEVICE STATUS</span><h3>设备状态</h3></div><span className="panel-count">36 顶</span></header><div className="device-status-list"><div><span><i className="status-green" />在线</span><strong>28</strong><small>77.8%</small></div><div><span><i className="status-amber" />任务中</span><strong>6</strong><small>16.7%</small></div><div><span><i className="status-red" />离线</span><strong>2</strong><small>5.5%</small></div></div><div className="device-signal"><Radio size={16} /><span>现场网络稳定</span><b>4G / 5G</b></div></section><section className="preview-panel preview-panel-wide"><header><div><span className="panel-kicker">CAPTURE STREAM</span><h3>现场取证能力</h3></div><span className="panel-count">演示素材</span></header><div className="device-capability-grid"><Capability icon={Camera} label="第一视角视频" note="支持实时画面与回放" /><Capability icon={ScanLine} label="AI 关键帧" note="识别疑似隐患" /><Capability icon={Radio} label="远程对讲" note="连接专家协同" /><Capability icon={MapPin} label="位置轨迹" note="回放检查路径" /></div></section></div>;
}

function ReportsPage() {
  return <div className="page-preview-grid split-preview-grid"><section className="preview-panel preview-report-hero"><img src={assets.report} alt="检查报告与现场证据桌面场景" /><div><span className="panel-kicker">REPORT CENTER</span><h3>检查报告生成</h3><p>将现场证据、整改记录与专家意见整理成可追溯报告。</p><div className="report-meta"><span>已归档证据 <b>12</b></span><span>待复核 <b>03</b></span></div></div></section><section className="preview-panel report-sheet-panel"><header><div><span className="panel-kicker">DOCUMENT PREVIEW</span><h3>安全检查报告</h3></div><span className="preview-doc-state">待复核</span></header><div className="report-sheet"><span>山东国控企管 · 安全运营平台</span><h4>消防与用电安全检查报告</h4><div className="report-sheet-line wide" /><div className="report-sheet-line" /><div className="report-sheet-images"><img src={assets.hazard} alt="" /><img src={assets.helmet} alt="" /></div><div className="report-sheet-line wide" /><div className="report-sheet-line short" /></div></section><section className="preview-panel preview-panel-wide"><header><div><span className="panel-kicker">ARCHIVE MATERIALS</span><h3>证据链归档</h3></div><button className="secondary-preview-button">预览全部</button></header><div className="preview-evidence-strip"><EvidenceTile title="原始现场照片" image={assets.hazard} /><EvidenceTile title="检查记录摘要" image={assets.report} /><EvidenceTile title="复查现场画面" image={assets.helmet} /><EvidenceTile title="园区点位分布" image={assets.park} /></div></section></div>;
}

function AnalyticsPage() {
  return <div className="page-preview-grid split-preview-grid"><section className="preview-panel preview-analytics-map"><img src={assets.park} alt="园区风险分布场景" /><div><span className="panel-kicker">PARK RISK PORTRAIT</span><h3>园区风险分布</h3><p>以项目、点位和隐患类型查看区域安全画像。</p></div><span className="map-node node-one">12</span><span className="map-node node-two">08</span><span className="map-node node-three">03</span></section><section className="preview-panel preview-category-panel"><header><div><span className="panel-kicker">RISK MIX</span><h3>隐患类型分布</h3></div><span className="panel-count">562 项</span></header><div className="category-bars"><div><span>用电安全</span><i style={{ width: "88%" }} /><b>562</b></div><div><span>消防设施</span><i style={{ width: "62%" }} /><b>328</b></div><div><span>疏散通道</span><i style={{ width: "40%" }} /><b>184</b></div><div><span>临时用电</span><i style={{ width: "26%" }} /><b>108</b></div></div></section><section className="preview-panel preview-panel-wide"><header><div><span className="panel-kicker">WEEKLY TREND</span><h3>高风险隐患趋势</h3></div><span className="chart-range">05-10 — 05-16</span></header><div className="analytics-chart"><span /><span /><span /><span /><span /><span /><span /></div></section></div>;
}

function KnowledgePage() {
  return <div className="page-preview-grid split-preview-grid"><section className="preview-panel preview-knowledge-hero"><img src={assets.knowledge} alt="安全知识图谱场景" /><div><span className="panel-kicker">KNOWLEDGE GRID</span><h3>让专业判断回到现场</h3><p>检查依据、隐患图谱、专家规则在同一张知识网络中协同。</p><div className="knowledge-pills"><span>检查依据 128</span><span>专家规则 42</span><span>知识条目 368</span></div></div></section><section className="preview-panel knowledge-index-panel"><header><div><span className="panel-kicker">INDEX</span><h3>知识索引</h3></div><button className="secondary-preview-button">查看全部</button></header><div className="knowledge-index-list"><div><BookOpen size={16} /><span>配电设施检查要点</span><b>12 条</b></div><div><TriangleAlert size={16} /><span>消防通道判定规则</span><b>08 条</b></div><div><Layers3 size={16} /><span>智能安全帽取证规范</span><b>16 条</b></div><div><Network size={16} /><span>隐患图谱关联案例</span><b>32 条</b></div></div></section><section className="preview-panel preview-panel-wide knowledge-quote"><div><span className="panel-kicker">DESIGN PRINCIPLE</span><h3>证据先行，判断可追溯</h3><p>卡片只承载一个动作，图片只承担场景与记忆点，所有风险结论回到检查数据和复核流程。</p></div><img src={assets.texture} alt="深海蓝电路纹理" /></section></div>;
}

function RiskRow({ title, project, risk, image }: { title: string; project: string; risk: string; image: string }) {
  return <button className="preview-risk-row"><img src={image} alt="" /><span><strong>{title}</strong><small>{project}</small></span><b>{risk}</b><ChevronRight size={15} /></button>;
}

function EvidenceTile({ title, image }: { title: string; image: string }) {
  return <figure className="preview-evidence-tile"><img src={image} alt={`${title}演示素材`} /><figcaption><strong>{title}</strong><small>演示素材 · 可接入对应业务卡片</small></figcaption></figure>;
}

function TimelineStep({ label, note, state }: { label: string; note: string; state: string }) {
  return <div className={`preview-timeline-step ${state}`}><span className="timeline-dot" /><div><strong>{label}</strong><small>{note}</small></div></div>;
}

function Capability({ icon: Icon, label, note }: { icon: ElementType; label: string; note: string }) {
  return <div className="device-capability"><span><Icon size={18} /></span><strong>{label}</strong><small>{note}</small></div>;
}

export default VisualPreview;
