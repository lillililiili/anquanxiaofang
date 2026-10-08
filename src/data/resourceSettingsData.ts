import type { ResourceMember, ResourceRole, ResourceRule, SystemParameters } from "../features/resources/resourceTypes";

export const defaultSystemParameters: SystemParameters = {
  platformName: "消防与用电安全智能检查服务平台",
  inspectionCycle: "每周",
  rectificationDays: 3,
  aiConfidence: 85,
  logPageSize: 10,
};

const allPermissions = ["customers", "projects", "devices", "templates", "settings"].flatMap(module => ["view", "edit", "export"].map(action => `${module}.${action}`));

export const seedRoles: ResourceRole[] = [
  { id: "R001", name: "平台管理员", description: "维护资源台账、演示成员与系统配置，查看全平台操作记录。", scope: "全部项目", permissions: allPermissions },
  { id: "R002", name: "现场检查员", description: "查看负责项目，维护检查设备和检查模板，准备现场检查资料。", scope: "指定项目", permissions: ["customers.view", "projects.view", "devices.view", "devices.edit", "templates.view", "templates.export"] },
  { id: "R003", name: "项目负责人", description: "维护负责项目的客户与项目资料，查看设备台账和检查模板。", scope: "指定项目", permissions: ["customers.view", "customers.edit", "customers.export", "projects.view", "projects.edit", "projects.export", "devices.view", "devices.export", "templates.view"] },
  { id: "R004", name: "安全专家", description: "查阅项目和设备资料，维护检查模板，为现场检查提供专业支持。", scope: "全部项目", permissions: ["customers.view", "projects.view", "projects.export", "devices.view", "templates.view", "templates.edit", "templates.export"] },
];

export const seedMembers: ResourceMember[] = [
  { id: "U001", name: "演示管理员", department: "平台运营部", roleId: "R001", phone: "13800001101", status: "启用", projectIds: [], lastLogin: "2026-09-23 09:12" },
  { id: "U002", name: "张三", department: "现场检查组", roleId: "R002", phone: "13800001102", status: "启用", projectIds: ["P001", "P003", "P006"], lastLogin: "2026-09-23 08:45" },
  { id: "U003", name: "李四", department: "项目服务部", roleId: "R003", phone: "13800001103", status: "启用", projectIds: ["P001", "P002", "P003", "P004"], lastLogin: "2026-09-23 08:32" },
  { id: "U004", name: "王工", department: "专家支持中心", roleId: "R004", phone: "13800001104", status: "启用", projectIds: [], lastLogin: "2026-09-22 16:38" },
  { id: "U005", name: "赵工", department: "专家支持中心", roleId: "R004", phone: "13800001105", status: "启用", projectIds: [], lastLogin: "2026-09-23 09:05" },
  { id: "U006", name: "陈晨", department: "现场检查组", roleId: "R002", phone: "13800001106", status: "启用", projectIds: ["P004", "P005", "P007"], lastLogin: "2026-09-22 15:21" },
  { id: "U007", name: "刘洋", department: "项目服务部", roleId: "R003", phone: "13800001107", status: "启用", projectIds: ["P005", "P006", "P007", "P008"], lastLogin: "2026-09-22 14:06" },
  { id: "U008", name: "周宁", department: "现场检查组", roleId: "R002", phone: "13800001108", status: "停用", projectIds: ["P002", "P008"], lastLogin: "2026-09-16 10:24" },
];

export const seedRules: ResourceRule[] = [
  { id: "N001", name: "整改到期提醒", trigger: "整改期限临近", threshold: 24, recipientRoleId: "R003", enabled: true },
  { id: "N002", name: "设备离线提醒", trigger: "设备持续离线", threshold: 30, recipientRoleId: "R001", enabled: true },
  { id: "N003", name: "服务续期提醒", trigger: "服务期限临近", threshold: 15, recipientRoleId: "R003", enabled: true },
  { id: "N004", name: "专家复核积压提醒", trigger: "待复核事项积压", threshold: 5, recipientRoleId: "R004", enabled: false },
];
