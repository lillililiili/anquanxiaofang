import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { config } from "../env.js";
import type { BBox, RiskLevel, SafetyAnalysis, SafetyDetection } from "../types/safety.types.js";

type YoloRawDetection = {
  classId: number;
  label: string;
  confidence: number;
  bbox: BBox;
};

type YoloRawResponse = {
  detections: YoloRawDetection[];
};

type HazardMapping = {
  hazardName: string;
  category: SafetyDetection["category"];
  riskLevel: RiskLevel;
  description: string;
  evidence: string;
  possibleConsequence: string;
  basisKeywords: string[];
  rectificationSuggestion: string;
  needRetake: boolean;
  retakeSuggestions: string[];
  needExpertReview: boolean;
  countsAsHazard: boolean;
};

const labelMappings: Array<{ keywords: string[]; mapping: HazardMapping }> = [
  {
    keywords: ["open_electrical_box", "electrical_box_open", "distribution_box_open", "power_box_open", "配电箱未关闭", "配电箱门打开"],
    mapping: {
      hazardName: "配电箱未关闭",
      category: "用电安全" as SafetyDetection["category"],
      riskLevel: "高风险" as RiskLevel,
      description: "YOLO 识别到配电箱或配电柜门处于开启状态，存在误触、短路或异物进入风险。",
      evidence: "画面中存在疑似开启的配电箱门或裸露的配电设备区域。",
      possibleConsequence: "可能引发触电、短路或电气火灾。",
      basisKeywords: ["低压配电", "配电箱闭锁", "触电风险"],
      rectificationSuggestion: "立即关闭配电箱门并上锁，检查门锁、警示标识和箱内接线状态。",
      needRetake: true,
      retakeSuggestions: ["补拍配电箱门锁状态", "补拍配电箱内部接线和回路标识"],
      needExpertReview: true,
      countsAsHazard: true
    }
  },
  {
    keywords: ["exposed_wire", "wire_exposed", "cable_exposed", "bare_wire", "线缆裸露", "裸露线缆"],
    mapping: {
      hazardName: "线缆裸露",
      category: "用电安全" as SafetyDetection["category"],
      riskLevel: "高风险" as RiskLevel,
      description: "YOLO 识别到疑似线缆裸露或接线不规范区域。",
      evidence: "画面中存在线缆外露、走线凌乱或接头暴露的视觉特征。",
      possibleConsequence: "可能导致短路、触电或设备故障。",
      basisKeywords: ["线缆绝缘", "接线规范", "电气火灾"],
      rectificationSuggestion: "对裸露线缆进行绝缘包扎，整理线缆走向，必要时更换老化线路。",
      needRetake: true,
      retakeSuggestions: ["补拍裸露线缆细节", "补拍线缆接头和保护措施"],
      needExpertReview: true,
      countsAsHazard: true
    }
  },
  {
    keywords: ["fire_corridor_blocked", "blocked_fire_exit", "blocked_corridor", "消防通道占用", "通道堵塞"],
    mapping: {
      hazardName: "消防通道占用",
      category: "消防安全" as SafetyDetection["category"],
      riskLevel: "高风险" as RiskLevel,
      description: "YOLO 识别到消防通道或疏散通道存在堆物、遮挡或占用情况。",
      evidence: "画面中消防通道区域存在障碍物或通行空间不足。",
      possibleConsequence: "可能影响人员疏散和消防救援。",
      basisKeywords: ["消防通道", "安全疏散", "通道占用"],
      rectificationSuggestion: "立即清理通道堆物，恢复疏散宽度，并设置通道保持责任标识。",
      needRetake: true,
      retakeSuggestions: ["补拍通道整体宽度", "补拍清理后的同角度照片"],
      needExpertReview: false,
      countsAsHazard: true
    }
  },
  {
    keywords: ["extinguisher_low_pressure", "low_pressure_extinguisher", "灭火器压力不足"],
    mapping: {
      hazardName: "灭火器压力不足",
      category: "消防安全" as SafetyDetection["category"],
      riskLevel: "中风险" as RiskLevel,
      description: "YOLO 识别到灭火器压力表疑似异常或低压。",
      evidence: "画面中灭火器压力表指针疑似不在正常区域。",
      possibleConsequence: "火情发生时可能影响初期灭火效果。",
      basisKeywords: ["灭火器", "压力表", "消防设施"],
      rectificationSuggestion: "更换或充装压力不足的灭火器，确认压力处于正常范围。",
      needRetake: true,
      retakeSuggestions: ["补拍灭火器压力表特写", "补拍灭火器有效期标签"],
      needExpertReview: false,
      countsAsHazard: true
    }
  },
  {
    keywords: ["fire_extinguisher", "fire extinguisher", "fireextinguisher", "灭火器"],
    mapping: {
      hazardName: "灭火器位置确认",
      category: "消防安全" as SafetyDetection["category"],
      riskLevel: "低风险" as RiskLevel,
      description: "YOLO 识别到画面中的灭火器目标，可用于确认消防设施位置和在位情况。",
      evidence: "画面中存在灭火器外形目标，已由 fire_extinguisher 类别框选。",
      possibleConsequence: "该结果只表示识别到灭火器本体，压力、有效期和遮挡情况仍需结合特写或专用模型判断。",
      basisKeywords: ["灭火器", "fire_extinguisher", "消防设施在位"],
      rectificationSuggestion: "核对灭火器是否在指定位置，并补拍压力表和有效期标签用于进一步检查。",
      needRetake: true,
      retakeSuggestions: ["补拍灭火器压力表特写", "补拍灭火器有效期标签"],
      needExpertReview: false,
      countsAsHazard: false
    }
  },
  {
    keywords: ["fire_hydrant", "fire hydrant", "firehydrant", "消火栓", "消防栓"],
    mapping: {
      hazardName: "消火栓位置确认",
      category: "消防安全" as SafetyDetection["category"],
      riskLevel: "低风险" as RiskLevel,
      description: "YOLO26 识别到画面中的消火栓目标，可用于确认消防设施位置和在位情况。",
      evidence: "画面中存在消火栓外形目标，已由 fire hydrant 类别框选。",
      possibleConsequence: "该结果只表示识别到消火栓本体，遮挡、损坏和水压状态仍需结合现场检查判断。",
      basisKeywords: ["消火栓", "fire hydrant", "消防设施在位"],
      rectificationSuggestion: "核对消火栓是否无遮挡、标识清晰、箱门可开启，并补拍周边通道和压力/接口状态。",
      needRetake: true,
      retakeSuggestions: ["补拍消火栓周边无遮挡情况", "补拍消火栓标识和接口状态"],
      needExpertReview: false,
      countsAsHazard: false
    }
  },
  {
    keywords: ["flame", "smoke", "明火", "烟雾"],
    mapping: {
      hazardName: "疑似明火或烟雾",
      category: "消防安全" as SafetyDetection["category"],
      riskLevel: "高风险" as RiskLevel,
      description: "YOLO 识别到画面中存在疑似明火或烟雾特征。",
      evidence: "画面中存在火焰、烟雾或异常发光区域。",
      possibleConsequence: "可能存在火灾风险，需要立即核查。",
      basisKeywords: ["明火", "烟雾", "火灾风险"],
      rectificationSuggestion: "立即核查现场火源和烟雾来源，必要时启动现场应急处置流程。",
      needRetake: false,
      retakeSuggestions: [],
      needExpertReview: true,
      countsAsHazard: true
    }
  },
  {
    keywords: ["no_helmet", "no_hardhat", "helmet_missing", "未戴安全帽"],
    mapping: {
      hazardName: "人员未佩戴安全帽",
      category: "其他" as SafetyDetection["category"],
      riskLevel: "中风险" as RiskLevel,
      description: "YOLO 识别到现场人员疑似未佩戴安全帽。",
      evidence: "画面中人员头部区域未检测到安全帽或安全帽佩戴异常。",
      possibleConsequence: "现场作业中可能增加物体打击等伤害风险。",
      basisKeywords: ["个体防护", "安全帽", "现场作业"],
      rectificationSuggestion: "提醒现场人员规范佩戴安全帽，并复查个人防护用品佩戴情况。",
      needRetake: false,
      retakeSuggestions: [],
      needExpertReview: false,
      countsAsHazard: true
    }
  },
  {
    keywords: ["person", "人员"],
    mapping: {
      hazardName: "人员位置确认",
      category: "其他" as SafetyDetection["category"],
      riskLevel: "低风险" as RiskLevel,
      description: "YOLO26 识别到画面中的人员目标，可用于现场人员位置确认。",
      evidence: "画面中存在人员目标，已由 person 类别框选。",
      possibleConsequence: "该结果只表示识别到人员本体，是否存在未佩戴安全帽等风险需要专用 PPE 模型进一步判断。",
      basisKeywords: ["person", "人员识别", "现场定位"],
      rectificationSuggestion: "结合现场作业要求复核人员防护用品佩戴情况。",
      needRetake: false,
      retakeSuggestions: [],
      needExpertReview: false,
      countsAsHazard: false
    }
  }
];

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parsePythonJson(text: string): YoloRawResponse {
  const trimmed = text.trim();
  if (!trimmed) return { detections: [] };
  return JSON.parse(trimmed) as YoloRawResponse;
}

function runYoloPython(frameBase64: string): Promise<YoloRawResponse> {
  const scriptPath = resolve(process.cwd(), config.yoloScriptPath);
  const payload = JSON.stringify({
    frameBase64,
    modelPath: config.yoloModelPath.replace(/\\/g, "/"),
    classNamesPath: config.yoloClassNamesPath.replace(/\\/g, "/"),
    inputSize: config.yoloInputSize,
    confidenceThreshold: config.yoloConfidenceThreshold,
    nmsThreshold: config.yoloNmsThreshold
  });

  return new Promise((resolvePromise, reject) => {
    const child = spawn(config.yoloPythonPath, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const output = Buffer.concat(stdout).toString("utf8");
      const errorOutput = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        reject(new Error(errorOutput || `OpenCV YOLO process exited with code ${code}`));
        return;
      }
      try {
        resolvePromise(parsePythonJson(output));
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.end(payload, "utf8");
  });
}

function getMapping(label: string): HazardMapping {
  const normalized = normalizeLabel(label);
  return labelMappings.find((item) => item.keywords.some((keyword) => normalized.includes(normalizeLabel(keyword))))?.mapping ?? {
    hazardName: `疑似${label || "现场异常"}`,
    category: "其他" as SafetyDetection["category"],
    riskLevel: "建议人工复核" as RiskLevel,
    description: `YOLO 识别到 ${label || "未知目标"}，建议结合现场检查规则进行人工确认。`,
    evidence: "画面中存在需要人工确认的目标或状态。",
    possibleConsequence: "需要结合现场情况进一步判断风险。",
    basisKeywords: ["AI识别", "人工复核"],
    rectificationSuggestion: "建议检查人员补充现场照片和描述后提交专家复核。",
    needRetake: true,
    retakeSuggestions: ["补拍目标区域近景", "补拍目标周边环境"],
    needExpertReview: true,
    countsAsHazard: true
  };
}

function detectionCountsAsHazard(item: SafetyDetection): boolean {
  return item.riskLevel !== ("低风险" as RiskLevel);
}

function toSafetyDetection(item: YoloRawDetection, index: number): SafetyDetection {
  const mapping = getMapping(item.label);
  return {
    id: `Y${String(index + 1).padStart(3, "0")}`,
    hazardName: mapping.hazardName,
    category: mapping.category,
    riskLevel: mapping.riskLevel,
    confidence: Number(item.confidence.toFixed(4)),
    bbox: item.bbox,
    description: mapping.description,
    evidence: mapping.evidence,
    possibleConsequence: mapping.possibleConsequence,
    basisKeywords: mapping.basisKeywords,
    rectificationSuggestion: mapping.rectificationSuggestion,
    needRetake: mapping.needRetake,
    retakeSuggestions: mapping.retakeSuggestions,
    needExpertReview: mapping.needExpertReview
  };
}

function getOverallRiskLevel(detections: SafetyDetection[]): RiskLevel {
  if (detections.some((item) => item.riskLevel === ("高风险" as RiskLevel))) return "高风险" as RiskLevel;
  if (detections.some((item) => item.riskLevel === ("中风险" as RiskLevel))) return "中风险" as RiskLevel;
  if (detections.some((item) => item.riskLevel === ("建议人工复核" as RiskLevel))) return "建议人工复核" as RiskLevel;
  return "低风险" as RiskLevel;
}

export async function analyzeFrameWithOpenCvYolo(options: {
  frameBase64: string;
  analysisId: string;
  deviceId: string;
  taskId: string;
  captureTime: string;
}): Promise<SafetyAnalysis> {
  const raw = await runYoloPython(options.frameBase64);
  const detections = raw.detections.map(toSafetyDetection);
  const hazardCount = detections.filter(detectionCountsAsHazard).length;
  const overallRiskLevel = getOverallRiskLevel(detections);
  return {
    analysisId: options.analysisId,
    deviceId: options.deviceId,
    taskId: options.taskId,
    captureTime: options.captureTime,
    hasHazard: hazardCount > 0,
    overallRiskLevel,
    summary: detections.length
      ? `OpenCV YOLO 识别到 ${detections.length} 个目标，其中 ${hazardCount} 个需要按隐患复核。`
      : "OpenCV YOLO 未识别到当前模型类别中的目标。",
    detections,
    manualReviewRequired: detections.some((item) => item.needExpertReview),
    provider: "yolo"
  };
}
