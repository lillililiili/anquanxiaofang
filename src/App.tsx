import {
  BatteryMedium,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Cpu,
  Download,
  FileText,
  HardHat,
  Home,
  LayoutDashboard,
  Lightbulb,
  ListCollapse,
  LogOut,
  MapPin,
  Maximize,
  Mic,
  MonitorCog,
  MoreHorizontal,
  PlayCircle,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Target,
  Upload,
  UserCircle2,
  UsersRound,
  Wifi,
  Wrench
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chatMessages as expertChatMessages,
  expertReviewRecords,
  reportReviewInfo,
  retakeSuggestions,
  screenshots as expertScreenshots,
  selectedVideo,
  suspectedHazards as expertHazards,
  taskInfo,
  videoChannels,
  type ExpertHazard,
  type ExpertSnapshot,
  type ExpertVideoChannel
} from "./data/expertMockData";
import {
  openHelmetStream,
  sendRetakeInstruction,
  sendTalkbackAudio,
  startWebrtcCall,
  stopHelmetStream,
  stopWebrtcCall
} from "./services/expertDeviceAdapter";
import { ExpertRulesPage, HazardGraphPage, KnowledgePage } from "./pages/ModelCenterPages";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type PageKey =
  | "dashboard"
  | "customers"
  | "projects"
  | "devices"
  | "helmet"
  | "tasks"
  | "ai"
  | "hazards"
  | "experts"
  | "reports"
  | "templates"
  | "analytics"
  | "warnings"
  | "knowledge"
  | "hazardGraph"
  | "expertRules"
  | "settings";

type CustomerView = "enterprise";
type HazardView = "registration" | "rectification" | "statistics" | "overdue";
type DetailTab = "basic" | "projects" | "contracts" | "attachments";
type Option = { label: string; value: string };
type MediaKind = "image" | "video" | "audio";
type MediaPreview = { title: string; type: MediaKind; src: string; transcript?: string };

type ApiResponse<T> = { success: boolean; message?: string; data: T };

type Customer = {
  id: string;
  name: string;
  type: string;
  area: string;
  risk: string;
  projects: number;
  contact: string;
  phone: string;
  contractStatus: string;
  creditCode: string;
  address: string;
  founded: string;
  scale: string;
  email: string;
  tags: string[];
};

const demoMedia = {
  images: {
    cableExposed: "/demo-media/images/evidence_cable_exposed.jpg",
    electricalPanelOpen: "/demo-media/images/evidence_electrical_panel_open.jpg",
    fireCorridorBlocked: "/demo-media/images/evidence_fire_corridor_blocked.jpg",
    extinguisherLowPressure: "/demo-media/images/evidence_extinguisher_low_pressure.jpg",
    electricalCabinetVisible: "/demo-media/images/evidence_electrical_cabinet_visible.jpg",
    hotWorkTempPower: "/demo-media/images/evidence_hot_work_temp_power.jpg",
    hydrantExtinguisher: "/demo-media/images/evidence_hydrant_extinguisher.jpg",
    infraredOverheat: "/demo-media/images/evidence_infrared_overheat.jpg",
    locationTrajectoryMap: "/demo-media/images/location_trajectory_map.png",
    rectificationBefore: "/demo-media/images/rectification_before.jpg",
    rectificationAfter: "/demo-media/images/rectification_after.jpg",
    audioWaveform: "/demo-media/images/audio_waveform_card.png",
    reportCenter: "/demo-media/images/page_report_center.png",
    reportCenterPages: "/demo-media/images/page_report_center_three_pages.png",
    remoteExpertConsole: "/demo-media/images/page_remote_expert_console.png",
    rectificationProcess: Array.from({ length: 8 }, (_, index) => `/demo-media/images/rectification_process_${String(index + 1).padStart(2, "0")}.jpg`)
  },
  videos: {
    helmetLive: "/demo-media/videos/helmet_live_electrical_inspection.mp4",
    fireCorridor: "/demo-media/videos/fire_corridor_obstruction.mp4",
    extinguisherPressure: "/demo-media/videos/extinguisher_pressure_check.mp4",
    hotWorkTempPower: "/demo-media/videos/hot_work_temp_power_check.mp4",
    locationReplay: "/demo-media/videos/location_trajectory_replay.mp4",
    rectificationBeforeAfter: "/demo-media/videos/rectification_before_after.mp4"
  },
  audio: {
    hazardDescription: "/demo-media/audio/audio_hazard_description.mp3",
    expertInstruction: "/demo-media/audio/audio_expert_instruction.mp3",
    rectificationUpdate: "/demo-media/audio/audio_rectification_update.mp3",
    recheckResult: "/demo-media/audio/audio_recheck_result.mp3",
    enterpriseConfirm: "/demo-media/audio/audio_enterprise_confirm.mp3",
    patrolNote: "/demo-media/audio/audio_patrol_note.mp3"
  },
  transcripts: {
    hazardDescription: "现场发现配电箱门未关闭，线缆存在裸露，有触电风险，请尽快安排整改。",
    expertInstruction: "请检查配电箱内部接线情况，补拍箱门锁具和回路标识，并确认漏电保护器状态。",
    rectificationUpdate: "整改人员已关闭配电箱门并完成线缆绝缘包扎，现场环境已经清理。",
    recheckResult: "经现场复查，配电箱门已关闭并上锁，警示标识齐全，复查结果通过。",
    enterpriseConfirm: "企业确认该隐患已完成整改，整改结果符合现场安全管理要求。",
    patrolNote: "本次巡检覆盖配电室、消防通道和设备间，发现问题已全部记录。"
  }
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080/api").replace(/\/$/, "");

function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE_URL.endsWith("/api") || normalizedPath.startsWith("/api/")) return `${API_BASE_URL}${normalizedPath}`;
  return `${API_BASE_URL}/api${normalizedPath}`;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path));
  if (!response.ok) throw new Error(`接口请求失败：${response.status}`);
  const payload = await response.json() as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.message ?? "接口返回失败");
  return payload.data;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`接口请求失败：${response.status}`);
  const payload = await response.json() as ApiResponse<T>;
  if (!payload.success) throw new Error(payload.message ?? "接口返回失败");
  return payload.data;
}

const pageTitles: Record<PageKey, string> = {
  dashboard: "运营工作台",
  customers: "客户与项目档案",
  projects: "项目管理",
  devices: "设备管理",
  helmet: "安全帽现场端",
  tasks: "检查任务",
  ai: "大模型中台",
  hazards: "隐患闭环",
  experts: "远程专家端",
  reports: "报告中心",
  templates: "检查模板",
  analytics: "数据看板",
  warnings: "预警中心",
  knowledge: "知识库",
  hazardGraph: "隐患图谱",
  expertRules: "专家规则库",
  settings: "系统管理"
};

const menuItems: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "运营工作台", icon: Home },
  { key: "projects", label: "项目管理", icon: FileText },
  { key: "tasks", label: "检查任务", icon: CheckSquare },
  { key: "helmet", label: "安全帽现场端", icon: HardHat },
  { key: "ai", label: "大模型中台", icon: Brain },
  { key: "devices", label: "设备管理", icon: Cpu },
  { key: "templates", label: "检查模板", icon: SlidersHorizontal },
  { key: "hazards", label: "隐患闭环", icon: Target },
  { key: "experts", label: "远程专家", icon: UserCircle2 },
  { key: "reports", label: "报告中心", icon: FileText },
  { key: "analytics", label: "数据看板", icon: LayoutDashboard },
  { key: "warnings", label: "预警中心", icon: Bell },
  { key: "settings", label: "系统管理", icon: ShieldCheck }
];

const projectOptions = ["全部项目", "国控大厦项目", "齐鲁科技园", "山东国控大数据中心"].map(toOption);
const hazardViewLabels: Record<HazardView, string> = {
  registration: "隐患登记",
  rectification: "隐患整改",
  statistics: "隐患统计看板",
  overdue: "隐患超期预警列表"
};

const customers: Customer[] = [
  {
    id: "C001",
    name: "山东国控大数据中心有限公司",
    type: "数据中心",
    area: "山东省济南市",
    risk: "高风险",
    projects: 3,
    contact: "张伟",
    phone: "186****8888",
    contractStatus: "有效",
    creditCode: "91370100MA8DATA001",
    address: "山东省济南市高新区港兴三路88号",
    founded: "2020-03-12",
    scale: "200-500人",
    email: "zhangwei@gkdata.com",
    tags: ["配电房", "机房UPS", "气体灭火", "柴油发电机"]
  },
  {
    id: "C002",
    name: "齐鲁科技园管理有限公司",
    type: "科技园区",
    area: "山东省济南市",
    risk: "中风险",
    projects: 8,
    contact: "王磊",
    phone: "185****1234",
    contractStatus: "有效",
    creditCode: "91370100MA3P2Q2R4K",
    address: "山东省济南市高新区舜华路1236号",
    founded: "2019-06-18",
    scale: "500-1000人",
    email: "wanglei@qilupark.com",
    tags: ["配电房", "电气火灾", "消防通道", "高空作业", "临时用电"]
  },
  {
    id: "C003",
    name: "鲁商广场商业管理有限公司",
    type: "商业综合体",
    area: "山东省济南市",
    risk: "中风险",
    projects: 2,
    contact: "李娜",
    phone: "187****5678",
    contractStatus: "即将到期",
    creditCode: "91370100MA7MALL003",
    address: "山东省济南市市中区经四路66号",
    founded: "2017-11-02",
    scale: "100-300人",
    email: "lina@lushangmall.com",
    tags: ["消防通道", "餐饮后厨", "人员密集", "扶梯机房"]
  },
  {
    id: "C004",
    name: "银座佳驿酒店管理有限公司",
    type: "酒店宾馆",
    area: "山东省济南市",
    risk: "低风险",
    projects: 5,
    contact: "刘洋",
    phone: "188****9012",
    contractStatus: "有效",
    creditCode: "91370100MAHOTEL004",
    address: "山东省济南市历下区泺源大街28号",
    founded: "2016-04-21",
    scale: "100-300人",
    email: "liuyang@hotel.com",
    tags: ["客房疏散", "配电间", "消防栓", "厨房用电"]
  },
  {
    id: "C005",
    name: "济南鲁能物业管理有限公司",
    type: "物业公司",
    area: "山东省济南市",
    risk: "中风险",
    projects: 12,
    contact: "赵强",
    phone: "150****3456",
    contractStatus: "有效",
    creditCode: "91370100MAPROP005",
    address: "山东省济南市历城区工业北路99号",
    founded: "2018-09-10",
    scale: "300-500人",
    email: "zhaoqiang@property.com",
    tags: ["电动车充电", "地下车库", "消防泵房", "电梯机房"]
  }
];

const taskRows = [
  ["RW20250516001", "国控大厦项目", "消防检查", "张三、李四", "05-16 09:00", "进行中"],
  ["RW20250516002", "齐鲁科技园", "用电检查", "王五、赵六", "05-16 09:30", "进行中"],
  ["RW20250516003", "山东国控大数据中心", "消防检查", "孙七、周八", "05-16 10:00", "未开始"],
  ["RW20250516004", "鲁商广场", "消防检查", "吴九、郑十", "05-16 10:30", "未开始"],
  ["RW20250516005", "高新智造产业园", "用电检查", "刘一、陈二", "05-16 11:00", "未开始"]
];

const alertRows = [
  ["HD2025050001", "国控大厦项目", "消防通道堆放杂物", "5天", "重大隐患"],
  ["HD2025050002", "齐鲁科技园", "配电柜接线松动", "3天", "重大隐患"],
  ["HD2025050003", "鲁商广场", "灭火器压力不足", "2天", "较大隐患"],
  ["HD2025050004", "山东国控大数据中心", "应急照明故障", "1天", "一般隐患"]
];

const dashboardProjectOptions = ["全部项目", ...new Set([...taskRows, ...alertRows].map((row) => row[1]))].map(toOption);

const projectRows = [
  ["P20250516001", "国控大厦项目", "综合楼宇", "济南市历下区", "较高风险", "92%", "进行中"],
  ["P20250516002", "齐鲁科技园一期", "科技园区", "济南市高新区", "中风险", "88%", "进行中"],
  ["P20250516003", "山东国控大数据中心", "数据中心", "济南市高新区", "高风险", "76%", "重点督办"],
  ["P20250516004", "鲁商广场", "商业综合体", "济南市市中区", "中风险", "81%", "进行中"],
  ["P20250516005", "高新智造产业园", "工业园区", "济南市章丘区", "较高风险", "69%", "待复查"],
  ["P20250516006", "青岛海尔数据产业园", "数据中心", "青岛市崂山区", "中风险", "84%", "进行中"]
];

const stats = [
  { title: "今日检查任务", value: 48, unit: "项", icon: ClipboardList, tone: "blue", footer: [["已完成", "16 项"], ["完成率", "33.33%"]] },
  { title: "待整改隐患", value: 152, unit: "项", icon: ShieldAlert, tone: "orange", footer: [["一般隐患", "98 项"], ["重大隐患", "54 项"]] },
  { title: "超期预警", value: 24, unit: "项", icon: Siren, tone: "red", footer: [["即将超期", "12 项"], ["已超期", "12 项"]] },
  { title: "安全帽设备", value: 36, unit: "顶", icon: HardHat, tone: "green", footer: [["在线", "28 顶"], ["离线", "8 顶"]] }
];

const rectification = [
  { name: "待整改", value: 152, color: "#ef4444" },
  { name: "整改中", value: 68, color: "#f97316" },
  { name: "待复查", value: 30, color: "#2f80ed" },
  { name: "已整改", value: 54, color: "#18a863" }
];

const helmetTrend = [
  { time: "00:00", 在线数量: 12, 离线数量: 3 },
  { time: "04:00", 在线数量: 15, 离线数量: 4 },
  { time: "08:00", 在线数量: 18, 离线数量: 6 },
  { time: "12:00", 在线数量: 28, 离线数量: 8 },
  { time: "16:00", 在线数量: 36, 离线数量: 8 },
  { time: "20:00", 在线数量: 31, 离线数量: 9 },
  { time: "24:00", 在线数量: 28, 离线数量: 8 }
];

const riskTrend = [
  { day: "05-10", 高风险: 21, 较高风险: 16, 中风险: 11, 低风险: 5 },
  { day: "05-11", 高风险: 26, 较高风险: 20, 中风险: 13, 低风险: 6 },
  { day: "05-12", 高风险: 28, 较高风险: 22, 中风险: 15, 低风险: 7 },
  { day: "05-13", 高风险: 32, 较高风险: 25, 中风险: 16, 低风险: 8 },
  { day: "05-14", 高风险: 30, 较高风险: 23, 中风险: 14, 低风险: 6 },
  { day: "05-15", 高风险: 29, 较高风险: 24, 中风险: 15, 低风险: 8 },
  { day: "05-16", 高风险: 25, 较高风险: 21, 中风险: 14, 低风险: 7 }
];

type InspectionTask = {
  id: string;
  name: string;
  type: string;
  project: string;
  inspector: string;
  plannedDate: string;
  plannedTime: string;
  status: string;
  priority: string;
  device: string;
  template: string;
  description: string;
};

type ManagedDevice = {
  id: string;
  name: string;
  type: string;
  model: string;
  status: string;
  battery: string;
  network: string;
  user: string;
  project: string;
  firmware: string;
  lastSeen: string;
};

type HazardClue = {
  id: string;
  taskName: string;
  project: string;
  checkType: string;
  inspector: string;
  checkDate: string;
  sourceDevice: string;
  foundTime: string;
  location: string;
  tags: string[];
  risk: string;
  source: string;
  status: string;
  description: string;
  aiAdvice: string;
};

type HazardLedger = {
  id: string;
  title: string;
  project: string;
  taskName: string;
  category: string;
  risk: string;
  unit: string;
  person: string;
  deadline: string;
  status: string;
  foundTime: string;
  overdueDays: number;
  source: string;
  measure: string;
};

const inspectionTaskSeed: InspectionTask[] = [
  { id: "RW20250516001", name: "齐鲁科技园配电室专项检查", type: "用电安全检查", project: "齐鲁科技园", inspector: "张三", plannedDate: "2025-05-16", plannedTime: "09:30", status: "待派发", priority: "高", device: "aa的智能安全帽", template: "用电安全检查模板 V2.3", description: "核查配电室配电箱闭锁、线缆绝缘、警示标识和消防通道情况。" },
  { id: "RW20250516002", name: "国控大厦消防控制室巡检", type: "消防安全检查", project: "国控大厦项目", inspector: "李四", plannedDate: "2025-05-16", plannedTime: "10:00", status: "执行中", priority: "高", device: "bb的智能安全帽", template: "消防设施检查模板 V1.9", description: "检查消防主机、值班记录、应急广播和消防泵房联动状态。" },
  { id: "RW20250516003", name: "鲁商广场消防通道复查", type: "复查验收", project: "鲁商广场", inspector: "王五", plannedDate: "2025-05-16", plannedTime: "14:30", status: "待复查", priority: "中", device: "aa的智能安全帽", template: "隐患复查模板 V1.6", description: "复查消防通道占用隐患整改结果并归档现场证据。" },
  { id: "RW20250516004", name: "高新智造产业园动火临电检查", type: "动火临电", project: "高新智造产业园", inspector: "赵六", plannedDate: "2025-05-17", plannedTime: "09:00", status: "待派发", priority: "中", device: "未绑定", template: "动火作业检查模板 V1.8", description: "检查临时电源箱、接地保护、动火审批和现场监护落实情况。" }
];

const managedDeviceSeed: ManagedDevice[] = [
  { id: "SHM20250516001", name: "aa的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "在线", battery: "82%", network: "4G", user: "张三", project: "齐鲁科技园配电室专项检查", firmware: "V2.3.1", lastSeen: "2025-05-16 10:31" },
  { id: "SHM20250516002", name: "bb的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "任务中", battery: "64%", network: "5G", user: "李四", project: "国控大厦消防控制室巡检", firmware: "V2.3.1", lastSeen: "2025-05-16 10:28" },
  { id: "CAM20250516003", name: "配电室摄像机 A01", type: "摄像设备", model: "CAM-PTZ-4M", status: "在线", battery: "市电", network: "有线", user: "运维部", project: "齐鲁科技园", firmware: "V1.8.4", lastSeen: "2025-05-16 10:30" },
  { id: "BOX20250516008", name: "用电采集终端 08", type: "传感器设备", model: "BOX-ELEC-08", status: "离线", battery: "34%", network: "4G", user: "王五", project: "鲁商广场", firmware: "V1.4.2", lastSeen: "2025-05-15 18:20" },
  { id: "SHM20250516009", name: "cc的智能安全帽", type: "智能安全帽", model: "SHM-01 Lite", status: "在线", battery: "76%", network: "4G", user: "王五", project: "鲁商广场消防通道复查", firmware: "V2.2.8", lastSeen: "2025-05-16 10:26" },
  { id: "SHM20250516010", name: "dd的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "在线", battery: "91%", network: "5G", user: "赵六", project: "高新智造产业园动火临电检查", firmware: "V2.3.1", lastSeen: "2025-05-16 10:24" },
  { id: "SHM20250516011", name: "ee的智能安全帽", type: "智能安全帽", model: "SHM-01 Lite", status: "离线", battery: "18%", network: "4G", user: "孙七", project: "银座佳驿酒店后厨用电检查", firmware: "V2.1.9", lastSeen: "2025-05-15 19:46" },
  { id: "SHM20250516012", name: "ff的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "任务中", battery: "58%", network: "5G", user: "周八", project: "山东国控大数据中心机房巡检", firmware: "V2.3.1", lastSeen: "2025-05-16 10:22" },
  { id: "SHM20250516019", name: "gg的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "在线", battery: "87%", network: "4G", user: "郑十", project: "鲁商物流园仓储消防巡检", firmware: "V2.3.1", lastSeen: "2025-05-16 10:21" },
  { id: "SHM20250516020", name: "hh的智能安全帽", type: "智能安全帽", model: "SHM-01 Lite", status: "在线", battery: "69%", network: "5G", user: "陈八", project: "国控大厦B1配电间巡检", firmware: "V2.2.8", lastSeen: "2025-05-16 10:20" },
  { id: "SHM20250516021", name: "ii的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "任务中", battery: "73%", network: "5G", user: "刘一", project: "济南科创园消防设施复查", firmware: "V2.3.1", lastSeen: "2025-05-16 10:19" },
  { id: "SHM20250516022", name: "jj的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "在线", battery: "95%", network: "4G", user: "许二", project: "山控能源站临电检查", firmware: "V2.3.1", lastSeen: "2025-05-16 10:18" },
  { id: "SHM20250516023", name: "kk的智能安全帽", type: "智能安全帽", model: "SHM-01 Lite", status: "离线", battery: "22%", network: "4G", user: "马三", project: "历下产业园消防通道巡检", firmware: "V2.1.9", lastSeen: "2025-05-15 20:12" },
  { id: "SHM20250516024", name: "ll的智能安全帽", type: "智能安全帽", model: "SHM-01 Pro", status: "在线", battery: "80%", network: "5G", user: "宋四", project: "章丘智造基地配电室复查", firmware: "V2.3.1", lastSeen: "2025-05-16 10:17" },
  { id: "CAM20250516013", name: "消防通道摄像机 B02", type: "摄像设备", model: "CAM-PTZ-4M", status: "在线", battery: "市电", network: "有线", user: "物业部", project: "国控大厦项目", firmware: "V1.8.4", lastSeen: "2025-05-16 10:29" },
  { id: "CAM20250516014", name: "后厨明火识别摄像机 C03", type: "摄像设备", model: "CAM-AI-2M", status: "在线", battery: "市电", network: "有线", user: "酒店工程部", project: "银座佳驿酒店", firmware: "V1.6.7", lastSeen: "2025-05-16 10:18" },
  { id: "CAM20250516015", name: "配电室热成像摄像机 D04", type: "摄像设备", model: "CAM-THERM-2M", status: "维护中", battery: "市电", network: "有线", user: "数据中心运维部", project: "山东国控大数据中心", firmware: "V1.9.0", lastSeen: "2025-05-16 09:55" },
  { id: "BOX20250516016", name: "漏电监测终端 16", type: "传感器设备", model: "BOX-RCD-16", status: "在线", battery: "92%", network: "NB-IoT", user: "工程部", project: "国控大厦项目", firmware: "V1.5.3", lastSeen: "2025-05-16 10:27" },
  { id: "BOX20250516017", name: "烟感联动网关 17", type: "传感器设备", model: "GW-FIRE-17", status: "在线", battery: "市电", network: "以太网", user: "消防运维服务部", project: "齐鲁科技园", firmware: "V1.7.1", lastSeen: "2025-05-16 10:25" },
  { id: "BOX20250516018", name: "温湿度传感器 18", type: "传感器设备", model: "BOX-ENV-18", status: "离线", battery: "27%", network: "LoRa", user: "仓储运营部", project: "鲁商物流园", firmware: "V1.3.6", lastSeen: "2025-05-15 17:08" }
];

const hazardClueSeed: HazardClue[] = [
  { id: "XS20250516001", taskName: "国控大厦消防安全检查", project: "国控大厦项目", checkType: "消防安全检查", inspector: "张三", checkDate: "2025-05-16", sourceDevice: "aa的智能安全帽", foundTime: "10:31:02", location: "2号楼B1层 配电室", tags: ["配电箱未关闭", "线缆裸露"], risk: "高风险", source: "图片识别", status: "待登记", description: "配电箱门未关闭，箱内多处线缆裸露，存在触电风险。", aiAdvice: "立即关闭配电箱并上锁，对裸露线缆做绝缘包扎，补贴警示标识。" },
  { id: "XS20250516002", taskName: "国控大厦消防安全检查", project: "国控大厦项目", checkType: "消防安全检查", inspector: "张三", checkDate: "2025-05-16", sourceDevice: "aa的智能安全帽", foundTime: "10:31:28", location: "东侧消防通道", tags: ["消防通道占用"], risk: "中风险", source: "视频关键帧", status: "待登记", description: "消防通道有杂物堆放，影响疏散通行。", aiAdvice: "清理消防通道杂物，设置禁止堆放标识，并纳入日常巡查。" },
  { id: "XS20250516003", taskName: "齐鲁科技园配电室专项检查", project: "齐鲁科技园", checkType: "用电安全检查", inspector: "李四", checkDate: "2025-05-16", sourceDevice: "bb的智能安全帽", foundTime: "11:08:45", location: "3号楼配电间", tags: ["线缆老化破损"], risk: "高风险", source: "人工上报", status: "待登记", description: "配电间部分线缆外皮老化破损，需要停电检修。", aiAdvice: "停用相关支路，完成绝缘检测和线缆更换后再恢复供电。" },
  { id: "XS20250516004", taskName: "鲁商广场消防通道复查", project: "鲁商广场", checkType: "复查验收", inspector: "王五", checkDate: "2025-05-16", sourceDevice: "手机端", foundTime: "14:22:10", location: "后厨通道", tags: ["灭火器压力不足"], risk: "中风险", source: "图片识别", status: "已登记", description: "灭火器压力表低于正常范围。", aiAdvice: "更换或重新充装灭火器，并检查周边点位配置数量。" },
  { id: "XS20250516005", taskName: "高新智造产业园动火临电检查", project: "高新智造产业园", checkType: "动火临电", inspector: "赵六", checkDate: "2025-05-17", sourceDevice: "专家补录", foundTime: "09:15:33", location: "B区动火点", tags: ["临时用电不规范", "接地缺失"], risk: "重大隐患", source: "专家补录", status: "待提交", description: "临时用电箱缺少防护，动火设备接地措施不足。", aiAdvice: "暂停现场作业，补齐临电防护和接地检测记录后再复工。" },
  { id: "XS20250516006", taskName: "银座佳驿酒店后厨用电检查", project: "银座佳驿酒店", checkType: "用电安全检查", inspector: "张三", checkDate: "2025-05-15", sourceDevice: "手机端", foundTime: "16:40:20", location: "后厨操作间", tags: ["插排串接"], risk: "低风险", source: "人工上报", status: "已提交", description: "后厨存在插排串接和线缆拖地。", aiAdvice: "更换固定插座，线缆穿管固定，避免潮湿区域拖地使用。" }
];

const hazardLedgerSeed: HazardLedger[] = [
  { id: "HZ20250516001", title: "配电箱未关闭，存在触电风险", project: "齐鲁科技园", taskName: "配电室专项检查", category: "用电安全 / 配电箱及线路", risk: "高风险", unit: "山东消防技术服务中心", person: "张三", deadline: "2025-05-16", status: "待整改", foundTime: "2025-05-15 10:21", overdueDays: 7, source: "智能安全帽", measure: "关闭配电箱并上锁，整理线缆，粘贴警示标识。" },
  { id: "HZ20250516002", title: "灭火器压力不足", project: "齐鲁科技园", taskName: "消防设施巡检", category: "消防设施 / 灭火器", risk: "中风险", unit: "齐鲁科技园物业", person: "李四", deadline: "2025-05-17", status: "整改中", foundTime: "2025-05-15 11:05", overdueDays: 0, source: "手机端", measure: "更换压力不足灭火器并重新登记台账。" },
  { id: "HZ20250516003", title: "安全通道堆物", project: "鲁商广场", taskName: "消防通道复查", category: "消防安全 / 疏散通道", risk: "高风险", unit: "鲁商广场运营部", person: "王五", deadline: "2025-05-16", status: "待复查", foundTime: "2025-05-14 09:48", overdueDays: 3, source: "视频关键帧", measure: "清理通道堆物并设置巡检责任人。" },
  { id: "HZ20250516004", title: "电缆线裸露", project: "山东国控大数据中心", taskName: "机房用电检查", category: "用电安全 / 线缆", risk: "中风险", unit: "数据中心运维部", person: "赵六", deadline: "2025-05-18", status: "企业确认", foundTime: "2025-05-13 16:20", overdueDays: 0, source: "图片识别", measure: "完成线缆绝缘包扎并上传整改后照片。" },
  { id: "HZ20250516005", title: "消防栓被遮挡", project: "高新智造产业园", taskName: "园区消防巡检", category: "消防设施 / 消火栓", risk: "低风险", unit: "高新区物业", person: "孙七", deadline: "2025-05-20", status: "专家复核", foundTime: "2025-05-12 13:30", overdueDays: 0, source: "人工上报", measure: "移除遮挡物，补充地面警示线。" },
  { id: "HZ20250516006", title: "应急灯不亮", project: "国控大厦项目", taskName: "楼宇消防检查", category: "消防设施 / 应急照明", risk: "中风险", unit: "国控大厦物业", person: "周八", deadline: "2025-05-19", status: "已销号", foundTime: "2025-05-11 08:45", overdueDays: 0, source: "手机端", measure: "更换故障灯具，复测断电照明。" },
  { id: "HZ20250516007", title: "临时电源箱防护不足", project: "高新智造产业园", taskName: "动火临电检查", category: "临时用电 / 电源箱", risk: "高风险", unit: "施工单位", person: "郑十", deadline: "2025-05-14", status: "整改中", foundTime: "2025-05-10 15:40", overdueDays: 9, source: "专家补录", measure: "补齐箱体防护、漏保和接地措施。" },
  { id: "HZ20250516008", title: "警示标识缺失", project: "银座佳驿酒店", taskName: "后厨用电检查", category: "用电安全 / 标识", risk: "低风险", unit: "酒店工程部", person: "陈八", deadline: "2025-05-22", status: "待整改", foundTime: "2025-05-15 17:10", overdueDays: 0, source: "人工上报", measure: "补贴用电安全警示标识。" },
  { id: "HZ20250516009", title: "消防通道反复占用", project: "鲁商物流园", taskName: "仓储消防巡检", category: "消防安全 / 疏散通道", risk: "高风险", unit: "仓储运营部", person: "刘一", deadline: "2025-05-12", status: "多次退回", foundTime: "2025-05-08 09:10", overdueDays: 11, source: "智能安全帽", measure: "清理堆物并建立通道保持责任制度。" },
  { id: "HZ20250516010", title: "配电室杂物堆放", project: "国控大厦项目", taskName: "B1配电间巡检", category: "用电安全 / 配电室", risk: "中风险", unit: "楼宇工程部", person: "吴九", deadline: "2025-05-23", status: "即将超期", foundTime: "2025-05-16 09:22", overdueDays: 0, source: "图片识别", measure: "清除配电室杂物，保持安全距离。" }
];

const genericTables: Record<string, { headers: string[]; rows: string[][] }> = {
  devices: { headers: ["设备编号", "设备类型", "绑定项目", "在线状态", "电量"], rows: [["SHM20250516001", "智能安全帽", "国控大厦项目", "在线", "86%"], ["CAM20250516003", "热成像摄像机", "齐鲁科技园", "在线", "市电"], ["BOX20250516008", "用电采集终端", "鲁商广场", "离线", "34%"]] },
  tasks: { headers: ["任务编号", "项目名称", "检查类型", "检查人员", "计划时间", "状态"], rows: taskRows },
  hazards: { headers: ["隐患编号", "项目名称", "隐患描述", "超期时长", "风险等级"], rows: alertRows },
  experts: { headers: ["会诊编号", "专家", "专业方向", "关联项目", "状态"], rows: [["EX20250516001", "王工", "电气安全", "齐鲁科技园", "会诊中"], ["EX20250516002", "赵工", "消防设施", "国控大厦项目", "待接入"], ["EX20250516003", "孙工", "建筑消防", "鲁商广场", "已完成"]] },
  reports: { headers: ["报告编号", "报告名称", "项目名称", "生成时间", "状态"], rows: [["BG20250516001", "消防与用电安全检查报告", "国控大厦项目", "05-16 11:30", "已生成"], ["BG20250515008", "隐患整改复查报告", "齐鲁科技园", "05-15 17:20", "已生成"], ["BG20250514012", "园区风险分析报告", "高新智造产业园", "05-14 15:10", "草稿"]] },
  analytics: { headers: ["指标名称", "当前值", "环比", "风险说明", "状态"], rows: [["高风险隐患", "25", "-4", "持续下降", "正常"], ["超期整改", "24", "+2", "需要督办", "预警"], ["安全帽在线率", "77.8%", "+3.2%", "现场稳定", "正常"]] },
  warnings: { headers: ["预警编号", "预警类型", "项目名称", "触发时间", "状态"], rows: [["YJ20250516001", "超期整改", "国控大厦项目", "05-16 10:42", "待处理"], ["YJ20250516002", "设备离线", "鲁商广场", "05-16 09:21", "待处理"], ["YJ20250516003", "高风险隐患", "山东国控大数据中心", "05-16 08:50", "处理中"]] },
  knowledge: { headers: ["条目名称", "分类", "适用场景", "更新人", "状态"], rows: [["配电柜检查要点", "用电安全", "配电室巡检", "系统管理员", "已发布"], ["消防通道判定标准", "消防安全", "楼宇检查", "系统管理员", "已发布"], ["智能安全帽取证规范", "现场作业", "远程会诊", "系统管理员", "草稿"]] },
  hazardGraph: { headers: ["图谱节点", "关联风险", "关联标准", "典型案例", "状态"], rows: [["配电箱未关闭", "触电风险 / 电气火灾", "GB 50054-2011", "128 条", "已发布"], ["消防通道占用", "疏散受阻", "GB 50016-2014", "96 条", "已发布"], ["灭火器压力不足", "初起火灾处置失败", "GB 50140-2005", "72 条", "已发布"], ["临时用电不规范", "短路 / 过载", "JGJ 46-2005", "58 条", "维护中"]] },
  expertRules: { headers: ["规则名称", "专业方向", "触发条件", "责任组", "状态"], rows: [["配电箱闭锁检查规则", "电气安全", "识别到箱门开启或未上锁", "电气专家组", "启用"], ["消防通道占用判定规则", "消防安全", "通道堆物或宽度不足", "消防专家组", "启用"], ["灭火器压力异常规则", "消防设施", "压力表不在绿色区间", "消防设施组", "启用"], ["临时用电接地规则", "作业安全", "接地缺失或漏保异常", "作业安全组", "草稿"]] },
  settings: { headers: ["配置项", "配置内容", "负责人", "更新时间", "状态"], rows: [["角色权限", "运营管理员 / 检查员 / 专家", "系统管理员", "05-16 09:00", "启用"], ["消息规则", "隐患超期自动提醒", "系统管理员", "05-15 18:00", "启用"], ["项目字典", "园区 / 楼宇 / 数据中心", "系统管理员", "05-14 16:00", "启用"]] }
};

const hazardRoutes: Record<HazardView, string> = {
  registration: "/hazards/register",
  rectification: "/hazards/rectify",
  statistics: "/hazards/dashboard",
  overdue: "/hazards/overdue"
};

const pageRoutes: Partial<Record<PageKey, string>> = {
  dashboard: "/",
  customers: "/customers/enterprise",
  projects: "/projects",
  devices: "/devices",
  helmet: "/helmet-live",
  tasks: "/tasks",
  ai: "/model-center",
  hazards: hazardRoutes.registration,
  experts: "/expert",
  reports: "/reports",
  templates: "/templates",
  analytics: "/analytics",
  warnings: "/warnings",
  knowledge: "/model-center/knowledge",
  hazardGraph: "/model-center/hazard-graph",
  expertRules: "/model-center/expert-rules",
  settings: "/settings"
};

function getInitialRoute(): { page: PageKey; hazardView: HazardView; customerView: CustomerView } {
  const path = window.location.pathname;
  if (path.includes("/customers/park")) {
    window.history.replaceState({}, "", "/customers/enterprise");
    return { page: "customers", hazardView: "registration", customerView: "enterprise" };
  }
  if (path.includes("/customers")) return { page: "customers", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/projects")) return { page: "projects", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/hazards/rectify") || path.includes("/hazards/rectification")) return { page: "hazards", hazardView: "rectification", customerView: "enterprise" };
  if (path.includes("/hazards/dashboard") || path.includes("/hazards/statistics")) return { page: "hazards", hazardView: "statistics", customerView: "enterprise" };
  if (path.includes("/hazards/overdue")) return { page: "hazards", hazardView: "overdue", customerView: "enterprise" };
  if (path.includes("/hazards")) return { page: "hazards", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/helmet-live")) return { page: "helmet", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/model-center/hazard-graph")) return { page: "hazardGraph", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/model-center/expert-rules")) return { page: "expertRules", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/model-center/knowledge")) return { page: "knowledge", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/model-center") || path.includes("/ai-analysis")) return { page: "ai", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/devices")) return { page: "devices", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/templates")) return { page: "templates", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/expert")) return { page: "experts", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/reports")) return { page: "reports", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/tasks")) return { page: "tasks", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/analytics")) return { page: "analytics", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/warnings")) return { page: "warnings", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/knowledge")) return { page: "knowledge", hazardView: "registration", customerView: "enterprise" };
  if (path.includes("/settings")) return { page: "settings", hazardView: "registration", customerView: "enterprise" };
  return { page: "dashboard", hazardView: "registration", customerView: "enterprise" };
}

function App() {
  const initialRoute = getInitialRoute();
  const [page, setPage] = useState<PageKey>(initialRoute.page);
  const [customerView, setCustomerView] = useState<CustomerView>(initialRoute.customerView);
  const [hazardView, setHazardView] = useState<HazardView>(initialRoute.hazardView);
  const [collapsed, setCollapsed] = useState(false);
  const [date, setDate] = useState("2025-05-16");
  const [project, setProject] = useState(projectOptions[0].value);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const syncRoute = () => {
      const route = getInitialRoute();
      setPage(route.page);
      setCustomerView(route.customerView);
      setHazardView(route.hazardView);
      setToast(null);
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentTitle = page === "hazards" ? hazardViewLabels[hazardView] : pageTitles[page];
  const showGlobalFilters = ["dashboard", "customers", "projects", "analytics", "warnings"].includes(page);
  const currentProjectOptions = projectOptions.some((option) => option.value === project) ? projectOptions : [...projectOptions, toOption(project)];
  const globalFilters = (
    <>
      <label className="date-box"><span>{page === "dashboard" ? "任务日期" : "日期"}</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setToast(`已切换日期：${event.target.value}`); }} /></label>
      <SelectBox label={page === "dashboard" ? "清单项目" : "项目"} value={project} options={page === "dashboard" ? dashboardProjectOptions : currentProjectOptions} onChange={(value) => { setProject(value); setToast(`已筛选：${value}`); }} />
    </>
  );

  const navigate = (next: PageKey, message?: string, routeOverride?: string) => {
    setPage(next);
    const route = routeOverride ?? pageRoutes[next] ?? "/";
    if (window.location.pathname !== route) window.history.pushState({}, "", route);
    setToast(message ?? `已进入${pageTitles[next]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCustomer = (view: CustomerView) => {
    setCustomerView(view);
    navigate("customers", "已打开企业档案", "/customers/enterprise");
  };

  const openHazard = (view: HazardView) => {
    setHazardView(view);
    navigate("hazards", `已打开${hazardViewLabels[view]}`, hazardRoutes[view]);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setToast("已进入全屏模式");
      return;
    }
    await document.exitFullscreen?.();
    setToast("已退出全屏模式");
  };

  return (
    <div className={`workbench-shell ${collapsed ? "is-collapsed" : ""}`}>
      <Sidebar page={page} customerView={customerView} hazardView={hazardView} collapsed={collapsed} navigate={navigate} openCustomer={openCustomer} openHazard={openHazard} toggleCollapsed={() => setCollapsed((value) => !value)} />
      <main className="workspace">
        {page !== "helmet" && page !== "ai" && page !== "experts" && page !== "knowledge" && page !== "hazardGraph" && page !== "expertRules" && <Topbar title={currentTitle} filters={showGlobalFilters ? globalFilters : null} onMessage={() => navigate("warnings", "已打开消息与预警中心")} onTodo={() => navigate("tasks", "已打开待办检查任务")} onHelp={() => navigate("knowledge", "已打开帮助与知识库")} onFullscreen={toggleFullscreen} onUser={() => navigate("settings", "已打开系统管理")} />}
        {page === "dashboard" && <Dashboard navigate={navigate} date={date} project={project} onResetFilters={() => { setDate("2025-05-16"); setProject(projectOptions[0].value); }} />}
        {page === "customers" && customerView === "enterprise" && <EnterpriseArchivePage setToast={setToast} navigate={navigate} />}
        {page === "projects" && <ProjectMapPage setToast={setToast} navigate={navigate} />}
        {page === "tasks" && <InspectionTasksPage setToast={setToast} navigate={navigate} />}
        {page === "hazards" && <HazardClosurePage view={hazardView} setView={openHazard} setToast={setToast} />}
        {page === "helmet" && <HelmetLivePage setToast={setToast} navigate={navigate} />}
        {page === "ai" && <AiModelCenterPage setToast={setToast} navigate={navigate} />}
        {page === "devices" && <DevicesManagementPage setToast={setToast} navigate={navigate} />}
        {page === "templates" && <InspectionTemplatesPage setToast={setToast} />}
        {page === "experts" && <ExpertPage setToast={setToast} navigate={navigate} />}
        {page === "reports" && <ReportsGeneratePage setToast={setToast} />}
        {page === "knowledge" && <KnowledgePage setToast={setToast} />}
        {page === "hazardGraph" && <HazardGraphPage setToast={setToast} />}
        {page === "expertRules" && <ExpertRulesPage setToast={setToast} />}
        {!["dashboard", "customers", "projects", "tasks", "hazards", "helmet", "ai", "devices", "templates", "experts", "reports", "knowledge", "hazardGraph", "expertRules"].includes(page) && <GenericModulePage page={page} navigate={navigate} />}
      </main>
      {toast && <div className="toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function Sidebar({
  page,
  customerView,
  hazardView,
  collapsed,
  navigate,
  openCustomer,
  openHazard,
  toggleCollapsed
}: {
  page: PageKey;
  customerView: CustomerView;
  hazardView: HazardView;
  collapsed: boolean;
  navigate: (page: PageKey, message?: string) => void;
  openCustomer: (view: CustomerView) => void;
  openHazard: (view: HazardView) => void;
  toggleCollapsed: () => void;
}) {
  const customerActive = page === "customers";
  const hazardActive = page === "hazards";
  const modelCenterActive = ["ai", "knowledge", "hazardGraph", "expertRules"].includes(page);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><ShieldCheck size={26} /></div>
        <strong>消防与用电安全<span className="brand-subtitle">智能检查服务平台</span></strong>
      </div>
      <button className="enterprise" onClick={() => openCustomer("enterprise")} title="山东国控企管">
        <Building2 size={19} />
        <span>山东国控企管</span>
        <ChevronDown size={16} />
      </button>
      <nav aria-label="主导航">
        <button className={page === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")} title="运营工作台">
          <Home size={20} />
          <span>运营工作台</span>
          {page !== "dashboard" && <ChevronRight size={15} />}
        </button>
        <button className={customerActive ? "active" : ""} onClick={() => openCustomer("enterprise")} title="客户管理">
          <UsersRound size={20} />
          <span>客户管理</span>
          <ChevronDown size={15} />
        </button>
        {!collapsed && customerActive && (
          <div className="subnav">
            <button className={customerActive && customerView === "enterprise" ? "sub-active" : ""} onClick={() => openCustomer("enterprise")}>企业档案</button>
          </div>
        )}
        {menuItems.slice(1).map(({ key, label, icon: Icon }) => (
          <div className="nav-group" key={key}>
            <button className={(key === "ai" ? modelCenterActive : page === key) ? "active" : ""} onClick={() => key === "hazards" ? openHazard("registration") : navigate(key)} title={label}>
              <Icon size={20} />
              <span>{label}</span>
              {key === "hazards" || key === "ai" ? <ChevronDown size={15} /> : page !== key && <ChevronRight size={15} />}
            </button>
            {!collapsed && key === "ai" && modelCenterActive && (
              <div className="subnav">
                <button className={page === "ai" ? "sub-active" : ""} onClick={() => navigate("ai")}>大模型中台</button>
                <button className={page === "knowledge" ? "sub-active" : ""} onClick={() => navigate("knowledge", "已打开知识库")}>知识库</button>
                <button className={page === "hazardGraph" ? "sub-active" : ""} onClick={() => navigate("hazardGraph", "已打开隐患图谱")}>隐患图谱</button>
                <button className={page === "expertRules" ? "sub-active" : ""} onClick={() => navigate("expertRules", "已打开专家规则库")}>专家规则库</button>
              </div>
            )}
            {!collapsed && key === "hazards" && hazardActive && (
              <div className="subnav">
                {(Object.keys(hazardViewLabels) as HazardView[]).map((item) => (
                  <button key={item} className={hazardView === item ? "sub-active" : ""} onClick={() => openHazard(item)}>{hazardViewLabels[item].replace("列表", "")}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <button className="collapse-menu" onClick={toggleCollapsed} title={collapsed ? "展开菜单" : "收起菜单"}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        <span>{collapsed ? "展开菜单" : "收起菜单"}</span>
      </button>
    </aside>
  );
}

function Topbar({ title, filters, onMessage, onTodo, onHelp, onFullscreen, onUser }: { title: string; filters: React.ReactNode | null; onMessage: () => void; onTodo: () => void; onHelp: () => void; onFullscreen: () => void; onUser: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-actions-row">
        <div className="demo-indicator"><ShieldCheck size={14} />演示数据<span>DEMO</span></div>
        <div className="topbar-actions">
          <button className="nav-action" onClick={onMessage}><Bell size={20} />消息<span>12</span></button>
          <button className="nav-action" onClick={onTodo}><CalendarDays size={20} />待办<span>5</span></button>
          <button className="nav-action" onClick={onHelp}><CircleHelp size={20} />帮助中心</button>
          <button className="nav-action" onClick={onFullscreen}><Maximize size={20} />全屏</button>
          <button className="user-menu" onClick={onUser}><UserCircle2 size={28} />系统管理员<ChevronDown size={15} /></button>
        </div>
      </div>
      <div className={`topbar-context ${filters ? "" : "no-filters"}`}>
        <div className="topbar-title"><ListCollapse size={20} /><h1>{title}</h1></div>
        {filters && <section className="filters topbar-filters">{filters}</section>}
      </div>
    </header>
  );
}

function Dashboard({ navigate, date, project, onResetFilters }: { navigate: (page: PageKey, message?: string) => void; date: string; project: string; onResetFilters: () => void }) {
  const visibleTasks = taskRows.filter((row) => (project === "全部项目" || row[1] === project) && (!date || `${row[0].slice(2, 6)}-${row[4].slice(0, 5)}` === date));
  const visibleAlerts = alertRows.filter((row) => project === "全部项目" || row[1] === project);
  const filtersChanged = date !== "2025-05-16" || project !== "全部项目";
  return (
    <section className="content-grid dashboard-overview">
      <div className="overview-heading">
        <div><h2>安全运营概览</h2><p>平台汇总 · 任务、隐患与设备一览</p></div>
        <div className="overview-actions"><button className="secondary-btn" onClick={() => navigate("reports")}><FileText size={16} />查看检查报告</button><button className="primary-btn" onClick={() => navigate("tasks")}><ClipboardList size={16} />派发检查任务</button></div>
      </div>
      <div className="stats-row">{stats.map((item) => <StatCard key={item.title} {...item} />)}</div>
      <div className="overview-scope"><span><CalendarDays size={15} />2025 年 5 月演示样例 · 日期筛选任务，项目筛选任务与预警清单</span>{filtersChanged && <button onClick={onResetFilters}>重置筛选</button>}</div>
      <Panel className="overview-tasks" title={`检查任务 · ${visibleTasks.length} 项`} onMore={() => navigate("tasks", "已打开检查任务")}><DataTable headers={["任务编号", "项目名称", "检查类型", "检查人员", "计划时间", "状态"]} columnWidths={["21%", "23%", "14%", "14%", "16%", "12%"]} rows={visibleTasks} emptyText="当前日期或项目暂无检查任务，可调整上方筛选条件。" /></Panel>
      <Panel className="overview-rectification" title="隐患整改情况" onMore={() => navigate("hazards", "已打开隐患闭环")}><RectificationChart /></Panel>
      <Panel className="overview-alerts" title={`隐患超期预警 · ${visibleAlerts.length} 项`} onMore={() => navigate("warnings", "已打开预警中心")}><DataTable headers={["隐患编号", "项目名称", "隐患描述", "超期时长", "风险等级"]} columnWidths={["21%", "24%", "27%", "13%", "15%"]} rows={visibleAlerts} emptyText="当前项目暂无超期预警。" /></Panel>
      <Panel className="overview-map" title="园区风险分布" onMore={() => navigate("analytics", "已打开数据看板")}><ShandongMap /></Panel>
      <Panel className="overview-trend" title="安全帽在线趋势" onMore={() => navigate("devices", "已打开设备管理")}><LineCard data={helmetTrend} colors={["#2f80ed", "#94a3b8"]} keys={["在线数量", "离线数量"]} xKey="time" /></Panel>
      <Panel className="overview-trend" title="风险趋势" onMore={() => navigate("analytics", "已打开风险趋势")}><LineCard data={riskTrend} colors={["#ef4444", "#f97316", "#f6b500", "#18a863"]} keys={["高风险", "较高风险", "中风险", "低风险"]} xKey="day" /></Panel>
    </section>
  );
}

function EnterpriseArchivePage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string) => void }) {
  const [customerItems, setCustomerItems] = useState<Customer[]>(customers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("basic");
  const [status, setStatus] = useState("全部");
  const [risk, setRisk] = useState("全部");
  const [area, setArea] = useState("全部");
  const [contract, setContract] = useState("全部");
  const [startDate, setStartDate] = useState("2016-01-01");
  const [endDate, setEndDate] = useState("2026-06-05");
  const [pageSize, setPageSize] = useState("10条/页");
  const [pageNo, setPageNo] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "project" | "image" | "contract">(null);
  const [projectForm, setProjectForm] = useState({ name: "", type: "综合检查项目", risk: "中风险", owner: "" });
  const selected = selectedId ? customerItems.find((item) => item.id === selectedId) ?? null : null;

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return customerItems.filter((item) => {
      const matchesStatus = status === "全部" || item.contractStatus === status;
      const matchesRisk = risk === "全部" || item.risk === risk;
      const matchesArea = area === "全部" || item.area === area;
      const matchesContract = contract === "全部" || item.contractStatus === contract;
      const matchesKeyword = !keyword || `${item.name}${item.creditCode}${item.contact}${item.phone}`.toLowerCase().includes(keyword);
      const matchesStart = !startDate || item.founded >= startDate;
      const matchesEnd = !endDate || item.founded <= endDate;
      return matchesStatus && matchesRisk && matchesArea && matchesContract && matchesKeyword && matchesStart && matchesEnd;
    });
  }, [area, contract, customerItems, endDate, risk, search, startDate, status]);

  const pageSizeNumber = Number.parseInt(pageSize, 10) || 10;
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / pageSizeNumber));
  const currentPage = Math.min(pageNo, pageCount);
  const tableRows = filteredCustomers
    .slice((currentPage - 1) * pageSizeNumber, currentPage * pageSizeNumber)
    .map((item) => [item.id, item.name, item.type, item.area, item.risk, String(item.projects), item.contact, item.phone, item.contractStatus]);

  useEffect(() => {
    setPageNo(1);
  }, [status, risk, area, contract, startDate, endDate, search, pageSize]);

  const reset = () => {
    setStatus("全部");
    setRisk("全部");
    setArea("全部");
    setContract("全部");
    setStartDate("2016-01-01");
    setEndDate("2026-06-05");
    setSearch("");
    setToast("筛选条件已重置");
  };

  const exportCustomers = () => {
    const headers = ["编号", "企业名称", "客户类型", "所在地区", "风险等级", "项目数量", "安全联系人", "联系电话", "服务合同状态"];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...filteredCustomers.map((item) => [item.id, item.name, item.type, item.area, item.risk, String(item.projects), item.contact, item.phone, item.contractStatus])]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "企业档案.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(`已导出 ${filteredCustomers.length} 条企业档案`);
  };

  const importEnterprise = () => {
    const imported: Customer = {
      id: `CU${Date.now().toString().slice(-8)}`,
      name: "泰山能源储运有限公司",
      type: "仓储物流",
      area: "山东省济南市",
      risk: "中风险",
      projects: 2,
      contact: "周航",
      phone: "151****6021",
      contractStatus: "有效",
      creditCode: "91370100MA4IMPORT",
      address: "山东省济南市历城区港兴路66号",
      founded: "2024-11-20",
      scale: "300-500人",
      email: "zhouhang@taishanlogistics.com",
      tags: ["仓储物流", "临时用电"]
    };
    setCustomerItems((items) => [imported, ...items]);
    setSelectedId(imported.id);
    setDetailOpen(true);
    setDetailTab("basic");
    setToast("已导入企业：泰山能源储运有限公司");
  };

  const submitProject = () => {
    const targetId = selectedId ?? filteredCustomers[0]?.id ?? customerItems[0]?.id;
    if (!targetId || !projectForm.name.trim()) {
      setToast("请先填写项目名称");
      return;
    }
    setCustomerItems((items) => items.map((item) => item.id === targetId ? { ...item, projects: item.projects + 1, risk: projectForm.risk } : item));
    setSelectedId(targetId);
    setDetailOpen(true);
    setDetailTab("projects");
    setModal(null);
    setProjectForm({ name: "", type: "综合检查项目", risk: "中风险", owner: "" });
    setToast(`已新增项目：${projectForm.name}`);
  };

  const addTag = () => {
    if (!selected) return;
    const tag = `新增标签${selected.tags.length + 1}`;
    setCustomerItems((items) => items.map((item) => item.id === selected.id ? { ...item, tags: [...item.tags, tag] } : item));
    setToast(`已为${selected.name}添加标签：${tag}`);
  };

  return (
    <section className={`archive-page ${detailOpen && selected ? "detail-open" : ""}`}>
      <div className="archive-main">
        <div className="archive-title-row">
          <strong>企业档案</strong>
          <button className="secondary-btn" onClick={() => navigate("projects", "已进入项目管理")}>进入项目管理</button>
        </div>
        <div className="archive-filter">
          <SelectBox label="客户状态" value={status} options={["全部", "有效", "即将到期", "停用"].map(toOption)} onChange={setStatus} />
          <SelectBox label="风险等级" value={risk} options={["全部", "高风险", "中风险", "低风险"].map(toOption)} onChange={setRisk} />
          <SelectBox label="所在地区" value={area} options={["全部", "山东省济南市", "山东省青岛市", "山东省烟台市"].map(toOption)} onChange={setArea} />
          <label className="search-field"><Search size={16} /><input value={search} placeholder="请输入企业名称/统一社会信用代码" onChange={(event) => setSearch(event.target.value)} /></label>
          <SelectBox label="服务合同状态" value={contract} options={["全部", "有效", "即将到期", "已过期"].map(toOption)} onChange={setContract} />
          <label className="date-range">
            <span>创建时间</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <i>→</i>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button className="secondary-btn" onClick={reset}>重置</button>
          <button className="primary-btn" onClick={() => setToast(`已查询到 ${filteredCustomers.length} 条企业档案`)}>查询</button>
        </div>
        <div className="table-toolbar">
          <button className="primary-btn" onClick={() => setModal("project")}>新增项目</button>
          <button className="secondary-btn" onClick={importEnterprise}>导入企业</button>
          <button className="secondary-btn" onClick={exportCustomers}>导出 <ChevronDown size={14} /></button>
        </div>
        <div className="archive-table-card">
          <DataTable
            headers={["编号", "企业名称", "客户类型", "所在地区", "风险等级", "项目数量", "安全联系人", "联系电话", "服务合同状态"]}
            rows={tableRows}
            selectedKey={selected?.id}
            onRowClick={(row) => {
              setSelectedId(row[0]);
              setDetailOpen(true);
              setDetailTab("basic");
              setToast(`已打开${row[1]}详情`);
            }}
          />
        </div>
        <div className="pagination-row">
          <span>共 {filteredCustomers.length} 条</span>
          <SelectBox label="分页" value={pageSize} options={["10条/页", "20条/页", "50条/页"].map(toOption)} onChange={setPageSize} compact />
          <button onClick={() => setPageNo(Math.max(1, currentPage - 1))}>{"<"}</button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 7).map((item) => <button key={item} className={item === currentPage ? "active" : ""} onClick={() => { setPageNo(item); setToast(`已切换到第 ${item} 页`); }}>{item}</button>)}
          <button onClick={() => setPageNo(Math.min(pageCount, currentPage + 1))}>{">"}</button>
          <span>前往</span>
          <input value={currentPage} onChange={(event) => setPageNo(Math.min(pageCount, Math.max(1, Number(event.target.value) || 1)))} />
          <span>页</span>
        </div>
      </div>
      {detailOpen && selected && <CustomerDetail customer={selected} tab={detailTab} setTab={setDetailTab} close={() => setDetailOpen(false)} setToast={setToast} onAddTag={addTag} openImage={() => setModal("image")} openContract={() => setModal("contract")} />}
      {modal === "project" && (
        <ActionModal title="新增项目" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={submitProject}>保存项目</button></>}>
          <div className="modal-form">
            <label><span>项目名称</span><input value={projectForm.name} placeholder="请输入项目名称" onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} /></label>
            <label><span>项目类型</span><select value={projectForm.type} onChange={(event) => setProjectForm({ ...projectForm, type: event.target.value })}><option>综合检查项目</option><option>消防设施检查</option><option>用电安全检查</option><option>隐患整改复核</option></select></label>
            <label><span>风险等级</span><select value={projectForm.risk} onChange={(event) => setProjectForm({ ...projectForm, risk: event.target.value })}><option>高风险</option><option>中风险</option><option>低风险</option></select></label>
            <label><span>负责人</span><input value={projectForm.owner} placeholder="请输入负责人" onChange={(event) => setProjectForm({ ...projectForm, owner: event.target.value })} /></label>
            <p className="modal-note">保存后会把项目数量计入当前选中的企业；未选企业时，计入当前列表第一家企业。</p>
          </div>
        </ActionModal>
      )}
      {modal === "image" && selected && (
        <ActionModal title={`${selected.name} 建筑大图`} onClose={() => setModal(null)}>
          <div className="large-building-preview"><div className="building-photo"><div className="building-sky" /><div className="building-tower one" /><div className="building-tower two" /><div className="building-ground" /></div></div>
        </ActionModal>
      )}
      {modal === "contract" && selected && (
        <ActionModal title={`${selected.name} 合同详情`} onClose={() => setModal(null)}>
          <div className="contract-detail-card">
            <p><span>合同编号：</span><b>HT20250108002</b></p>
            <p><span>合同类型：</span><b>年度安全托管服务</b></p>
            <p><span>合同金额：</span><b>¥120,000.00</b></p>
            <p><span>服务范围：</span><b>消防设施巡检、用电安全检查、隐患闭环复核</b></p>
            <p><span>有效期：</span><b>2025-01-08 至 2026-01-07</b></p>
            <p><span>合同状态：</span><b>{selected.contractStatus}</b></p>
          </div>
        </ActionModal>
      )}
    </section>
  );
}

function CustomerDetail({ customer, tab, setTab, close, setToast, onAddTag, openImage, openContract }: { customer: Customer; tab: DetailTab; setTab: (tab: DetailTab) => void; close: () => void; setToast: (message: string) => void; onAddTag: () => void; openImage: () => void; openContract: () => void }) {
  const detailTabs: { key: DetailTab; label: string }[] = [
    { key: "basic", label: "基本信息" },
    { key: "projects", label: `项目信息 (${customer.projects})` },
    { key: "contracts", label: "服务合同 (2)" },
    { key: "attachments", label: "附件 (12)" }
  ];

  return (
    <aside className="archive-detail">
      <header>
        <h2>{customer.name}</h2>
        <button onClick={close}>×</button>
      </header>
      <div className="detail-tabs">
        {detailTabs.map((item) => (
          <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => { setTab(item.key); setToast(`已切换到${item.label}`); }}>{item.label}</button>
        ))}
      </div>
      {tab === "basic" && <CustomerBasic customer={customer} setToast={setToast} onAddTag={onAddTag} openImage={openImage} openContract={openContract} />}
      {tab === "projects" && <DetailSimpleTable title="项目信息" headers={["项目名称", "类型", "风险", "覆盖率", "状态"]} rows={projectRows.slice(0, Math.min(customer.projects, 5)).map((row) => [row[1], row[2], row[4], row[5], row[6]])} />}
      {tab === "contracts" && <DetailSimpleTable title="服务合同" headers={["合同编号", "合同类型", "金额", "有效期", "状态"]} rows={[["HT20250108002", "年度安全托管", "¥120,000.00", "2025-01-08 至 2026-01-07", "有效"], ["HT20240312006", "专项检查服务", "¥36,000.00", "2024-03-12 至 2025-03-11", "已归档"]]} />}
      {tab === "attachments" && <AttachmentList setToast={setToast} />}
    </aside>
  );
}

function CustomerBasic({ customer, setToast, onAddTag, openImage, openContract }: { customer: Customer; setToast: (message: string) => void; onAddTag: () => void; openImage: () => void; openContract: () => void }) {
  const [expandedHistory, setExpandedHistory] = useState(false);
  const historyRows = [
    ["RW20250516008", "消防检查", "2025-05-16 10:20", customer.risk, "5", "张三", "查看报告"],
    ["RW20250502005", "用电检查", "2025-05-02 14:30", "低风险", "2", "李四", "查看报告"],
    ["RW20250415004", "综合检查", "2025-04-15 09:10", "中风险", "7", "王五", "查看报告"],
    ["RW20250326011", "夜间巡检", "2025-03-26 20:10", "中风险", "4", "赵六", "查看报告"],
    ["RW20250218009", "专项复查", "2025-02-18 15:40", "低风险", "1", "孙七", "查看报告"]
  ];

  return (
    <>
      <div className="detail-basic">
        <div className="kv-list">
          <span>客户类型：</span><b>{customer.type}</b>
          <span>统一社会信用代码：</span><b>{customer.creditCode}</b>
          <span>所在地区：</span><b>{customer.address}</b>
          <span>成立日期：</span><b>{customer.founded}</b>
          <span>企业规模：</span><b>{customer.scale}</b>
          <span>备注信息：</span><b>-</b>
        </div>
        <div className="building-photo">
          <div className="building-sky" />
          <div className="building-tower one" />
          <div className="building-tower two" />
          <div className="building-ground" />
          <button onClick={openImage}>查看大图</button>
        </div>
      </div>
      <div className="detail-grid">
        <section>
          <h3>安全联系人</h3>
          <p>联系人：{customer.contact}</p>
          <p>职务：安全主管</p>
          <p>联系电话：{customer.phone}</p>
          <p>邮箱：{customer.email}</p>
        </section>
        <section>
          <h3>风险标签</h3>
          <div className="tag-cloud">
            {customer.tags.map((tag) => <span key={tag}>{tag}</span>)}
            <button onClick={onAddTag}>+ 添加标签</button>
          </div>
        </section>
        <section>
          <h3>建筑楼层</h3>
          <MiniParkMap />
        </section>
        <section>
          <h3>服务合同</h3>
          <div className="kv-list compact">
            <span>合同编号：</span><b>HT20250108002</b>
            <span>合同金额：</span><b>¥120,000.00</b>
            <span>签订日期：</span><b>2025-01-08</b>
            <span>有效期至：</span><b>2026-01-07</b>
            <span>合同状态：</span><b><Badge label={customer.contractStatus} /></b>
          </div>
          <button className="text-link" onClick={openContract}>查看合同详情</button>
        </section>
      </div>
      <section className="history-card">
        <h3>历史检查</h3>
        <DataTable headers={["检查编号", "检查类型", "检查时间", "风险等级", "隐患数量", "检查人", "操作"]} rows={expandedHistory ? historyRows : historyRows.slice(0, 3)} onRowClick={(row) => setToast(`已打开${row[0]}报告`)} />
        <button className="text-link" onClick={() => { setExpandedHistory((value) => !value); setToast(expandedHistory ? "已收起历史记录" : `已加载${customer.name}更多历史记录`); }}>{expandedHistory ? "收起记录" : "更多记录 >"}</button>
      </section>
    </>
  );
}

function ActionModal({ title, children, footer, onClose }: { title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

function MediaPreviewModal({ preview, onClose }: { preview: MediaPreview | null; onClose: () => void }) {
  if (!preview) return null;
  return (
    <ActionModal title={preview.title} onClose={onClose}>
      <div className={`media-preview ${preview.type}`}>
        {preview.type === "image" && <img src={preview.src} alt={preview.title} />}
        {preview.type === "video" && <video src={preview.src} controls autoPlay />}
        {preview.type === "audio" && (
          <div className="media-audio-preview">
            <audio src={preview.src} controls autoPlay />
            {preview.transcript && <p>{preview.transcript}</p>}
          </div>
        )}
      </div>
    </ActionModal>
  );
}

function downloadAsset(src: string, filename: string) {
  const link = document.createElement("a");
  link.href = src;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DetailSimpleTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <section className="detail-tab-panel">
      <h3>{title}</h3>
      <DataTable headers={headers} rows={rows} />
    </section>
  );
}

function AttachmentList({ setToast }: { setToast: (message: string) => void }) {
  const rows = [
    ["企业营业执照.pdf", "基础档案", "2025-01-08", "已归档"],
    ["消防验收资料.zip", "消防资料", "2025-01-10", "已归档"],
    ["配电室照片包.zip", "现场照片", "2025-05-16", "待复核"],
    ["安全检查报告.docx", "检查报告", "2025-05-16", "已生成"]
  ];
  return (
    <section className="detail-tab-panel">
      <h3>附件资料</h3>
      <DataTable headers={["文件名称", "分类", "上传时间", "状态"]} rows={rows} onRowClick={(row) => setToast(`已预览附件：${row[0]}`)} />
    </section>
  );
}

function ProjectMapPage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string) => void }) {
  const [type, setType] = useState("全部");
  const [risk, setRisk] = useState("全部");
  const [status, setStatus] = useState("全部");
  const [region, setRegion] = useState("山东省");
  const [mapLevel, setMapLevel] = useState("山东省");
  return (
    <section className="project-page">
      <div className="project-filter">
        <SelectBox label="项目类型" value={type} options={["全部", "科技园区", "数据中心", "商业综合体", "工业园区", "仓储物流"].map(toOption)} onChange={setType} />
        <SelectBox label="风险等级" value={risk} options={["全部", "高风险", "较高风险", "中风险", "低风险"].map(toOption)} onChange={setRisk} />
        <SelectBox label="项目状态" value={status} options={["全部", "进行中", "待复查", "重点督办"].map(toOption)} onChange={setStatus} />
        <SelectBox label="所在区域" value={region} options={["山东省", "济南市", "青岛市", "烟台市", "临沂市"].map(toOption)} onChange={setRegion} />
        <button className="primary-btn" onClick={() => setToast(`已查询项目：${type} / ${risk} / ${region}`)}>查询</button>
        <button className="secondary-btn" onClick={() => navigate("customers", "已返回企业档案")}>返回客户档案</button>
      </div>
      <div className="project-layout">
        <div className="project-list">
          <div className="table-toolbar">
            <button className="primary-btn" onClick={() => setToast("已打开新增项目窗口")}>新增项目</button>
            <button className="secondary-btn" onClick={() => setToast("已批量派发检查任务")}>批量派单</button>
            <button className="secondary-btn" onClick={() => setToast("已导出项目清单")}>导出清单</button>
          </div>
          <DataTable headers={["项目编号", "项目名称", "项目类型", "所在地区", "风险等级", "检查覆盖率", "状态"]} rows={projectRows} />
        </div>
        <aside className="project-map-panel">
          <header><h2>项目地图</h2><SelectBox label="地图层级" value={mapLevel} options={["山东省", "济南市", "青岛市"].map(toOption)} onChange={(value) => { setMapLevel(value); setRegion(value); setToast(`已切换地图层级：${value}`); }} compact /></header>
          <div className="project-map">
            <ShandongMap />
            {[
              { name: "国控大厦", left: 34, top: 47, level: "orange" },
              { name: "大数据中心", left: 39, top: 42, level: "red" },
              { name: "青岛产业园", left: 70, top: 50, level: "green" },
              { name: "高新智造园", left: 45, top: 58, level: "yellow" }
            ].map((pin) => (
              <button key={pin.name} className={`project-pin ${pin.level}`} style={{ left: `${pin.left}%`, top: `${pin.top}%` }} onClick={() => setToast(`已选中${pin.name}`)}><MapPin size={15} />{pin.name}</button>
            ))}
          </div>
          <div className="project-summary"><MiniStat label="项目总数" value="86" /><MiniStat label="高风险" value="12" /><MiniStat label="待复查" value="18" /></div>
          <section className="selected-project"><h3>山东国控大数据中心</h3><p>数据中心 / 济南市高新区 / 高风险</p><div className="progress-line"><i style={{ width: "76%" }} /></div><button className="text-link" onClick={() => setToast("已进入项目详情")}>查看项目详情</button></section>
        </aside>
      </div>
    </section>
  );
}

function InspectionTasksPage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string) => void }) {
  const [tasks, setTasks] = useState<InspectionTask[]>(inspectionTaskSeed);
  const [selectedId, setSelectedId] = useState(inspectionTaskSeed[0].id);
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [projectFilter, setProjectFilter] = useState("全部项目");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"new" | "dispatch" | null>(null);
  const [draft, setDraft] = useState<InspectionTask>({
    id: "",
    name: "新增用电安全检查",
    type: "用电安全检查",
    project: "齐鲁科技园",
    inspector: "张三",
    plannedDate: "2025-05-16",
    plannedTime: "15:00",
    status: "待派发",
    priority: "中",
    device: "未绑定",
    template: "用电安全检查模板 V2.3",
    description: "按模板核查现场消防与用电安全情况，并自动归档证据。"
  });
  const selectedTask = tasks.find((task) => task.id === selectedId) ?? tasks[0];
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const keyword = query.trim();
    return (statusFilter === "全部状态" || task.status === statusFilter)
      && (typeFilter === "全部类型" || task.type === typeFilter)
      && (projectFilter === "全部项目" || task.project === projectFilter)
      && (!keyword || `${task.id}${task.name}${task.project}${task.inspector}`.includes(keyword));
  }), [projectFilter, query, statusFilter, tasks, typeFilter]);
  const updateTask = (id: string, patch: Partial<InspectionTask>, message: string) => {
    setTasks((items) => items.map((task) => task.id === id ? { ...task, ...patch } : task));
    setToast(message);
  };
  const addTask = () => {
    const id = `RW${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(tasks.length + 1).padStart(3, "0")}`;
    const nextTask = { ...draft, id };
    setTasks((items) => [nextTask, ...items]);
    setSelectedId(id);
    setModal(null);
    setToast("检查任务已新增并进入待派发队列");
  };
  const exportTasks = () => {
    const rows = [["任务编号", "任务名称", "检查类型", "项目", "检查人员", "计划时间", "状态"], ...filteredTasks.map((task) => [task.id, task.name, task.type, task.project, task.inspector, `${task.plannedDate} ${task.plannedTime}`, task.status])];
    downloadText("检查任务清单.csv", `\uFEFF${rows.map((row) => row.join(",")).join("\n")}`, "text/csv;charset=utf-8");
    setToast("检查任务清单已导出");
  };
  return (
    <section className="ops-module-page tasks-module-page">
      <div className="module-header-card">
        <div><h2>检查任务模块</h2><p>承接任务计划、派发、现场执行和报告流转，本地任务派发模块已接入。</p></div>
        <div className="module-actions"><button className="primary-btn" onClick={() => setModal("new")}>新增任务</button><button className="secondary-btn" onClick={exportTasks}><Download size={16} />导出清单</button></div>
      </div>
      <div className="module-filter-card">
        <SelectBox label="任务状态" value={statusFilter} options={["全部状态", "待派发", "待执行", "执行中", "待复查", "已完成"].map(toOption)} onChange={setStatusFilter} />
        <SelectBox label="检查类型" value={typeFilter} options={["全部类型", "用电安全检查", "消防安全检查", "复查验收", "动火临电"].map(toOption)} onChange={setTypeFilter} />
        <SelectBox label="所属项目" value={projectFilter} options={["全部项目", "齐鲁科技园", "国控大厦项目", "鲁商广场", "高新智造产业园"].map(toOption)} onChange={setProjectFilter} />
        <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="任务编号/名称/人员" /></label>
        <button className="primary-btn" onClick={() => setToast(`已查询到 ${filteredTasks.length} 条任务`)}>查询</button>
        <button className="secondary-btn" onClick={() => { setStatusFilter("全部状态"); setTypeFilter("全部类型"); setProjectFilter("全部项目"); setQuery(""); setToast("任务筛选条件已重置"); }}>重置</button>
      </div>
      <div className="module-split-layout">
        <section className="module-list-card">
          <DataTable headers={["任务编号", "任务名称", "检查类型", "所属项目", "检查人员", "计划时间", "状态"]} rows={filteredTasks.map((task) => [task.id, task.name, task.type, task.project, task.inspector, `${task.plannedDate} ${task.plannedTime}`, task.status])} selectedKey={selectedId} onRowClick={(row) => setSelectedId(row[0])} />
        </section>
        <aside className="module-detail-card">
          <header><h3>{selectedTask.name}</h3><Badge label={selectedTask.status} /></header>
          <dl className="detail-pairs">
            <dt>任务编号</dt><dd>{selectedTask.id}</dd>
            <dt>检查类型</dt><dd>{selectedTask.type}</dd>
            <dt>所属项目</dt><dd>{selectedTask.project}</dd>
            <dt>检查人员</dt><dd>{selectedTask.inspector}</dd>
            <dt>计划时间</dt><dd>{selectedTask.plannedDate} {selectedTask.plannedTime}</dd>
            <dt>绑定设备</dt><dd>{selectedTask.device}</dd>
            <dt>检查模板</dt><dd>{selectedTask.template}</dd>
            <dt>任务描述</dt><dd>{selectedTask.description}</dd>
          </dl>
          <div className="task-checklist">
            {["配电箱闭锁", "线缆绝缘", "消防通道", "警示标识", "现场取证"].map((item, index) => <label key={item}><input type="checkbox" defaultChecked={index < 2} />{item}</label>)}
          </div>
          <footer>
            <button className="primary-btn" onClick={() => setModal("dispatch")}>派发任务</button>
            <button className="secondary-btn" onClick={() => updateTask(selectedTask.id, { device: selectedTask.device === "未绑定" ? "aa的智能安全帽" : "bb的智能安全帽" }, "已重新绑定安全帽")}>绑定安全帽</button>
            <button className="secondary-btn" onClick={() => navigate("helmet", "正在打开安全帽现场端")}>查看现场</button>
            <button className="secondary-btn" onClick={() => navigate("reports", "已进入报告中心")}>生成报告</button>
          </footer>
        </aside>
      </div>
      {modal === "new" && (
        <ActionModal title="新增检查任务" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={addTask}>保存任务</button></>}>
          <div className="module-form-grid">
            <label><span>任务名称</span><input value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} /></label>
            <label><span>检查日期</span><input type="date" value={draft.plannedDate} onChange={(event) => setDraft((value) => ({ ...value, plannedDate: event.target.value }))} /></label>
            <label><span>检查时间</span><input type="time" value={draft.plannedTime} onChange={(event) => setDraft((value) => ({ ...value, plannedTime: event.target.value }))} /></label>
            <SelectBox label="检查类型" value={draft.type} options={["用电安全检查", "消防安全检查", "复查验收", "动火临电"].map(toOption)} onChange={(type) => setDraft((value) => ({ ...value, type }))} />
            <SelectBox label="所属项目" value={draft.project} options={["齐鲁科技园", "国控大厦项目", "鲁商广场", "高新智造产业园"].map(toOption)} onChange={(project) => setDraft((value) => ({ ...value, project }))} />
            <SelectBox label="检查人员" value={draft.inspector} options={["张三", "李四", "王五", "赵六"].map(toOption)} onChange={(inspector) => setDraft((value) => ({ ...value, inspector }))} />
            <label className="wide"><span>任务描述</span><textarea value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} /></label>
          </div>
        </ActionModal>
      )}
      {modal === "dispatch" && (
        <ActionModal title="派发检查任务" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { updateTask(selectedTask.id, { status: "待执行", device: selectedTask.device === "未绑定" ? "aa的智能安全帽" : selectedTask.device }, "任务已派发至安全帽现场端"); setModal(null); }}>确认派发</button></>}>
          <div className="dispatch-confirm">
            <p>任务将派发给 <b>{selectedTask.inspector}</b>，绑定设备 <b>{selectedTask.device === "未绑定" ? "aa的智能安全帽" : selectedTask.device}</b>。</p>
            <p>派发后可在安全帽现场端查看第一视角视频和现场证据。</p>
          </div>
        </ActionModal>
      )}
    </section>
  );
}

function HazardClosurePage({ view, setView, setToast }: { view: HazardView; setView: (view: HazardView) => void; setToast: (message: string) => void }) {
  return (
    <section className="hazard-page">
      {view === "registration" && <MultiHazardRegistrationPage setView={setView} setToast={setToast} />}
      {view === "rectification" && <MultiHazardRectifyPage setToast={setToast} />}
      {view === "statistics" && <MultiHazardDashboardPage setView={setView} setToast={setToast} />}
      {view === "overdue" && <MultiHazardOverduePage setToast={setToast} />}
    </section>
  );
}

function MultiHazardRegistrationPage({ setView, setToast }: { setView: (view: HazardView) => void; setToast: (message: string) => void }) {
  const [project, setProject] = useState("全部项目");
  const [task, setTask] = useState("全部任务");
  const [inspector, setInspector] = useState("全部人员");
  const [source, setSource] = useState("全部来源");
  const [status, setStatus] = useState("全部状态");
  const [checkDate, setCheckDate] = useState("2025-05-16");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(hazardClueSeed[0].id);
  const [evidenceTab, setEvidenceTab] = useState("图片取证");
  const [records, setRecords] = useState(hazardLedgerSeed.slice(0, 8));
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const selected = hazardClueSeed.find((item) => item.id === selectedId) ?? hazardClueSeed[0];
  const [tags, setTags] = useState(selected.tags);
  const [risk, setRisk] = useState(selected.risk);
  const [category, setCategory] = useState("用电安全 / 配电箱及线路");
  const [unit, setUnit] = useState("山东国控大数据中心");
  const [dept, setDept] = useState("运维部");
  const [person, setPerson] = useState("张三");
  const [deadline, setDeadline] = useState("2025-05-23");
  const [description, setDescription] = useState(selected.description);
  const [measure, setMeasure] = useState("");

  useEffect(() => {
    setTags(selected.tags);
    setRisk(selected.risk);
    setDescription(selected.description);
    setMeasure("");
  }, [selected.id]);

  const filteredClues = hazardClueSeed.filter((item) => {
    const text = `${item.id}${item.taskName}${item.project}${item.location}${item.tags.join("")}`;
    return (project === "全部项目" || item.project === project)
      && (task === "全部任务" || item.taskName === task)
      && (inspector === "全部人员" || item.inspector === inspector)
      && (source === "全部来源" || item.sourceDevice === source)
      && (status === "全部状态" || item.status === status)
      && (!checkDate || item.checkDate === checkDate)
      && (!keyword.trim() || text.includes(keyword.trim()));
  });
  const makeRecord = (recordStatus: string): HazardLedger => ({
    id: `HZ${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${String(records.length + 11).padStart(3, "0")}`,
    title: (description.trim() || selected.description).slice(0, 28),
    project: selected.project,
    taskName: selected.taskName,
    category,
    risk,
    unit,
    person,
    deadline,
    status: recordStatus,
    foundTime: `${selected.checkDate} ${selected.foundTime}`,
    overdueDays: 0,
    source: selected.sourceDevice,
    measure: measure.trim() || selected.aiAdvice
  });
  const saveDraft = () => {
    const row = makeRecord("待提交");
    setRecords((items) => [row, ...items]);
    setToast("草稿已保存并写入待提交列表");
  };
  const submit = (next = false) => {
    if (!tags.length || !description.trim() || !measure.trim()) {
      setToast("请补充疑似隐患、隐患描述和整改措施");
      return;
    }
    const row = makeRecord("已登记");
    setRecords((items) => [row, ...items]);
    setToast(next ? "已提交当前隐患，自动切换到下一条线索" : "隐患已提交并写入登记列表");
    if (next) {
      const index = filteredClues.findIndex((item) => item.id === selected.id);
      const nextItem = filteredClues[index + 1] ?? filteredClues[0];
      if (nextItem) setSelectedId(nextItem.id);
    }
  };
  const evidenceImages = [demoMedia.images.electricalPanelOpen, demoMedia.images.cableExposed, demoMedia.images.fireCorridorBlocked, demoMedia.images.extinguisherLowPressure];
  return (
    <div className="multi-hazard-page">
      <div className="multi-filter-card">
        <SelectBox label="项目" value={project} options={["全部项目", ...Array.from(new Set(hazardClueSeed.map((item) => item.project)))].map(toOption)} onChange={setProject} />
        <SelectBox label="任务名称" value={task} options={["全部任务", ...Array.from(new Set(hazardClueSeed.map((item) => item.taskName)))].map(toOption)} onChange={setTask} />
        <SelectBox label="检查人员" value={inspector} options={["全部人员", "张三", "李四", "王五", "赵六"].map(toOption)} onChange={setInspector} />
        <SelectBox label="来源设备" value={source} options={["全部来源", "aa的智能安全帽", "bb的智能安全帽", "手机端", "专家补录"].map(toOption)} onChange={setSource} />
        <SelectBox label="隐患状态" value={status} options={["全部状态", "待登记", "已登记", "待提交", "已提交"].map(toOption)} onChange={setStatus} />
        <label className="date-box"><span>检查时间</span><input type="date" value={checkDate} onChange={(event) => setCheckDate(event.target.value)} /></label>
        <label className="search-box"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="关键字搜索" /></label>
        <button className="primary-btn" onClick={() => setToast(`已查询到 ${filteredClues.length} 条线索`)}>查询</button>
        <button className="secondary-btn" onClick={() => { setProject("全部项目"); setTask("全部任务"); setInspector("全部人员"); setSource("全部来源"); setStatus("全部状态"); setCheckDate("2025-05-16"); setKeyword(""); setToast("筛选条件已重置"); }}>重置</button>
        <button className="primary-btn" onClick={() => { setTags([""]); setDescription(""); setMeasure(""); setRisk("中风险"); setToast("已创建空白登记表"); }}>新建登记</button>
      </div>
      <div className="register-three-column">
        <section className="multi-card clue-list-card">
          <header><h3>待登记线索列表</h3><span>共 {filteredClues.length} 条</span></header>
          {filteredClues.map((item) => (
            <button key={item.id} className={item.id === selected.id ? "active" : ""} onClick={() => { setSelectedId(item.id); setToast(`已选择线索：${item.id}`); }}>
              <span className="clue-card-main"><b>{item.id}</b><strong>{item.tags.join("、")}</strong></span>
              <span className="clue-card-meta"><span>{item.taskName}</span><small>{item.foundTime} · {item.location}</small></span>
              <Badge label={item.risk} />
            </button>
          ))}
        </section>
        <section className="multi-card evidence-center-card">
          <header><h3>现场证据</h3><button className="text-link" onClick={() => { downloadText(`${selected.id}证据材料清单.txt`, `线索：${selected.id}\n证据：图片、视频、语音、位置轨迹`); setToast("证据材料已打包下载"); }}>全部下载</button></header>
          <div className="evidence-tab-row small">{["图片取证", "视频关键帧", "语音记录", "位置轨迹"].map((tab) => <button key={tab} className={evidenceTab === tab ? "active" : ""} onClick={() => setEvidenceTab(tab)}>{tab}</button>)}</div>
          {evidenceTab === "图片取证" && <div className="multi-evidence-grid">{evidenceImages.map((src, index) => <button key={src} onClick={() => setPreview({ title: `${selected.id} 图片证据 ${index + 1}`, type: "image", src })}><img src={src} alt="现场证据" /><span>{selected.tags[index % selected.tags.length]}</span></button>)}</div>}
          {evidenceTab === "视频关键帧" && <div className="multi-video-grid">{[demoMedia.videos.helmetLive, demoMedia.videos.fireCorridor].map((src, index) => <button key={src} onClick={() => setPreview({ title: `关键帧视频 ${index + 1}`, type: "video", src })}><video src={src} muted /><PlayCircle size={34} /><span>{index === 0 ? "10:31:02" : "10:31:28"}</span></button>)}</div>}
          {evidenceTab === "语音记录" && <div className="multi-voice-list">{[demoMedia.audio.hazardDescription, demoMedia.audio.patrolNote].map((src, index) => <button key={src} onClick={() => setPreview({ title: `语音记录 ${index + 1}`, type: "audio", src, transcript: index === 0 ? demoMedia.transcripts.hazardDescription : demoMedia.transcripts.patrolNote })}><PlayCircle size={22} /><b>{index === 0 ? "现场描述录音" : "巡检补充说明"}</b><span>{index === 0 ? "00:38" : "00:24"}</span><small>{index === 0 ? demoMedia.transcripts.hazardDescription : demoMedia.transcripts.patrolNote}</small></button>)}</div>}
          {evidenceTab === "位置轨迹" && <div className="multi-track-panel"><img src={demoMedia.images.locationTrajectoryMap} alt="位置轨迹" /><div className="track-points">{["起点", "配电室入口", "配电箱区域", "通道区域", "终点"].map((point, index) => <button key={point} onClick={() => setPreview({ title: `${point}轨迹回放`, type: "video", src: demoMedia.videos.locationReplay })}><b>{index + 1}</b><span>{point}</span></button>)}</div></div>}
          <section className="compact-timeline"><h3>证据时间线</h3>{["图片取证 10:31:02", "视频关键帧 10:31:28", "语音记录 10:31:45", "位置轨迹 10:32:10"].map((item) => <button key={item} onClick={() => { setEvidenceTab(item.split(" ")[0]); setToast(`已定位${item}`); }}>{item}<span>{selected.location}</span></button>)}</section>
        </section>
        <aside className="multi-card hazard-register-form">
          <header><h3>隐患登记信息</h3><button className="text-link" onClick={() => setTaskOpen(true)}>查看任务详情</button></header>
          <label><span>疑似隐患</span><div className="editable-tags">{tags.map((tag, index) => <input key={`${selected.id}-${index}`} value={tag} onChange={(event) => setTags((items) => items.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />)}<button onClick={() => setTags((items) => [...items, `补充隐患${items.length + 1}`])}>+ 添加</button></div></label>
          <SelectBox label="隐患分类" value={category} options={["用电安全 / 配电箱及线路", "消防安全 / 疏散通道", "消防设施 / 灭火器", "动火作业 / 临时用电"].map(toOption)} onChange={setCategory} />
          <SelectBox label="风险等级" value={risk} options={["低风险", "中风险", "高风险", "重大隐患"].map(toOption)} onChange={setRisk} />
          <SelectBox label="责任单位" value={unit} options={["山东国控大数据中心", "齐鲁科技园物业", "鲁商广场运营部", "施工单位"].map(toOption)} onChange={setUnit} />
          <SelectBox label="责任部门" value={dept} options={["运维部", "工程部", "物业部", "安全管理部"].map(toOption)} onChange={setDept} />
          <SelectBox label="责任人" value={person} options={["张三", "李四", "王五", "赵六"].map(toOption)} onChange={setPerson} />
          <label><span>整改期限</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
          <label><span>隐患描述</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label><span>整改措施</span><textarea value={measure} onChange={(event) => setMeasure(event.target.value)} /></label>
          <section className="ai-suggestion-card"><header><h4>AI整改建议</h4><button onClick={() => { setMeasure(selected.aiAdvice); setToast("AI建议已引用到整改措施"); }}>引用建议</button></header><p>{selected.aiAdvice}</p></section>
          <footer><button className="secondary-btn" onClick={saveDraft}>保存草稿</button><button className="primary-btn" onClick={() => submit(false)}>提交隐患</button><button className="secondary-btn" onClick={() => submit(true)}>继续登记下一条</button></footer>
        </aside>
      </div>
      <section className="multi-card">
        <header><h3>本任务已登记隐患列表</h3><span>至少 8 条记录</span></header>
        <DataTable headers={["隐患编号", "任务名称", "隐患描述", "风险等级", "责任单位", "责任人", "整改期限", "状态", "操作"]} rows={records.map((item) => [item.id, item.taskName, item.title, item.risk, item.unit, item.person, item.deadline, item.status, "查看"])} onRowClick={(row) => { setToast(`已打开登记记录：${row[0]}`); setView("rectification"); }} />
      </section>
      {taskOpen && <ActionModal title="任务详情" onClose={() => setTaskOpen(false)}><div className="contract-detail-card"><p><span>任务名称：</span><b>{selected.taskName}</b></p><p><span>检查模板：</span><b>{selected.checkType}模板</b></p><p><span>执行人员：</span><b>{selected.inspector}</b></p><p><span>来源设备：</span><b>{selected.sourceDevice}</b></p></div></ActionModal>}
      <MediaPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function MultiHazardRectifyPage({ setToast }: { setToast: (message: string) => void }) {
  const [rows, setRows] = useState(hazardLedgerSeed);
  const [selectedId, setSelectedId] = useState(hazardLedgerSeed[0].id);
  const [activeTab, setActiveTab] = useState("整改信息");
  const [projectFilter, setProjectFilter] = useState("全部项目");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [riskFilter, setRiskFilter] = useState("全部等级");
  const [keyword, setKeyword] = useState("");
  const [recheckResult, setRecheckResult] = useState("通过");
  const [expertConclusion, setExpertConclusion] = useState("通过");
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [modal, setModal] = useState<"dispatch" | "recheck" | "expert" | "archive" | null>(null);
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const current = rows.find((item) => item.id === selectedId) ?? rows[0];
  const filteredRows = rows.filter((item) => (projectFilter === "全部项目" || item.project === projectFilter) && (statusFilter === "全部状态" || item.status === statusFilter) && (riskFilter === "全部等级" || item.risk === riskFilter) && (!keyword.trim() || `${item.id}${item.title}${item.project}${item.person}`.includes(keyword.trim())));
  const steps = ["隐患登记", "整改派发", "整改完成", "整改复查", "企业确认", "专家复核", "销号归档"];
  const stepIndex = Math.max(1, ["待整改", "整改中", "待复查", "企业确认", "专家复核", "已销号"].indexOf(current.status) + 1);
  const updateCurrent = (patch: Partial<HazardLedger>, message: string) => {
    setRows((items) => items.map((item) => item.id === current.id ? { ...item, ...patch } : item));
    setToast(message);
  };
  const actionButtons = [
    ...(activeTab === "整改信息" && current.status === "待整改" ? [["派发整改", () => setModal("dispatch")] as const] : []),
    ...(activeTab === "整改照片" && current.status === "整改中" ? [["上传整改照片", () => { setExtraPhotos((items) => [...items, demoMedia.images.rectificationAfter]); setToast("整改照片已加入当前隐患"); }] as const] : []),
    ...(activeTab === "整改照片" && current.status === "整改中" ? [["提交整改完成", () => updateCurrent({ status: "待复查" }, "整改完成，已进入待复查")] as const] : []),
    ...(activeTab === "复查验收" && current.status === "待复查" ? [["提交复查结果", () => setModal("recheck")] as const] : []),
    ...(activeTab === "企业确认" && current.status === "企业确认" ? [["企业确认", () => updateCurrent({ status: "专家复核" }, "企业已确认，进入专家复核")] as const] : []),
    ...(activeTab === "专家复核" && current.status === "专家复核" ? [["提交专家复核", () => setModal("expert")] as const] : []),
    ...(activeTab === "销号归档" && current.status !== "已销号" ? [["销号归档", () => setModal("archive")] as const] : []),
    ...(activeTab === "销号归档" || activeTab === "整改信息" ? [["打印详情", () => { downloadText(`${current.id}详情.txt`, JSON.stringify(current, null, 2)); setToast("隐患详情已导出"); }] as const] : [])
  ];
  return (
    <div className="multi-hazard-page">
      <div className="multi-filter-card">
        <SelectBox label="项目" value={projectFilter} options={["全部项目", ...Array.from(new Set(rows.map((item) => item.project)))].map(toOption)} onChange={setProjectFilter} />
        <label className="search-box"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="隐患编号/任务名称/责任人" /></label>
        <SelectBox label="风险等级" value={riskFilter} options={["全部等级", "重大隐患", "高风险", "中风险", "低风险"].map(toOption)} onChange={setRiskFilter} />
        <SelectBox label="当前状态" value={statusFilter} options={["全部状态", "待整改", "整改中", "待复查", "企业确认", "专家复核", "已销号"].map(toOption)} onChange={setStatusFilter} />
        <label className="date-box"><span>发现开始</span><input type="date" defaultValue="2025-05-10" /></label>
        <label className="date-box"><span>整改期限</span><input type="date" defaultValue={current.deadline} /></label>
        <button className="primary-btn" onClick={() => setToast(`已查询到 ${filteredRows.length} 条整改隐患`)}>查询</button>
        <button className="secondary-btn" onClick={() => { setProjectFilter("全部项目"); setStatusFilter("全部状态"); setRiskFilter("全部等级"); setKeyword(""); setToast("整改筛选已重置"); }}>重置</button>
        <button className="secondary-btn" onClick={() => { downloadText("隐患整改清单.csv", `\uFEFF隐患编号,描述,项目,风险,状态\n${filteredRows.map((item) => [item.id, item.title, item.project, item.risk, item.status].join(",")).join("\n")}`, "text/csv;charset=utf-8"); setToast("整改清单已导出"); }}>导出</button>
      </div>
      <div className="rectify-multi-layout">
        <section className="multi-card rectify-ledger-list">
          <header><h3>待整改隐患列表</h3><span>共 {filteredRows.length} 条</span></header>
          {filteredRows.map((item) => <button key={item.id} className={item.id === current.id ? "active" : ""} onClick={() => { setSelectedId(item.id); setToast(`已选择隐患：${item.id}`); }}><b>{item.id}</b><strong>{item.title}</strong><span>{item.project} · {item.unit}</span><small>期限 {item.deadline} {item.overdueDays > 0 ? `· 超期${item.overdueDays}天` : ""}</small><Badge label={item.risk} /><Badge label={item.status} /></button>)}
        </section>
        <section className="multi-card rectify-process-card">
          <div className="flow-track archive">{steps.map((step, index) => <div key={step} className={index <= stepIndex ? "active" : ""}><i /><b>{step}</b><span>{index <= stepIndex ? "已处理" : "待处理"}</span></div>)}</div>
          <div className="rectify-tab-row small">{["整改信息", "整改照片", "复查验收", "企业确认", "专家复核", "销号归档"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
          {activeTab === "整改信息" && <div className="rectify-info-grid"><button className="rectify-photo" onClick={() => setPreview({ title: "整改前", type: "image", src: demoMedia.images.rectificationBefore })}><img src={demoMedia.images.rectificationBefore} alt="整改前" /><b>整改前</b></button><button className="rectify-photo after" onClick={() => setPreview({ title: "整改后", type: "image", src: demoMedia.images.rectificationAfter })}><img src={demoMedia.images.rectificationAfter} alt="整改后" /><b>整改后</b></button><p className="rectify-measure">{current.measure}</p></div>}
          {activeTab === "整改照片" && <div className="multi-evidence-grid">{[...demoMedia.images.rectificationProcess, ...extraPhotos].map((src, index) => <button key={`${src}-${index}`} onClick={() => setPreview({ title: `整改过程照片 ${index + 1}`, type: "image", src })}><img src={src} alt="整改过程" /><span>2025-05-15 {10 + index}:2{index}</span></button>)}</div>}
          {activeTab === "复查验收" && <div className="module-form-grid"><SelectBox label="复查结果" value={recheckResult} options={["通过", "不通过"].map(toOption)} onChange={setRecheckResult} /><label><span>复查人</span><input defaultValue="李四" /></label><label><span>复查时间</span><input type="datetime-local" defaultValue="2025-05-16T14:30" /></label><label className="wide"><span>复查意见</span><textarea defaultValue="整改符合要求，现场证据完整。" /></label></div>}
          {activeTab === "企业确认" && <div className="module-form-grid enterprise-confirm-form"><label><span>确认人</span><input defaultValue="王磊" /></label><label><span>确认时间</span><input type="datetime-local" defaultValue="2025-05-16T15:10" /></label><label className="wide"><span>确认意见</span><textarea defaultValue="企业确认整改完成，现场具备安全使用条件。" /></label><div className="enterprise-confirm-assets"><div className="signature-preview"><span>企业电子签名</span><strong>王磊</strong></div><div className="seal-preview"><span>企业电子章</span><strong>齐鲁科技园管理有限公司</strong></div></div></div>}
          {activeTab === "专家复核" && <div className="module-form-grid"><label><span>专家姓名</span><input defaultValue="赵工" /></label><SelectBox label="复核结论" value={expertConclusion} options={["通过", "不通过", "需补充材料"].map(toOption)} onChange={setExpertConclusion} /><label className="wide"><span>复核意见</span><textarea defaultValue="整改资料完整，风险已消除，建议销号。" /></label></div>}
          {activeTab === "销号归档" && <div className="archive-panel"><div className="photo-stat-grid"><MiniStat label="归档编号" value={`ARCH${current.id.slice(-8)}`} /><MiniStat label="归档时间" value="2025-05-16" /><MiniStat label="全流程材料" value="9项" /></div><button className="primary-btn" onClick={() => { downloadText(`${current.id}归档材料.txt`, `归档编号：ARCH${current.id}\n隐患：${current.title}\n状态：${current.status}`); setToast("归档材料已导出"); }}>导出归档材料</button></div>}
          {actionButtons.length > 0 && <footer className="rectify-inline-actions">{actionButtons.map(([label, handler]) => <button key={label} className={label === "派发整改" || label === "提交整改完成" ? "primary-btn" : "secondary-btn"} onClick={handler}>{label}</button>)}</footer>}
        </section>
        <aside className="multi-card rectify-action-card">
          <header><h3>隐患详情与操作</h3><Badge label={current.status} /></header>
          <dl className="detail-pairs"><dt>隐患编号</dt><dd>{current.id}</dd><dt>项目名称</dt><dd>{current.project}</dd><dt>任务名称</dt><dd>{current.taskName}</dd><dt>隐患分类</dt><dd>{current.category}</dd><dt>风险等级</dt><dd><Badge label={current.risk} /></dd><dt>责任单位</dt><dd>{current.unit}</dd><dt>责任人</dt><dd>{current.person}</dd><dt>整改期限</dt><dd>{current.deadline}</dd><dt>是否超期</dt><dd>{current.overdueDays > 0 ? `超期${current.overdueDays}天` : "未超期"}</dd><dt>发现来源</dt><dd>{current.source}</dd></dl>
        </aside>
      </div>
      {modal === "dispatch" && <ActionModal title="派发整改" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { updateCurrent({ status: "整改中" }, "整改任务已派发"); setModal(null); }}>确认派发</button></>}><div className="module-form-grid"><SelectBox label="责任人" value={current.person} options={["张三", "李四", "王五", "赵六"].map(toOption)} onChange={(value) => updateCurrent({ person: value }, "责任人已更新")} /><label><span>整改期限</span><input type="date" defaultValue={current.deadline} /></label><label className="wide"><span>整改要求</span><textarea defaultValue={current.measure} /></label></div></ActionModal>}
      {modal === "recheck" && <ActionModal title="提交复查结果" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => { updateCurrent({ status: "整改中" }, "复查不通过，已退回整改"); setModal(null); }}>不通过</button><button className="primary-btn" onClick={() => { updateCurrent({ status: "企业确认" }, "复查通过，进入企业确认"); setModal(null); }}>通过</button></>}><p className="modal-note">请选择复查结果，系统会自动推进闭环状态。</p></ActionModal>}
      {modal === "expert" && <ActionModal title="专家复核" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => { updateCurrent({ status: "待复查" }, "专家复核不通过，退回复查"); setModal(null); }}>不通过</button><button className="primary-btn" onClick={() => { updateCurrent({ status: "已销号" }, "专家复核通过，已销号"); setModal(null); }}>通过</button></>}><p className="modal-note">专家复核后将决定是否进入销号归档。</p></ActionModal>}
      {modal === "archive" && <ActionModal title="销号归档" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { updateCurrent({ status: "已销号" }, "已生成归档记录并销号"); setModal(null); }}>确认销号</button></>}><p className="modal-note">确认后生成归档编号并导出全流程证据包。</p></ActionModal>}
      <MediaPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function MultiHazardDashboardPage({ setView, setToast }: { setView: (view: HazardView) => void; setToast: (message: string) => void }) {
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [riskFilter, setRiskFilter] = useState("全部等级");
  const [project, setProject] = useState("全部项目");
  const [enterpriseFilter, setEnterpriseFilter] = useState("全部企业");
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [unitFilter, setUnitFilter] = useState("全部单位");
  const [trendMode, setTrendMode] = useState<"按日" | "按周">("按日");
  const visible = hazardLedgerSeed.filter((item) => (statusFilter === "全部状态" || item.status === statusFilter) && (riskFilter === "全部等级" || item.risk === riskFilter) && (project === "全部项目" || item.project === project) && (enterpriseFilter === "全部企业" || item.project === enterpriseFilter) && (typeFilter === "全部类型" || item.category.includes(typeFilter.replace("检查", ""))) && (unitFilter === "全部单位" || item.unit === unitFilter));
  const kpis = [
    ["隐患总数", "1,256", "全部状态"],
    ["待整改", "327", "待整改"],
    ["整改中", "214", "整改中"],
    ["待复查", "142", "待复查"],
    ["企业确认中", "58", "企业确认"],
    ["专家复核中", "49", "专家复核"],
    ["已销号", "573", "已销号"],
    ["超期预警数", "86", "超期"],
    ["闭环率", "71.8%", "全部状态"],
    ["超期率", "8.6%", "超期"]
  ];
  const exportDashboard = () => {
    downloadText("隐患统计看板摘要.txt", `项目：${project}\n风险：${riskFilter}\n状态：${statusFilter}\n重点隐患：${visible.map((item) => item.id).join("、")}`);
    setToast("看板摘要已导出");
  };
  return (
    <div className="multi-hazard-page">
      <div className="multi-filter-card">
        <label className="date-box"><span>开始日期</span><input type="date" defaultValue="2025-05-10" /></label>
        <label className="date-box"><span>结束日期</span><input type="date" defaultValue="2025-05-16" /></label>
        <SelectBox label="项目" value={project} options={["全部项目", ...Array.from(new Set(hazardLedgerSeed.map((item) => item.project)))].map(toOption)} onChange={setProject} />
        <SelectBox label="企业/项目" value={enterpriseFilter} options={["全部企业", "齐鲁科技园", "山东国控大数据中心"].map(toOption)} onChange={setEnterpriseFilter} />
        <SelectBox label="检查类型" value={typeFilter} options={["全部类型", "消防安全检查", "用电安全检查", "动火临电"].map(toOption)} onChange={setTypeFilter} />
        <SelectBox label="风险等级" value={riskFilter} options={["全部等级", "重大隐患", "高风险", "中风险", "低风险"].map(toOption)} onChange={setRiskFilter} />
        <SelectBox label="状态" value={statusFilter} options={["全部状态", "待整改", "整改中", "待复查", "企业确认", "专家复核", "已销号"].map(toOption)} onChange={setStatusFilter} />
        <SelectBox label="责任单位" value={unitFilter} options={["全部单位", "齐鲁科技园物业", "鲁商广场运营部", "施工单位"].map(toOption)} onChange={setUnitFilter} />
        <button className="primary-btn" onClick={() => setToast(`看板已按 ${visible.length} 条样本刷新`)}>查询</button>
        <button className="secondary-btn" onClick={() => { setProject("全部项目"); setEnterpriseFilter("全部企业"); setTypeFilter("全部类型"); setUnitFilter("全部单位"); setRiskFilter("全部等级"); setStatusFilter("全部状态"); setToast("看板筛选已重置"); }}>重置</button>
        <button className="secondary-btn" onClick={exportDashboard}>导出看板</button>
        <button className="secondary-btn" onClick={() => { downloadText("本周隐患闭环管理摘要.txt", `统计周期：2025-05-10 至 2025-05-16\n当前样本：${visible.length} 条\n状态：${statusFilter}`); setToast("已生成本周隐患闭环管理摘要"); }}>生成周报</button>
      </div>
      <div className="multi-kpi-grid">{kpis.map(([label, value, filter]) => <button key={label} onClick={() => { if (filter === "超期") setView("overdue"); else setStatusFilter(filter); setToast(`已联动筛选：${label}`); }}><span>{label}</span><strong>{value}</strong><small>较上周 ↑ 8.6%</small></button>)}</div>
      <div className="multi-dashboard-grid">
        <div className="multi-chart-row">
        <section className="dashboard-card chart-fixed"><header><h3>隐患状态分布</h3><button onClick={() => setStatusFilter("整改中")}>筛整改中</button></header><RectificationChart /></section>
        <section className="dashboard-card chart-fixed"><header><h3>风险等级分布</h3><button onClick={() => setRiskFilter("高风险")}>筛高风险</button></header><RectificationChart /></section>
        </div>
        <div className="multi-analysis-row">
        <section className="dashboard-card wide chart-fixed"><header><h3>隐患趋势</h3><button onClick={() => setTrendMode((value) => value === "按日" ? "按周" : "按日")}>{trendMode}</button></header><LineCard data={riskTrend.map((item, index) => trendMode === "按周" ? { ...item, 高风险: item.高风险 - index, 较高风险: item.较高风险 - index, 中风险: item.中风险 - index } : item)} colors={["#ef4444", "#f97316", "#0f6fd1"]} keys={["高风险", "较高风险", "中风险"]} xKey="day" /></section>
        <section className="dashboard-card"><header><h3>责任单位排行 TOP10</h3><button onClick={() => setView("rectification")}>更多</button></header><div className="rank-bars">{["齐鲁科技园物业", "鲁商广场运营部", "数据中心运维部", "施工单位", "国控大厦物业"].map((name, index) => <p key={name}><span>{index + 1}</span><b>{name}</b><i style={{ width: `${90 - index * 12}%` }} /><em>{268 - index * 38}</em></p>)}</div></section>
        </div>
        <div className="multi-chart-row">
        <section className="dashboard-card"><header><h3>闭环效率分析</h3><button onClick={() => setStatusFilter("已销号")}>更多</button></header><div className="efficiency-grid"><MiniStat label="平均整改时长" value="6.8天" /><MiniStat label="平均复查时长" value="1.6天" /><MiniStat label="复查通过率" value="87.6%" /><MiniStat label="专家介入次数" value="126次" /></div></section>
        <section className="dashboard-card"><header><h3>隐患分类分布</h3><button onClick={() => setRiskFilter("中风险")}>筛选</button></header><div className="category-bars">{["用电安全 562", "消防设施 328", "疏散通道 184", "临时用电 108", "动火作业 74"].map((item, index) => <button key={item} onClick={() => setTypeFilter(item.split(" ")[0])}><span>{item}</span><i style={{ width: `${88 - index * 12}%` }} /></button>)}</div></section>
        </div>
        <div className="multi-table-row">
        <section className="dashboard-card wide"><header><h3>重点隐患清单</h3><button onClick={() => setView("rectification")}>查看详情</button></header><DataTable headers={["隐患编号", "描述", "项目", "风险等级", "状态", "责任单位", "超期天数", "操作"]} rows={visible.slice(0, 6).map((item) => [item.id, item.title, item.project, item.risk, item.status, item.unit, `${item.overdueDays}天`, "查看详情"])} onRowClick={() => setView("rectification")} /></section>
        <section className="dashboard-card"><header><h3>超期隐患清单</h3><button onClick={() => setView("overdue")}>进入预警</button></header><DataTable headers={["隐患编号", "项目", "责任人", "期限", "超期", "操作"]} rows={hazardLedgerSeed.filter((item) => item.overdueDays > 0).slice(0, 5).map((item) => [item.id, item.project, item.person, item.deadline, `${item.overdueDays}天`, "催办"])} onRowClick={() => setView("overdue")} /></section>
        </div>
      </div>
    </div>
  );
}

function MultiHazardOverduePage({ setToast }: { setToast: (message: string) => void }) {
  const [rows, setRows] = useState(hazardLedgerSeed.concat(hazardLedgerSeed.map((item, index) => ({ ...item, id: `${item.id}B${index}`, overdueDays: item.overdueDays + index + 1, status: index % 3 === 0 ? "即将超期" : item.status }))).slice(0, 20));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("全部项目");
  const [riskFilter, setRiskFilter] = useState("全部等级");
  const [typeFilter, setTypeFilter] = useState("全部预警");
  const [minOverdueDays, setMinOverdueDays] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [expertAssignee, setExpertAssignee] = useState("赵工");
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [modal, setModal] = useState<"urge" | "expert" | "flow" | null>(null);
  const selected = rows.find((item) => item.id === selectedId) ?? null;
  const visible = rows.filter((item) => (projectFilter === "全部项目" || item.project === projectFilter) && (riskFilter === "全部等级" || item.risk === riskFilter) && (typeFilter === "全部预警" || (typeFilter === "已超期" ? item.overdueDays > 0 : item.status === typeFilter)) && item.overdueDays >= minOverdueDays && (!keyword.trim() || `${item.id}${item.title}${item.project}${item.person}`.includes(keyword.trim())));
  const update = (id: string, patch: Partial<HazardLedger>, message: string) => {
    setRows((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    setToast(message);
  };
  const exportRows = () => {
    downloadText("隐患超期预警列表.csv", `\uFEFF隐患编号,项目,描述,风险,责任人,超期天数\n${visible.map((item) => [item.id, item.project, item.title, item.risk, item.person, item.overdueDays].join(",")).join("\n")}`, "text/csv;charset=utf-8");
    setToast("预警列表已导出");
  };
  return (
    <div className="multi-hazard-page">
      <div className="multi-filter-card">
        <SelectBox label="项目" value={projectFilter} options={["全部项目", ...Array.from(new Set(rows.map((item) => item.project)))].map(toOption)} onChange={setProjectFilter} />
        <label className="search-box"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="隐患编号/责任人/关键字" /></label>
        <SelectBox label="风险等级" value={riskFilter} options={["全部等级", "重大隐患", "高风险", "中风险", "低风险"].map(toOption)} onChange={setRiskFilter} />
        <SelectBox label="预警类型" value={typeFilter} options={["全部预警", "即将超期", "已超期", "多次退回"].map(toOption)} onChange={setTypeFilter} />
        <label className="date-box"><span>开始日期</span><input type="date" defaultValue="2025-05-10" /></label>
        <label className="date-box"><span>结束日期</span><input type="date" defaultValue="2025-05-23" /></label>
        <button className="primary-btn" onClick={() => setToast(`已查询到 ${visible.length} 条预警`)}>查询</button>
        <button className="secondary-btn" onClick={() => { setProjectFilter("全部项目"); setRiskFilter("全部等级"); setTypeFilter("全部预警"); setMinOverdueDays(0); setKeyword(""); setToast("预警筛选已重置"); }}>重置</button>
        <button className="secondary-btn" onClick={exportRows}>导出</button>
        <button className="primary-btn" onClick={() => { setRows((items) => items.map((item) => visible.some((row) => row.id === item.id) ? { ...item, status: "已催办" } : item)); setToast("已批量催办当前筛选记录"); }}>批量催办</button>
      </div>
      <div className="multi-kpi-grid overdue">{[["即将超期", "36"], ["已超期", "68"], ["超期3天以上", "42"], ["超期7天以上", "24"], ["多次退回", "12"], ["今日催办", "18"]].map(([label, value]) => <button key={label} onClick={() => { setTypeFilter(label.includes("即将") ? "即将超期" : label.includes("已") ? "已超期" : "全部预警"); setMinOverdueDays(label.includes("7天") ? 7 : label.includes("3天") ? 3 : 0); setToast(`已筛选：${label}`); }}><span>{label}</span><strong>{value}</strong><small>较昨日 ↑ 6</small></button>)}</div>
      <div className={`overdue-multi-layout ${selected ? "detail-open" : ""}`}>
        <section className="multi-card overdue-list-main">
          <header><h3>超期隐患列表</h3><span>共 {visible.length} 条</span></header>
          <div className="table-fit"><table className="data-table"><thead><tr>{["隐患编号", "项目名称", "隐患描述", "风险等级", "责任单位", "责任人", "整改期限", "当前状态", "超期天数", "预警类型", "最近催办", "操作"].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{visible.map((item) => <tr key={item.id} className={selectedId === item.id ? "selected-row" : ""} onClick={() => setSelectedId(item.id)}><td>{item.id}</td><td>{item.project}</td><td>{item.title}</td><td><Badge label={item.risk} /></td><td>{item.unit}</td><td>{item.person}</td><td>{item.deadline}</td><td><Badge label={item.status} /></td><td className={item.overdueDays > 0 ? "danger-text" : ""}>{item.overdueDays}天</td><td>{item.overdueDays > 0 ? "已超期" : "即将超期"}</td><td>{item.overdueDays > 0 ? "2025-05-23" : "-"}</td><td><button onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}>查看</button><button onClick={(event) => { event.stopPropagation(); update(item.id, { status: "已催办" }, "催办记录已生成"); }}>催办</button><button onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); setModal("expert"); }}>专家</button></td></tr>)}</tbody></table></div>
        </section>
        {selected && <aside className="multi-card overdue-detail-panel">
          <header><h3>{selected.title}</h3><button onClick={() => setSelectedId(null)}>×</button></header>
          <dl className="detail-pairs"><dt>隐患编号</dt><dd>{selected.id}</dd><dt>发现时间</dt><dd>{selected.foundTime}</dd><dt>整改期限</dt><dd>{selected.deadline}</dd><dt>流程节点</dt><dd>{selected.status}</dd><dt>企业反馈</dt><dd>已收到催办，正在安排整改。</dd><dt>专家建议</dt><dd>{selected.measure}</dd></dl>
          <section><h4>历史整改 / 复查 / 催办记录</h4><ul>{["发现隐患并登记", "派发整改责任人", "发送催办通知", "等待整改反馈"].map((item, index) => <li key={item}>{item} · 2025-05-{16 + index}</li>)}</ul></section>
          <div className="drawer-evidence">{[demoMedia.images.electricalPanelOpen, demoMedia.images.cableExposed, demoMedia.images.rectificationAfter].map((src, index) => <button key={src} onClick={() => setPreview({ title: `预警证据 ${index + 1}`, type: "image", src })}><img src={src} alt="证据" /></button>)}</div>
          <footer><button className="primary-btn" onClick={() => setModal("urge")}>催办</button><button className="secondary-btn" onClick={() => setModal("expert")}>派发专家</button><button className="secondary-btn" onClick={() => setModal("flow")}>查看流程</button><button className="secondary-btn" onClick={() => update(selected.id, { status: "已升级" }, "预警已升级")}>升级预警</button></footer>
        </aside>}
      </div>
      {modal === "urge" && selected && <ActionModal title="催办说明" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { update(selected.id, { status: "已催办" }, "催办通知已发送"); setModal(null); }}>发送催办</button></>}><div className="module-form-grid"><label className="wide"><span>催办说明</span><textarea defaultValue="请责任单位在 24 小时内反馈整改进展并上传证据。" /></label></div></ActionModal>}
      {modal === "expert" && selected && <ActionModal title="派发专家" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={() => { update(selected.id, { status: "专家复核" }, `专家复核任务已派发给${expertAssignee}`); setModal(null); }}>确认派发</button></>}><SelectBox label="选择专家" value={expertAssignee} options={["赵工", "王工", "孙工"].map(toOption)} onChange={setExpertAssignee} /></ActionModal>}
      {modal === "flow" && selected && <ActionModal title="流程时间线" onClose={() => setModal(null)}><div className="flow-track archive">{["隐患登记", "派发整改", "催办提醒", "复查", "销号"].map((step, index) => <div key={step} className={index < 3 ? "active" : ""}><i /><b>{step}</b><span>{index < 3 ? "已完成" : "待处理"}</span></div>)}</div></ActionModal>}
      <MediaPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function HazardRegistrationPage({ setView, setToast }: { setView: (view: HazardView) => void; setToast: (message: string) => void }) {
  const [evidenceTab, setEvidenceTab] = useState("图片取证（4）");
  const [risk, setRisk] = useState("高风险");
  const [tags, setTags] = useState(["线缆裸露", "消防通道占用"]);
  const [category, setCategory] = useState("用电安全 / 配电箱及线路");
  const [responsibleUnit, setResponsibleUnit] = useState("山东国控大数据中心");
  const [responsibleDept, setResponsibleDept] = useState("运维部");
  const [responsiblePerson, setResponsiblePerson] = useState("张三");
  const [audioType, setAudioType] = useState("全部类型");
  const [deviceType, setDeviceType] = useState("全部设备");
  const [mediaProject, setMediaProject] = useState("全部项目");
  const [keyframeBoost, setKeyframeBoost] = useState(0);
  const [uploadedVoices, setUploadedVoices] = useState<string[]>([]);
  const [playingVoice, setPlayingVoice] = useState("");
  const [deadline, setDeadline] = useState("2025-05-23");
  const [description, setDescription] = useState("配电箱内多处线缆裸露未做绝缘包扎，配电箱门未关闭；东侧消防通道被杂物占用，影响疏散通行。");
  const [measure, setMeasure] = useState("1. 对配电箱内裸露线缆进行绝缘包扎，关闭配电箱门；\n2. 清理消防通道杂物，确保通道畅通。");
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [registerAiIndex, setRegisterAiIndex] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const registerAiPlans = [
    ["依据《低压配电设计规范》完善配电箱导线绝缘防护。", "依据《建筑设计防火规范》保持疏散通道畅通。", "建议设置维护责任人并定期巡检。"],
    ["建议核查配电箱门锁闭状态和箱内线缆固定情况。", "风险提示：裸露线缆可能造成触电或短路风险。", "复查要求：上传整改前后对比照片和现场位置记录。"],
    ["建议整改：清理通道占用物并设置禁止堆放标识。", "建议专家复核：高风险用电点位可由电气专家远程复核。", "建议核查：确认整改后配电箱周边无可燃物堆放。"]
  ];
  const evidence = [
    { label: "线缆裸露", time: "10:31:05", tone: "danger", wide: true, src: demoMedia.images.cableExposed },
    { label: "消防通道占用", time: "10:31:28", tone: "warning", src: demoMedia.images.fireCorridorBlocked },
    { label: "配电箱未关闭", time: "10:31:02", tone: "danger", src: demoMedia.images.electricalPanelOpen },
    { label: "灭火器压力不足", time: "10:31:45", tone: "warning", src: demoMedia.images.extinguisherLowPressure }
  ];
  const videoRecords = [
    { title: "aa的智能安全帽 SHM20250516001", source: "aa的智能安全帽", project: "齐鲁科技园", time: "2025-05-14 10:31:02", duration: "00:42", src: demoMedia.videos.helmetLive },
    { title: "bb的智能安全帽 SHM20250516002", source: "bb的智能安全帽", project: "国控大厦项目", time: "2025-05-14 10:32:18", duration: "01:15", src: demoMedia.videos.fireCorridor },
    { title: "执法记录仪 0001234", source: "执法记录仪", project: "国控大厦项目", time: "2025-05-14 10:33:10", duration: "00:58", src: demoMedia.videos.extinguisherPressure },
    { title: "监控摄像头 A-01", source: "监控摄像头", project: "齐鲁科技园", time: "2025-05-14 10:35:26", duration: "01:06", src: demoMedia.videos.hotWorkTempPower }
  ];
  const voiceRecords = [
    { id: "voice-1", title: "隐患现场描述录音", type: "隐患描述", duration: "00:38", speaker: "张三", source: "aa的智能安全帽", src: demoMedia.audio.hazardDescription, transcript: demoMedia.transcripts.hazardDescription },
    { id: "voice-2", title: "整改沟通记录", type: "整改沟通", duration: "01:02", speaker: "李四", source: "执法记录仪", src: demoMedia.audio.rectificationUpdate, transcript: demoMedia.transcripts.rectificationUpdate },
    { id: "voice-3", title: "复查现场沟通录音", type: "复查沟通", duration: "00:48", speaker: "赵六", source: "bb的智能安全帽", src: demoMedia.audio.recheckResult, transcript: demoMedia.transcripts.recheckResult },
    ...uploadedVoices.map((name, index) => ({ id: `uploaded-${index}`, title: name, type: "隐患描述", duration: "00:12", speaker: "张三", source: index % 2 === 0 ? "aa的智能安全帽" : "bb的智能安全帽", src: demoMedia.audio.patrolNote, transcript: demoMedia.transcripts.patrolNote }))
  ];
  const keyframeThumbs = [
    demoMedia.images.electricalPanelOpen,
    demoMedia.images.cableExposed,
    demoMedia.images.fireCorridorBlocked,
    demoMedia.images.extinguisherLowPressure,
    demoMedia.images.electricalCabinetVisible,
    demoMedia.images.hotWorkTempPower
  ];
  const timeline = [
    ["图片取证", "10:31:05", "配电箱内线缆裸露，未做绝缘处理", "拍摄位置：配电室"],
    ["视频关键帧", "10:31:28", "消防通道被杂物占用，影响疏散通行", "拍摄位置：东侧通道"],
    ["语音记录", "10:31:45", "配电箱门未关闭，线缆裸露，有触电风险；灭火器压力不足...", "拍摄位置：配电室"]
  ];
  const trackRows = [
    ["1", "2025-05-14 10:30:58", "齐鲁科技园", "aa的智能安全帽", "2号楼1层 配电室入口", "00:02:36", "回放"],
    ["2", "2025-05-14 10:31:34", "齐鲁科技园", "aa的智能安全帽", "配电室内部 配电箱区域", "00:05:18", "回放"],
    ["3", "2025-05-14 10:36:52", "国控大厦项目", "bb的智能安全帽", "配电室西侧 通道区域", "00:01:45", "回放"],
    ["4", "2025-05-14 10:38:37", "国控大厦项目", "执法记录仪", "配电室出口 通道处", "00:00:58", "回放"]
  ];
  const mediaProjectOptions = ["全部项目", ...Array.from(new Set([...videoRecords.map((item) => item.project), ...trackRows.map((row) => row[2])]))];

  const addTag = () => {
    const next = `现场补充${tags.length + 1}`;
    setTags((items) => [...items, next]);
    setToast(`已添加疑似隐患：${next}`);
  };

  const updateTag = (index: number, value: string) => {
    setTags((items) => items.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const saveDraft = () => {
    setToast("草稿已保存");
  };

  const confirmHazard = () => {
    setConfirmed(true);
    setToast("已人工确认，可生成整改单");
  };

  const generateOrder = () => {
    if (!confirmed) {
      setToast("请先完成人工确认");
      return;
    }
    setToast("已生成整改单并进入隐患整改");
    setView("rectification");
  };

  const openTimelineItem = (item: string[]) => {
    const tabMap: Record<string, string> = {
      图片取证: "图片取证（4）",
      视频关键帧: "视频关键帧（2）",
      语音记录: "语音记录（1）"
    };
    setEvidenceTab(tabMap[item[0]] ?? "图片取证（4）");
    if (item[0] === "图片取证") {
      setMediaPreview({ title: `图片取证：${item[1]}`, type: "image", src: demoMedia.images.cableExposed });
    }
    if (item[0] === "视频关键帧") {
      setMediaPreview({ title: `视频关键帧：${item[1]}`, type: "video", src: demoMedia.videos.fireCorridor });
    }
    if (item[0] === "语音记录") {
      setMediaPreview({ title: `语音记录：${item[1]}`, type: "audio", src: demoMedia.audio.hazardDescription, transcript: demoMedia.transcripts.hazardDescription });
    }
    setToast(`已定位到${item[0]} ${item[1]}`);
  };

  const downloadEvidenceImage = () => {
    setToast("证据材料已打包下载");
  };

  const downloadTextFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(`已下载${name}`);
  };

  const renderEvidenceContent = () => {
    if (evidenceTab.startsWith("视频")) {
      const videos = videoRecords.filter((item) => (mediaProject === "全部项目" || item.project === mediaProject) && (deviceType === "全部设备" || item.source === deviceType));
      return (
        <div className="video-evidence-panel">
          <div className="evidence-filter-inline"><SelectBox label="项目" value={mediaProject} options={mediaProjectOptions.map(toOption)} onChange={(value) => { setMediaProject(value); setToast(`已筛选项目：${value}`); }} compact /><SelectBox label="视频来源" value={deviceType} options={["全部设备", "aa的智能安全帽", "bb的智能安全帽", "执法记录仪", "监控摄像头"].map(toOption)} onChange={(value) => { setDeviceType(value); setToast(`已筛选视频来源：${value}`); }} compact /><button className="primary-btn" onClick={() => { setKeyframeBoost((value) => value + 4); setToast("已提取视频关键帧，关键帧列表已刷新"); }}>提取关键帧</button><button className="secondary-btn" onClick={() => { setMediaProject("全部项目"); setDeviceType("全部设备"); setKeyframeBoost(0); setToast("视频筛选已重置"); }}>重置</button></div>
          <div className="video-card-grid">{videos.map((item) => <button key={item.title} className="video-card" onClick={() => setMediaPreview({ title: item.title, type: "video", src: item.src })}><video src={item.src} muted preload="metadata" /><span>{item.title}</span><i className="play-button">▶</i><b>{item.time}</b><em>{item.duration}</em></button>)}</div>
          <div className="keyframe-groups">{[`关键帧抽取：${16 + keyframeBoost} 帧`, `关键帧热度：${22 + keyframeBoost} 帧`].map((title, groupIndex) => <section key={title}><h3>{title}</h3><div>{keyframeThumbs.slice(groupIndex, groupIndex + 4).map((src, index) => <button key={`${title}-${src}`} onClick={() => setMediaPreview({ title: `${title} ${index + 1}`, type: "image", src })}><img src={src} alt={`${title} ${index + 1}`} /></button>)}</div><button className="text-link" onClick={() => { setKeyframeBoost((value) => value + 2); setToast(`${title}已展开更多图片`); }}>更多关键帧 &gt;</button></section>)}</div>
        </div>
      );
    }
    if (evidenceTab.startsWith("语音")) {
      const voices = audioType === "全部类型" ? voiceRecords : voiceRecords.filter((item) => item.type === audioType);
      return (
        <div className="voice-evidence-panel">
          <div className="evidence-filter-inline"><SelectBox label="语音类型" value={audioType} options={["全部类型", "隐患描述", "整改沟通", "复查沟通"].map(toOption)} onChange={(value) => { setAudioType(value); setToast(`已筛选语音：${value}`); }} compact /><button className="primary-btn" onClick={() => { const name = `补充语音记录 ${uploadedVoices.length + 1}`; setUploadedVoices((items) => [...items, name]); setToast(`已上传语音：${name}`); }}>上传语音</button><button className="secondary-btn" onClick={() => { setAudioType("全部类型"); setPlayingVoice(""); setToast("语音筛选已重置"); }}>重置</button></div>
          {voices.map((item) => <article className={`voice-row ${playingVoice === item.id ? "playing" : ""}`} key={item.id}><button onClick={() => { const next = playingVoice === item.id ? "" : item.id; setPlayingVoice(next); setToast(next ? `正在播放：${item.title}` : `已暂停：${item.title}`); }}>{playingVoice === item.id ? "Ⅱ" : "▶"}</button><div><b>{item.title}</b><span>2025-05-14 10:31:05　时长 {item.duration}　录音人：{item.speaker}　来源：{item.source}</span><img className="audio-waveform" src={demoMedia.images.audioWaveform} alt={`${item.title}声纹`} />{playingVoice === item.id && <><audio src={item.src} controls autoPlay /><p className="voice-transcript">{item.transcript}</p></>}</div><footer><button onClick={() => { setDescription((text) => `${text}\n语音转写：${item.transcript}`.slice(0, 200)); setToast("语音转写完成并写入隐患描述"); }}>转写</button><button onClick={() => { downloadAsset(item.src, `${item.title}.mp3`); setToast(`已下载${item.title}`); }}>下载</button><button onClick={() => { setTags((items) => items.includes("重点语音") ? items : [...items, "重点语音"]); setToast("已标记为重点语音"); }}>标记</button></footer></article>)}
        </div>
      );
    }
    if (evidenceTab.startsWith("位置")) {
      const visibleTrackRows = trackRows.filter((row) => (mediaProject === "全部项目" || row[2] === mediaProject) && (deviceType === "全部设备" || row[3] === deviceType));
      const pins = [
        { label: "起", className: "start", left: 8, top: 72 },
        { label: "1", className: "point", left: 20, top: 34 },
        { label: "2", className: "point", left: 38, top: 32 },
        { label: "3", className: "point", left: 56, top: 58 },
        { label: "4", className: "point", left: 74, top: 42 },
        { label: "终", className: "end", left: 92, top: 30 }
      ];
      return (
        <div className="track-evidence-panel">
          <div className="evidence-filter-inline"><SelectBox label="项目" value={mediaProject} options={mediaProjectOptions.map(toOption)} onChange={(value) => { setMediaProject(value); setToast(`已筛选项目：${value}`); }} compact /><SelectBox label="设备类型" value={deviceType} options={["全部设备", "aa的智能安全帽", "bb的智能安全帽", "执法记录仪"].map(toOption)} onChange={(value) => { setDeviceType(value); setToast(`已筛选设备：${value}`); }} compact /><button className="primary-btn" onClick={() => setMediaPreview({ title: "轨迹回放视频：全程路线", type: "video", src: demoMedia.videos.locationReplay })}>轨迹回放</button><button className="secondary-btn" onClick={() => { setMediaProject("全部项目"); setDeviceType("全部设备"); setToast("轨迹筛选已重置"); }}>重置</button></div>
          <div className="track-map linear">
            <img src={demoMedia.images.locationTrajectoryMap} alt="位置轨迹平面图" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="8,72 20,34 38,32 56,58 74,42 92,30" />
            </svg>
            {pins.map((pin) => <span key={pin.label} className={`pin ${pin.className}`} style={{ left: `${pin.left}%`, top: `${pin.top}%` }}>{pin.label}</span>)}
          </div>
          <DataTable headers={["序号", "时间", "所属项目", "设备", "位置描述", "停留时长", "操作"]} rows={visibleTrackRows} onRowClick={(row) => setMediaPreview({ title: `轨迹回放视频：${row[1]}`, type: "video", src: demoMedia.videos.locationReplay })} />
        </div>
      );
    }
    return (
      <div className="evidence-grid">
        {evidence.map((item) => (
          <button key={item.label} className={`evidence-shot ${item.wide ? "wide" : ""}`} onClick={() => setMediaPreview({ title: item.label, type: "image", src: item.src })}>
            <img src={item.src} alt={item.label} />
            <span className={`shot-label ${item.tone}`}>{item.label}</span>
            <em>{item.time}</em>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="hazard-registration">
      <div className="hazard-task-meta">
        <span>任务编号：<b>RW20250516003</b></span>
        <span>任务名称：<b>国控大厦消防安全检查</b></span>
        <span>检查人员：<b>张三</b></span>
        <span>检查时间：<b>2025-05-16 10:30</b></span>
        <span>来源：<b>aa的智能安全帽</b></span>
        <button className="text-link" onClick={() => setTaskDetailOpen(true)}>查看任务详情</button>
      </div>
      <div className="hazard-register-layout">
        <section className="hazard-evidence-card">
          <header><h2>现场证据</h2><button className="text-link" onClick={downloadEvidenceImage}>全部下载</button></header>
          <div className="evidence-tab-row">
            {["图片取证（4）", "视频关键帧（2）", "语音记录（1）", "位置轨迹"].map((item) => <button key={item} className={evidenceTab === item ? "active" : ""} onClick={() => setEvidenceTab(item)}>{item}</button>)}
          </div>
          {renderEvidenceContent()}
          <section className="evidence-timeline">
            <h3>证据时间线</h3>
            {timeline.map((item) => (
              <button key={`${item[0]}-${item[1]}`} onClick={() => openTimelineItem(item)}>
                <i />
                <strong>{item[0]}</strong>
                <span>{item[1]}</span>
                <p>{item[2]}</p>
                <em>{item[3]}</em>
              </button>
            ))}
          </section>
        </section>
        <aside className="hazard-form-card">
          <h2>隐患信息</h2>
          <label><span>疑似隐患 *</span><div className="chip-input editable">{tags.map((tag, index) => <span key={`tag-${index}`}><input value={tag} onChange={(event) => updateTag(index, event.target.value)} /><button onClick={() => setTags((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}<button onClick={addTag}>+ 添加</button></div></label>
          <label><span>隐患分类 *</span><SelectInline value={category} options={["用电安全 / 配电箱及线路", "消防安全 / 疏散通道", "消防设施 / 灭火器材", "作业安全 / 高空作业"]} onChange={setCategory} /></label>
          <div className="risk-choice"><span>风险等级 *</span>{["低风险", "中风险", "高风险", "重大风险"].map((item) => <button key={item} className={risk === item ? "active" : ""} onClick={() => setRisk(item)}>{item}</button>)}</div>
          <label><span>责任单位 *</span><SelectInline value={responsibleUnit} options={["山东国控大数据中心", "齐鲁科技园管理有限公司", "鲁商广场商业管理有限公司"]} onChange={(value) => { setResponsibleUnit(value); setToast(`已切换责任单位：${value}`); }} /></label>
          <label><span>责任部门 *</span><SelectInline value={responsibleDept} options={["运维部", "安全管理部", "物业工程部"]} onChange={(value) => { setResponsibleDept(value); setToast(`已切换责任部门：${value}`); }} /></label>
          <label><span>责任人 *</span><SelectInline value={responsiblePerson} options={["张三", "李四", "王磊", "赵六"]} onChange={(value) => { setResponsiblePerson(value); setToast(`已切换责任人：${value}`); }} /></label>
          <label><span>整改期限 *</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
          <label><span>隐患描述 *</span><textarea value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} /><em>{description.length}/200</em></label>
          <label><span>整改措施 *</span><textarea value={measure} maxLength={200} onChange={(event) => setMeasure(event.target.value)} /><em>{measure.length}/200</em></label>
          <div className="ai-suggestion">
            <header><b>AI 整改建议</b><div><button onClick={() => { const next = (registerAiIndex + 1) % registerAiPlans.length; setRegisterAiIndex(next); setToast("已换一版 AI 整改建议"); }}>换一换</button><button onClick={() => { setMeasure(registerAiPlans[registerAiIndex].join("\n")); setToast("已引用 AI 建议"); }}>引用建议</button></div></header>
            <p>基于国家标准和行业规范，AI 推荐以下整改建议：</p>
            <ol>{registerAiPlans[registerAiIndex].map((item) => <li key={item}>{item}</li>)}</ol>
          </div>
          <footer>
            {!confirmed && <><button className="secondary-btn" onClick={saveDraft}>保存草稿</button><button className="secondary-btn" onClick={confirmHazard}>人工确认</button></>}
            {confirmed && <button className="primary-btn" onClick={generateOrder}>生成整改单</button>}
          </footer>
        </aside>
      </div>
      {taskDetailOpen && <ActionModal title="任务详情" onClose={() => setTaskDetailOpen(false)}><div className="contract-detail-card"><p><span>任务编号：</span><b>RW20250516003</b></p><p><span>任务名称：</span><b>国控大厦消防安全检查</b></p><p><span>检查人员：</span><b>张三</b></p><p><span>检查时间：</span><b>2025-05-16 10:30</b></p><p><span>取证来源：</span><b>aa的智能安全帽</b></p></div></ActionModal>}
      <MediaPreviewModal preview={mediaPreview} onClose={() => setMediaPreview(null)} />
    </div>
  );
}

function HazardRectificationPage({ setToast }: { setToast: (message: string) => void }) {
  const [activeTab, setActiveTab] = useState("整改信息");
  const [status, setStatus] = useState("待复查");
  const [note, setNote] = useState("已按整改要求完成关闭配电箱门并上锁、线缆整理固定和警示标识粘贴，现场环境已恢复整洁，具备安全使用条件。");
  const [reviewOpinion, setReviewOpinion] = useState("经现场复查，配电箱门已关闭并上锁，线缆已整理固定，警示标识已补贴，现场环境已清理，整改结果符合要求。");
  const [companyOpinion, setCompanyOpinion] = useState("企业已确认该隐患整改完成，整改结果符合现场安全管理要求，同意进入专家复核流程。");
  const [expertOpinion, setExpertOpinion] = useState("经复核，整改措施覆盖原隐患问题，整改后配电箱门已关闭并上锁，线缆已整理固定，现场风险已消除，建议予以销号归档。");
  const [selectedPhoto, setSelectedPhoto] = useState("整改前：配电箱门未关闭，线路裸露");
  const [photoFilter, setPhotoFilter] = useState("全部");
  const [coverPhoto, setCoverPhoto] = useState("整改前：配电箱门未关闭，线路裸露");
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);
  const [confirmSigned, setConfirmSigned] = useState(false);
  const [rectifyModal, setRectifyModal] = useState<null | "upload" | "reject" | "sign" | "material" | "close" | "report" | "preview">(null);
  const [rectifyPreview, setRectifyPreview] = useState<MediaPreview | null>(null);
  const [rectifyAiIndex, setRectifyAiIndex] = useState(0);
  const [compareReversed, setCompareReversed] = useState(false);
  const [rectifyAudioPlaying, setRectifyAudioPlaying] = useState(false);
  const [extraEvidenceCards, setExtraEvidenceCards] = useState<string[][]>([]);
  const [hiddenEvidence, setHiddenEvidence] = useState<string[]>([]);
  const stepItems = ["隐患登记", "整改派发", "整改执行", "整改复查", "企业确认", "专家复核", "销号归档"];
  const rectifyAiPlans = [
    ["配电箱门必须保持关闭并上锁，防止误操作和异常进入。", "线缆应整理并使用线槽或扎带固定，避免缠绕和磨损。", "在配电箱门外粘贴“当心触电”警示标识，提醒注意安全。", "定期检查配电箱运行状态，确保开关、电缆无过热、松动等隐患。"],
    ["建议复核配电箱门锁闭状态，确认锁具可正常使用。", "建议检查箱内端子排压接情况，重点查看是否松动发热。", "建议对整改后照片进行同角度留存，便于报告归档。", "建议由责任部门建立每日巡查记录，连续跟踪 7 天。"],
    ["建议核查配电室周边是否仍有可燃物或杂物堆放。", "建议补充门锁细节图、警示标识图、线缆整理后全景图。", "建议专家复核整改前后对比材料是否完整。", "建议将该点位纳入下周抽检清单。"]
  ];
  const photos = demoMedia.images.rectificationProcess.map((src, index) => ({ time: ["05-14 10:20", "05-14 10:35", "05-14 10:48", "05-14 11:05", "05-14 11:15", "05-14 11:28", "05-14 11:40", "05-14 11:52"][index], src }));
  const baseEvidenceCards = [
    ["整改前：配电箱门未关闭，线路裸露", "整改前", "05-14 09:15", "李四", demoMedia.images.rectificationBefore],
    ["整改中：工作人员整理线缆", "整改中", "05-14 10:35", "张三", demoMedia.images.rectificationProcess[1]],
    ["整改中：补贴当心触电警示标识", "整改中", "05-14 10:48", "张三", demoMedia.images.rectificationProcess[2]],
    ["整改后：配电箱门已关闭并上锁", "整改后", "05-14 11:28", "张三", demoMedia.images.rectificationAfter],
    ["整改后：现场环境已清理", "整改后", "05-14 11:40", "张三", demoMedia.images.rectificationProcess[6]],
    ["视频：整改过程视频 00:42", "视频", "05-14 10:31", "张三", demoMedia.videos.rectificationBeforeAfter],
    ["文件：整改说明.pdf", "文件", "05-14 11:52", "张三", demoMedia.images.reportCenter],
    ["整改后：门锁细节图", "整改后", "05-14 11:15", "张三", demoMedia.images.rectificationProcess[4]],
    ["整改中：线缆固定完成", "整改中", "05-14 11:05", "张三", demoMedia.images.rectificationProcess[3]],
    ["整改前：箱内线路杂乱", "整改前", "05-14 09:20", "李四", demoMedia.images.electricalPanelOpen],
    ["整改后：警示标识清晰", "整改后", "05-14 11:45", "张三", demoMedia.images.rectificationProcess[7]],
    ["文件：复查记录.docx", "文件", "05-16 09:35", "李四", demoMedia.images.reportCenterPages]
  ];
  const evidenceCards = [...baseEvidenceCards, ...extraEvidenceCards].filter((item) => !hiddenEvidence.includes(item[0]));
  const filteredEvidence = photoFilter === "全部" ? evidenceCards : evidenceCards.filter((item) => item[1] === photoFilter);
  const reviewEvidence = [
    ["整改后图片", demoMedia.images.rectificationAfter],
    ["复查现场照片", demoMedia.images.rectificationProcess[6]],
    ["配电箱门锁细节图", demoMedia.images.rectificationProcess[7]],
    ["警示标识照片", demoMedia.images.rectificationProcess[4]],
    ["线缆整理照片", demoMedia.images.rectificationProcess[3]]
  ];
  const confirmEvidence = [
    ["整改后照片", demoMedia.images.rectificationAfter],
    ["复查验收照片", demoMedia.images.rectificationProcess[5]],
    ["企业现场确认照片", demoMedia.images.rectificationProcess[6]],
    ["企业确认函.pdf", demoMedia.images.reportCenterPages]
  ];
  const previewEvidenceCard = (item: string[]) => {
    setSelectedPhoto(item[0]);
    setRectifyPreview({ title: item[0], type: item[1] === "视频" ? "video" : "image", src: item[4] || demoMedia.images.rectificationAfter });
  };
  const currentIndex = status === "已销号" ? 6 : status === "待销号归档" ? 6 : status === "待专家复核" ? 5 : status === "待企业确认" ? 4 : status === "待复查" ? 3 : 2;
  const submitRectification = () => {
    setStatus("待复查");
    setActiveTab("复查验收");
    setToast("整改已提交，状态已更新为待复查");
  };
  const passReview = () => {
    setStatus("待企业确认");
    setActiveTab("企业确认");
    setToast("复查通过，已发起企业确认");
  };
  const passCompany = () => {
    setStatus("待专家复核");
    setActiveTab("专家复核");
    setToast("企业确认通过，已进入专家复核");
  };
  const passExpert = () => {
    setStatus("待销号归档");
    setActiveTab("销号归档");
    setToast("专家复核通过，已进入销号归档");
  };
  const closeArchive = () => {
    setStatus("已销号");
    setRectifyModal(null);
    setToast("隐患已销号归档");
  };

  return (
    <div className="rectification-execute-page">
      <section className="rectify-summary-strip">
        <p><span>隐患编号</span><b>YH20250514088</b></p>
        <p><span>风险等级</span><Badge label="高风险" /></p>
        <p><span>所属项目</span><b>齐鲁科技园</b></p>
        <p><span>发现时间</span><b>2025-05-14 09:15</b></p>
        <p><span>责任单位</span><b>山东国控企管</b></p>
        <p><span>整改责任人</span><b>张三</b></p>
        <p><span>联系电话</span><b>186****8888</b></p>
        <p><span>整改期限</span><b>2025-05-16 <em>超期</em></b></p>
        <p><span>当前状态</span><Badge label={status} /></p>
      </section>
      <div className="rectify-execute-layout">
        <section className="rectify-main-card">
          <div className="rectify-tab-row">
            {["整改信息", "整改照片", "复查验收", "企业确认", "专家复核", "销号归档"].map((item) => <button key={item} className={activeTab === item ? "active" : ""} onClick={() => setActiveTab(item)}>{item}</button>)}
          </div>
          {activeTab === "整改信息" && (
            <>
          <div className="number-title"><span>1</span><b>整改前后对比</b></div>
          <div className="compare-photos">
            <button className={`rectify-photo ${compareReversed ? "after" : "before"}`} onClick={() => setRectifyPreview({ title: compareReversed ? "整改后照片" : "整改前照片", type: "image", src: compareReversed ? demoMedia.images.rectificationAfter : demoMedia.images.rectificationBefore })}><img src={compareReversed ? demoMedia.images.rectificationAfter : demoMedia.images.rectificationBefore} alt={compareReversed ? "整改后照片" : "整改前照片"} /><b>{compareReversed ? "整改后" : "整改前"}</b></button>
            <button className="compare-arrow" onClick={() => { setCompareReversed((value) => !value); setToast("已切换对比视图"); }}>›</button>
            <button className={`rectify-photo ${compareReversed ? "before" : "after"}`} onClick={() => setRectifyPreview({ title: compareReversed ? "整改前照片" : "整改后照片", type: "image", src: compareReversed ? demoMedia.images.rectificationBefore : demoMedia.images.rectificationAfter })}><img src={compareReversed ? demoMedia.images.rectificationBefore : demoMedia.images.rectificationAfter} alt={compareReversed ? "整改前照片" : "整改后照片"} /><b>{compareReversed ? "整改前" : "整改后"}</b></button>
          </div>
          <div className="number-title"><span>2</span><b>整改措施</b></div>
          <p className="rectify-measure">关闭配电箱门并上锁、整理线缆、补贴警示标识。</p>
          <div className="number-title"><span>3</span><b>整改过程照片</b></div>
          <div className="rectify-photo-strip">
            {photos.map((item, index) => <button key={item.time} className={index === 0 ? "active" : ""} onClick={() => { const title = `整改过程照片 ${item.time}`; setSelectedPhoto(title); setRectifyPreview({ title, type: "image", src: item.src }); setToast("已切换整改过程照片"); }}><img src={item.src} alt={`整改过程照片 ${item.time}`} /> <span>{item.time}</span></button>)}
          </div>
          <div className="number-title"><span>4</span><b>整改说明</b></div>
          <div className={`rectify-audio-row ${rectifyAudioPlaying ? "playing" : ""}`}><button onClick={() => { setRectifyAudioPlaying((value) => !value); setToast(rectifyAudioPlaying ? "已暂停整改说明语音" : "正在播放整改说明语音"); }}>{rectifyAudioPlaying ? "暂停" : "播放"}语音</button><div><audio src={demoMedia.audio.rectificationUpdate} controls autoPlay={rectifyAudioPlaying} /> <p>{demoMedia.transcripts.rectificationUpdate}</p></div><textarea value={note} onChange={(event) => setNote(event.target.value)} /></div>
          <div className="number-title"><span>5</span><b>流程跟踪</b></div>
          <div className="flow-track">{stepItems.map((item, index) => <div key={item} className={index <= currentIndex ? "active" : ""}><i /><b>{item}</b><span>{index <= currentIndex ? ["05-14 09:15", "05-14 10:10", "05-14 10:20", "待复查", "待企业确认", "待专家复核", "待销号归档"][index] : "-"}</span></div>)}</div>
            </>
          )}
          {activeTab === "整改照片" && (
            <div className="rectify-photo-manager">
              <h3 className="tab-panel-title">整改影像资料</h3>
              <div className="photo-stat-grid">{[["整改前照片", "3张"], ["整改中照片", "5张"], ["整改后照片", "4张"], ["视频证据", "2段"]].map((item) => <MiniStat key={item[0]} label={item[0]} value={item[1]} />)}</div>
              <div className="rectify-tab-row small">{["全部", "整改前", "整改中", "整改后", "视频"].map((item) => <button key={item} className={photoFilter === item ? "active" : ""} onClick={() => setPhotoFilter(item)}>{item}</button>)}</div>
              <div className="photo-manager-layout">
                <div className="evidence-wall">{filteredEvidence.map((item) => <button key={item[0]} className={selectedPhoto === item[0] ? "active" : ""} onClick={() => { previewEvidenceCard(item); setToast(`已选择证据：${item[0]}`); }}>{item[1] === "视频" ? <video src={item[4]} muted preload="metadata" /> : <img src={item[4] || demoMedia.images.rectificationAfter} alt={item[0]} />}<b>{item[1]}</b><strong>{item[0]}</strong><span>{item[2]} / {item[3]}</span>{coverPhoto === item[0] && <em>封面</em>}{reportPhotos.includes(item[0]) && <em>已加入报告</em>}</button>)}</div>
                <aside className="photo-detail-card"><h3>照片详情</h3><p>证据名称：<b>{selectedPhoto}</b></p><p>证据类型：<b>{evidenceCards.find((item) => item[0] === selectedPhoto)?.[1] ?? "图片"}</b></p><p>上传时间：<b>2025-05-14 11:28</b></p><p>上传人：<b>张三</b></p><p>所属阶段：<b>整改执行</b></p><p>拍摄位置：<b>2号楼B1层 配电室</b></p><p>关联隐患：<b>YH20250514088</b></p><label><input type="checkbox" checked={reportPhotos.includes(selectedPhoto)} onChange={() => setReportPhotos((items) => items.includes(selectedPhoto) ? items.filter((item) => item !== selectedPhoto) : [...items, selectedPhoto])} /> 作为报告证据</label><footer><button onClick={() => setRectifyModal("upload")}>上传整改照片</button><button onClick={() => { const name = `视频：补充整改视频 ${extraEvidenceCards.length + 1}`; setExtraEvidenceCards((items) => [...items, [name, "视频", "05-16 11:05", "张三", demoMedia.videos.rectificationBeforeAfter]]); setSelectedPhoto(name); setToast("视频上传成功"); }}>上传视频</button><button onClick={() => { setCoverPhoto(selectedPhoto); setToast("已设为封面"); }}>设为封面</button><button onClick={() => { setReportPhotos((items) => items.includes(selectedPhoto) ? items : [...items, selectedPhoto]); setToast("已加入报告"); }}>加入报告</button><button onClick={() => { setHiddenEvidence((items) => items.includes(selectedPhoto) ? items : [...items, selectedPhoto]); setReportPhotos((items) => items.filter((item) => item !== selectedPhoto)); setSelectedPhoto(filteredEvidence.find((item) => item[0] !== selectedPhoto)?.[0] ?? ""); setToast("已删除当前证据"); }}>删除</button></footer></aside>
              </div>
              {status === "整改中" && <footer className="tab-action-row"><button className="primary-btn" onClick={submitRectification}>提交整改</button></footer>}
            </div>
          )}
          {activeTab === "复查验收" && (
            <div className="review-panel">
              <h3 className="tab-panel-title">复查检查项</h3>
              <div className="photo-stat-grid">{[["复查状态", "待复查"], ["复查人员", "李四"], ["计划复查时间", "2025-05-16 09:30"], ["复查方式", "现场复查+图片核验"], ["当前结论", "待填写"]].map((item) => <MiniStat key={item[0]} label={item[0]} value={item[1]} />)}</div>
              <table className="action-table"><thead><tr>{["序号", "复查项目", "复查要求", "复查结果", "证据", "备注"].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{["配电箱门是否关闭并上锁", "箱内线缆是否整理固定", "裸露线缆是否完成绝缘处理", "警示标识是否补贴", "周边环境是否清理", "是否具备安全使用条件"].map((item, index) => <tr key={item}><td>{index + 1}</td><td>{item}</td><td>符合整改要求</td><td><select onChange={() => setToast("复查结果已更新")}><option>合格</option><option>不合格</option><option>不适用</option></select></td><td>已上传</td><td>正常</td></tr>)}</tbody></table>
              <div className="review-evidence-row">{reviewEvidence.map(([item, src]) => <button key={item} onClick={() => { setSelectedPhoto(item); setRectifyPreview({ title: item, type: "image", src }); }}><img src={src} alt={item} /><span>{item}</span></button>)}</div>
              <textarea className="rectify-textarea" value={reviewOpinion} onChange={(event) => setReviewOpinion(event.target.value)} />
              <div className="radio-row">{["复查通过", "复查不通过", "需补充整改"].map((item) => <label key={item}><input name="review" type="radio" defaultChecked={item === "复查通过"} />{item}</label>)}</div>
              {status === "待复查" && <footer className="tab-action-row"><button className="secondary-btn" onClick={() => { setReviewOpinion((text) => text.includes("已保存") ? text : `${text}\n复查记录已保存。`); setToast("复查记录已保存"); }}>保存复查记录</button><button className="primary-btn" onClick={passReview}>复查通过</button><button className="secondary-btn" onClick={() => setRectifyModal("reject")}>退回整改</button><button className="secondary-btn" onClick={passReview}>发起企业确认</button></footer>}
            </div>
          )}
          {activeTab === "企业确认" && (
            <div className="confirm-panel">
              <h3 className="tab-panel-title">企业确认信息</h3>
              <div className="photo-stat-grid">{[["企业名称", "齐鲁科技园管理有限公司"], ["确认人", "王磊"], ["职务", "安全主管"], ["确认状态", status === "待企业确认" ? "待确认" : "已确认"], ["发起确认时间", "2025-05-16 10:20"]].map((item) => <MiniStat key={item[0]} label={item[0]} value={item[1]} />)}</div>
              <section className="summary-card"><h3>整改结果摘要</h3><p>隐患名称：配电箱未关闭，存在触电风险</p><p>整改要求：关闭配电箱门并上锁，整理线缆，补贴警示标识</p><p>整改完成时间：2025-05-15 16:40；复查结果：复查通过；复查人员：李四</p></section>
              <div className="review-evidence-row">{confirmEvidence.map(([item, src]) => <button key={item} onClick={() => { setSelectedPhoto(item); setRectifyPreview({ title: item, type: "image", src }); }}><img src={src} alt={item} /><span>{item}</span></button>)}</div>
              <textarea className="rectify-textarea" value={companyOpinion} onChange={(event) => setCompanyOpinion(event.target.value)} />
              <div className="signature-area"><div className="signature-preview"><span>企业电子签名</span><strong>{confirmSigned ? "王磊" : "待签名"}</strong></div><div className="seal-preview"><span>企业电子章</span><strong>齐鲁科技园管理有限公司</strong></div><time>确认时间：2025-05-16 10:35</time></div>
              {status === "待企业确认" && <footer className="tab-action-row"><button className="secondary-btn" onClick={() => { const name = "文件：企业确认函.pdf"; setExtraEvidenceCards((items) => items.some((item) => item[0] === name) ? items : [...items, [name, "文件", "05-16 10:35", "王磊", demoMedia.images.reportCenterPages]]); setSelectedPhoto(name); setToast("企业确认函已上传"); }}>上传确认函</button><button className="secondary-btn" onClick={() => setRectifyModal("sign")}>电子签名</button><button className="primary-btn" onClick={passCompany}>企业确认通过</button><button className="secondary-btn" onClick={() => setRectifyModal("reject")}>退回复查</button></footer>}
            </div>
          )}
          {activeTab === "专家复核" && (
            <div className="expert-panel">
              <h3 className="tab-panel-title">专家复核信息</h3>
              <div className="photo-stat-grid">{[["专家姓名", "赵六"], ["专家类型", "电气安全专家"], ["职称", "高级工程师"], ["复核方式", "远程复核"], ["复核状态", "待复核"]].map((item) => <MiniStat key={item[0]} label={item[0]} value={item[1]} />)}</div>
              <DataTable headers={["资料清单", "完整性", "说明"]} rows={[["原始隐患照片", "已完整", "4张"], ["AI识别结果", "已完整", "已归档"], ["整改前后对比图", "已完整", "2张"], ["复查验收记录", "已完整", "6项"], ["企业确认材料", "待补充", "确认函待盖章"], ["相关标准依据", "已完整", "3条"]]} />
              <table className="action-table"><thead><tr><th>复核要点</th><th>判断依据</th><th>复核结果</th><th>说明</th></tr></thead><tbody>{["整改措施是否覆盖原隐患问题", "整改后是否消除触电风险", "线缆整理和绝缘处理是否符合要求", "警示标识是否清晰有效", "是否建议销号归档"].map((item) => <tr key={item}><td>{item}</td><td>现场证据+复查记录</td><td><select onChange={() => setToast("复核结果已更新")}><option>通过</option><option>不通过</option><option>需补充材料</option></select></td><td>符合要求</td></tr>)}</tbody></table>
              <textarea className="rectify-textarea" value={expertOpinion} onChange={(event) => setExpertOpinion(event.target.value)} />
              <div className="radio-row">{["复核通过，建议销号", "复核不通过，退回整改", "需补充材料后再审"].map((item) => <label key={item}><input name="expert" type="radio" defaultChecked={item === "复核通过，建议销号"} />{item}</label>)}</div>
              {status === "待专家复核" && <footer className="tab-action-row"><button className="secondary-btn" onClick={() => { setExpertOpinion((text) => text.includes("已暂存") ? text : `${text}\n专家意见已暂存。`); setToast("专家意见已暂存"); }}>暂存意见</button><button className="primary-btn" onClick={passExpert}>复核通过</button><button className="secondary-btn" onClick={() => setRectifyModal("reject")}>退回整改</button><button className="secondary-btn" onClick={() => setRectifyModal("material")}>要求补充材料</button><button className="secondary-btn" onClick={() => setActiveTab("销号归档")}>进入销号归档</button></footer>}
            </div>
          )}
          {activeTab === "销号归档" && (
            <div className="archive-panel">
              <h3 className="tab-panel-title">销号信息</h3>
              <div className="photo-stat-grid">{[["当前状态", status === "已销号" ? "已销号" : "待销号"], ["销号申请人", "张三"], ["销号审核人", "系统管理员"], ["申请时间", "2025-05-16 15:30"], ["归档编号", "ARCH202505160088"]].map((item) => <MiniStat key={item[0]} label={item[0]} value={item[1]} />)}</div>
              <DataTable headers={["闭环材料", "状态", "说明"]} rows={["隐患登记记录", "现场原始证据", "整改派发记录", "整改照片和说明", "复查验收记录", "企业确认材料", "专家复核意见", "整改前后对比图", "报告附件"].map((item) => [item, "已归档", "材料完整"])} />
              <div className="flow-track archive">{stepItems.map((item, index) => <div key={item} className={index <= currentIndex ? "active" : ""}><i /><b>{item}</b><span>{["李四", "赵六", "张三", "李四", "王磊", "赵六", "系统管理员"][index]}</span></div>)}</div>
              <section className="summary-card"><h3>销号结论</h3><p>隐患已完成整改并通过复查、企业确认及专家复核，符合销号归档条件。</p><p>归档位置：报告中心 / 证据链归档 / 齐鲁科技园 / 2025年5月</p></section>
              {status === "待销号归档" && <footer className="tab-action-row"><button className="secondary-btn" onClick={() => setRectifyModal("report")}>生成闭环报告</button><button className="primary-btn" onClick={() => setRectifyModal("close")}>确认销号</button><button className="secondary-btn" onClick={() => { setStatus("待专家复核"); setActiveTab("专家复核"); setToast("已退回专家复核"); }}>退回专家复核</button><button className="secondary-btn" onClick={() => { const blob = new Blob([`归档编号：ARCH202505160088\n隐患：YH20250514088\n状态：${status}`], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "隐患归档包.txt"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setToast("归档包已生成并开始下载"); }}>下载归档包</button></footer>}
            </div>
          )}
        </section>
        <aside className="rectify-side-stack">
          <section>
            <h3>整改任务信息</h3>
            <p><span>整改要求</span><b>配电箱门未关闭，建议纳入重点整改，要求立即整改。</b><Badge label="高风险" /></p>
            <p><span>责任部门</span><b>工程部</b></p>
            <p><span>整改期限</span><b>2025-05-16 17:00</b><em>已超期</em></p>
            <p><span>现场位置</span><b>2号楼B1层 配电室</b></p>
            <p><span>来源检查任务</span><b>RW20250516001 国控大厦项目 消防检查</b></p>
          </section>
          <section className="ai-rectify-card">
            <header><h3>AI整改建议</h3><button onClick={() => { setRectifyAiIndex((value) => (value + 1) % rectifyAiPlans.length); setToast("已切换一组 AI 建议"); }}>换一换</button></header>
            {rectifyAiPlans[rectifyAiIndex].map((item, index) => <p key={item}><span>{index + 1}</span>{item}</p>)}
          </section>
          <section>
            <h3>附件上传</h3>
            <div className="upload-grid"><button onClick={() => { const name = `整改后：补充现场图片 ${extraEvidenceCards.length + 1}`; setExtraEvidenceCards((items) => [...items, [name, "整改后", "05-16 11:00", "张三", demoMedia.images.rectificationProcess[5]]]); setSelectedPhoto(name); setActiveTab("整改照片"); setToast("已上传图片"); }}>上传图片<small>支持JPG、PNG、BMP</small></button><button onClick={() => { const name = `视频：补充整改视频 ${extraEvidenceCards.length + 1}`; setExtraEvidenceCards((items) => [...items, [name, "视频", "05-16 11:05", "张三", demoMedia.videos.rectificationBeforeAfter]]); setSelectedPhoto(name); setActiveTab("整改照片"); setToast("已上传视频"); }}>上传视频<small>支持MP4、MOV等</small></button></div>
          </section>
        </aside>
      </div>
      {rectifyModal === "upload" && <ActionModal title="上传整改图片" onClose={() => setRectifyModal(null)} footer={<><button className="secondary-btn" onClick={() => setRectifyModal(null)}>取消</button><button className="primary-btn" onClick={() => { const name = `整改后：弹窗上传图片 ${extraEvidenceCards.length + 1}`; setExtraEvidenceCards((items) => [...items, [name, "整改后", "05-16 11:18", "张三", demoMedia.images.rectificationProcess[6]]]); setSelectedPhoto(name); setActiveTab("整改照片"); setRectifyModal(null); setToast("整改图片已上传并加入照片列表"); }}>确认上传</button></>}><div className="upload-grid modal-upload image-only"><button onClick={() => setToast("已选择图片文件")}>上传图片<small>支持 JPG、PNG、BMP</small></button></div></ActionModal>}
      {rectifyModal === "reject" && <ActionModal title="退回原因" onClose={() => setRectifyModal(null)} footer={<><button className="secondary-btn" onClick={() => setRectifyModal(null)}>取消</button><button className="primary-btn" onClick={() => { setStatus(activeTab === "企业确认" ? "待复查" : "整改中"); setActiveTab(activeTab === "企业确认" ? "复查验收" : "整改信息"); setRectifyModal(null); setToast("已退回整改并记录原因"); }}>确认退回</button></>}><div className="modal-form"><label><span>原因</span><input defaultValue="需补充整改照片或完善现场说明" /></label></div></ActionModal>}
      {rectifyModal === "sign" && <ActionModal title="电子签名" onClose={() => setRectifyModal(null)} footer={<><button className="secondary-btn" onClick={() => setRectifyModal(null)}>取消</button><button className="primary-btn" onClick={() => { setConfirmSigned(true); setRectifyModal(null); setToast("电子签名已完成"); }}>确认签名</button></>}><div className="signature-preview">王磊</div></ActionModal>}
      {rectifyModal === "material" && <ActionModal title="补充材料要求" onClose={() => setRectifyModal(null)} footer={<><button className="secondary-btn" onClick={() => setRectifyModal(null)}>取消</button><button className="primary-btn" onClick={() => { setStatus("待补充材料"); setRectifyModal(null); setToast("已要求补充材料"); }}>发送要求</button></>}><div className="modal-form"><label><span>材料要求</span><input defaultValue="补充企业确认函盖章页和门锁细节照片" /></label></div></ActionModal>}
      {rectifyModal === "close" && <ActionModal title="确认销号" onClose={() => setRectifyModal(null)} footer={<><button className="secondary-btn" onClick={() => setRectifyModal(null)}>取消</button><button className="primary-btn" onClick={closeArchive}>确认销号</button></>}><p className="modal-note">确认后该隐患进入已销号状态，并归入证据链档案。</p></ActionModal>}
      {rectifyModal === "report" && <ActionModal title="闭环报告预览" onClose={() => setRectifyModal(null)} footer={<button className="primary-btn" onClick={() => { setRectifyModal(null); setToast("闭环报告已生成"); }}>生成报告</button>}><div className="contract-detail-card"><p><span>报告名称：</span><b>齐鲁科技园隐患闭环报告</b></p><p><span>归档编号：</span><b>ARCH202505160088</b></p><p><span>材料数量：</span><b>9项</b></p></div></ActionModal>}
      <MediaPreviewModal preview={rectifyPreview} onClose={() => setRectifyPreview(null)} />
    </div>
  );
}

function HazardStatisticsPage({ setView, setToast }: { setView: (view: HazardView) => void; setToast: (message: string) => void }) {
  const [statStart, setStatStart] = useState("2025-05-10");
  const [statEnd, setStatEnd] = useState("2025-05-16");
  const [statProject, setStatProject] = useState("全部项目/园区");
  const [statType, setStatType] = useState("全部类型");
  const [statRisk, setStatRisk] = useState("全部等级");
  const [statUnit, setStatUnit] = useState("全部单位");
  const [statStatus, setStatStatus] = useState("全部状态");
  const kpis = [
    ["隐患总数", "1,256", "↑ 12.6%", "blue"],
    ["高风险隐患", "238", "↑ 15.3%", "red"],
    ["超期预警", "152", "↑ 18.9%", "red"],
    ["整改中", "386", "↑ 6.7%", "orange"],
    ["待复查", "174", "↓ 3.2%", "blue"],
    ["已销号", "870", "↑ 14.1%", "green"],
    ["闭环率", "92.1%", "↑ 5.4%", "blue"]
  ];
  const topUnits = [["齐鲁科技园", "268"], ["消防运维服务部", "214"], ["智慧产业园", "178"], ["用电安全管理部", "132"], ["国控管理中心", "108"], ["综合管理部", "86"], ["物业服务中心", "82"], ["设备运维部", "74"], ["工程管理部", "61"], ["鲁商广场", "51"]];
  return (
    <div className="hazard-dashboard-page">
      <div className="dashboard-filter-line">
        <SelectBox label="项目/园区" value={statProject} options={["全部项目/园区", "齐鲁科技园", "国控大厦项目"].map(toOption)} onChange={(value) => { setStatProject(value); setToast(`已筛选项目/园区：${value}`); }} />
        <label><span>开始日期</span><input type="date" value={statStart} onChange={(event) => setStatStart(event.target.value)} /></label>
        <label><span>结束日期</span><input type="date" value={statEnd} onChange={(event) => setStatEnd(event.target.value)} /></label>
        <SelectBox label="隐患类型" value={statType} options={["全部类型", "用电安全", "消防安全", "动火作业"].map(toOption)} onChange={(value) => { setStatType(value); setToast(`已筛选隐患类型：${value}`); }} />
        <SelectBox label="风险等级" value={statRisk} options={["全部等级", "高风险", "中风险", "低风险"].map(toOption)} onChange={(value) => { setStatRisk(value); setToast(`已筛选风险等级：${value}`); }} />
        <SelectBox label="责任单位" value={statUnit} options={["全部单位", "山东国控企管", "齐鲁科技园"].map(toOption)} onChange={(value) => { setStatUnit(value); setToast(`已筛选责任单位：${value}`); }} />
        <SelectBox label="状态" value={statStatus} options={["全部状态", "整改中", "待复查", "已销号"].map(toOption)} onChange={(value) => { setStatStatus(value); setToast(`已筛选状态：${value}`); }} />
        <button className="primary-btn" onClick={() => setToast(`已查询：${statProject} / ${statType} / ${statRisk}`)}>查询</button>
        <button className="secondary-btn" onClick={() => { setStatProject("全部项目/园区"); setStatType("全部类型"); setStatRisk("全部等级"); setStatUnit("全部单位"); setStatStatus("全部状态"); setToast("统计筛选已重置"); }}>重置</button>
        <button className="secondary-btn" onClick={() => setToast("已生成统计报表")}>导出报表</button>
      </div>
      <div className="hazard-kpi-grid">{kpis.map(([label, value, trend, tone]) => <button key={label} className={`hazard-kpi ${tone}`} onClick={() => label.includes("超期") ? setView("overdue") : setView("rectification")}><i /> <span>{label}</span><strong>{value}</strong><small>环比上月 <b>{trend}</b></small></button>)}</div>
      <div className="dashboard-grid">
        <div className="dashboard-analysis-row">
        <section className="dashboard-card wide chart-fixed"><header><h3>隐患趋势分析</h3><div><button className="active" onClick={() => setToast("已切换日视图")}>日</button><button onClick={() => setToast("已切换周视图")}>周</button><button onClick={() => setToast("已切换月视图")}>月</button><button onClick={() => setView("rectification")}>更多</button></div></header><LineCard data={riskTrend} colors={["#2f80ed", "#18a863", "#f6b500"]} keys={["高风险", "较高风险", "中风险"]} xKey="day" /></section>
        <section className="dashboard-card"><header><h3>责任单位隐患排行 TOP10</h3><button onClick={() => setView("rectification")}>更多</button></header><div className="rank-bars">{topUnits.map(([name, value], index) => <p key={name}><span>{index + 1}</span><b>{name}</b><i style={{ width: `${Math.max(18, Number(value) / 3)}%` }} /><em>{value}</em></p>)}</div></section>
        </div>
        <div className="dashboard-chart-row">
        <section className="dashboard-card chart-fixed"><header><h3>隐患类型分布</h3><button onClick={() => setView("rectification")}>更多</button></header><RectificationChart /></section>
        <section className="dashboard-card chart-fixed"><header><h3>风险等级分布</h3><button onClick={() => setView("overdue")}>更多</button></header><RectificationChart /></section>
        </div>
        <div className="dashboard-chart-row">
        <section className="dashboard-card"><header><h3>本月督办提醒</h3><button onClick={() => setView("overdue")}>更多</button></header><div className="reminder-list">{["高风险隐患超期未整改（5项）", "中风险隐患即将超期（12项）", "复查待处理（17项）", "专家复核待分配（8项）"].map((item, index) => <button key={item} onClick={() => setView(index === 0 ? "overdue" : "rectification")}><i className={`dot-${index}`} />{item}<span>{index === 0 ? "高优先级" : index === 3 ? "低优先级" : "中优先级"}</span></button>)}</div><button className="full-width-link" onClick={() => setView("rectification")}>进入隐患闭环管理 →</button></section>
        <section className="dashboard-card"><header><h3>闭环效率分析</h3><button onClick={() => setToast("已打开闭环效率明细")}>更多</button></header><div className="efficiency-grid">{[["平均整改时长", "4.6天", "↓ 0.6天"], ["复查通过率", "87.6%", "↑ 4.3%"], ["专家复核次数", "126次", "↑ 12.5%"], ["闭环率", "92.1%", "↑ 5.4%"]].map((item) => <MiniStat key={item[0]} label={`${item[0]} ${item[2]}`} value={item[1]} />)}</div></section>
        </div>
        <div className="dashboard-table-row">
        <section className="dashboard-card wide"><header><h3>重点隐患清单</h3><button onClick={() => setView("rectification")}>进入闭环</button></header><DataTable headers={["隐患编号", "隐患描述", "所属项目", "隐患类型", "风险等级", "责任单位", "整改状态", "超期天数", "发现时间", "操作"]} rows={[["YH20250516001", "配电箱门未关闭，存在触电风险", "齐鲁科技园", "用电安全", "高风险", "齐鲁科技园", "整改中", "5", "2025-05-16 10:31", "查看详情"], ["YH20250515023", "灭火器压力不足", "智慧产业园", "消防安全", "中风险", "物业服务中心", "整改中", "3", "2025-05-15 14:22", "查看详情"], ["YH20250514017", "临时用电线路敷设不规范", "鲁商广场", "临时用电", "中风险", "工程管理部", "待复查", "0", "2025-05-14 09:48", "查看详情"]]} /></section>
        </div>
      </div>
    </div>
  );
}

function HazardOverduePage({ setToast }: { setToast: (message: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("全部预警");
  const [warningLevel, setWarningLevel] = useState("全部");
  const [riskFilter, setRiskFilter] = useState("全部");
  const [projectFilter, setProjectFilter] = useState("全部");
  const [unitFilter, setUnitFilter] = useState("全部");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [search, setSearch] = useState("");
  const [evidencePreview, setEvidencePreview] = useState<MediaPreview | null>(null);
  const [rows, setRows] = useState([
    ["RPT20250516001", "配电箱未关闭，存在触电风险", "齐鲁科技园", "高风险", "齐鲁科技园", "张三", "2025-05-09", "7天", "待整改", "2025-05-15 10:30"],
    ["RPT20250515045", "灭火器压力不足", "齐鲁科技园", "高风险", "齐鲁科技园", "李四", "2025-05-08", "8天", "已催办", "2025-05-14 14:20"],
    ["RPT20250516023", "应急照明损坏", "鲁商广场", "中风险", "鲁商广场", "王五", "2025-05-19", "2天", "即将超期", "-"],
    ["RPT20250514032", "线路裸露，绝缘防护不足", "山东国控大数据中心", "高风险", "数据中心运维部", "赵六", "2025-05-07", "9天", "待整改", "2025-05-13 09:15"],
    ["RPT20250513018", "消防通道堆放杂物", "国控大厦项目", "中风险", "后勤保障部", "周七", "2025-05-06", "10天", "已催办", "2025-05-12 16:45"],
    ["RPT20250516067", "指示标识缺失", "高新智慧产业园", "低风险", "高新区物业", "陈八", "2025-05-20", "1天", "即将超期", "-"],
    ["RPT20250512011", "配电柜门未关闭", "齐鲁科技园", "高风险", "齐鲁科技园", "孙九", "2025-05-05", "11天", "已升级", "2025-05-12 10:05"],
    ["RPT20250511005", "接地线未连接", "鲁商广场", "中风险", "鲁商广场", "郑十", "2025-05-04", "12天", "待整改", "2025-05-11 11:20"]
  ]);
  const urge = (id: string) => {
    setRows((items) => items.map((row) => row[0] === id ? [...row.slice(0, 8), "已催办", "2025-05-16 10:00"] : row));
    setToast(`已发送 ${id} 催办提醒`);
  };
  const batchUrge = () => {
    setRows((items) => items.map((row) => ["待整改", "即将超期"].includes(row[8]) ? [...row.slice(0, 8), "已催办", "2025-05-16 10:00"] : row));
    setToast("已批量催办当前待处理预警");
  };
  const escalate = (id: string) => {
    setRows((items) => items.map((row) => row[0] === id ? [...row.slice(0, 8), "已升级", row[9]] : row));
    setToast("已升级处置");
  };
  const startReview = (id: string) => {
    setRows((items) => items.map((row) => row[0] === id ? [...row.slice(0, 8), "待复查", "2025-05-16 11:20"] : row));
    setToast("已发起复查");
  };
  const tabItems = ["全部预警", "高风险超期", "即将超期", "已催办", "已升级"];
  const matchTab = (row: string[], tab: string) => {
    if (tab === "高风险超期") return row[3] === "高风险";
    if (tab === "即将超期") return row[8] === "即将超期";
    if (tab === "已催办") return row[8] === "已催办";
    if (tab === "已升级") return row[8] === "已升级";
    return true;
  };
  const matchWarningLevel = (row: string[]) => {
    if (warningLevel === "严重预警") return row[3] === "高风险" && row[8] !== "已升级";
    if (warningLevel === "重点提醒") return row[3] !== "低风险";
    if (warningLevel === "一般提醒") return row[3] === "低风险";
    return true;
  };
  const visibleRows = useMemo(() => rows.filter((row) => {
    const keyword = search.trim();
    return matchTab(row, activeTab)
      && matchWarningLevel(row)
      && (riskFilter === "全部" || row[3] === riskFilter)
      && (projectFilter === "全部" || row[2] === projectFilter)
      && (unitFilter === "全部" || row[4] === unitFilter)
      && (statusFilter === "全部" || row[8] === statusFilter)
      && (!keyword || row.join(" ").includes(keyword));
  }), [rows, activeTab, warningLevel, riskFilter, projectFilter, unitFilter, statusFilter, search]);
  const current = selected ? rows.find((row) => row[0] === selected) ?? null : null;
  const countTab = (tab: string) => rows.filter((row) => matchTab(row, tab)).length;
  const drawerEvidence = [
    { title: "配电箱未关闭", src: demoMedia.images.electricalPanelOpen },
    { title: "线缆裸露", src: demoMedia.images.cableExposed },
    { title: "消防通道占用", src: demoMedia.images.fireCorridorBlocked },
    { title: "灭火器压力不足", src: demoMedia.images.extinguisherLowPressure },
    { title: "现场复查照片", src: demoMedia.images.rectificationAfter }
  ];
  const resetFilters = () => {
    setWarningLevel("全部");
    setRiskFilter("全部");
    setProjectFilter("全部");
    setUnitFilter("全部");
    setStatusFilter("全部");
    setSearch("");
    setActiveTab("全部预警");
    setSelected(null);
    setToast("筛选条件已重置");
  };
  const downloadOverdueList = () => {
    const content = ["隐患编号,隐患描述,所属项目,风险等级,责任单位,整改责任人,整改期限,超期天数,当前状态,最近催办时间", ...visibleRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "隐患超期预警列表.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("已导出当前筛选结果");
  };

  return (
    <div className="overdue-warning-page">
      <div className={`overdue-shell ${current ? "detail-open" : ""}`}>
        <main className="overdue-main">
          <div className="overdue-kpis">
            {[
              ["超期隐患总数", String(rows.length), "↑ 12", "全部预警"],
              ["高风险超期", String(countTab("高风险超期")), "↑ 6", "高风险超期"],
              ["即将超期（≤3天）", String(countTab("即将超期")), "↓ 4", "即将超期"],
              ["已催办", String(countTab("已催办")), "↑ 8", "已催办"],
              ["已升级处置", String(countTab("已升级")), "↑ 2", "已升级"]
            ].map((item, index) => <button key={item[0]} className={`overdue-kpi tone-${index} ${activeTab === item[3] ? "active" : ""}`} onClick={() => { setActiveTab(item[3]); setSelected(null); }}><i /><span>{item[0]}</span><strong>{item[1]}</strong><small>较昨日 {item[2]}</small></button>)}
          </div>
          <section className="overdue-filter-card">
            <SelectBox label="预警级别" value={warningLevel} options={["全部", "严重预警", "重点提醒", "一般提醒"].map(toOption)} onChange={(value) => { setWarningLevel(value); setSelected(null); }} />
            <SelectBox label="风险等级" value={riskFilter} options={["全部", "高风险", "中风险", "低风险"].map(toOption)} onChange={(value) => { setRiskFilter(value); setSelected(null); }} />
            <SelectBox label="所属项目" value={projectFilter} options={["全部", "齐鲁科技园", "鲁商广场", "国控大厦项目", "山东国控大数据中心", "高新智慧产业园"].map(toOption)} onChange={(value) => { setProjectFilter(value); setSelected(null); }} />
            <SelectBox label="责任单位" value={unitFilter} options={["全部", "齐鲁科技园", "鲁商广场", "数据中心运维部", "后勤保障部", "高新区物业"].map(toOption)} onChange={(value) => { setUnitFilter(value); setSelected(null); }} />
            <SelectBox label="当前状态" value={statusFilter} options={["全部", "待整改", "已催办", "已升级", "即将超期", "待复查"].map(toOption)} onChange={(value) => { setStatusFilter(value); setSelected(null); }} />
            <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setSelected(null); }} placeholder="隐患编号/描述" /></label>
            <button className="primary-btn" onClick={() => setToast(`已查询到 ${visibleRows.length} 条预警`)}>查询</button>
            <button className="secondary-btn" onClick={resetFilters}>重置</button>
            <button className="secondary-btn" onClick={batchUrge}>批量催办</button>
            <button className="secondary-btn" onClick={downloadOverdueList}>导出列表</button>
          </section>
          <section className="overdue-table-card">
            <div className="overdue-tabs">
              {tabItems.map((item) => <button key={item} className={activeTab === item ? "active" : ""} onClick={() => { setActiveTab(item); setSelected(null); }}>{item}（{countTab(item)}）</button>)}
              <button onClick={() => { setRows((items) => [...items]); setSelected(null); setToast("列表已刷新"); }}>刷新</button>
            </div>
            <div className="overdue-tags"><span>超期天数分布：</span><b>≥30天 18项</b><b>15-30天 20项</b><b>8-15天 14项</b><b>4-7天 16项</b><span>风险等级分布：高风险 24 / 中风险 32 / 低风险 12</span></div>
            <table className="action-table">
              <thead><tr>{["预警级别", "隐患编号", "隐患描述", "所属项目", "风险等级", "责任单位", "整改责任人", "整改期限", "超期天数", "当前状态", "最近催办时间", "操作"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>{visibleRows.map((row) => <tr key={row[0]} className={selected === row[0] ? "selected-row" : ""} onClick={() => setSelected(row[0])}><td>预警</td><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td><Badge label={row[3]} /></td><td>{row[4]}</td><td>{row[5]}</td><td>{row[6]}</td><td>{row[7]}</td><td><Badge label={row[8]} /></td><td>{row[9]}</td><td><button onClick={(event) => { event.stopPropagation(); setSelected(row[0]); }}>查看</button><button onClick={(event) => { event.stopPropagation(); urge(row[0]); }}>催办</button></td></tr>)}</tbody>
            </table>
            {visibleRows.length === 0 && <p className="empty-state">暂无符合条件的预警记录</p>}
          </section>
        </main>
        {current && <aside className="overdue-drawer">
          <header><h3>{current[1]}</h3><button onClick={() => setSelected(null)}>×</button></header>
          <div className="drawer-tags"><Badge label={current[3]} /><Badge label={`已超期 ${current[7]}`} /><Badge label={current[8]} /></div>
          <section><h4>基本信息</h4><p>隐患编号：<b>{current[0]}</b><span>风险等级：<Badge label={current[3]} /></span></p><p>所属项目：<b>{current[2]}</b></p><p>发现位置：<b>配电室 / 配电箱 A-01</b></p><p>整改期限：<b>{current[6]} 18:00:00（已超期 {current[7]}）</b></p><p>整改责任人：<b>{current[5]} / 138****1234</b></p></section>
          <section><h4>超期原因分析</h4><ul><li>整改计划排期滞后，责任单位未按时安排整改人员与备件。</li><li>现场条件受限，配电室部分设备带电运行，需停电协调。</li><li>监督跟进不足，整改过程中未及时反馈进度。</li></ul></section>
          <section><h4>处理进度</h4><div className="drawer-flow">{["发现隐患", "派发整改", "催办提醒", "升级处置", "待复查"].map((item, index) => <span key={item} className={index < 3 ? "done" : ""}><i />{item}<em>{index < 3 ? ["2025-05-01", "2025-05-01", "2025-05-13"][index] : "-"}</em></span>)}</div></section>
          <section><h4>最近证据</h4><div className="drawer-evidence">{drawerEvidence.map((item) => <button key={item.title} onClick={() => setEvidencePreview({ title: `${item.title} / ${current[0]}`, type: "image", src: item.src })}><img src={item.src} alt={item.title} /></button>)}</div></section>
          <section><h4>督办建议</h4><p>建议立即安排维修人员关闭配电箱门，并复查电气安全，防止触电事故发生；同时加强日常隐患查频次，确保类似问题不再发生。</p></section>
          <footer><button className="secondary-btn" onClick={() => urge(current[0])}>催办提醒</button><button className="primary-btn" onClick={() => escalate(current[0])}>升级处置</button><button className="secondary-btn" onClick={() => startReview(current[0])}>发起复查</button><button className="secondary-btn" onClick={() => setEvidencePreview({ title: `隐患详情：${current[0]}`, type: "image", src: drawerEvidence[0].src })}>查看详情</button></footer>
        </aside>}
      </div>
      <MediaPreviewModal preview={evidencePreview} onClose={() => setEvidencePreview(null)} />
    </div>
  );
}

function SelectInline({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select>;
}

type HelmetStatusItem = { label: string; value: string; detail?: string; meter?: number; tone?: "green" | "blue" | "orange" | "red" };
type HelmetSensorItem = { label: string; value: string; state: string; tone: "green" | "orange" | "red" | "blue" };
type HelmetChecklistItem = { id: number; name: string; status: "正常" | "异常" | "待检查"; hazardKey?: string };
type HelmetRiskLevel = "高风险" | "中风险" | "低风险" | "建议人工复核";
type HelmetBBox = { x: number; y: number; w: number; h: number };
type HelmetSuspectedHazard = { key: string; candidateId?: string; name: string; time: string; confidence: string; risk: HelmetRiskLevel; boxClass?: string; evidence: string; bbox?: HelmetBBox; description?: string; rectificationSuggestion?: string; needExpertReview?: boolean };
type HelmetHazardRecord = { id: string; key: string; candidateId?: string; desc: string; risk: HelmetRiskLevel; status: string; foundTime: string; orderReady?: boolean; rectificationSuggestion?: string; draftId?: string };
type HelmetTimelineSegment = { label: string; start: string; end: string; status: "normal" | "abnormal" | "pending" | "current"; width: number };
type HelmetLiveState = { deviceId: string; deviceName: string; online: boolean; battery: number; network: string; taskId: string; taskName: string; inspector: string; streamUrl: string; aiEnabled: boolean; runTime: string; lastAnalysis?: HelmetAnalysis };
type HelmetDetection = { id: string; candidateId?: string; hazardName: string; category: string; riskLevel: HelmetRiskLevel; confidence: number; bbox?: HelmetBBox; description: string; rectificationSuggestion: string; needExpertReview: boolean };
type HelmetAnalysis = { analysisId: string; deviceId: string; taskId: string; captureTime: string; hasHazard: boolean; overallRiskLevel: HelmetRiskLevel; summary: string; detections: HelmetDetection[]; candidates?: (HelmetDetection & { candidateId: string; status: string })[]; provider: string };
type RectificationResult = { suggestions: string[]; basisKeywords: string[]; needExpertReview: boolean };
type HelmetModelStatus = { provider: string; analysisId?: string; summary?: string; captureTime?: string; detections: number; loading: boolean; boxes: HelmetSuspectedHazard[] };

const deviceStatus: HelmetStatusItem[] = [
  { label: "安全帽编号", value: "AAS-20250516-001" },
  { label: "电量", value: "78%", meter: 78, tone: "green" },
  { label: "存储空间", value: "62%", detail: "62GB/100GB", meter: 62, tone: "blue" },
  { label: "网络状态", value: "5G", tone: "green" },
  { label: "GPS定位", value: "北纬 31.2304° / 东经 121.4737°", tone: "blue" },
  { label: "移动速度", value: "1.2 m/s" },
  { label: "设备温度", value: "32.6 °C", tone: "green" },
  { label: "运行时长", value: "02:45:18" },
  { label: "连接状态", value: "稳定", tone: "green" }
];

const aiStatus: HelmetSensorItem[] = [
  { label: "跌倒检测", value: "未触发", state: "正常", tone: "green" },
  { label: "红外测温", value: "36.5 °C", state: "正常", tone: "green" },
  { label: "环境光照", value: "良好 320 lux", state: "正常", tone: "green" },
  { label: "烟雾检测", value: "未检测到", state: "正常", tone: "green" },
  { label: "AI识别状态", value: "3项异常识别", state: "告警", tone: "red" }
];

const checklist: HelmetChecklistItem[] = [
  { id: 1, name: "配电箱外观检查", status: "正常" },
  { id: 2, name: "配电箱门状态", status: "异常", hazardKey: "panel" },
  { id: 3, name: "线缆连接情况", status: "异常", hazardKey: "cable" },
  { id: 4, name: "接地线连接检查", status: "正常" },
  { id: 5, name: "灭火器检查", status: "异常", hazardKey: "extinguisher" },
  { id: 6, name: "绝缘垫检查", status: "待检查" }
];

const suspectedHazards: HelmetSuspectedHazard[] = [
  { key: "panel", name: "配电箱未关闭", time: "15:04:12", confidence: "0.94", risk: "高风险", boxClass: "box-panel", evidence: demoMedia.images.electricalPanelOpen },
  { key: "cable", name: "线缆裸露", time: "15:04:15", confidence: "0.89", risk: "高风险", boxClass: "box-cable", evidence: demoMedia.images.cableExposed },
  { key: "extinguisher", name: "灭火器压力不足", time: "15:04:18", confidence: "0.91", risk: "中风险", boxClass: "box-extinguisher", evidence: demoMedia.images.extinguisherLowPressure }
];

const hazardRecords: HelmetHazardRecord[] = [
  { id: "YH20250516001-001", key: "panel", desc: "配电箱门未关闭", risk: "高风险", status: "待派发", foundTime: "2025-05-16 15:04:12" },
  { id: "YH20250516001-002", key: "cable", desc: "线缆裸露，未做绝缘防护", risk: "高风险", status: "待派发", foundTime: "2025-05-16 15:04:15" },
  { id: "YH20250516001-003", key: "extinguisher", desc: "灭火器压力不足", risk: "中风险", status: "待复查", foundTime: "2025-05-16 15:04:18" },
  { id: "YH20250516001-004", key: "dust", desc: "配电箱内灰尘较多", risk: "低风险", status: "待整改", foundTime: "2025-05-16 15:10:22" },
  { id: "YH20250516001-005", key: "ground", desc: "接地线标识不清晰", risk: "低风险", status: "已整改", foundTime: "2025-05-16 15:12:45" }
];

function normalizeHelmetRisk(value: string): HelmetRiskLevel {
  if (value.includes("高")) return "高风险";
  if (value.includes("中")) return "中风险";
  if (value.includes("低")) return "低风险";
  return "建议人工复核";
}

function boxClassByName(name: string) {
  if (name.includes("线缆")) return "box-cable";
  if (name.includes("灭火器")) return "box-extinguisher";
  return "box-panel";
}

function evidenceByName(name: string) {
  if (name.includes("线缆")) return demoMedia.images.cableExposed;
  if (name.includes("灭火器")) return demoMedia.images.extinguisherLowPressure;
  if (name.includes("消防通道")) return demoMedia.images.fireCorridorBlocked;
  return demoMedia.images.electricalPanelOpen;
}

function formatAnalysisTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 19) || "15:04:12";
  return date.toTimeString().slice(0, 8);
}

function formatProviderName(provider: string) {
  if (!provider) return "未读取";
  if (provider === "yolo") return "OpenCV YOLO26n";
  if (provider === "yolo-fallback-mock") return "OpenCV YOLO 回退 Mock";
  if (provider.includes("fallback")) return `${provider} 回退`;
  if (provider === "mock") return "Mock 演示数据";
  if (provider === "openai") return "OpenAI 视觉模型";
  if (provider === "qwen") return "通义千问视觉模型";
  if (provider === "deepseek") return "DeepSeek";
  return provider;
}

function providerTone(provider: string) {
  if (provider === "yolo") return "ok";
  if (provider.includes("fallback")) return "warn";
  if (provider === "mock") return "mock";
  return "ok";
}

async function imageAssetToDataUrl(src: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context || !canvas.width || !canvas.height) throw new Error("图片画面不可用");
  context.drawImage(image, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  if (!dataUrl.includes(",") || dataUrl.endsWith(",")) throw new Error("图片转换为空");
  return dataUrl;
}

function mapDetectionToHazard(detection: HelmetDetection, captureTime: string): HelmetSuspectedHazard {
  return {
    key: detection.candidateId ?? detection.id,
    candidateId: detection.candidateId,
    name: detection.hazardName,
    time: formatAnalysisTime(captureTime),
    confidence: detection.confidence.toFixed(2),
    risk: normalizeHelmetRisk(detection.riskLevel),
    boxClass: boxClassByName(detection.hazardName),
    evidence: evidenceByName(detection.hazardName),
    bbox: detection.bbox,
    description: detection.description,
    rectificationSuggestion: detection.rectificationSuggestion,
    needExpertReview: detection.needExpertReview
  };
}

function mapDetectionToRecord(detection: HelmetDetection, analysis: HelmetAnalysis): HelmetHazardRecord {
  const key = detection.candidateId ?? detection.id;
  return {
    id: `YH${analysis.captureTime.replace(/\D/g, "").slice(0, 12)}-${detection.id}`,
    key,
    candidateId: detection.candidateId,
    desc: detection.hazardName,
    risk: normalizeHelmetRisk(detection.riskLevel),
    status: "待确认",
    foundTime: analysis.captureTime.replace("T", " ").slice(0, 19),
    rectificationSuggestion: detection.rectificationSuggestion
  };
}

const timelineSegments: HelmetTimelineSegment[] = [
  { label: "正常", start: "14:30", end: "14:45", status: "normal", width: 24 },
  { label: "异常", start: "14:45", end: "15:00", status: "abnormal", width: 23 },
  { label: "当前", start: "15:00", end: "15:05", status: "current", width: 8 },
  { label: "待检查", start: "15:05", end: "15:30", status: "pending", width: 45 }
];

const helmetDeviceOptions = [
  { name: "aa的智能安全帽", project: "齐鲁科技园" },
  { name: "bb的智能安全帽", project: "国控大厦项目" },
  { name: "cc的智能安全帽", project: "鲁商广场" },
  { name: "dd的智能安全帽", project: "高新智造产业园" }
];

function HelmetLivePage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string) => void }) {
  const [project, setProject] = useState("全部项目");
  const [device, setDevice] = useState("aa的智能安全帽");
  const [hdMode, setHdMode] = useState(true);
  const [recording, setRecording] = useState(false);
  const [talking, setTalking] = useState(false);
  const [lightOn, setLightOn] = useState(false);
  const [infrared, setInfrared] = useState(false);
  const [retakeMode, setRetakeMode] = useState(false);
  const [activeChecklistId, setActiveChecklistId] = useState(2);
  const [activeHazardKey, setActiveHazardKey] = useState("panel");
  const [hazards, setHazards] = useState<HelmetHazardRecord[]>(hazardRecords);
  const [screenshots, setScreenshots] = useState<HelmetHazardRecord[]>([]);
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [detail, setDetail] = useState<HelmetHazardRecord | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState<HelmetModelStatus>({ provider: "读取中", detections: 0, loading: true, boxes: [] });
  const visibleHazards = modelStatus.provider === "yolo" ? modelStatus.boxes : suspectedHazards;
  const activeHazard = visibleHazards.find((item) => item.key === activeHazardKey) ?? visibleHazards[0] ?? suspectedHazards[0];
  const activeChecklist = checklist.find((item) => item.id === activeChecklistId) ?? checklist[1];
  const allHazards = [...screenshots, ...hazards];
  const helmetProjectOptions = ["全部项目", ...Array.from(new Set(helmetDeviceOptions.map((item) => item.project)))];
  const filteredHelmetDevices = helmetDeviceOptions.filter((item) => project === "全部项目" || item.project === project);
  const updateModelStatus = (analysis: HelmetAnalysis | null) => {
    setModelStatus({
      provider: analysis?.provider ?? "未分析",
      analysisId: analysis?.analysisId,
      captureTime: analysis?.captureTime,
      summary: analysis?.summary,
      detections: analysis?.detections?.length ?? 0,
      boxes: analysis ? analysis.detections.map((item) => mapDetectionToHazard(item, analysis.captureTime)) : [],
      loading: false
    });
  };
  useEffect(() => {
    let cancelled = false;
    apiGet<HelmetAnalysis | null>("/vision/latest?deviceId=SHM20250516001")
      .then((analysis) => { if (!cancelled) updateModelStatus(analysis); })
      .catch(() => { if (!cancelled) setModelStatus({ provider: "未连接", detections: 0, loading: false, boxes: [], summary: "未读取到后端模型状态" }); });
    return () => { cancelled = true; };
  }, []);
  const verifyYoloModel = async () => {
    setModelStatus((current) => ({ ...current, loading: true }));
    try {
      const frameBase64 = await imageAssetToDataUrl(infrared ? demoMedia.images.infraredOverheat : demoMedia.images.hotWorkTempPower);
      const analysis = await apiPost<HelmetAnalysis>("/vision/analyze-frame", {
        deviceId: "SHM20250516001",
        taskId: "TASK20250516001",
        captureTime: new Date().toISOString(),
        frameBase64
      });
      updateModelStatus(analysis);
      setToast(`已调用模型：${formatProviderName(analysis.provider)}`);
    } catch (error) {
      setModelStatus({ provider: "调用失败", detections: 0, loading: false, boxes: [], summary: error instanceof Error ? error.message : "模型调用失败" });
      setToast("模型验证失败，请查看后端日志");
    }
  };
  const updateHelmetProject = (value: string) => {
    setProject(value);
    const nextDevices = helmetDeviceOptions.filter((item) => value === "全部项目" || item.project === value);
    if (nextDevices.length > 0 && !nextDevices.some((item) => item.name === device)) setDevice(nextDevices[0].name);
    setToast(`已筛选项目：${value}`);
  };
  const captureScreenshot = () => {
    const id = `YH20250516001-S${String(screenshots.length + 1).padStart(2, "0")}`;
    const row: HelmetHazardRecord = { id, key: "screenshot", desc: `现场截图取证 ${screenshots.length + 1}`, risk: "中风险", status: "待派发", foundTime: `2025-05-16 15:${String(6 + screenshots.length).padStart(2, "0")}:00` };
    setScreenshots((items) => [row, ...items]);
    setActiveHazardKey(row.key);
    setToast("截图成功，已追加到现场隐患记录");
  };
  const generateOrder = (id: string) => {
    setHazards((items) => items.map((item) => item.id === id ? { ...item, orderReady: true } : item));
    setScreenshots((items) => items.map((item) => item.id === id ? { ...item, orderReady: true } : item));
    setToast("整改单已生成");
  };
  const dispatchRecord = (id: string) => {
    setHazards((items) => items.map((item) => item.id === id ? { ...item, status: item.status === "待整改" ? "整改中" : "待整改" } : item));
    setScreenshots((items) => items.map((item) => item.id === id ? { ...item, status: "待整改" } : item));
    setToast(`${id} 已派发整改`);
  };
  const chooseChecklist = (item: HelmetChecklistItem) => {
    setActiveChecklistId(item.id);
    if (item.hazardKey) setActiveHazardKey(item.hazardKey);
    setToast(`已聚焦检查项：${item.name}`);
  };
  const chooseHazard = (item: HelmetSuspectedHazard) => {
    setActiveHazardKey(item.key);
    setToast(`已高亮识别框：${item.name}`);
  };
  const openMoreAction = (action: string) => {
    setMoreOpen(false);
    if (action === "download") {
      downloadAsset(demoMedia.videos.helmetLive, "helmet_live_clip.mp4");
      setToast("视频片段已下载");
      return;
    }
    if (action === "history") {
      setPreview({ title: "历史关键帧", type: "image", src: activeHazard.evidence });
      return;
    }
    downloadText("安全帽现场证据.txt", `任务：配电室日常巡检\n当前隐患：${activeHazard.name}\n记录数：${allHazards.length}`);
    setToast("证据已导出");
  };
  return (
    <section className="helmet-terminal-page">
      <HelmetLiveHeader project={project} projectOptions={helmetProjectOptions} setProject={updateHelmetProject} device={device} deviceOptions={filteredHelmetDevices.map((item) => item.name)} setDevice={(value) => { setDevice(value); setToast(`已切换设备：${value}`); }} onFullscreen={() => setToast("已切换现场终端全屏视图")} onSettings={() => setToast("已打开现场终端设置")} onExit={() => navigate("dashboard", "已退出现场终端")} />
      <div className="helmet-terminal-grid">
        <aside className="helmet-side-stack">
          <DeviceStatusCard deviceStatus={deviceStatus} />
          <SensorStatusCard aiStatus={aiStatus} />
          <QuickActionsCard hdMode={hdMode} talking={talking} lightOn={lightOn} onToggleHd={() => { setHdMode((value) => !value); setToast(hdMode ? "已切换为标准视频" : "已切换为高清视频"); }} onScreenshot={captureScreenshot} onTalk={() => { setTalking((value) => !value); setToast(talking ? "语音对讲已关闭" : "语音对讲中"); }} onLight={() => { setLightOn((value) => !value); setToast(lightOn ? "补光灯已关闭" : "补光灯已开启"); }} onSos={() => setSosOpen(true)} />
        </aside>
        <main className="helmet-main-stack">
          <LiveVideoPanel activeHazardKey={activeHazardKey} hdMode={hdMode} recording={recording} talking={talking} infrared={infrared} lightOn={lightOn} retakeMode={retakeMode} suspectedHazards={visibleHazards} checklistItem={activeChecklist} modelStatus={modelStatus} onVerifyModel={verifyYoloModel} onScreenshot={captureScreenshot} onRecord={() => { setRecording((value) => !value); setToast(recording ? "录制已停止" : "现场录制已开始"); }} onTalk={() => { setTalking((value) => !value); setToast(talking ? "对讲已释放" : "正在对讲"); }} onInfrared={() => { setInfrared((value) => !value); setToast(infrared ? "已切回普通画面" : "已切换红外模式"); }} onLight={() => { setLightOn((value) => !value); setToast(lightOn ? "补光灯已关闭" : "补光灯已开启"); }} moreOpen={moreOpen} setMoreOpen={setMoreOpen} onMoreAction={openMoreAction} onPreview={() => setPreview({ title: `${device} 第一视角视频`, type: "video", src: demoMedia.videos.helmetLive })} />
          <TimelinePanel timelineSegments={timelineSegments} />
          <HazardRecordTable records={allHazards} activeKey={activeHazardKey} onFocus={(record) => { setActiveHazardKey(record.key); setDetail(record); }} onGenerate={generateOrder} onDispatch={dispatchRecord} />
        </main>
        <aside className="helmet-side-stack">
          <ChecklistPanel checklist={checklist} activeId={activeChecklistId} onSelect={chooseChecklist} />
          <SuspectedHazardsPanel suspectedHazards={visibleHazards} activeKey={activeHazardKey} onSelect={chooseHazard} onAll={() => navigate("hazards", "已进入隐患登记")} />
          <RetakeSuggestionPanel retakeMode={retakeMode} onRetake={() => { setRetakeMode(true); setToast("已进入补拍模式"); }} onRefresh={() => { setActiveHazardKey("cable"); setToast("建议补拍项已刷新"); }} />
        </aside>
      </div>
      {detail && <ActionModal title="现场隐患详情" onClose={() => setDetail(null)} footer={<><button className="secondary-btn" onClick={() => setDetail(null)}>关闭</button><button className="primary-btn" onClick={() => { generateOrder(detail.id); setDetail(null); }}>生成整改单</button><button className="primary-btn" onClick={() => { dispatchRecord(detail.id); setDetail(null); }}>派发整改</button></>}><div className="helmet-detail-modal"><img src={suspectedHazards.find((item) => item.key === detail.key)?.evidence ?? demoMedia.images.electricalPanelOpen} alt={detail.desc} /><dl><dt>隐患编号</dt><dd>{detail.id}</dd><dt>隐患描述</dt><dd>{detail.desc}</dd><dt>风险等级</dt><dd>{detail.risk}</dd><dt>当前状态</dt><dd>{detail.status}</dd><dt>发现时间</dt><dd>{detail.foundTime}</dd><dt>关联检查项</dt><dd>{activeChecklist.name}</dd></dl></div></ActionModal>}
      {sosOpen && <ActionModal title="SOS 紧急求助确认" onClose={() => setSosOpen(false)} footer={<><button className="secondary-btn" onClick={() => setSosOpen(false)}>取消</button><button className="primary-btn" onClick={() => { setSosOpen(false); setToast("已发送紧急求助"); }}>确认发送</button></>}><p className="modal-note">将向运营工作台、远程专家和项目安全负责人同步当前位置与实时视频。</p></ActionModal>}
      <MediaPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

function HelmetLiveHeader({ project, projectOptions, setProject, device, deviceOptions, setDevice, onFullscreen, onSettings, onExit }: { project: string; projectOptions: string[]; setProject: (value: string) => void; device: string; deviceOptions: string[]; setDevice: (value: string) => void; onFullscreen: () => void; onSettings: () => void; onExit: () => void }) {
  return (
    <header className="helmet-live-header">
      <div className="helmet-title-mark"><HardHat size={28} /><strong>智能安全帽现场终端</strong></div>
      <span className="helmet-phase">任务执行 / 现场检查中</span>
      <div className="helmet-task-meta"><span>任务名称：<b>配电室日常巡检</b></span><span>任务编号：<b>TASK20250516001</b></span><span>检查员：<b>张伟</b></span><span>开始时间：<b>2025-05-16 14:30:00</b></span></div>
      <label className="helmet-device-select"><span>项目：</span><select value={project} onChange={(event) => setProject(event.target.value)}>{projectOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="helmet-device-select"><span>设备：</span><select value={device} onChange={(event) => setDevice(event.target.value)}>{deviceOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <span className="helmet-connect-dot">已连接</span>
      <span className="helmet-battery"><BatteryMedium size={18} />78%</span>
      <span className="helmet-signal-bars"><i /><i /><i /><i /></span>
      <div className="helmet-header-actions"><button onClick={onFullscreen} title="全屏"><Maximize size={18} /></button><button onClick={onSettings} title="设置"><Settings size={18} /></button><button onClick={onExit} title="退出"><LogOut size={18} /><span>退出</span></button></div>
    </header>
  );
}

function HelmetPanel({ title, count, action, children }: { title: string; count?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="helmet-panel"><header><h3>{title}{count && <small>{count}</small>}</h3>{action}</header>{children}</section>;
}

function DeviceStatusCard({ deviceStatus }: { deviceStatus: HelmetStatusItem[] }) {
  return (
    <HelmetPanel title="设备状态" action={<span className="mini-live-dot">设备在线</span>}>
      <div className="helmet-status-list">{deviceStatus.map((item) => <div key={item.label} className="helmet-status-row"><span>{item.label}</span><b>{item.value}</b>{item.meter !== undefined && <i className={`helmet-meter ${item.tone ?? "blue"}`}><em style={{ width: `${item.meter}%` }} /></i>}{item.detail && <small>{item.detail}</small>}</div>)}</div>
    </HelmetPanel>
  );
}

function SensorStatusCard({ aiStatus }: { aiStatus: HelmetSensorItem[] }) {
  return (
    <HelmetPanel title="智能感知状态">
      <div className="helmet-sensor-list">{aiStatus.map((item) => <p key={item.label}><span>{item.label}</span><b className={item.tone}>{item.value}</b><em>{item.state}</em></p>)}</div>
    </HelmetPanel>
  );
}

function QuickActionsCard({ hdMode, talking, lightOn, onToggleHd, onScreenshot, onTalk, onLight, onSos }: { hdMode: boolean; talking: boolean; lightOn: boolean; onToggleHd: () => void; onScreenshot: () => void; onTalk: () => void; onLight: () => void; onSos: () => void }) {
  return (
    <HelmetPanel title="快捷操作">
      <div className="helmet-quick-grid">
        <button className={hdMode ? "active" : ""} onClick={onToggleHd}><MonitorCog size={16} />高清视频</button>
        <button onClick={onScreenshot}><Camera size={16} />截图</button>
        <button className={talking ? "active" : ""} onClick={onTalk}><Mic size={16} />{talking ? "对讲中" : "语音对讲"}</button>
        <button className={lightOn ? "active" : ""} onClick={onLight}><Lightbulb size={16} />补光灯</button>
        <button className="sos" onClick={onSos}><Siren size={18} />SOS 紧急求助</button>
      </div>
    </HelmetPanel>
  );
}

function LiveVideoPanel({ activeHazardKey, hdMode, recording, talking, infrared, lightOn, retakeMode, suspectedHazards, checklistItem, modelStatus, onVerifyModel, onScreenshot, onRecord, onTalk, onInfrared, onLight, moreOpen, setMoreOpen, onMoreAction, onPreview }: { activeHazardKey: string; hdMode: boolean; recording: boolean; talking: boolean; infrared: boolean; lightOn: boolean; retakeMode: boolean; suspectedHazards: HelmetSuspectedHazard[]; checklistItem: HelmetChecklistItem; modelStatus: HelmetModelStatus; onVerifyModel: () => void; onScreenshot: () => void; onRecord: () => void; onTalk: () => void; onInfrared: () => void; onLight: () => void; moreOpen: boolean; setMoreOpen: (value: boolean) => void; onMoreAction: (action: string) => void; onPreview: () => void }) {
  const isYoloResult = modelStatus.provider === "yolo";
  const hasYoloBoxes = isYoloResult && modelStatus.boxes.length > 0;
  return (
    <section className="helmet-video-panel">
      <header><h2><VideoIcon />实时视频画面（AI识别中）</h2><div><span className="live-pill">直播中</span><span>分辨率：{hdMode ? "1080P" : "720P"}</span><button onClick={onPreview}><Maximize size={16} /></button></div></header>
      <div className={`helmet-model-proof ${providerTone(modelStatus.provider)}`}>
        <div>
          <span>当前识别引擎</span>
          <strong>{modelStatus.loading ? "模型调用中..." : formatProviderName(modelStatus.provider)}</strong>
        </div>
        <p><b>provider:</b> {modelStatus.provider || "-"}{modelStatus.analysisId ? ` / analysisId: ${modelStatus.analysisId}` : ""}</p>
        <p>{modelStatus.summary ?? `最近返回 ${modelStatus.detections} 个检测结果`} {modelStatus.provider === "yolo" && "当前模型为 YOLO26n COCO 预训练版，包含 person、bottle、fire hydrant 等通用类别。"}</p>
        <button className="secondary-btn" onClick={onVerifyModel} disabled={modelStatus.loading}>{modelStatus.loading ? "验证中" : "验证 YOLO 模型"}</button>
      </div>
      <div className={`helmet-video-frame ${infrared ? "thermal" : ""} ${retakeMode ? "retake" : ""}`}>
        <img src={infrared ? demoMedia.images.infraredOverheat : demoMedia.images.hotWorkTempPower} alt="智能安全帽第一视角实时画面" />
        <div className="helmet-video-hud"><span>{checklistItem.name}</span><b>{retakeMode ? "补拍中" : "AI Tracking"}</b></div>
        {isYoloResult && suspectedHazards.length === 0 && <div className="helmet-yolo-empty">当前 YOLO26n COCO 模型未识别到配置类别目标；它不包含 fire_extinguisher 灭火器专用类别。</div>}
        {suspectedHazards.map((item) => {
          const bboxStyle = item.bbox ? { left: `${item.bbox.x * 100}%`, top: `${item.bbox.y * 100}%`, width: `${item.bbox.w * 100}%`, height: `${item.bbox.h * 100}%` } : undefined;
          return <button key={item.key} style={bboxStyle} className={`helmet-ai-box ${item.boxClass} ${hasYoloBoxes ? "from-yolo" : ""} ${activeHazardKey === item.key ? "active" : ""}`} onClick={() => onMoreAction("history")}><strong>{item.name}</strong><span>置信度：{item.confidence}</span></button>;
        })}
      </div>
      <footer className="helmet-video-toolbar">
        <button onClick={onScreenshot}><Camera size={16} />截图（F8）</button>
        <button className={recording ? "active danger" : ""} onClick={onRecord}><Radio size={16} />{recording ? "停止录制" : "录制（F9）"}</button>
        <button className={talking ? "active" : ""} onClick={onTalk}><Mic size={16} />对讲（按住说话）</button>
        <button className={infrared ? "active" : ""} onClick={onInfrared}><MonitorCog size={16} />红外模式</button>
        <button className={lightOn ? "active" : ""} onClick={onLight}><Lightbulb size={16} />补光灯</button>
        <div className="helmet-more-wrap"><button onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={18} />更多</button>{moreOpen && <div className="helmet-more-menu"><button onClick={() => onMoreAction("download")}>下载视频片段</button><button onClick={() => onMoreAction("history")}>查看历史帧</button><button onClick={() => onMoreAction("export")}>导出证据</button></div>}</div>
      </footer>
    </section>
  );
}

function VideoIcon() {
  return <span className="video-title-icon"><MonitorCog size={16} /></span>;
}

function TimelinePanel({ timelineSegments }: { timelineSegments: HelmetTimelineSegment[] }) {
  return (
    <HelmetPanel title="巡检轨迹与时间线" action={<span className="timeline-summary">已巡检：35分钟 / 预计：60分钟</span>}>
      <div className="helmet-timeline-legend"><span className="normal">正常</span><span className="abnormal">异常</span><span className="pending">待检查</span><span className="current">当前</span></div>
      <div className="helmet-timebar">{timelineSegments.map((item) => <i key={item.label + item.start} className={item.status} style={{ width: `${item.width}%` }} title={`${item.label} ${item.start}-${item.end}`} />)}<b style={{ left: "55%" }}>15:05</b></div>
      <div className="helmet-time-labels"><span>14:30</span><span>14:40</span><span>14:50</span><span>15:00</span><span>15:10</span><span>15:20</span><span>15:30</span></div>
    </HelmetPanel>
  );
}

function HazardRecordTable({ records, activeKey, onFocus, onGenerate, onDispatch }: { records: HelmetHazardRecord[]; activeKey: string; onFocus: (record: HelmetHazardRecord) => void; onGenerate: (id: string) => void; onDispatch: (id: string) => void }) {
  return (
    <section className="helmet-table-panel">
      <header><h3>现场隐患记录 <small>共 {records.length} 条记录</small></h3><div><label><Search size={14} /><input placeholder="搜索隐患描述/编号" /></label><button onClick={() => downloadText("现场隐患记录.csv", `\uFEFF${records.map((item) => [item.id, item.desc, item.risk, item.status, item.foundTime].join(",")).join("\n")}`, "text/csv;charset=utf-8")}><Download size={14} />导出记录</button></div></header>
      <div className="helmet-table-wrap"><table><thead><tr><th>隐患编号</th><th>隐患描述</th><th>风险等级</th><th>当前状态</th><th>发现时间</th><th>操作</th></tr></thead><tbody>{records.map((item) => <tr key={item.id} className={activeKey === item.key ? "active" : ""}><td>{item.id}</td><td>{item.desc}</td><td><Badge label={item.risk} /></td><td><Badge label={item.status} /></td><td>{item.foundTime}</td><td><button onClick={() => onFocus(item)}>查看详情</button><button onClick={() => onGenerate(item.id)}>{item.orderReady ? "已生成" : "生成整改单"}</button><button onClick={() => onDispatch(item.id)}>派发整改</button></td></tr>)}</tbody></table></div>
    </section>
  );
}

function ChecklistPanel({ checklist, activeId, onSelect }: { checklist: HelmetChecklistItem[]; activeId: number; onSelect: (item: HelmetChecklistItem) => void }) {
  return (
    <HelmetPanel title="当前检查清单" count="（10/16）" action={<button className="helmet-text-btn" onClick={() => onSelect(checklist[0])}>查看全部</button>}>
      <div className="helmet-checklist">{checklist.map((item) => <button key={item.id} className={activeId === item.id ? "active" : ""} onClick={() => onSelect(item)}><i>{item.id}</i><span>{item.name}</span><Badge label={item.status} /></button>)}</div>
    </HelmetPanel>
  );
}

function SuspectedHazardsPanel({ suspectedHazards, activeKey, onSelect, onAll }: { suspectedHazards: HelmetSuspectedHazard[]; activeKey: string; onSelect: (item: HelmetSuspectedHazard) => void; onAll: () => void }) {
  return (
    <HelmetPanel title="疑似隐患" count="（3）" action={<button className="helmet-text-btn" onClick={onAll}>全部隐患</button>}>
      <div className="helmet-suspect-list">{suspectedHazards.map((item) => <button key={item.key} className={activeKey === item.key ? "active" : ""} onClick={() => onSelect(item)}><span className="suspect-dot"><ShieldAlert size={14} /></span><strong>{item.name}</strong><small>{item.time}　置信度：{item.confidence}</small><Badge label={item.risk} /></button>)}</div>
    </HelmetPanel>
  );
}

function RetakeSuggestionPanel({ retakeMode, onRetake, onRefresh }: { retakeMode: boolean; onRetake: () => void; onRefresh: () => void }) {
  return (
    <HelmetPanel title="建议补拍项" count="（1）" action={<button className="helmet-text-btn" onClick={onRefresh}>刷新</button>}>
      <div className={`helmet-retake-card ${retakeMode ? "active" : ""}`}><b>配电箱内部线缆情况</b><p>建议多角度拍摄内部接线及元器件状态，补充箱门锁闭和回路标识特写。</p><button onClick={onRetake}>{retakeMode ? "补拍中" : "去补拍"}</button></div>
    </HelmetPanel>
  );
}

type KnowledgeBaseItem = { name: string; category: string; docs: number; status: string; updated: string };
type ExpertRuleItem = { name: string; count: number; owner: string };
type AiRecordItem = { time: string; task: string; type: string; input: string; output: string; confidence: string; confirmation: string };
type ModelCenterModal = "knowledge" | "newKnowledge" | "graph" | "rules" | "newRule" | "basis" | "record" | "messages" | null;

const knowledgeBases: KnowledgeBaseItem[] = [
  { name: "消防安全知识库", category: "消防安全", docs: 1245, status: "已更新", updated: "2025-05-16" },
  { name: "用电安全知识库", category: "用电安全", docs: 987, status: "已更新", updated: "2025-05-16" },
  { name: "物业安全检查知识库", category: "物业安全", docs: 642, status: "已更新", updated: "2025-05-15" },
  { name: "园区安全检查知识库", category: "园区安全", docs: 735, status: "已更新", updated: "2025-05-15" },
  { name: "动火与临时用电知识库", category: "作业安全", docs: 568, status: "已更新", updated: "2025-05-14" }
];

const hazardGraphs = {
  center: "配电箱未关闭",
  nodes: ["电气火灾", "触电风险", "线缆裸露", "接地异常", "管理责任", "整改建议"],
  metrics: [
    ["已建图谱", "50 类"],
    ["关联标准", "186 条"],
    ["典型案例", "320 条"]
  ]
};

const expertRules: ExpertRuleItem[] = [
  { name: "用电安全规则", count: 42, owner: "电气专家组" },
  { name: "消防设施规则", count: 36, owner: "消防专家组" },
  { name: "临时用电规则", count: 18, owner: "作业安全组" },
  { name: "动火作业规则", count: 16, owner: "动火管理组" },
  { name: "物业巡检规则", count: 16, owner: "物业巡检组" }
];

const recentAIRecords: AiRecordItem[] = [
  { time: "15:29:30", task: "齐鲁科技园配电室巡检", type: "图片识别", input: "配电箱图片", output: "配电箱未关闭", confidence: "0.94", confirmation: "已确认" },
  { time: "15:28:15", task: "国控大厦消防检查", type: "视频关键帧", input: "消防通道视频", output: "消防通道占用", confidence: "0.89", confirmation: "待确认" },
  { time: "15:27:45", task: "鲁商广场物业巡检", type: "语音转文字", input: "现场语音", output: "已转写", confidence: "0.92", confirmation: "已确认" },
  { time: "15:26:30", task: "齐鲁科技园检查报告", type: "报告生成", input: "隐患数据", output: "报告已生成", confidence: "-", confirmation: "已确认" }
];

function AiModelCenterPage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string, routeOverride?: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [kbItems, setKbItems] = useState(knowledgeBases);
  const [ruleItems, setRuleItems] = useState(expertRules);
  const [modal, setModal] = useState<ModelCenterModal>(null);
  const [selectedRecord, setSelectedRecord] = useState<AiRecordItem | null>(null);
  const [newKnowledgeName, setNewKnowledgeName] = useState("消防控制室巡检要点");
  const [newKnowledgeCategory, setNewKnowledgeCategory] = useState("消防安全");
  const [newRuleName, setNewRuleName] = useState("配电箱闭锁检查规则");
  const [newRuleOwner, setNewRuleOwner] = useState("电气专家组");
  const [basisKeyword, setBasisKeyword] = useState("配电箱未关闭");
  const basisItems = ["《低压配电设计规范》GB 50054-2011", "《建筑设计防火规范》GB 50016-2014", "《建筑灭火器配置设计规范》GB 50140-2005"];
  const searchText = searchQuery.trim();
  const searchResults = searchText
    ? [
        ...kbItems.filter((item) => `${item.name}${item.category}`.includes(searchText)).map((item) => ({ type: "知识库", title: item.name, desc: `${item.category} / 文档 ${item.docs}` })),
        ...hazardGraphs.nodes.filter((item) => item.includes(searchText)).map((item) => ({ type: "隐患图谱", title: item, desc: `关联中心节点：${hazardGraphs.center}` })),
        ...ruleItems.filter((item) => `${item.name}${item.owner}`.includes(searchText)).map((item) => ({ type: "专家规则", title: item.name, desc: `${item.count} 条 / ${item.owner}` })),
        ...recentAIRecords.filter((item) => `${item.task}${item.type}${item.input}${item.output}`.includes(searchText)).map((item) => ({ type: "处理记录", title: item.task, desc: `${item.time} / ${item.output}` }))
      ]
    : [];
  const metricCards: { icon: React.ElementType; title: string; value: string; unit: string; desc: string; change: string }[] = [
    { icon: BookOpen, title: "知识库", value: "6", unit: "个", desc: "覆盖消防与用电安全知识", change: "+2 今日更新" },
    { icon: Brain, title: "隐患图谱", value: "50", unit: "类", desc: "关联隐患与风险关系", change: "+3 关系" },
    { icon: ShieldCheck, title: "专家规则", value: "128", unit: "条", desc: "专家沉淀规则与标准", change: "+6 条" },
    { icon: Search, title: "今日识别", value: "2,341", unit: "次", desc: "多模态 AI 识别分析", change: "+12.6%" },
    { icon: ClipboardList, title: "整改建议", value: "1,876", unit: "条", desc: "智能生成整改建议", change: "+86 条" },
    { icon: FileText, title: "报告生成", value: "426", unit: "份", desc: "智能生成检查报告", change: "+18 份" }
  ];
  const addKnowledge = () => {
    const next: KnowledgeBaseItem = { name: newKnowledgeName, category: newKnowledgeCategory, docs: 1, status: "已更新", updated: "2025-05-16" };
    setKbItems((items) => [next, ...items]);
    setModal("knowledge");
    setToast("知识条目已加入知识库");
  };
  const addRule = () => {
    const existing = ruleItems.find((item) => item.name === newRuleName);
    setRuleItems((items) => existing ? items.map((item) => item.name === newRuleName ? { ...item, count: item.count + 1, owner: newRuleOwner } : item) : [{ name: newRuleName, count: 1, owner: newRuleOwner }, ...items]);
    setModal("rules");
    setToast("专家规则已加入规则库");
  };
  const openRecord = (record: AiRecordItem) => {
    setSelectedRecord(record);
    setModal("record");
  };
  return (
    <section className="model-center-page">
      <main className="model-center-main">
        <header className="model-topbar">
          <div className="model-title-block"><p>首页 / 大模型中台</p><h1>大模型中台</h1><span>统一管理知识库、隐患图谱、AI识别和业务生成能力</span></div>
          <div className="model-top-actions">
            <label className="model-search-box"><Search size={18} /><input value={searchQuery} placeholder="搜索知识、隐患、依据、案例" onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(Boolean(event.target.value.trim())); }} onKeyDown={(event) => { if (event.key === "Enter") setSearchOpen(true); }} /><button onClick={() => setSearchOpen(true)}>搜索</button></label>
            <button onClick={() => setModal("messages")}><Bell size={18} /><i>3</i></button>
            <button onClick={() => navigate("knowledge", "已打开帮助中心")}><CircleHelp size={18} />帮助中心</button>
            <button onClick={() => navigate("settings", "已打开系统管理员设置")}><UserCircle2 size={20} />系统管理员<ChevronDown size={14} /></button>
            <time>更新时间：2025-05-16 15:30:00</time>
            {searchOpen && searchText && <div className="model-search-results">{searchResults.length ? searchResults.map((item) => <button key={`${item.type}-${item.title}`} onClick={() => { setSearchOpen(false); setToast(`已定位${item.type}：${item.title}`); }}><b>{item.type}</b><span>{item.title}</span><small>{item.desc}</small></button>) : <p>未找到匹配内容</p>}</div>}
          </div>
        </header>
        <div className="model-main-content">
          <section className="model-metric-grid">
            {metricCards.map(({ icon: Icon, title, value, unit, desc, change }) => <article className="model-metric-card" key={title}><span><Icon size={24} /></span><div><p>{title}</p><strong>{value}<small>{unit}</small></strong><em>{desc}</em><b>{change}</b></div></article>)}
          </section>
          <section id="model-core-capabilities" className="model-three-grid">
            <article className="model-card model-knowledge-card">
              <header><h2><BookOpen size={20} />知识库</h2><button onClick={() => setModal("knowledge")}>进入知识库</button></header>
              <div className="model-kb-list">{kbItems.slice(0, 5).map((item) => <button key={item.name} onClick={() => { setBasisKeyword(item.category); setModal("basis"); }}><FileText size={16} /><span>{item.name}</span><b>文档 {item.docs.toLocaleString()}</b><em>{item.status}</em></button>)}</div>
              <footer><button className="primary-btn" onClick={() => setModal("knowledge")}>进入知识库</button><button className="secondary-btn" onClick={() => setModal("newKnowledge")}>新增知识</button></footer>
            </article>
            <article className="model-card model-graph-card">
              <header><h2><Target size={20} />隐患图谱</h2><button onClick={() => setModal("graph")}>查看图谱</button></header>
              <div className="model-graph-visual">
                <strong>{hazardGraphs.center}</strong>
                {hazardGraphs.nodes.map((item, index) => <button key={item} className={`node node-${index}`} onClick={() => { setBasisKeyword(item); setModal("basis"); }}>{item}</button>)}
              </div>
              <aside>{hazardGraphs.metrics.map(([label, value]) => <p key={label}><span>{label}</span><b>{value}</b></p>)}</aside>
            </article>
            <article className="model-card model-rules-card">
              <header><h2><ShieldCheck size={20} />专家规则库</h2><button onClick={() => setModal("rules")}>管理规则</button></header>
              <div className="model-rule-list">{ruleItems.slice(0, 5).map((item) => <p key={item.name}><span>{item.name}</span><b>{item.count} 条</b></p>)}</div>
              <footer><button className="primary-btn" onClick={() => setModal("rules")}>管理规则</button><button className="secondary-btn" onClick={() => setModal("newRule")}>新增规则</button></footer>
            </article>
          </section>
          <section id="model-recent-records" className="model-card model-record-table">
            <header><h2><ListCollapse size={20} />最近 AI 处理记录</h2><button onClick={() => downloadText("最近AI处理记录.csv", `\uFEFF时间,来源任务,处理类型,输入内容,输出结果,置信度,人工确认\n${recentAIRecords.map((item) => [item.time, item.task, item.type, item.input, item.output, item.confidence, item.confirmation].join(",")).join("\n")}`, "text/csv;charset=utf-8")}><Download size={16} />导出</button></header>
            <div className="model-table-scroll"><table><thead><tr><th>时间</th><th>来源任务</th><th>处理类型</th><th>输入内容</th><th>输出结果</th><th>置信度</th><th>人工确认</th><th>操作</th></tr></thead><tbody>{recentAIRecords.map((item) => <tr key={`${item.time}-${item.task}`}><td>{item.time}</td><td>{item.task}</td><td>{item.type}</td><td>{item.input}</td><td><Badge label={item.output} /></td><td>{item.confidence}</td><td><Badge label={item.confirmation} /></td><td><button onClick={() => openRecord(item)}>查看</button></td></tr>)}</tbody></table></div>
          </section>
        </div>
      </main>
      {modal === "knowledge" && <ActionModal title="知识库详情" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => setModal("newKnowledge")}>新增知识</button>}><div className="model-modal-list">{kbItems.map((item) => <p key={item.name}><BookOpen size={16} /><b>{item.name}</b><span>{item.category}</span><em>文档 {item.docs.toLocaleString()} / {item.updated}</em></p>)}</div></ActionModal>}
      {modal === "newKnowledge" && <ActionModal title="新增知识" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={addKnowledge}>保存知识</button></>}><div className="module-form-grid"><label><span>知识名称</span><input value={newKnowledgeName} onChange={(event) => setNewKnowledgeName(event.target.value)} /></label><label><span>知识分类</span><input value={newKnowledgeCategory} onChange={(event) => setNewKnowledgeCategory(event.target.value)} /></label><label className="wide"><span>适用场景</span><textarea defaultValue="配电室巡检、消防设施检查、物业安全检查等业务场景。" /></label></div></ActionModal>}
      {modal === "graph" && <ActionModal title="隐患图谱详情" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => { setBasisKeyword(hazardGraphs.center); setModal("basis"); }}>检索关联依据</button>}><div className="model-graph-modal"><div className="model-graph-visual large"><strong>{hazardGraphs.center}</strong>{hazardGraphs.nodes.map((item, index) => <button key={item} className={`node node-${index}`}>{item}</button>)}</div><div>{hazardGraphs.metrics.map(([label, value]) => <p key={label}><span>{label}</span><b>{value}</b></p>)}</div></div></ActionModal>}
      {modal === "rules" && <ActionModal title="专家规则库" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => setModal("newRule")}>新增规则</button>}><div className="model-modal-list">{ruleItems.map((item) => <p key={item.name}><ShieldCheck size={16} /><b>{item.name}</b><span>{item.owner}</span><em>{item.count} 条</em></p>)}</div></ActionModal>}
      {modal === "newRule" && <ActionModal title="新增规则" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>取消</button><button className="primary-btn" onClick={addRule}>保存规则</button></>}><div className="module-form-grid"><label><span>规则名称</span><input value={newRuleName} onChange={(event) => setNewRuleName(event.target.value)} /></label><label><span>责任组</span><input value={newRuleOwner} onChange={(event) => setNewRuleOwner(event.target.value)} /></label><label className="wide"><span>判定逻辑</span><textarea defaultValue="当现场图片识别到配电箱门未关闭时，匹配高风险隐患并建议立即闭锁处理。" /></label></div></ActionModal>}
      {modal === "basis" && <ActionModal title="检查依据检索" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => { setBasisKeyword("配电箱未关闭"); setToast("已恢复默认检索关键词"); }}>重置检索</button>}><div className="model-basis-modal"><label><span>隐患关键词</span><input value={basisKeyword} onChange={(event) => setBasisKeyword(event.target.value)} /></label>{basisItems.filter((item) => `${item}${basisKeyword}`.includes(basisKeyword.trim() || "配电")).map((item) => <p key={item}><FileText size={16} /><b>{item}</b><span>匹配：配电箱、消防通道、灭火器配置等检查依据</span></p>)}</div></ActionModal>}
      {modal === "messages" && <ActionModal title="消息中心" onClose={() => setModal(null)} footer={<button className="primary-btn" onClick={() => navigate("warnings", "已打开消息与预警中心")}>查看全部消息</button>}><div className="model-modal-list"><p><Bell size={16} /><b>高风险识别任务待确认</b><span>齐鲁科技园</span><em>15:29</em></p><p><Bell size={16} /><b>报告生成完成</b><span>国控大厦消防检查</span><em>15:26</em></p></div></ActionModal>}
      {modal === "record" && selectedRecord && <ActionModal title="AI 处理详情" onClose={() => setModal(null)} footer={<><button className="secondary-btn" onClick={() => setModal(null)}>关闭</button><button className="primary-btn" onClick={() => { setToast("人工确认记录已更新"); setModal(null); }}>确认结果</button></>}><dl className="model-record-detail"><dt>输入内容</dt><dd>{selectedRecord.input}</dd><dt>模型结果</dt><dd>{selectedRecord.output}</dd><dt>关联知识</dt><dd>用电安全知识库、隐患图谱、专家规则库</dd><dt>人工确认</dt><dd>{selectedRecord.confirmation}</dd><dt>来源任务</dt><dd>{selectedRecord.task}</dd></dl></ActionModal>}
    </section>
  );
}

function modelNavIcon(item: string) {
  if (item.includes("知识")) return <BookOpen size={17} />;
  if (item.includes("图谱")) return <Target size={17} />;
  if (item.includes("规则")) return <ShieldCheck size={17} />;
  if (item.includes("案例")) return <FileText size={17} />;
  if (item.includes("识别")) return <Camera size={17} />;
  if (item.includes("视频")) return <PlayCircle size={17} />;
  if (item.includes("语音")) return <Mic size={17} />;
  if (item.includes("建议")) return <Sparkles size={17} />;
  if (item.includes("报告")) return <ClipboardList size={17} />;
  if (item.includes("问答")) return <Bot size={17} />;
  return <Settings size={17} />;
}

function DevicesManagementPage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string) => void }) {
  const [devices, setDevices] = useState<ManagedDevice[]>(managedDeviceSeed);
  const [activeTab, setActiveTab] = useState("智能安全帽");
  const [projectFilter, setProjectFilter] = useState("全部项目");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(managedDeviceSeed[0].id);
  const [modal, setModal] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState("智能安全帽");
  const [newDeviceModel, setNewDeviceModel] = useState("SHM-01 Pro");
  const deviceProjectOptions = ["全部项目", ...Array.from(new Set(devices.map((item) => item.project)))];
  const filteredDevices = devices.filter((item) => (activeTab === "全部设备" || item.type === activeTab) && (projectFilter === "全部项目" || item.project === projectFilter) && (!query.trim() || `${item.id}${item.name}${item.project}${item.user}`.includes(query.trim())));
  const selected = filteredDevices.find((item) => item.id === selectedId) ?? filteredDevices[0] ?? devices[0];
  const updateDevice = (id: string, patch: Partial<ManagedDevice>, message: string) => {
    setDevices((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    setToast(message);
  };
  const exportDevices = () => {
    const rows = [["设备编号", "设备名称", "设备类型", "在线状态", "电量", "绑定项目"], ...filteredDevices.map((item) => [item.id, item.name, item.type, item.status, item.battery, item.project])];
    downloadText("设备管理清单.csv", `\uFEFF${rows.map((row) => row.join(",")).join("\n")}`, "text/csv;charset=utf-8");
    setToast("设备清单已导出");
  };
  return (
    <section className="ops-module-page devices-module-page">
      <div className="module-header-card">
        <div><h2>设备管理</h2><p>从 abc 接入智能安全帽、摄像设备、传感器和网关管理能力。</p></div>
        <div className="module-actions"><button className="primary-btn" onClick={() => setModal(true)}>新增设备</button><button className="secondary-btn" onClick={exportDevices}><Download size={16} />导出设备</button></div>
      </div>
      <div className="module-tabs">{["全部设备", "智能安全帽", "摄像设备", "传感器设备"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setToast(`已切换${tab}`); }}>{tab}</button>)}</div>
      <div className="module-filter-card"><SelectBox label="项目" value={projectFilter} options={deviceProjectOptions.map(toOption)} onChange={(value) => { setProjectFilter(value); setToast(`已筛选项目：${value}`); }} compact /><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="设备编号/名称/项目" /></label><button className="primary-btn" onClick={() => setToast(`已查询到 ${filteredDevices.length} 台设备`)}>查询</button><button className="secondary-btn" onClick={() => { setQuery(""); setActiveTab("全部设备"); setProjectFilter("全部项目"); setToast("设备筛选条件已重置"); }}>重置</button></div>
      <div className="module-split-layout">
        <section className="module-list-card">
          <DataTable headers={["设备编号", "设备名称", "设备类型", "在线状态", "电量", "绑定项目"]} rows={filteredDevices.map((item) => [item.id, item.name, item.type, item.status, item.battery, item.project])} selectedKey={selectedId} onRowClick={(row) => setSelectedId(row[0])} />
        </section>
        <aside className="module-detail-card">
          <header><h3>{selected.name}</h3><Badge label={selected.status} /></header>
          <div className="device-preview-card"><HardHat size={58} /><strong>{selected.model}</strong><span>{selected.id}</span></div>
          <div className="device-metrics"><MiniStat label="电量" value={selected.battery} /><MiniStat label="网络" value={selected.network} /><MiniStat label="固件" value={selected.firmware} /></div>
          <dl className="detail-pairs">
            <dt>使用人员</dt><dd>{selected.user}</dd>
            <dt>绑定项目</dt><dd>{selected.project}</dd>
            <dt>最近在线</dt><dd>{selected.lastSeen}</dd>
          </dl>
          <footer>
            <button className="primary-btn" onClick={() => navigate("helmet", "正在打开安全帽现场端")}>实时画面</button>
            <button className="secondary-btn" onClick={() => updateDevice(selected.id, { status: "在线", lastSeen: "2025-05-16 10:45" }, "设备已重启并恢复在线")}>重启设备</button>
            <button className="secondary-btn" onClick={() => updateDevice(selected.id, { firmware: "V2.4.0" }, "固件升级任务已下发")}>固件升级</button>
            <button className="secondary-btn" onClick={() => updateDevice(selected.id, { user: "未绑定", project: "未绑定" }, "设备绑定关系已解除")}>解绑</button>
          </footer>
        </aside>
      </div>
      {modal && (
        <ActionModal title="新增设备" onClose={() => setModal(false)} footer={<><button className="secondary-btn" onClick={() => setModal(false)}>取消</button><button className="primary-btn" onClick={() => { const id = `DEV20250516${String(devices.length + 20).padStart(3, "0")}`; setDevices((items) => [{ ...managedDeviceSeed[0], id, type: newDeviceType, model: newDeviceModel, name: `${newDeviceType} ${devices.length + 1}`, status: "在线", user: "待分配", project: "未绑定" }, ...items]); setSelectedId(id); setActiveTab(newDeviceType); setModal(false); setToast("新设备已入库"); }}>确认入库</button></>}>
          <div className="module-form-grid"><SelectBox label="设备类型" value={newDeviceType} options={["智能安全帽", "摄像设备", "传感器设备"].map(toOption)} onChange={setNewDeviceType} /><SelectBox label="设备型号" value={newDeviceModel} options={["SHM-01 Pro", "SHM-01 Lite", "CAM-PTZ-4M"].map(toOption)} onChange={setNewDeviceModel} /><label><span>入库日期</span><input type="date" defaultValue="2025-05-16" /></label></div>
        </ActionModal>
      )}
    </section>
  );
}

function InspectionTemplatesPage({ setToast }: { setToast: (message: string) => void }) {
  const [activeTab, setActiveTab] = useState("检查模板管理");
  const [category, setCategory] = useState("消防设施检查模板");
  const [status, setStatus] = useState("草稿");
  const [version, setVersion] = useState("V2.3");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rows, setRows] = useState([
    { item: "配电箱闭锁", content: "箱门关闭、门锁完好、回路标识清晰", rules: 6, risk: "高风险" },
    { item: "线缆绝缘", content: "线缆无裸露、无破损、敷设固定", rules: 5, risk: "高风险" },
    { item: "消防通道", content: "通道畅通，无堆物占用", rules: 4, risk: "中风险" },
    { item: "灭火器压力", content: "压力表在绿色区域，铅封完整", rules: 3, risk: "中风险" }
  ]);
  const addRow = () => {
    setRows((items) => [...items, { item: "新增检查项", content: "填写检查内容和判定标准", rules: 1, risk: "中风险" }]);
    setStatus("草稿");
    setToast("检查项已新增");
  };
  const exportTemplate = () => {
    downloadText("检查模板.csv", `\uFEFF检查项,检查内容,规则数,风险等级\n${rows.map((row) => [row.item, row.content, row.rules, row.risk].join(",")).join("\n")}`, "text/csv;charset=utf-8");
    setToast("检查模板已导出");
  };
  return (
    <section className="ops-module-page templates-module-page">
      <div className="module-header-card">
        <div><h2>检查模板</h2><p>接入 abc 的检查模板管理、专家规则库、隐患图谱配置和行业知识库能力。</p></div>
        <div className="module-actions"><button className="primary-btn" onClick={addRow}>新增检查项</button><button className="secondary-btn" onClick={exportTemplate}><Download size={16} />导出模板</button></div>
      </div>
      <div className="module-tabs">{["检查模板管理", "专家规则库", "隐患图谱配置", "行业知识库"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setToast(`已切换${tab}`); }}>{tab}</button>)}</div>
      {activeTab === "检查模板管理" ? (
        <div className="templates-layout">
          <aside className="template-tree-card">
            {["消防设施检查模板", "用电安全检查模板", "临时用电模板", "动火作业模板", "仓储物流模板"].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </aside>
          <section className="module-list-card">
            <header className="template-editor-header"><div><h3>{category}</h3><span>{version} · {status}</span></div><div><button className="secondary-btn" onClick={() => { setVersion("V2.4"); setStatus("草稿"); setToast("模板已复制为新版本"); }}>复制模板</button><button className="secondary-btn" onClick={() => setPreviewOpen(true)}>预览模板</button><button className="primary-btn" onClick={() => { setStatus("已发布"); setToast("模板已发布"); }}>发布模板</button></div></header>
            <div className="table-fit"><table className="data-table"><thead><tr>{["检查项", "检查内容", "AI规则", "风险等级", "操作"].map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.item}-${index}`}><td>{row.item}</td><td>{row.content}</td><td>{row.rules} 条</td><td><Badge label={row.risk} /></td><td><button onClick={() => setRows((items) => items.map((item, rowIndex) => rowIndex === index ? { ...item, rules: item.rules + 1 } : item))}>关联规则</button><button onClick={() => setRows((items) => items.filter((_, rowIndex) => rowIndex !== index))}>删除</button></td></tr>)}</tbody></table></div>
            <footer className="tab-action-row"><button className="secondary-btn" onClick={() => { setStatus("草稿"); setToast("模板已保存为草稿"); }}>保存模板</button><button className="primary-btn" onClick={() => { setStatus("已发布"); setToast("模板已发布到任务派发模块"); }}>发布模板</button></footer>
          </section>
        </div>
      ) : (
        <section className="module-list-card knowledge-result-list">{["配电箱未关闭识别规则", "消防通道占用图谱", "灭火器压力不足规则", "动火临电知识条目"].map((item, index) => <button key={item} onClick={() => setToast(`已打开${item}`)}><SlidersHorizontal size={16} />{item}<span>{activeTab} #{index + 1}</span></button>)}</section>
      )}
      {previewOpen && <ActionModal title="模板预览" onClose={() => setPreviewOpen(false)} footer={<button className="primary-btn" onClick={() => setPreviewOpen(false)}>确认</button>}><DataTable headers={["检查项", "检查内容", "风险等级"]} rows={rows.map((row) => [row.item, row.content, row.risk])} /></ActionModal>}
    </section>
  );
}

function ExpertPage({ setToast, navigate }: { setToast: (message: string) => void; navigate: (page: PageKey, message?: string, routeOverride?: string) => void }) {
  type ReviewTab = "隐患审核" | "整改建议审核" | "报告复核";
  type ExpertAnnotation = { id: string; type: "矩形" | "圆形" | "文字"; className: string; label: string };
  const [activeChannel, setActiveChannel] = useState<ExpertVideoChannel>(selectedVideo);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("隐患审核");
  const [hazards, setHazards] = useState<ExpertHazard[]>(expertHazards);
  const [snapshots, setSnapshots] = useState<ExpertSnapshot[]>(expertScreenshots);
  const [messages, setMessages] = useState(expertChatMessages);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(expertScreenshots[0].id);
  const [reviewChoice, setReviewChoice] = useState("确认隐患");
  const [severity, setSeverity] = useState("建议重点整改");
  const [opinion, setOpinion] = useState("配电箱门未关闭，建议纳入重点整改，要求立即整改。");
  const [talking, setTalking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [lightOn, setLightOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ptzOpen, setPtzOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [minutesId, setMinutesId] = useState("");
  const [annotations, setAnnotations] = useState<ExpertAnnotation[]>([
    { id: "ai-panel", type: "矩形", className: "panel-box", label: "配电箱未关闭\n高风险" },
    { id: "ai-cable", type: "矩形", className: "cable-box", label: "线缆裸露\n高风险" },
    { id: "ai-extinguisher", type: "矩形", className: "extinguisher-box", label: "灭火器压力不足\n中风险" }
  ]);
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const focusedHazard = hazards.find((item) => item.focused) ?? hazards[0];

  const showAdapterResult = async (run: Promise<{ message: string }>) => {
    const result = await run;
    setToast(result.message);
  };

  const switchChannel = async (channel: ExpertVideoChannel) => {
    setActiveChannel(channel);
    setSelectedSnapshotId(expertScreenshots[0].id);
    setToast(`已切换到${channel.project}${channel.point}视频`);
    if (channel.status === "直播中") await showAdapterResult(openHelmetStream(channel.deviceId));
  };

  const addMessage = (text: string, speaker = "王工") => {
    setMessages((items) => [...items, { time: "10:31:18", speaker, text }]);
  };

  const addAnnotation = (type: ExpertAnnotation["type"]) => {
    const next: ExpertAnnotation = type === "圆形"
      ? { id: `circle-${Date.now()}`, type, className: "manual-circle", label: "需复核" }
      : type === "文字"
        ? { id: `text-${Date.now()}`, type, className: "manual-text", label: "请补拍箱内接线" }
        : { id: `rect-${Date.now()}`, type, className: "manual-rect", label: "专家标注" };
    setAnnotations((items) => [...items, next]);
    setToast(`已添加${type}标注`);
  };

  const captureSnapshot = () => {
    const next = { id: `shot-${Date.now()}`, time: "10:31:18", src: activeChannel.thumbnail };
    setSnapshots((items) => [next, ...items].slice(0, 8));
    setSelectedSnapshotId(next.id);
    setToast("截图已保存");
  };

  const toggleTalk = async () => {
    const next = !talking;
    setTalking(next);
    if (next) {
      addMessage("请补拍配电箱内部接线情况。");
      await showAdapterResult(startWebrtcCall(activeChannel.deviceId));
      await showAdapterResult(sendTalkbackAudio(activeChannel.deviceId, "请补拍配电箱内部接线情况。"));
      return;
    }
    await showAdapterResult(stopWebrtcCall(activeChannel.deviceId));
  };

  const sendRetake = async () => {
    addMessage("请补拍配电箱内部接线情况。");
    await showAdapterResult(sendRetakeInstruction(activeChannel.deviceId, "请补拍配电箱内部接线情况。"));
  };

  const submitReview = () => {
    setHazards((items) => items.map((item) => item.id === focusedHazard.id ? { ...item, status: "已提交" } : item));
    setReviewSubmitted(true);
    setToast("专家审核意见已提交");
  };

  const markFocus = () => {
    setHazards((items) => items.map((item) => item.id === focusedHazard.id ? { ...item, focused: true, status: "已审核" } : item));
    setToast("已标记为重点整改建议");
  };

  const generateMinutes = () => {
    const id = "EXPERT20250516001";
    setMinutesId(id);
    downloadText(`${id}.txt`, `专家会诊记录\n编号：${id}\n任务：${taskInfo.name}\n专家：王工\n审核结论：${opinion}\n对话记录：\n${messages.map((item) => `${item.time} ${item.speaker}：${item.text}`).join("\n")}`);
    setToast("专家会诊记录已生成");
  };

  return (
    <section className="expert-workstation embedded">
      <main className="expert-main">
        <header className="expert-topbar">
          <div className="expert-title-block"><h1>远程专家端</h1><span>实时视频查看</span></div>
          <div className="expert-meta"><span>专家：王工</span><span>专家类型：电气安全专家</span><b><i />在线</b></div>
          <div className="expert-top-actions">
            <button onClick={() => setToast("消息中心已打开")}><Bell size={18} />消息<em>6</em></button>
            <button onClick={() => setToast("待办列表已打开")}><ClipboardList size={18} />待办<em>12</em></button>
            <button onClick={() => setToast("帮助中心已打开")}><CircleHelp size={18} />帮助中心</button>
            <button onClick={() => setToast("用户菜单已打开")}><UserCircle2 size={18} />王工<ChevronDown size={14} /></button>
            <button onClick={() => document.documentElement.requestFullscreen?.()}><Maximize size={18} />全屏</button>
          </div>
        </header>

        <section className="expert-channel-strip">
          {videoChannels.map((channel) => <button key={channel.id} className={activeChannel.id === channel.id ? "active" : ""} onClick={() => switchChannel(channel)}><strong>{channel.index}</strong><img src={channel.thumbnail} alt={channel.point} /><div><span className={channel.status === "直播中" ? "live-dot" : "offline-dot"}>{channel.status}</span><b>{channel.project}<br />{channel.point}</b><small>检查员：{channel.inspector}</small><small>{channel.time}</small><em className={`risk-pill ${channel.risk === "高风险" ? "danger" : channel.risk === "中风险" ? "warning" : channel.risk === "低风险" ? "safe" : "muted"}`}>{channel.risk === "-" ? "无风险" : channel.risk}</em></div></button>)}
        </section>

        <div className="expert-console-grid">
          <section className="expert-video-stage">
            <header><h2>实时视频查看（{activeChannel.project} {activeChannel.point}）</h2><span>设备：{activeChannel.deviceId}</span><span>检查员：{activeChannel.inspector}</span></header>
            <div className="expert-video-frame">
              <video src={activeChannel.video} poster={activeChannel.thumbnail} muted={muted} autoPlay loop playsInline />
              <div className="video-stats"><span>分辨率：{activeChannel.resolution}</span><span>码率：{activeChannel.bitrate}</span><span>延迟：{activeChannel.latency}</span><span>设备：{activeChannel.deviceId}</span><span>检查员：{activeChannel.inspector}</span></div>
              <div className="annotation-tools">
                {[["箭头", Target], ["矩形", CheckSquare], ["圆形", CircleHelp], ["画笔", SlidersHorizontal], ["文字", FileText], ["马赛克", LayoutDashboard]].map(([label, Icon]) => <button key={label as string} onClick={() => label === "矩形" || label === "圆形" || label === "文字" ? addAnnotation(label as ExpertAnnotation["type"]) : setToast(`已选择${label}工具`)}><Icon size={17} />{label as string}</button>)}
                <button onClick={() => { setAnnotations((items) => items.slice(0, -1)); setToast("已撤销最后一个标注"); }}><ChevronLeft size={17} />撤销</button>
                <button onClick={() => { setAnnotations([]); setToast("已清空专家标注"); }}><LogOut size={17} />清空</button>
              </div>
              {annotations.map((item) => <div key={item.id} className={`expert-annotation ${item.className}`}><span>{item.label}</span></div>)}
              <div className="video-control-bar">
                <button className={talking ? "active" : ""} onClick={toggleTalk}><Mic size={20} />语音对讲</button>
                <button onClick={captureSnapshot}><Camera size={20} />截图</button>
                <button className={recording ? "active danger" : ""} onClick={() => { setRecording((value) => !value); setToast(recording ? "录像片段已保存" : "已开始录制"); }}><Radio size={20} />录制</button>
                <button onClick={() => setToast("视频流已刷新")}><Cpu size={20} />刷新</button>
                <button className={muted ? "active" : ""} onClick={() => setMuted((value) => !value)}><Bell size={20} />静音</button>
                <button className={micOn ? "active" : ""} onClick={() => setMicOn((value) => !value)}><Mic size={20} />麦克风</button>
                <button className={lightOn ? "active" : ""} onClick={() => { setLightOn((value) => !value); setToast("补光灯指令已下发"); }}><Lightbulb size={20} />补光灯</button>
                <button onClick={() => { const next = zoom === 1 ? 1.5 : zoom === 1.5 ? 2 : 1; setZoom(next); setToast(`已切换到 ${next.toFixed(1)}x`); }}><Search size={20} />{zoom.toFixed(1)}x</button>
                <button onClick={() => setPtzOpen((value) => !value)}><MonitorCog size={20} />云台控制</button>
              </div>
              {ptzOpen && <div className="ptz-popover"><button onClick={() => setToast("云台向上")}>上</button><button onClick={() => setToast("云台向左")}>左</button><button onClick={() => setToast("云台复位")}>复位</button><button onClick={() => setToast("云台向右")}>右</button><button onClick={() => setToast("云台向下")}>下</button></div>}
            </div>
          </section>

          <aside className="expert-review-panel">
            <header><h2>专家意见录入</h2></header>
            <div className="expert-review-tabs">{(["隐患审核", "整改建议审核", "报告复核"] as ReviewTab[]).map((tab) => <button key={tab} className={reviewTab === tab ? "active" : ""} onClick={() => setReviewTab(tab)}>{tab}</button>)}</div>
            {reviewTab === "隐患审核" && <div className="hazard-review-stack">
              {hazards.map((hazard) => <article key={hazard.id} className={hazard.focused ? "focused" : ""} onClick={() => setHazards((items) => items.map((item) => ({ ...item, focused: item.id === hazard.id })))}><header><b>{hazard.id}</b><strong>{hazard.name}</strong><Badge label={hazard.risk} /></header><p>依据标准：{hazard.standard}</p><p>AI描述：{hazard.description}</p>{hazard.focused && <><div className="radio-row expert-radio-row">{["确认隐患", "部分属实", "不属实，需说明", "需补拍"].map((item) => <label key={item}><input name="expert-review" type="radio" checked={reviewChoice === item} onChange={() => setReviewChoice(item)} />{item}</label>)}</div><div className="radio-row expert-radio-row">{["一般隐患", "较大隐患", "建议重点整改"].map((item) => <label key={item}><input name="expert-severity" type="radio" checked={severity === item} onChange={() => setSeverity(item)} />{item}</label>)}</div><textarea value={opinion} onChange={(event) => setOpinion(event.target.value)} /></>}</article>)}
              <section className="retake-box"><h3>补拍提示区</h3><ul>{retakeSuggestions.map((item) => <li key={item}>{item}</li>)}</ul><button className="primary-btn" onClick={sendRetake}>发送补拍提示</button></section>
              <footer><button className="secondary-btn" onClick={() => setToast("专家意见已暂存")}>暂存意见</button><button className="primary-btn" onClick={submitReview}>{reviewSubmitted ? "重新提交审核" : "提交审核"}</button><button className="secondary-btn danger-outline" onClick={markFocus}>建议纳入重点整改</button></footer>
            </div>}
            {reviewTab === "整改建议审核" && <div className="review-simple-card"><h3>AI生成整改建议</h3><ol><li>立即关闭配电箱门并上锁。</li><li>对裸露线缆进行绝缘包扎处理。</li><li>补拍整改后照片并保留同角度对比。</li></ol><h3>关联依据</h3><p>GB 50054-2011、GB/T 13869、园区安全巡检制度。</p><textarea defaultValue="建议明确整改期限，责任单位完成后由现场检查员提交复查材料。" /><footer><button className="primary-btn" onClick={() => setToast("整改建议已通过")}>通过建议</button><button className="secondary-btn" onClick={() => setToast("整改建议已保存修改")}>修改建议</button><button className="secondary-btn" onClick={() => setToast("已退回重新生成")}>退回重生成</button></footer></div>}
            {reviewTab === "报告复核" && <div className="review-simple-card report-review"><h3>{reportReviewInfo.name}</h3><p><span>报告类型</span><b>{reportReviewInfo.type}</b></p><p><span>已引用证据</span><b>{reportReviewInfo.evidenceCount}</b></p><p><span>已审核隐患</span><b>{reportReviewInfo.reviewedHazards}</b></p><p>{reportReviewInfo.summary}</p><footer><button className="primary-btn" onClick={() => setToast("报告复核已通过")}>复核通过</button><button className="secondary-btn" onClick={() => setToast("报告已退回修改")}>退回修改</button><button className="secondary-btn" onClick={() => navigate("reports", "已进入报告中心", "/reports/generate")}>进入报告中心</button></footer></div>}
          </aside>
        </div>

        <section className="expert-bottom-grid">
          <article className="expert-bottom-card snapshots"><header><h3>截图 / 关键帧列表</h3><button onClick={() => setToast("关键帧列表已展开")}><ChevronRight size={18} /></button></header><div>{snapshots.map((shot) => <button key={shot.id} className={selectedSnapshotId === shot.id ? "active" : ""} onClick={() => { setSelectedSnapshotId(shot.id); setPreview({ title: `关键帧 ${shot.time}`, type: "image", src: shot.src }); setToast("已切换关键帧"); }}><img src={shot.src} alt={shot.time} /><span>{shot.time}</span></button>)}</div></article>
          <article className="expert-bottom-card chat"><h3>对话记录</h3><div>{messages.map((message, index) => <p key={`${message.time}-${index}`}><time>{message.time}</time><b>{message.speaker}：</b><span>{message.text}</span></p>)}</div></article>
          <article className="expert-bottom-card task"><h3>检查任务信息</h3><dl><dt>任务编号</dt><dd>{taskInfo.id}</dd><dt>任务名称</dt><dd>{taskInfo.name}</dd><dt>检查人员</dt><dd>{taskInfo.inspector}</dd><dt>检查时间</dt><dd>{taskInfo.time}</dd><dt>检查地点</dt><dd>{taskInfo.location}</dd><dt>任务状态</dt><dd><Badge label={taskInfo.status} /></dd></dl></article>
        </section>

        <footer className="expert-bottom-actions">
          <button className="secondary-btn" onClick={() => setToast("当前会诊记录已暂存")}>暂存</button>
          <button className="primary-btn" onClick={submitReview}>提交审核</button>
          <button className="primary-btn" onClick={generateMinutes}><FileText size={18} />生成专家会诊记录</button>
          <button className="primary-btn" onClick={() => navigate("reports", "已进入报告中心", "/reports/generate")}><LayoutDashboard size={18} />进入报告中心</button>
          {minutesId && <span>已生成：{minutesId}</span>}
          <button className="secondary-btn subtle" onClick={() => showAdapterResult(stopHelmetStream(activeChannel.deviceId))}>停止接入</button>
        </footer>
      </main>
      <MediaPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

function ReportsGeneratePage({ setToast }: { setToast: (message: string) => void }) {
  const [preview, setPreview] = useState<MediaPreview | null>(null);
  const [selected, setSelected] = useState<string[]>(["配电箱未关闭", "消防通道占用"]);
  const [reportStatus, setReportStatus] = useState("草稿");
  const evidenceChain = [
    { title: "配电箱未关闭", src: demoMedia.images.electricalPanelOpen },
    { title: "线缆裸露", src: demoMedia.images.cableExposed },
    { title: "消防通道占用", src: demoMedia.images.fireCorridorBlocked },
    { title: "灭火器压力不足", src: demoMedia.images.extinguisherLowPressure },
    { title: "整改后照片", src: demoMedia.images.rectificationAfter }
  ];
  const exportReport = () => {
    const blob = new Blob([`消防与用电安全检查报告\n状态：${reportStatus}\n证据：${selected.join("、")}\n复查语音：${demoMedia.transcripts.recheckResult}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "消防与用电安全检查报告.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("报告文件已导出");
  };
  return (
    <section className="media-workflow-page reports-generate-page">
      <div className="media-hero-card">
        <div><h2>报告生成</h2><p>选择证据链、复查语音和整改材料后生成检查报告。</p></div>
        <div className="module-actions"><button className="primary-btn" onClick={() => { setReportStatus("已生成"); setToast("报告已生成"); }}>生成报告</button><button className="secondary-btn" onClick={exportReport}>导出报告</button></div>
      </div>
      <div className="report-layout">
        <section className="report-preview-card"><img src={demoMedia.images.reportCenterPages} alt="报告页面预览" /><Badge label={reportStatus} /></section>
        <aside className="media-side-card">
          <header><h3>证据链归档</h3><button onClick={() => setToast("证据材料已打包下载")}>全部下载</button></header>
          <div className="media-evidence-grid">
            {evidenceChain.map((item) => <button key={item.title} className={selected.includes(item.title) ? "active" : ""} onClick={() => { setSelected((items) => items.includes(item.title) ? items.filter((value) => value !== item.title) : [...items, item.title]); setPreview({ title: item.title, type: "image", src: item.src }); }}><img src={item.src} alt={item.title} /><b>{item.title}</b></button>)}
          </div>
          <section className="report-audio-card"><h3>复查语音</h3><audio src={demoMedia.audio.recheckResult} controls /><p>{demoMedia.transcripts.recheckResult}</p></section>
        </aside>
      </div>
      <section className="media-table-card">
        <h3>报告材料清单</h3>
        <DataTable headers={["材料名称", "类型", "状态"]} rows={[["现场原始证据", "图片", selected.length ? "已选择" : "待选择"], ["复查语音", "音频", "已归档"], ["整改前后对比", "图片", "已归档"], ["闭环记录", "表单", reportStatus]]} />
      </section>
      <MediaPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

function GenericModulePage({ page, navigate }: { page: PageKey; navigate: (page: PageKey, message?: string) => void }) {
  const table = genericTables[page as Exclude<PageKey, "dashboard" | "customers" | "projects">];
  return (
    <section className="module-page">
      <div className="module-hero"><div className="module-icon"><LayoutDashboard size={30} /></div><div><h2>{pageTitles[page]}</h2><p>该模块服务于客户管理、项目管理、设备管理、专家协同、报告归档和运营分析等后台能力。</p></div><div className="module-actions"><button className="primary-btn" onClick={() => navigate("dashboard", "已返回运营工作台")}>返回工作台</button><button className="secondary-btn" onClick={() => navigate("reports", "已进入报告中心")}>生成报告</button></div></div>
      <div className="module-grid"><Panel title={`${pageTitles[page]}列表`} onMore={() => navigate("dashboard", "已回到运营工作台查看汇总")}><DataTable headers={table.headers} rows={table.rows} /></Panel><Panel title="业务趋势" onMore={() => navigate("analytics", "已打开数据看板")}><LineCard data={riskTrend} colors={["#2f80ed", "#18a863"]} keys={["较高风险", "低风险"]} xKey="day" /></Panel></div>
    </section>
  );
}

function RectificationChart() {
  const total = rectification.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="donut-layout">
      <div className="donut-chart">
        <ResponsiveContainer><PieChart><Pie data={rectification} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={2} isAnimationActive={false}>{rectification.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer>
        <div className="donut-center"><strong>{total}</strong><span>隐患总数</span></div>
      </div>
      <div className="legend-stack">{rectification.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{item.value}</b><em>{((item.value / total) * 100).toFixed(2)}%</em></div>)}</div>
    </div>
  );
}

function StatCard({ title, value, unit, icon: Icon, tone, footer }: { title: string; value: number; unit: string; icon: React.ElementType; tone: string; footer: string[][] }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={48} /></div><div className="stat-main"><span>{title}</span><div><strong>{value}</strong><small>{unit}</small></div><footer>{footer.map(([label, text]) => <p key={label}><span>{label}</span><b>{text}</b></p>)}</footer></div></article>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Panel({ title, children, onMore, className = "" }: { title: string; children: React.ReactNode; onMore: () => void; className?: string }) {
  return <section className={`panel ${className}`}><header><h2>{title}</h2><button onClick={onMore} aria-label={`查看${title}`}>更多<ChevronRight size={16} /></button></header><div className="panel-body">{children}</div></section>;
}

function SelectBox({ label, value, options, onChange, compact }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; compact?: boolean }) {
  return <label className={`select-box ${compact ? "compact" : ""}`}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function shouldRenderBadgeCell(cell: string) {
  const value = cell.trim();
  const badgeValues = new Set([
    "重大隐患",
    "较大隐患",
    "一般隐患",
    "高风险",
    "中风险",
    "低风险",
    "在线",
    "离线",
    "任务中",
    "维护中",
    "待派发",
    "待执行",
    "执行中",
    "进行中",
    "未开始",
    "待整改",
    "整改中",
    "待复查",
    "企业确认",
    "专家复核",
    "已销号",
    "即将超期",
    "多次退回",
    "待登记",
    "已登记",
    "待提交",
    "已提交",
    "有效",
    "草稿",
    "已发布",
    "通过",
    "不通过",
    "已完整",
    "待补充"
  ]);
  return badgeValues.has(value) || /^超期\d+天$/.test(value);
}

function DataTable({ headers, rows, onRowClick, selectedKey, columnWidths, emptyText = "暂无符合条件的记录" }: { headers: string[]; rows: string[][]; onRowClick?: (row: string[]) => void; selectedKey?: string; columnWidths?: string[]; emptyText?: string }) {
  return (
    <div className="table-fit">
      <table className="data-table">
        {columnWidths && <colgroup>{columnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>}
        <thead><tr>{headers.map((item) => <th key={item} scope="col">{item}</th>)}</tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} className="table-empty-state">{emptyText}</td></tr> : rows.map((row) => <tr key={row.join("-")} className={`${onRowClick ? "clickable-row" : ""} ${selectedKey === row[0] ? "selected-row" : ""}`} onClick={() => onRowClick?.(row)}>{row.map((cell, index) => <td key={`${row[0]}-${index}`} title={cell}>{shouldRenderBadgeCell(cell) ? <Badge label={cell} /> : cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  const tone = label.includes("重大") || label.includes("高风险") || label.includes("预警") || label.includes("重点")
    ? "danger"
    : ["低风险", "一般隐患", "已销号", "已整改", "通过"].includes(label)
      ? "success"
    : ["进行中", "执行中", "任务中", "在线"].includes(label)
      ? "running"
    : label.includes("较大") || label.includes("待") || label.includes("中") || label.includes("到期")
      ? "warning"
      : label.includes("进行") || label.includes("在线") || label.includes("服务") || label.includes("有效") || label.includes("已")
        ? "running"
        : "muted";
  return <span className={`badge ${tone}`}>{label}</span>;
}

function LineCard({ data, keys, colors, xKey }: { data: Record<string, string | number>[]; keys: string[]; colors: string[]; xKey: string }) {
  return <div className="line-card"><ResponsiveContainer><LineChart data={data} margin={{ top: 28, right: 10, left: -24, bottom: 0 }}><XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><Tooltip /><Legend iconType="plainline" wrapperStyle={{ top: 0, fontSize: 12 }} />{keys.map((key, index) => <Line key={key} type="monotone" dataKey={key} stroke={colors[index]} strokeWidth={2.2} dot={{ r: 2.8, strokeWidth: 1 }} activeDot={{ r: 5 }} />)}</LineChart></ResponsiveContainer></div>;
}

function ShandongMap() {
  const mapPoints = [
    { city: "德州", value: 1, x: 20, y: 30, tone: "green" },
    { city: "济南", value: 12, x: 30, y: 45, tone: "red" },
    { city: "淄博", value: 8, x: 42, y: 37, tone: "orange" },
    { city: "潍坊", value: 5, x: 58, y: 54, tone: "yellow" },
    { city: "青岛", value: 3, x: 70, y: 50, tone: "green" },
    { city: "烟台", value: 7, x: 77, y: 24, tone: "orange" },
    { city: "临沂", value: 6, x: 45, y: 72, tone: "yellow" },
    { city: "日照", value: 2, x: 72, y: 74, tone: "green" }
  ];
  return (
    <div className="shandong-map">
      <svg viewBox="0 0 720 360" role="img" aria-label="山东省风险分布示意图">
        <path className="province" d="M77 188L96 156L126 141L150 112L204 121L232 101L280 113L300 91L344 109L384 88L427 104L458 80L504 91L535 69L589 96L632 91L664 119L642 151L674 181L634 201L611 236L552 229L516 260L467 244L425 273L375 252L335 284L284 265L242 290L203 255L152 257L126 224L88 220Z" />
        <path className="county c1" d="M95 164L204 121L236 193L151 255L88 219Z" /><path className="county c2" d="M204 121L300 91L333 181L236 193Z" /><path className="county c3" d="M300 91L427 104L405 194L333 181Z" /><path className="county c4" d="M427 104L535 69L552 173L405 194Z" /><path className="county c5" d="M535 69L664 119L611 236L552 173Z" /><path className="county c6" d="M236 193L333 181L335 284L242 290L151 255Z" /><path className="county c7" d="M333 181L405 194L425 273L335 284Z" /><path className="county c8" d="M405 194L552 173L516 260L425 273Z" /><path className="county c9" d="M552 173L611 236L516 260Z" />
      </svg>
      {mapPoints.map((point) => <div className={`risk-point ${point.tone}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} key={point.city}><b>{point.value}</b><span>{point.city}</span></div>)}
      <footer className="map-legend"><span><i className="red" />高风险</span><span><i className="orange" />较高风险</span><span><i className="yellow" />中风险</span><span><i className="green" />低风险</span></footer>
    </div>
  );
}

function MiniParkMap() {
  return <div className="mini-park-map">{["3号楼", "0号楼", "1号楼", "9号楼", "7号楼", "5号楼"].map((item) => <span key={item}>{item}</span>)}</div>;
}

function toOption(value: string): Option {
  return { label: value, value };
}

export default App;

