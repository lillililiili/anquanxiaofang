import { useEffect, useState, type ReactNode } from "react";
import { Bell, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Cloud, ListFilter, Search } from "lucide-react";
import { Button, Field, IconButton, Modal, Pill, cx } from "./PrototypeUI";
import { pages, prototypePageGroups, type PageInfo } from "./prototypeNav";
import "./theme-prototype.css";
import "./theme-prototype-layout.css";
import "./theme-prototype-overdue.css";
import "./theme-prototype-retake.css";
import "./theme-prototype-resources.css";
import "./theme-prototype-audit.css";
import "./theme-prototype-premium.css";
import "../features/resources/resources.css";

export type ThemeMode = "hybrid" | "current";
export type AppShellMode = "production" | "prototype";

type AppShellProps = {
  mode: AppShellMode;
  activePage: PageInfo;
  navigate: (path: string, focusId?: string) => void;
  toast: string;
  children: ReactNode;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
};

function clockText() {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function AppShell({
  mode,
  activePage,
  navigate,
  toast,
  children,
  theme = "hybrid",
  onThemeChange
}: AppShellProps) {
  const [globalPanel, setGlobalPanel] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [clock, setClock] = useState(clockText);
  const prototypeTools = mode === "prototype";

  useEffect(() => {
    const timer = window.setInterval(() => setClock(clockText()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="prototype-app" data-theme={theme} data-page={activePage.id} data-shell={mode}>
      <aside className={cx("prototype-sidebar", mobileNavOpen && "is-open")}>
        <div className="brand-lockup">
          <span className="brand-mark"><img src="/design-assets/safety-logo-v3.png" alt="" /></span>
          <div><strong>国控安全</strong><small>SAFETY OPS / 2.0</small></div>
        </div>
        <div className="sidebar-status"><span className="live-dot" />系统运行正常<span>·</span><span>{clock}</span></div>
        <nav className="prototype-nav">
          {prototypePageGroups.map((group) => (
            <div className="nav-group" key={group}>
              <div className="nav-group-label">{group}</div>
              {pages.filter((page) => page.group === group).map((page) => {
                const Icon = page.icon;
                return (
                  <button type="button" className={page.id === activePage.id ? "active" : ""} key={page.id} onClick={() => { navigate(page.path); setMobileNavOpen(false); }}>
                    <Icon size={17} /><span>{page.label}</span>{page.id === "warnings" && <b>12</b>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sync-row"><Cloud size={15} /><span>数据已同步</span><span className="sync-time">{clock}</span></div>
          <button type="button" className="sidebar-user" onClick={() => navigate("/settings")}>
            <span className="avatar">管</span>
            <span><strong>系统管理员</strong><small>超级管理员</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="关闭导航" onClick={() => setMobileNavOpen(false)} />}
      <main className="prototype-workspace">
        <header className="prototype-topbar">
          <button className="mobile-nav" type="button" aria-label="打开导航" onClick={() => setMobileNavOpen(true)}><ListFilter size={16} />导航</button>
          <div className="breadcrumbs"><span>消防与用电安全</span><ChevronRight size={15} /><strong>{activePage.label}</strong></div>
          <div className="topbar-actions">
            {prototypeTools && (
              <>
                <button className="directory-toggle" type="button" aria-expanded={directoryOpen} aria-controls="prototype-page-directory" onClick={() => setDirectoryOpen((value) => !value)}>
                  <span><ListFilter size={16} />页面目录</span>
                  <small>{directoryOpen ? "收起" : "展开"}</small>
                </button>
                <div className="theme-switch">
                  <span>界面主题</span>
                  <button type="button" className={theme === "hybrid" ? "active" : ""} onClick={() => onThemeChange?.("hybrid")}>深浅混合</button>
                  <button type="button" className={theme === "current" ? "active" : ""} onClick={() => onThemeChange?.("current")}>当前主题</button>
                </div>
              </>
            )}
            <IconButton label="全局搜索" onClick={() => { setGlobalQuery(""); setGlobalPanel("全局搜索"); }}><Search size={17} /></IconButton>
            <IconButton label="预警中心" onClick={() => navigate("/warnings")}><Bell size={17} /><i className="icon-badge">12</i></IconButton>
            <IconButton label="帮助" onClick={() => setGlobalPanel("使用帮助")}><CircleHelp size={17} /></IconButton>
          </div>
        </header>
        <div className="prototype-ribbon">
          <span className="ribbon-dot" />
          <strong>{prototypeTools ? "独立页面设计原型" : "演示环境"}</strong>
          <span>{prototypeTools ? "演示数据 · 现有业务内容与新版交互样式" : "演示数据 · 检查辅助，结论需人工确认"}</span>
          <span className="ribbon-page">当前：{activePage.label}</span>
        </div>
        <section className="prototype-content">{children}</section>
      </main>
      {prototypeTools && (
        <aside className={cx("directory-panel", directoryOpen && "open")}>
          {directoryOpen && (
            <div className="directory-body" id="prototype-page-directory">
              <div className="directory-title"><span>页面导航</span><Pill tone="info">{pages.length} 页</Pill></div>
              {prototypePageGroups.map((group) => (
                <div className="directory-group" key={group}>
                  <h3>{group}</h3>
                  {pages.filter((page) => page.group === group).map((page) => (
                    <button type="button" className={page.id === activePage.id ? "active" : ""} key={page.id} onClick={() => { navigate(page.path); setDirectoryOpen(false); }}>
                      {page.label}<ChevronRight size={13} />
                    </button>
                  ))}
                </div>
              ))}
              <p>页面内容、数据字段和操作路径按照现有系统功能重新设计。</p>
            </div>
          )}
        </aside>
      )}
      <Modal title={globalPanel} open={Boolean(globalPanel)} onClose={() => setGlobalPanel("")}>
        <div className="prototype-workflow-list">
          {globalPanel === "全局搜索" ? (
            <>
              <Field label="查找功能页面"><input autoFocus placeholder="输入任务、报告、知识库等关键词" value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} /></Field>
              {pages.filter((page) => `${page.label}${page.group}`.includes(globalQuery.trim())).map((page) => (
                <Button key={page.id} variant="secondary" onClick={() => { navigate(page.path); setGlobalPanel(""); }}>{page.label} · {page.group}</Button>
              ))}
              {!pages.some((page) => `${page.label}${page.group}`.includes(globalQuery.trim())) && <p>暂无匹配页面，请更换关键词。</p>}
            </>
          ) : (
            <>
              <article><h3>建议演示路径</h3><p>创建检查任务并绑定安全帽 → 现场检查与证据采集 → 隐患登记 → 整改派发与复查 → 专家审核 → 报告编制与归档。</p></article>
              <article><h3>本地演示数据</h3><p>表单、审批、通知和设备操作用于原型演示，记录保存在本机浏览器。知识与报告支持预览、下载；通知和设备控制展示模拟结果。</p></article>
              <Button onClick={() => { navigate("/tasks"); setGlobalPanel(""); }}>从检查任务开始</Button>
              <Button variant="secondary" onClick={() => { navigate("/model-center/knowledge"); setGlobalPanel(""); }}>打开知识库</Button>
            </>
          )}
        </div>
      </Modal>
      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span></div>}
    </div>
  );
}
