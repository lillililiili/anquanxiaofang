import { useEffect, useMemo, useState } from "react";
import AppShell from "./design/AppShell";
import { renderPrototypePage } from "./design/PrototypeRoutes";
import {
  findPage,
  readFocusId,
  stripAppBasePath,
  toPublicPath,
  withAppBasePath
} from "./design/prototypeNav";

function readProductionPath() {
  return stripAppBasePath(window.location.pathname);
}

export default function App() {
  const [pathname, setPathname] = useState(readProductionPath);
  const [focusId, setFocusId] = useState(readFocusId);
  const [toast, setToast] = useState("");
  const activePage = useMemo(() => findPage(pathname), [pathname]);

  useEffect(() => {
    if (window.location.pathname.includes("/customers/park")) {
      const next = withAppBasePath("/customers/enterprise");
      window.history.replaceState({}, "", next);
      setPathname("/customers/enterprise");
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      setPathname(readProductionPath());
      setFocusId(readFocusId());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message: string) => setToast(message);
  const navigate = (path: string, nextFocus?: string) => {
    const publicPath = toPublicPath(path);
    const route = `${withAppBasePath(publicPath)}${nextFocus ? `?focus=${encodeURIComponent(nextFocus)}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== route) window.history.pushState({}, "", route);
    setPathname(publicPath);
    setFocusId(nextFocus);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AppShell mode="production" activePage={activePage} navigate={navigate} toast={toast}>
      {renderPrototypePage(activePage, { notify, navigate, focusId })}
    </AppShell>
  );
}
