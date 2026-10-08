import type { ResourceState, SystemParameters } from "./resourceTypes";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const named = (value: RecordValue) => text(value.id) && !!value.id.trim() && text(value.name) && !!value.name.trim();
const strings = (value: RecordValue, fields: string[]) => fields.every(field => text(value[field]));
const optionalText = (value: RecordValue, fields: string[]) => fields.every(field => value[field] === undefined || text(value[field]));
const stringArray = (value: unknown) => Array.isArray(value) && value.every(text);
const choice = (value: unknown, options: string[]) => text(value) && options.includes(value);
const number = (value: unknown, minimum = 0) => typeof value === "number" && Number.isFinite(value) && value >= minimum;
const risk = (value: unknown) => choice(value, ["高风险", "中风险", "低风险"]);
function records(value: unknown, valid: (item: RecordValue) => boolean): boolean {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every(item => {
    if (!record(item) || !text(item.id) || !item.id.trim() || ids.has(item.id) || !valid(item)) return false;
    ids.add(item.id); return true;
  });
}

export function isSystemParameters(value: unknown): value is SystemParameters {
  if (!record(value)) return false;
  return text(value.platformName) && !!value.platformName.trim() && value.platformName.length <= 60
    && choice(value.inspectionCycle, ["每日", "每周", "每月"])
    && Number.isInteger(value.rectificationDays) && number(value.rectificationDays, 1) && (value.rectificationDays as number) <= 90
    && Number.isInteger(value.aiConfidence) && number(value.aiConfidence, 50) && (value.aiConfidence as number) <= 99
    && [5, 10, 20, 50].includes(value.logPageSize as number);
}

/** Check every field used by the resource pages before trusting persisted JSON. */
export function isResourceState(value: unknown): value is ResourceState {
  if (!record(value)) return false;
  return records(value.customers, item => named(item)
    && strings(item, ["type", "area", "contact", "phone", "creditCode", "address", "email", "owner", "serviceStart", "serviceEnd"])
    && risk(item.risk) && choice(item.serviceStatus, ["服务中", "待跟进", "已暂停"])
    && stringArray(item.tags) && optionalText(item, ["founded", "scale"]))
    && records(value.projects, item => named(item)
      && strings(item, ["customerId", "type", "region", "address", "manager", "phone", "startDate", "endDate", "lastInspection", "nextInspection", "templateId"])
      && optionalText(item, ["legacyId"]) && risk(item.risk) && number(item.hazards)
      && choice(item.status, ["服务中", "筹备中", "待复查", "已归档"])
      && records(item.points, point => named(point) && text(point.category) && typeof point.checked === "boolean"))
    && records(value.devices, item => named(item)
      && strings(item, ["model", "projectId", "user", "firmware", "network", "lastSeen", "maintenanceDate", "purchasedDate"])
      && choice(item.type, ["智能安全帽", "摄像设备", "传感器设备", "网关"])
      && choice(item.status, ["在线", "离线", "维护中"]) && number(item.battery) && (item.battery as number) <= 100
      && optionalText(item, ["legacyProjectName", "legacyStatus"])
      && (item.powerSource === undefined || choice(item.powerSource, ["电池", "市电"]))
      && (item.maintenanceTask === undefined || (record(item.maintenanceTask)
        && text(item.maintenanceTask.id) && !!item.maintenanceTask.id.trim()
        && choice(item.maintenanceTask.kind, ["重启", "固件升级"])
        && optionalText(item.maintenanceTask, ["targetFirmware"]))))
    && records(value.templates, item => named(item)
      && strings(item, ["category", "description", "updatedAt", "author"])
      && Number.isInteger(item.version) && number(item.version, 1)
      && choice(item.status, ["草稿", "已发布", "已停用"])
      && records(item.items, check => named(check) && strings(check, ["standard", "evidence"])
        && risk(check.risk) && typeof check.required === "boolean"))
    && records(value.members, item => named(item)
      && strings(item, ["department", "roleId", "phone", "lastLogin"])
      && choice(item.status, ["启用", "停用"]) && stringArray(item.projectIds))
    && records(value.roles, item => named(item) && strings(item, ["description", "scope"]) && stringArray(item.permissions))
    && records(value.rules, item => named(item) && strings(item, ["trigger", "recipientRoleId"])
      && number(item.threshold) && typeof item.enabled === "boolean")
    && records(value.logs, item => strings(item, ["time", "actor", "action", "target"]))
    && (value.systemParameters === undefined || isSystemParameters(value.systemParameters));
}

export function parseResourceSnapshot(raw: string): ResourceState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return record(parsed) && parsed.version === 1 && isResourceState(parsed.state) ? parsed.state : null;
  } catch { return null; }
}
