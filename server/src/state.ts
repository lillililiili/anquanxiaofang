import type { DeviceLiveState, HazardCandidate, HazardDraft, SafetyAnalysis } from "./types/safety.types.js";

export const defaultDevice: DeviceLiveState = {
  deviceId: "SHM20250516001",
  deviceName: "aa的智能安全帽",
  online: true,
  battery: 78,
  network: "5G",
  taskId: "TASK20250516001",
  taskName: "配电室日常巡检",
  inspector: "张伟",
  streamUrl: "/demo-media/videos/helmet_live_electrical_inspection.mp4",
  aiEnabled: true,
  runTime: "02:45:18"
};

export const state = {
  devices: new Map<string, DeviceLiveState>([[defaultDevice.deviceId, defaultDevice]]),
  latestAnalysis: new Map<string, SafetyAnalysis>(),
  hazardCandidates: new Map<string, HazardCandidate>(),
  drafts: new Map<string, HazardDraft>(),
  evidenceList: [] as Array<{ id: string; deviceId: string; taskId: string; captureTime: string; frameBase64: string }>,
  rectificationSuggestions: [] as Array<{ id: string; suggestions: string[]; createdAt: string }>
};

export function getDevice(deviceId = defaultDevice.deviceId) {
  return state.devices.get(deviceId) ?? defaultDevice;
}

export function updateDevice(deviceId: string, patch: Partial<DeviceLiveState>) {
  const next = { ...getDevice(deviceId), ...patch, deviceId };
  state.devices.set(deviceId, next);
  return next;
}

export function createId(prefix: string) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${prefix}${stamp}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
}
