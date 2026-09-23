/** Independent operations-workbench design preview. All records are demo data. */
export type DesignPreviewTask = {
  id: string;
  title: string;
  project: string;
  location: string;
  inspector: string;
  initials: string;
  kind: string;
  scheduledTime: string;
  status: "待执行" | "检查中" | "已完成";
  progress: number;
};

export type DesignPreviewHazard = {
  id: string;
  title: string;
  project: string;
  location: string;
  risk: "高风险" | "中风险";
  dueLabel: string;
  owner: string;
  image: string;
  suggestion: string;
};

export type DesignPreviewTrendPoint = {
  day: string;
  completed: number;
  planned: number;
};

export type DesignPreviewCategory = {
  name: string;
  value: number;
  color: string;
};

export const designPreviewTasks: DesignPreviewTask[] = [
  {
    id: "RW20260920001",
    title: "配电室专项检查",
    project: "齐鲁科技园",
    location: "3号楼 · B1配电室",
    inspector: "张三",
    initials: "张",
    kind: "用电安全",
    scheduledTime: "09:00",
    status: "已完成",
    progress: 100,
  },
  {
    id: "RW20260920002",
    title: "消防控制室巡检",
    project: "国控大厦项目",
    location: "主楼 · 消防控制室",
    inspector: "李四",
    initials: "李",
    kind: "消防安全",
    scheduledTime: "09:30",
    status: "已完成",
    progress: 100,
  },
  {
    id: "RW20260920003",
    title: "消防通道与设施检查",
    project: "鲁商广场",
    location: "B座 · 东侧疏散通道",
    inspector: "王五",
    initials: "王",
    kind: "消防安全",
    scheduledTime: "10:00",
    status: "检查中",
    progress: 68,
  },
  {
    id: "RW20260920004",
    title: "动火与临时用电检查",
    project: "高新智造产业园",
    location: "B区 · 2号厂房改造点",
    inspector: "赵六",
    initials: "赵",
    kind: "动火临电",
    scheduledTime: "10:30",
    status: "检查中",
    progress: 42,
  },
  {
    id: "RW20260920005",
    title: "后厨用电安全复查",
    project: "银座佳驿酒店",
    location: "1层 · 后厨操作间",
    inspector: "陈八",
    initials: "陈",
    kind: "整改复查",
    scheduledTime: "14:00",
    status: "待执行",
    progress: 0,
  },
  {
    id: "RW20260920006",
    title: "仓储消防设施检查",
    project: "鲁商物流园",
    location: "1号仓库 · 装卸区",
    inspector: "刘一",
    initials: "刘",
    kind: "消防安全",
    scheduledTime: "15:00",
    status: "待执行",
    progress: 0,
  },
];

export const designPreviewHazards: DesignPreviewHazard[] = [
  {
    id: "HZ20260920001",
    title: "配电箱门未关闭",
    project: "齐鲁科技园",
    location: "3号楼 · B1配电室",
    risk: "高风险",
    dueLabel: "今日待核查",
    owner: "李四",
    image: "/demo-media/images/evidence_electrical_panel_open.jpg",
    suggestion: "建议由专业电工核查配电箱闭锁及绝缘防护情况，完成整改后补充现场照片。",
  },
  {
    id: "HZ20260920002",
    title: "疏散通道疑似占用",
    project: "鲁商广场",
    location: "B座 · 东侧疏散通道",
    risk: "高风险",
    dueLabel: "今日待核查",
    owner: "王五",
    image: "/demo-media/images/evidence_fire_corridor_blocked.jpg",
    suggestion: "建议核查通道净宽与杂物堆放情况，清理占用物，并补充整改前后对比照片。",
  },
  {
    id: "HZ20260920003",
    title: "灭火器压力疑似不足",
    project: "国控大厦项目",
    location: "主楼 · 1层消防设施点",
    risk: "中风险",
    dueLabel: "明日到期",
    owner: "张三",
    image: "/demo-media/images/evidence_extinguisher_low_pressure.jpg",
    suggestion: "建议现场复核压力表读数，及时更换或维护设备，并更新消防设施检查台账。",
  },
];

export const designPreviewTrend: DesignPreviewTrendPoint[] = [
  { day: "周一", completed: 5, planned: 6 },
  { day: "周二", completed: 7, planned: 8 },
  { day: "周三", completed: 6, planned: 6 },
  { day: "周四", completed: 8, planned: 9 },
  { day: "周五", completed: 7, planned: 8 },
  { day: "周六", completed: 4, planned: 5 },
  { day: "周日", completed: 2, planned: 6 },
];

// Distribution of the three current suspected hazards, not an unrelated total.
export const designPreviewCategories: DesignPreviewCategory[] = [
  { name: "用电安全", value: 1, color: "#3772FF" },
  { name: "疏散通道", value: 1, color: "#F59E42" },
  { name: "消防设施", value: 1, color: "#24A98B" },
  { name: "临时用电", value: 0, color: "#97A6BA" },
];
