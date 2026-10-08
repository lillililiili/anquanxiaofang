import type { ReactNode } from "react";

export type Risk = "高风险" | "中风险" | "低风险";
export type ResourceCustomer = {
  id: string; name: string; type: string; area: string; risk: Risk; contact: string;
  phone: string; creditCode: string; address: string; email: string; tags: string[];
  owner: string; serviceStart: string; serviceEnd: string; serviceStatus: "服务中" | "待跟进" | "已暂停";
  founded?: string; scale?: string;
};
export type ResourceProject = {
  id: string; legacyId?: string; customerId: string; name: string; type: string; region: string; address: string;
  manager: string; phone: string; risk: Risk; status: "服务中" | "筹备中" | "待复查" | "已归档";
  startDate: string; endDate: string; lastInspection: string; nextInspection: string;
  templateId: string; hazards: number;
  points: { id: string; name: string; category: string; checked: boolean }[];
};
export type ResourceDevice = {
  id: string; name: string; type: "智能安全帽" | "摄像设备" | "传感器设备" | "网关";
  model: string; status: "在线" | "离线" | "维护中"; battery: number; projectId: string;
  user: string; firmware: string; network: string; lastSeen: string; maintenanceDate: string;
  purchasedDate: string; legacyProjectName?: string; powerSource?: "电池" | "市电"; legacyStatus?: string;
  maintenanceTask?: { id: string; kind: "重启" | "固件升级"; targetFirmware?: string };
};
export type ResourceCheckItem = { id: string; name: string; standard: string; risk: Risk; evidence: string; required: boolean };
export type ResourceTemplate = {
  id: string; name: string; category: string; description: string; version: number;
  status: "草稿" | "已发布" | "已停用"; updatedAt: string; author: string;
  items: ResourceCheckItem[];
};
export type ResourceMember = { id: string; name: string; department: string; roleId: string; phone: string; status: "启用" | "停用"; projectIds: string[]; lastLogin: string };
export type ResourceRole = { id: string; name: string; description: string; scope: string; permissions: string[] };
export type ResourceRule = { id: string; name: string; trigger: string; threshold: number; recipientRoleId: string; enabled: boolean };
export type ResourceLog = { id: string; time: string; actor: string; action: string; target: string };
export type SystemParameters = {
  platformName: string;
  inspectionCycle: "每日" | "每周" | "每月";
  rectificationDays: number;
  aiConfidence: number;
  logPageSize: number;
};
export type ResourceState = {
  customers: ResourceCustomer[]; projects: ResourceProject[]; devices: ResourceDevice[];
  templates: ResourceTemplate[]; members: ResourceMember[]; roles: ResourceRole[];
  rules: ResourceRule[]; logs: ResourceLog[];
  systemParameters?: SystemParameters;
};
export type ResourceTarget = "customers" | "projects" | "devices" | "templates" | "settings" | "tasks" | "helmet" | "knowledge" | "hazardGraph" | "expertRules";
export type ResourcePageProps = { navigate: (target: ResourceTarget, id?: string) => void; focusId?: string; recordView?: boolean };
export type RMColumn<T> = { key: string; label: string; width?: string | number; render: (row: T) => ReactNode };
