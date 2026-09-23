export type KnowledgeCategory = {
  id: string;
  name: string;
  count: number;
  status: "已更新" | "同步中";
  type: string;
  scene: string;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  version: string;
  updatedAt: string;
  status: "已更新" | "有效" | "待更新";
  publisher: string;
  scene: string;
  clauses: string;
  hazardTags: string[];
  citations: number;
  summary: string;
};

export const knowledgeCategories: KnowledgeCategory[] = [
  { id: "fire", name: "消防安全知识库", count: 1245, status: "已更新", type: "消防安全", scene: "消防巡检" },
  { id: "electric", name: "用电安全知识库", count: 987, status: "已更新", type: "用电安全", scene: "配电室巡检" },
  { id: "property", name: "物业安全检查知识库", count: 642, status: "已更新", type: "物业安全", scene: "物业巡检" },
  { id: "park", name: "园区安全检查知识库", count: 735, status: "已更新", type: "园区安全", scene: "园区巡检" },
  { id: "industry", name: "工贸企业安全知识库", count: 1128, status: "已更新", type: "工贸企业", scene: "企业自查" },
  { id: "hotwork", name: "动火与临时用电知识库", count: 568, status: "已更新", type: "作业安全", scene: "动火临电" }
];

export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "KD-0001",
    title: "《低压配电设计规范》GB 50054-2011",
    category: "用电安全知识库",
    keywords: ["低压配电", "供电系统", "设计规范"],
    version: "2011版",
    updatedAt: "2025-05-15 10:22:31",
    status: "已更新",
    publisher: "中华人民共和国住房和城乡建设部",
    scene: "低压配电系统设计、建设、验收与运行维护",
    clauses: "第 3.1.1 条、第 4.2.3 条、第 7.1.6 条等",
    hazardTags: ["配电箱未关闭", "线缆敷设不规范", "接地异常"],
    citations: 256,
    summary: "用于支撑配电系统巡检、箱门闭锁、线缆敷设和接地保护等检查依据检索。"
  },
  {
    id: "KD-0002",
    title: "《建筑设计防火规范》GB 50016-2014",
    category: "消防安全知识库",
    keywords: ["建筑防火", "防火分区", "安全疏散"],
    version: "2014版",
    updatedAt: "2025-05-14 16:45:12",
    status: "已更新",
    publisher: "中华人民共和国住房和城乡建设部",
    scene: "建筑消防检查、疏散通道检查",
    clauses: "第 5.5.17 条、第 6.4.1 条、第 8.3.1 条等",
    hazardTags: ["消防通道占用", "疏散指示缺失"],
    citations: 198,
    summary: "用于消防通道、安全出口、防火分隔和消防设施配置的检查依据。"
  },
  {
    id: "KD-0003",
    title: "《建筑灭火器配置设计规范》GB 50140-2005",
    category: "消防安全知识库",
    keywords: ["灭火器配置", "设置场所", "计算方法"],
    version: "2005版",
    updatedAt: "2025-05-13 09:15:43",
    status: "有效",
    publisher: "中华人民共和国公安部",
    scene: "灭火器配置、压力检查、点位复核",
    clauses: "第 4.1.3 条、第 5.1.1 条、第 7.2.2 条等",
    hazardTags: ["灭火器压力不足", "灭火器配置缺失"],
    citations: 176,
    summary: "为灭火器配置数量、类型和现场压力状态检查提供依据。"
  },
  {
    id: "KD-0004",
    title: "《电气装置安装工程接地装置施工及验收规范》GB 50169-2016",
    category: "用电安全知识库",
    keywords: ["接地装置", "施工验收", "接地电阻"],
    version: "2016版",
    updatedAt: "2025-05-12 14:33:08",
    status: "有效",
    publisher: "中国计划出版社",
    scene: "接地系统检查、临时用电验收",
    clauses: "第 3.0.4 条、第 4.2.1 条、第 6.2.5 条等",
    hazardTags: ["接地异常", "漏电保护缺失"],
    citations: 142,
    summary: "用于判断接地连接、接地电阻测试和临时用电保护措施是否合规。"
  },
  {
    id: "KD-0005",
    title: "《火灾自动报警系统设计规范》GB 50116-2013",
    category: "消防安全知识库",
    keywords: ["火灾报警", "系统设计", "联动控制"],
    version: "2013版",
    updatedAt: "2025-05-11 11:20:27",
    status: "待更新",
    publisher: "中华人民共和国住房和城乡建设部",
    scene: "消防控制室巡检、报警联动检查",
    clauses: "第 3.1.6 条、第 4.1.1 条、第 6.5.2 条等",
    hazardTags: ["消防主机故障", "联动控制异常"],
    citations: 118,
    summary: "用于消防报警系统、联动控制和控制室值守检查依据。"
  }
];

export const recentKnowledgeUpdates = [
  ["2025-05-15 10:22:31", "《低压配电设计规范》GB 50054-2011", "用电安全知识库", "更新至住房和城乡建设部 2025年第12号公告条文说明", "系统管理员"],
  ["2025-05-14 16:45:12", "《建筑设计防火规范》GB 50016-2014", "消防安全知识库", "补充最新条文解释与典型应用案例 8 条", "安全工程师-张工"],
  ["2025-05-13 09:15:43", "《建筑灭火器配置设计规范》GB 50140-2005", "消防安全知识库", "修订计算方法示例，新增现场所分类说明", "安全工程师-李工"],
  ["2025-05-12 14:33:08", "《电气装置安装工程接地装置施工及验收规范》GB 50169-2016", "用电安全知识库", "更新验收记录表模板及关键条款注释", "电气工程师-王工"],
  ["2025-05-11 11:20:27", "《火灾自动报警系统设计规范》GB 50116-2013", "消防安全知识库", "补充联动控制逻辑图示与常见问题说明", "安全工程师-赵工"]
];
