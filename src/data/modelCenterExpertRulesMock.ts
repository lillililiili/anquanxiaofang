export type ExpertRule = {
  id: string;
  name: string;
  category: string;
  condition: string;
  risk: "高风险" | "中风险" | "低风险";
  status: "已发布" | "已停用" | "草稿";
  updatedAt: string;
  scene: string;
  points: string;
  suggestion: string;
  basis: string;
  tags: string[];
  needExpert: boolean;
  keyRectify: boolean;
};

export const ruleCategories = [
  ["全部规则", "356"],
  ["用电安全规则", "128"],
  ["消防设施规则", "96"],
  ["临时用电规则", "48"],
  ["动火作业规则", "36"],
  ["物业巡检规则", "48"]
];

export const expertRules: ExpertRule[] = [
  { id: "EX-RULE-0001", name: "配电箱门未关闭规则", category: "用电安全规则", condition: "配电箱门未完全关闭或箱门未上锁", risk: "高风险", status: "已发布", updatedAt: "2025-05-16 10:32", scene: "配电室巡检", points: "配电箱门未完全关闭或箱门未上锁，存在触电、短路风险。", suggestion: "立即关闭配电箱门并上锁，确保配电箱处于关闭、锁闭状态。", basis: "GB 50054-2011《低压配电设计规范》6.1.5", tags: ["配电室", "车间用电检查"], needExpert: true, keyRectify: true },
  { id: "EX-RULE-0002", name: "线缆裸露识别规则", category: "用电安全规则", condition: "电缆或导线绝缘层破损或导体裸露", risk: "中风险", status: "已发布", updatedAt: "2025-05-15 16:48", scene: "配电室巡检", points: "导线裸露、绝缘破损、接线端子外露。", suggestion: "对裸露线缆进行绝缘包扎，必要时更换线缆。", basis: "GB/T 13869-2017《用电安全导则》", tags: ["线缆", "绝缘"], needExpert: true, keyRectify: false },
  { id: "EX-RULE-0003", name: "灭火器压力异常规则", category: "消防设施规则", condition: "灭火器压力指针不在绿色区域", risk: "中风险", status: "已发布", updatedAt: "2025-05-14 09:21", scene: "消防设施巡检", points: "压力表指针低于绿色区域或瓶体异常。", suggestion: "更换或重新充装灭火器，并复核配置点位。", basis: "GB 50140-2005《建筑灭火器配置设计规范》", tags: ["灭火器", "消防设施"], needExpert: false, keyRectify: false },
  { id: "EX-RULE-0004", name: "消防通道占用规则", category: "消防设施规则", condition: "消防通道被物品占用或堵塞", risk: "高风险", status: "已发布", updatedAt: "2025-05-13 14:05", scene: "消防通道检查", points: "疏散通道堆物、宽度不足或安全出口受阻。", suggestion: "立即清理通道堆放物，恢复疏散宽度。", basis: "GB 50016-2014《建筑设计防火规范》", tags: ["消防通道", "疏散"], needExpert: true, keyRectify: true },
  { id: "EX-RULE-0005", name: "临时用电未设漏保规则", category: "临时用电规则", condition: "临时用电未采用符合要求的配电箱", risk: "高风险", status: "已发布", updatedAt: "2025-05-12 11:30", scene: "动火临电检查", points: "临时用电未配置漏电保护或配电箱防护不足。", suggestion: "暂停作业，补齐漏保、接地和箱体防护。", basis: "JGJ 46-2005《施工现场临时用电安全技术规范》", tags: ["临时用电", "漏保"], needExpert: true, keyRectify: true },
  { id: "EX-RULE-0006", name: "接地线未连接规则", category: "用电安全规则", condition: "设备未可靠接地或接地线未连接", risk: "中风险", status: "已发布", updatedAt: "2025-05-11 15:42", scene: "配电室巡检", points: "接地线断开、标识不清或连接松动。", suggestion: "恢复可靠接地并留存接地检测记录。", basis: "GB 50169-2016《接地装置施工及验收规范》", tags: ["接地", "配电设备"], needExpert: false, keyRectify: false },
  { id: "EX-RULE-0007", name: "动火作业未审批规则", category: "动火作业规则", condition: "动火作业未办理审批手续或审批无效", risk: "高风险", status: "已发布", updatedAt: "2025-05-10 17:18", scene: "动火作业检查", points: "现场动火票缺失、审批过期或监护不到位。", suggestion: "停止动火作业，补办审批并落实监护措施。", basis: "企业动火作业安全管理制度", tags: ["动火", "审批"], needExpert: true, keyRectify: true }
];

export const ruleVersions = [
  ["V2.3", "当前版本", "张工", "2025-05-16 10:32", "已发布", "调整触发条件角度阈值；新增判断要点说明；完善整改建议内容。"],
  ["V2.2", "修正整改建议，关联依据更新", "李工", "2025-05-12 15:18", "已发布", "更新整改建议文本；关联依据更新为 GB 50054-2011。"],
  ["V2.1", "初始版本创建", "王工", "2025-05-08 09:05", "已发布", "创建规则基本信息与触发条件。"]
];

export const testResultMock = {
  hit: "命中",
  rule: "配电箱门未关闭规则",
  risk: "高风险",
  action: "建议人工确认并纳入重点整改"
};
