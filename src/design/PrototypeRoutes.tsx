import { useState } from "react";
import { Bell, CheckCircle2, ChevronRight, ClipboardCheck, Clock3, Download, HardHat, Plus, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Target } from "lucide-react";
import { projectNames, hazards, projects } from "./PrototypeFixtures";
import { HazardPage } from "./PrototypeHazards";
import OperationsModules from "../features/operations/OperationsModules";
import { IntelligencePage, KnowledgeCompletePage, ExpertRulesCompletePage } from "./PrototypeIntelligence";
import { TasksPage, HelmetPage } from "./PrototypeTaskHelmet";
import PrototypeOperations from "./PrototypeOperations";
import PrototypeExpert from "./PrototypeExpert";
import { Button, Pill, PageHeader, SectionCard, MetricCard, Field, Modal, DataTable, downloadText } from "./PrototypeUI";
import { sceneImages } from "../data/demoSceneMedia";
import HazardGraphCompletePage from "./ThemePrototypeGraph";
import ThemePrototypeRegionMap from "./ThemePrototypeRegionMap";
import ThemePrototypeSettings from "./ThemePrototypeSettings";
import PrototypeResources, { isPrototypeResourcePage } from "./PrototypeResources";
import PrototypeWorkbench from "./PrototypeWorkbench";
import type { PageInfo } from "./prototypeNav";

export type PageRenderProps = {
  notify: (message: string) => void;
  navigate: (path: string, focusId?: string) => void;
  focusId?: string;
};

function DashboardOverview({ navigate }: { notify: (message: string) => void; navigate: (path: string) => void }) {
  const [evidence, setEvidence] = useState<string[] | null>(null); const [refreshed, setRefreshed] = useState("10:36:12"); const [project, setProject] = useState("全部项目"); const [date, setDate] = useState("2025-05-16");
  return <div className="page-stack"><PageHeader eyebrow="OPERATIONS / 01" title="运营工作台" description="今天的检查任务、现场风险与整改进度集中在一个工作面。" actions={<><Button icon={RefreshCw} variant="secondary" onClick={() => setRefreshed(new Date().toLocaleTimeString())}>刷新数据</Button><Button icon={Plus} onClick={() => navigate("/tasks")}>新建检查任务</Button></>} /><div className="filter-strip"><Field label="统计日期"><input type="date" value={date} onInput={e => setDate(e.currentTarget.value)} onChange={e => setDate(e.target.value)} /></Field><Field label="项目范围"><select value={project} onChange={e => setProject(e.target.value)}>{projectNames.map((name) => <option key={name}>{name}</option>)}</select></Field><div className="filter-note"><span className="live-dot" />数据更新时间 {refreshed} · 自动同步</div></div><div className="metric-grid"><MetricCard label="今日检查任务" value="48" detail="16 项已完成 · 完成率 33.33%" icon={ClipboardCheck} tone="blue" /><MetricCard label="待整改隐患" value="152" detail="98 项一般 · 54 项重大" icon={ShieldAlert} tone="amber" /><MetricCard label="超期预警" value="24" detail="12 项即将超期 · 12 项已超期" icon={Bell} tone="red" /><MetricCard label="安全帽设备" value="36" detail="28 顶在线 · 8 顶离线" icon={HardHat} tone="green" /></div><div className="dashboard-grid two-one"><SectionCard eyebrow="LIVE RISK RADAR" title="现场风险雷达" action={<Pill tone="success">实时监控</Pill>}><div className="radar-layout"><div className="radar-orbit"><div className="radar-scan" /><div className="radar-core"><ShieldCheck size={26} /><strong>92</strong><span>安全指数</span></div><span className="radar-dot d1" /><span className="radar-dot d2" /><span className="radar-dot d3" /></div><div className="radar-list"><div><span>在线检查员</span><strong>18 / 22</strong><Pill tone="success">稳定</Pill></div><div><span>AI 识别队列</span><strong>07 条</strong><Pill tone="warning">处理中</Pill></div><div><span>需专家复核</span><strong>03 条</strong><Pill tone="danger">优先</Pill></div></div></div></SectionCard><SectionCard eyebrow="CLOSURE FLOW" title="隐患状态" action={<Button variant="ghost" onClick={() => navigate("/hazards/statistics")}>查看统计 <ChevronRight size={15} /></Button>}><div className="bar-stack">{[["待整改", "152", "88%", "danger"], ["整改中", "68", "52%", "amber"], ["待复查", "30", "26%", "blue"], ["已整改", "54", "38%", "green"]].map((row) => <div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><i><b className={row[3]} style={{ width: row[2] }} /></i></div>)}</div></SectionCard></div><SectionCard eyebrow="PRIORITY QUEUE" title="重点隐患流转" action={<Button variant="ghost" onClick={() => navigate("/hazards")}>进入隐患闭环 <ChevronRight size={15} /></Button>}><DataTable headers={["隐患项", "项目 / 位置", "风险等级", "责任人", "整改期限", "状态"]} rows={hazards.filter(row => (project === "全部项目" || row[2] === project) && (!date || row[7] >= date)).slice(0, 4).map((row) => [row[1], row[2] + " · " + row[3], row[5], row[6], row[7], row[8]])} onAction={() => navigate("/hazards/rectification")} /></SectionCard><SectionCard eyebrow="EVIDENCE STREAM" title="现场证据摘要" action={<Button variant="ghost" onClick={() => navigate("/helmet-live")}>打开现场端 <ChevronRight size={15} /></Button>}><div className="evidence-grid">{[["配电箱门未关闭", "齐鲁科技园 · B1 配电室", sceneImages.electricalPanelOpen], ["消防通道占用", "国控大厦 · 东侧通道", sceneImages.fireCorridorBlocked], ["线缆防护待核查", "国控大厦 · B1 配电室", sceneImages.cableExposed], ["灭火器压力待核查", "鲁商广场 · 后厨", sceneImages.extinguisherLowPressure]].map((item) => <button className="evidence-card" type="button" key={item[0]} onClick={() => setEvidence(item)}><img src={item[2] as string} alt={item[0] as string} /><div><Pill tone="danger">高风险</Pill><strong>{item[0]}</strong><span>{item[1]}</span></div></button>)}</div></SectionCard><Modal title="现场证据摘要" open={Boolean(evidence)} onClose={() => setEvidence(null)} wide>{evidence && <><img className="preview-image" src={evidence[2]} alt={evidence[0]} /><h3>{evidence[0]}</h3><p>{evidence[1]}</p><p className="muted-note">参考素材 · 建议结合现场情况核查，在现场端采集并登记证据。</p><div className="modal-foot"><Button onClick={() => navigate("/helmet-live")}>进入现场端</Button><Button variant="secondary" onClick={() => navigate("/hazards")}>进入隐患登记</Button></div></>}</Modal></div>;
}

function DashboardPage({ notify, navigate }: PageRenderProps) {
  return <PrototypeWorkbench navigate={navigate}><DashboardOverview notify={notify} navigate={navigate} /></PrototypeWorkbench>;
}

function AnalyticsPage({ notify, navigate }: PageRenderProps) {
  const [view, setView] = useState("综合画像");
  const [refreshed, setRefreshed] = useState("");
  return <>
    <div className="prototype-analysis-tabs">
      <button className={view === "综合画像" ? "active" : ""} onClick={() => setView("综合画像")}>综合画像</button>
      <button className={view === "预警台账分析" ? "active" : ""} onClick={() => setView("预警台账分析")}>预警台账分析</button>
    </div>
    {view === "预警台账分析" ? (
      <div className="prototype-resources prototype-operations">
        <OperationsModules page="analytics" navigate={(next) => navigate(`/${next}`)} notify={notify} />
      </div>
    ) : (
      <div className="page-stack">
        <PageHeader eyebrow="ANALYTICS / 10" title="数据看板" description="从项目、人员、设备和隐患四个角度观察安全运营。" actions={<><Button variant="secondary" icon={Download} onClick={() => { downloadText("安全运营画像.csv", "\uFEFF指标,数值\n检查完成率,88.6%\n隐患闭环率,76.4%\nAI识别准确率,92.6%\n平均响应时长,18min"); notify("报表已导出"); }}>导出报表</Button><Button icon={RefreshCw} onClick={() => setRefreshed(new Date().toLocaleTimeString())}>刷新看板</Button></>} />
        {refreshed && <p className="muted-note">示例指标已重新载入 · {refreshed}</p>}
        <div className="metric-grid">
          <MetricCard label="检查完成率" value="88.6%" detail="较上周期 ↑ 6.2%" icon={CheckCircle2} tone="green" />
          <MetricCard label="隐患闭环率" value="76.4%" detail="目标 85%" icon={Target} tone="blue" />
          <MetricCard label="AI 识别准确率" value="92.6%" detail="较上周期 ↑ 4.2%" icon={Sparkles} tone="amber" />
          <MetricCard label="平均响应时长" value="18 min" detail="较上周期 ↓ 7 min" icon={Clock3} tone="red" />
        </div>
        <div className="analytics-grid">
          <SectionCard title="检查量与隐患量趋势" eyebrow="VOLUME TREND">
            <div className="chart-legend"><span><i className="legend-dot blue" />检查量</span><span><i className="legend-dot red" />隐患量</span></div>
            <div className="fake-chart bar-chart">
              <div className="chart-y"><span>120</span><span>90</span><span>60</span><span>30</span><span>0</span></div>
              <div className="bars">{[70, 84, 62, 102, 94, 112, 118].map((height, index) => <div key={index}><i style={{ height: height + "px" }} /><b style={{ height: height / 2 + "px" }} /><span>05-{10 + index}</span></div>)}</div>
            </div>
          </SectionCard>
          <SectionCard title="项目风险分布" eyebrow="PROJECT RISK">
            <div className="project-risk-list">{projects.map((row) => <div key={row[0]}><strong>{row[1]}</strong><span>{row[4]}</span><i><b style={{ width: row[5] }} /></i><em>{row[5]}</em></div>)}</div>
          </SectionCard>
          <SectionCard title="检查类型占比" eyebrow="CHECK TYPES">
            <div className="donut-wrap large">
              <div className="donut"><strong>48</strong><span>本周期任务</span></div>
              <div className="legend-list">
                <div><i className="legend-dot blue" />消防安全 <b>42%</b></div>
                <div><i className="legend-dot amber" />用电安全 <b>35%</b></div>
                <div><i className="legend-dot green" />复查验收 <b>23%</b></div>
              </div>
            </div>
          </SectionCard>
          <ThemePrototypeRegionMap />
        </div>
      </div>
    )}
  </>;
}

const hazardVariants = ["hazardRegister", "hazardRectify", "hazardStats", "hazardOverdue"] as const;

export function renderPrototypePage(page: PageInfo, { notify, navigate, focusId }: PageRenderProps) {
  if (isPrototypeResourcePage(page.id)) return <PrototypeResources page={page.id} focusId={focusId} navigate={navigate} />;
  if (page.id === "dashboard") return <DashboardPage notify={notify} navigate={navigate} />;
  if (page.id === "tasks") return <TasksPage notify={notify} navigate={navigate} />;
  if (page.id === "helmet") return <HelmetPage notify={notify} navigate={navigate} />;
  if (page.id === "expert") return <PrototypeExpert notify={notify} navigate={navigate} />;
  if (hazardVariants.includes(page.id as typeof hazardVariants[number])) {
    return <HazardPage variant={page.id} notify={notify} navigate={navigate} />;
  }
  if (page.id === "modelCenter") return <IntelligencePage type="modelCenter" notify={notify} navigate={navigate} />;
  if (page.id === "knowledge") return <KnowledgeCompletePage notify={notify} navigate={navigate} />;
  if (page.id === "hazardGraph") return <HazardGraphCompletePage notify={notify} />;
  if (page.id === "expertRules") return <ExpertRulesCompletePage notify={notify} navigate={navigate} />;
  if (page.id === "analytics") return <AnalyticsPage notify={notify} navigate={navigate} />;
  if (page.id === "warnings") return <PrototypeOperations page="warnings" notify={notify} navigate={navigate} focusId={focusId} />;
  if (page.id === "reports") return <PrototypeOperations page="reports" notify={notify} navigate={navigate} focusId={focusId} />;
  return <ThemePrototypeSettings />;
}
