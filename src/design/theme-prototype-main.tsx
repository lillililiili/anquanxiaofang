import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import AppShell, { type ThemeMode } from "./AppShell";
import { renderPrototypePage } from "./PrototypeRoutes";
import PrototypeLogin from "./PrototypeLogin";
import { ResourceProvider } from "../features/resources/ResourceContext";
import {
  findPage,
  readFocusId,
  stripAppBasePath,
  toPrototypePath,
  withAppBasePath
} from "./prototypeNav";

const prototypeEntry = withAppBasePath("/theme-prototype.html");
const prototypeRoute = (path: string, focusId?: string) =>
  `${prototypeEntry}?page=${encodeURIComponent(path)}${focusId ? `&focus=${encodeURIComponent(focusId)}` : ""}`;

const readPrototypePath = () => {
  const queryPath = new URLSearchParams(window.location.search).get("page");
  if (queryPath) return queryPath;
  return stripAppBasePath(window.location.pathname);
};

function PrototypeApp() {
  const [theme, setTheme] = useState<ThemeMode>("hybrid");
  const [pathname, setPathname] = useState(readPrototypePath);
  const [resourceFocus, setResourceFocus] = useState<string | undefined>(readFocusId);
  const [toast, setToast] = useState("");
  const activePage = useMemo(() => findPage(pathname), [pathname]);

  useEffect(() => {
    const sync = () => {
      setPathname(readPrototypePath());
      setResourceFocus(readFocusId());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    document.title = "消防与用电安全 · 独立页面设计原型";
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string) => setToast(message);
  const navigate = (path: string, focusId?: string) => {
    const nextPath = toPrototypePath(path);
    const route = prototypeRoute(nextPath, focusId);
    if (`${window.location.pathname}${window.location.search}` !== route) window.history.pushState({}, "", route);
    setPathname(nextPath);
    setResourceFocus(focusId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (pathname === "/login") return <PrototypeLogin onEnter={() => navigate("/")} />;

  return (
    <AppShell mode="prototype" activePage={activePage} navigate={navigate} toast={toast} theme={theme} onThemeChange={setTheme}>
      {renderPrototypePage(activePage, { notify, navigate, focusId: resourceFocus })}
    </AppShell>
  );
}

const prototypeRoot = (import.meta.hot?.data.root as ReturnType<typeof ReactDOM.createRoot> | undefined) || ReactDOM.createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = prototypeRoot;
prototypeRoot.render(<React.StrictMode><ResourceProvider><PrototypeApp /></ResourceProvider></React.StrictMode>);
