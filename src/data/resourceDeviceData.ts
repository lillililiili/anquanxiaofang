import type { ResourceDevice } from "../features/resources/resourceTypes";

// 原设备台账完整迁移；任务名、供电方式与任务中状态另行保留，避免混淆项目档案和任务。
type LegacyDevice = Omit<ResourceDevice, "battery" | "status" | "projectId" | "purchasedDate" | "maintenanceDate"> & {
  battery: string;
  status: "在线" | "离线" | "维护中" | "任务中";
  project: string;
};

const legacyDevices: LegacyDevice[] = [
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
  { id: "BOX20250516018", name: "温湿度传感器 18", type: "传感器设备", model: "BOX-ENV-18", status: "离线", battery: "27%", network: "LoRa", user: "仓储运营部", project: "鲁商物流园", firmware: "V1.3.6", lastSeen: "2025-05-15 17:08" },
];

const projectMap: [string, string][] = [
  ["国控大厦", "P001"], ["齐鲁科技园", "P002"], ["山东国控大数据中心", "P003"],
  ["鲁商广场", "P004"], ["高新智造产业园", "P005"], ["银座佳驿酒店", "P006"],
  ["鲁商物流园", "P007"], ["青岛产业园", "P008"],
];

export const seedDevices: ResourceDevice[] = legacyDevices.map(({ project, battery, status, ...device }, index) => ({
  ...device,
  status: status === "任务中" ? "在线" : status,
  battery: battery === "市电" ? 100 : Number.parseInt(battery, 10),
  powerSource: battery === "市电" ? "市电" : "电池",
  legacyStatus: status,
  legacyProjectName: project,
  projectId: projectMap.find(([name]) => project.startsWith(name))?.[1] ?? "",
  purchasedDate: `2025-0${index % 3 + 1}-15`,
  maintenanceDate: index % 5 === 0 ? "2026-09-18" : "2026-10-15",
}));
