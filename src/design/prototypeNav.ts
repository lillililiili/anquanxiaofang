import type { ElementType } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  Cpu,
  FileBarChart,
  FileCheck2,
  HardHat,
  Headphones,
  Home,
  Layers3,
  LayoutDashboard,
  MapPin,
  Network,
  Settings2,
  Sparkles,
  Target,
  Wrench
} from "lucide-react";

export type PageId =
  | "dashboard"
  | "tasks"
  | "helmet"
  | "hazardRegister"
  | "hazardRectify"
  | "hazardStats"
  | "hazardOverdue"
  | "expert"
  | "modelCenter"
  | "knowledge"
  | "hazardGraph"
  | "expertRules"
  | "analytics"
  | "warnings"
  | "reports"
  | "customers"
  | "projects"
  | "devices"
  | "templates"
  | "settings";

export type PageInfo = { id: PageId; label: string; path: string; group: string; icon: ElementType };

export const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

export function withAppBasePath(route: string) {
  if (!APP_BASE_PATH) return route || "/";
  return route === "/" ? `${APP_BASE_PATH}/` : `${APP_BASE_PATH}${route}`;
}

export const pages: PageInfo[] = [
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

export const prototypePageGroups = Array.from(new Set(pages.map((page) => page.group)));

export const publicPathById: Record<PageId, string> = {
  dashboard: "/",
  tasks: "/tasks",
  helmet: "/helmet-live",
  hazardRegister: "/hazards/register",
  hazardRectify: "/hazards/rectify",
  hazardStats: "/hazards/dashboard",
  hazardOverdue: "/hazards/overdue",
  expert: "/expert",
  modelCenter: "/model-center",
  knowledge: "/model-center/knowledge",
  hazardGraph: "/model-center/hazard-graph",
  expertRules: "/model-center/expert-rules",
  analytics: "/analytics",
  warnings: "/warnings",
  reports: "/reports",
  customers: "/customers/enterprise",
  projects: "/projects",
  devices: "/devices",
  templates: "/templates",
  settings: "/settings"
};

const pathAliases: Record<string, PageId> = {
  "/hazards/register": "hazardRegister",
  "/hazards/rectify": "hazardRectify",
  "/hazards/rectification": "hazardRectify",
  "/hazards/dashboard": "hazardStats",
  "/hazards/statistics": "hazardStats",
  "/customers": "customers",
  "/customers/park": "customers",
  "/ai-analysis": "modelCenter",
  "/knowledge": "knowledge"
};

for (const page of pages) {
  pathAliases[page.path] = page.id;
  pathAliases[publicPathById[page.id]] = page.id;
}

export function normalizePath(path: string) {
  if (!path) return "/";
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function findPage(path: string): PageInfo {
  const normalized = normalizePath(path);
  const aliased = pathAliases[normalized];
  if (aliased) return pages.find((page) => page.id === aliased) ?? pages[0];
  const exact = pages.find((page) => page.path === normalized);
  if (exact) return exact;
  const byPrefix = [...pages]
    .sort((a, b) => b.path.length - a.path.length)
    .find((page) => page.path !== "/" && (normalized === page.path || normalized.startsWith(`${page.path}/`)));
  return byPrefix ?? pages[0];
}

export function toPublicPath(path: string) {
  return publicPathById[findPage(path).id];
}

export function toPrototypePath(path: string) {
  return findPage(path).path;
}

export function stripAppBasePath(pathname: string) {
  if (APP_BASE_PATH && pathname.startsWith(APP_BASE_PATH)) return pathname.slice(APP_BASE_PATH.length) || "/";
  return pathname;
}

export function readFocusId() {
  return new URLSearchParams(window.location.search).get("focus") || undefined;
}
