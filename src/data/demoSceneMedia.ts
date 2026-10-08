const photo = (name: string) => `/demo-media/scene-photos/${name}.jpg`;
const clip = (name: string) => `/demo-media/scene-clips/${name}.webm`;

export const sceneImages = {
  electricalPanelOpen: photo("electrical-panel"),
  electricalCabinetVisible: photo("reference-panel"),
  cableExposed: photo("reference-wiring"),
  fireCorridorBlocked: photo("reference-exit"),
  extinguisherLowPressure: photo("reference-pressure"),
  hotWorkTempPower: photo("reference-welding"),
  hydrantExtinguisher: photo("reference-hydrant"),
  temporaryPower: photo("temporary-power"),
  equipmentRoom: photo("reference-panel"),
  infraredOverheat: photo("thermal"),
  rectificationBefore: photo("rectification-before"),
  rectificationAfter: photo("rectification-after"),
};

// Two source photos only: do not manufacture eight stages from repeated UI screenshots.
export const rectificationPhotos = [sceneImages.rectificationBefore, sceneImages.rectificationAfter];
export const sceneVideos = {
  helmetLive: clip("electrical"),
  fireCorridor: clip("exit"),
  extinguisherPressure: clip("pressure"),
  hotWorkTempPower: clip("welding"),
  locationReplay: clip("location"),
  rectificationBeforeAfter: clip("rectification"),
};

/** Match the depicted subject; unsupported subjects must not fall back to a cabinet. */
export function getHazardScene(name: string): { src: string; video?: string } | undefined {
  if (/灭火器/.test(name)) return { src: sceneImages.extinguisherLowPressure, video: sceneVideos.extinguisherPressure };
  if (/消防栓|消火栓/.test(name)) return { src: sceneImages.hydrantExtinguisher };
  if (/通道|疏散|出口/.test(name)) return { src: sceneImages.fireCorridorBlocked, video: sceneVideos.fireCorridor };
  if (/临时电|临电|电源箱/.test(name)) return { src: sceneImages.temporaryPower };
  if (/动火|电焊/.test(name)) return { src: sceneImages.hotWorkTempPower, video: sceneVideos.hotWorkTempPower };
  if (/配电箱|配电柜/.test(name)) return { src: sceneImages.electricalPanelOpen, video: sceneVideos.helmetLive };
  if (/线缆|电缆|线路/.test(name)) return { src: sceneImages.cableExposed, video: sceneVideos.helmetLive };
  return undefined;
}

const legacyMedia: Record<string, string> = {
  "evidence_electrical_panel_open.jpg": sceneImages.electricalPanelOpen,
  "evidence_electrical_cabinet_visible.jpg": sceneImages.electricalCabinetVisible,
  "evidence_cable_exposed.jpg": sceneImages.cableExposed,
  "evidence_fire_corridor_blocked.jpg": sceneImages.fireCorridorBlocked,
  "evidence_extinguisher_low_pressure.jpg": sceneImages.extinguisherLowPressure,
  "evidence_hot_work_temp_power.jpg": sceneImages.hotWorkTempPower,
  "evidence_hydrant_extinguisher.jpg": sceneImages.hydrantExtinguisher,
  "evidence_temp_power_box.jpg": sceneImages.temporaryPower,
  "evidence_property_equipment_room.jpg": sceneImages.equipmentRoom,
  "evidence_infrared_overheat.jpg": sceneImages.infraredOverheat,
  "rectification_before.jpg": sceneImages.rectificationBefore,
  "rectification_after.jpg": sceneImages.rectificationAfter,
};

/** Upgrade known demo paths when reading saved records; preserve user-provided assets. */
export function resolveDemoImage(src: string): string {
  if (!src.startsWith("/demo-media/images/")) return src;
  return legacyMedia[src.slice("/demo-media/images/".length)] ?? src;
}

export function getMediaSourceNote(src: string): string {
  if (src.startsWith("/demo-media/scene-clips/")) return "图片轮播演示 · 非现场录像";
  const name = resolveDemoImage(src).split("/").pop();
  if (name === "electrical-panel.jpg") return "AI 生成场景 · 非真实巡检证据";
  if (name === "reference-panel.jpg" || name === "reference-wiring.jpg") return "实拍参考 · Santeri Viinamäki · CC BY-SA 4.0";
  if (name === "reference-exit.jpg") return "实拍参考 · Xzkdeng · CC0";
  if (name === "reference-pressure.jpg") return "实拍参考 · Connortk · CC BY-SA 3.0；图片不表示压力异常";
  if (name === "reference-welding.jpg") return "实拍参考 · jason gessner · CC BY-SA 2.0";
  if (name === "reference-hydrant.jpg") return "实拍参考 · Downtowngal · CC BY-SA 4.0";
  if (src.startsWith("/demo-media/scene-photos/")) return "原演示素材裁切 · 非真实巡检证据";
  return "演示素材";
}
