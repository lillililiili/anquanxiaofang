export type ExpertRisk = "高风险" | "中风险" | "低风险" | "-";
export type ExpertChannelStatus = "直播中" | "离线";
export type ExpertReviewStatus = "待审核" | "已审核" | "已提交";

export type ExpertVideoChannel = {
  id: string;
  index: number;
  project: string;
  point: string;
  inspector: string;
  time: string;
  status: ExpertChannelStatus;
  risk: ExpertRisk;
  deviceId: string;
  thumbnail: string;
  video: string;
  resolution: string;
  bitrate: string;
  latency: string;
};

export type ExpertHazard = {
  id: string;
  name: string;
  risk: ExpertRisk;
  confidence: string;
  source: string;
  standard: string;
  description: string;
  status: ExpertReviewStatus;
  focused?: boolean;
};

export type ExpertReviewRecord = {
  time: string;
  hazard: string;
  result: string;
  expert: string;
};

export type ExpertSnapshot = {
  id: string;
  time: string;
  src: string;
};

export type ExpertChatMessage = {
  time: string;
  speaker: string;
  text: string;
};

export const videoChannels: ExpertVideoChannel[] = [
  {
    id: "channel-1",
    index: 1,
    project: "齐鲁科技园",
    point: "配电室巡检",
    inspector: "张三",
    time: "10:28:30",
    status: "直播中",
    risk: "高风险",
    deviceId: "SHM20250516001",
    thumbnail: "/demo-media/images/evidence_electrical_panel_open.jpg",
    video: "/demo-media/videos/helmet_live_electrical_inspection.mp4",
    resolution: "1080P",
    bitrate: "2560kbps",
    latency: "120ms"
  },
  {
    id: "channel-2",
    index: 2,
    project: "齐鲁科技园",
    point: "消防通道检查",
    inspector: "李四",
    time: "10:27:58",
    status: "直播中",
    risk: "中风险",
    deviceId: "SHM20250516002",
    thumbnail: "/demo-media/images/evidence_fire_corridor_blocked.jpg",
    video: "/demo-media/videos/fire_corridor_obstruction.mp4",
    resolution: "1080P",
    bitrate: "2140kbps",
    latency: "136ms"
  },
  {
    id: "channel-3",
    index: 3,
    project: "鲁商广场",
    point: "消防泵房检查",
    inspector: "王五",
    time: "10:26:45",
    status: "直播中",
    risk: "低风险",
    deviceId: "SHM20250516003",
    thumbnail: "/demo-media/images/evidence_hydrant_extinguisher.jpg",
    video: "/demo-media/videos/extinguisher_pressure_check.mp4",
    resolution: "720P",
    bitrate: "1680kbps",
    latency: "142ms"
  },
  {
    id: "channel-4",
    index: 4,
    project: "高新智造产业园",
    point: "临时用电检查",
    inspector: "赵六",
    time: "10:27:12",
    status: "直播中",
    risk: "高风险",
    deviceId: "SHM20250516004",
    thumbnail: "/demo-media/images/evidence_hot_work_temp_power.jpg",
    video: "/demo-media/videos/hot_work_temp_power_check.mp4",
    resolution: "1080P",
    bitrate: "2480kbps",
    latency: "128ms"
  },
  {
    id: "channel-5",
    index: 5,
    project: "国控大厦",
    point: "消防设施检查",
    inspector: "孙七",
    time: "10:26:30",
    status: "直播中",
    risk: "中风险",
    deviceId: "SHM20250516005",
    thumbnail: "/demo-media/images/evidence_extinguisher_low_pressure.jpg",
    video: "/demo-media/videos/extinguisher_pressure_check.mp4",
    resolution: "720P",
    bitrate: "1960kbps",
    latency: "155ms"
  },
  {
    id: "channel-6",
    index: 6,
    project: "鲁商物流园",
    point: "仓储巡检",
    inspector: "刘洋",
    time: "10:25:50",
    status: "离线",
    risk: "-",
    deviceId: "SHM20250516006",
    thumbnail: "/demo-media/images/evidence_property_equipment_room.jpg",
    video: "/demo-media/videos/location_trajectory_replay.mp4",
    resolution: "离线",
    bitrate: "-",
    latency: "-"
  }
];

export const selectedVideo = videoChannels[0];

export const suspectedHazards: ExpertHazard[] = [
  {
    id: "1",
    name: "配电箱未关闭",
    risk: "高风险",
    confidence: "0.94",
    source: "AI识别",
    standard: "《低压配电设计规范》GB 50054-2011",
    description: "配电箱门未关闭，存在触电及误操作风险。",
    status: "待审核",
    focused: true
  },
  {
    id: "2",
    name: "线缆裸露",
    risk: "高风险",
    confidence: "0.89",
    source: "AI识别",
    standard: "《用电安全导则》GB/T 13869",
    description: "箱内局部线缆外露，建议补拍接线与回路标识。",
    status: "待审核"
  },
  {
    id: "3",
    name: "灭火器压力不足",
    risk: "中风险",
    confidence: "0.91",
    source: "AI识别",
    standard: "《建筑灭火器配置验收及检查规范》GB 50444",
    description: "压力指针偏离绿色区域，需现场复核压力表。",
    status: "待审核"
  }
];

export const expertReviewRecords: ExpertReviewRecord[] = [
  { time: "10:24:18", hazard: "消防通道占用", result: "已审核", expert: "王工" },
  { time: "10:26:05", hazard: "临时用电接地异常", result: "补充材料", expert: "王工" }
];

export const retakeSuggestions = [
  "建议补拍配电箱内部接线",
  "建议补拍配电箱铭牌及回路标识",
  "建议补拍灭火器压力表特写",
  "建议补拍整改后照片"
];

export const screenshots: ExpertSnapshot[] = [
  { id: "shot-1", time: "10:28:45", src: "/demo-media/images/evidence_electrical_panel_open.jpg" },
  { id: "shot-2", time: "10:29:12", src: "/demo-media/images/evidence_electrical_cabinet_visible.jpg" },
  { id: "shot-3", time: "10:29:35", src: "/demo-media/images/evidence_cable_exposed.jpg" },
  { id: "shot-4", time: "10:30:02", src: "/demo-media/images/evidence_temp_power_box.jpg" },
  { id: "shot-5", time: "10:30:25", src: "/demo-media/images/rectification_process_04.jpg" },
  { id: "shot-6", time: "10:31:05", src: "/demo-media/images/evidence_extinguisher_low_pressure.jpg" }
];

export const chatMessages: ExpertChatMessage[] = [
  { time: "10:28:30", speaker: "张三", text: "现场发现配电箱门未关闭。" },
  { time: "10:28:45", speaker: "王工", text: "请补拍箱内接线情况。" },
  { time: "10:29:13", speaker: "张三", text: "已补拍，请查看。" },
  { time: "10:29:35", speaker: "王工", text: "该隐患建议纳入重点整改。" }
];

export const taskInfo = {
  id: "RW20250516003",
  name: "齐鲁科技园配电室用电巡检",
  inspector: "张三",
  time: "2025-05-16 10:20 ~ 12:20",
  location: "齐鲁科技园 配电室",
  status: "执行中",
  deviceId: "SHM20250516001"
};

export const reportReviewInfo = {
  name: "齐鲁科技园配电室远程会诊记录",
  type: "专家会诊记录",
  evidenceCount: "12项",
  reviewedHazards: "3项",
  summary: "已确认配电箱未关闭和线缆裸露风险，建议纳入重点整改并补拍整改后照片。"
};
