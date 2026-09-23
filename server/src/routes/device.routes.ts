import { Router } from "express";
import { config } from "../env.js";
import { defaultDevice, getDevice, updateDevice } from "../state.js";
import type { ApiResponse, DeviceLiveState } from "../types/safety.types.js";

export const deviceRouter = Router();

deviceRouter.get("/index.php", (req, res) => {
  if (req.query.ctl !== "config" || req.query.act !== "get_config") {
    res.status(404).json({ status: false, msg: "unknown device config action" });
    return;
  }
  const apiUrl = config.apiPublicUrl.endsWith("/") ? config.apiPublicUrl : `${config.apiPublicUrl}/`;
  res.json({
    status: true,
    msg: "获取成功！",
    data: {
      account_id: "11444",
      config: JSON.stringify({
        api_url: apiUrl,
        ws_url: config.wsPublicUrl,
        sos_tmpt: "70",
        power_off_tmpt: "95",
        local_video_record: "1",
        picture_quality: "2",
        upload_video: "1",
        location_type: "0",
        private_switch: "0"
      }),
      notice_switch: JSON.stringify({
        isWear: "0",
        temperature: "0",
        fallAlarm: "0",
        lowBattery: "0",
        sos_switch: "0"
      }),
      ai_broadcast: "[]",
      model_switch: JSON.stringify({
        bodycheck_switch: "1",
        electriccheck_switch: "0",
        audiocheck_switch: "1",
        gascheck_switch: "1",
        sos_switch: 1
      }),
      low_report_time: 450,
      ca_report_time: 0,
      time: Math.floor(Date.now() / 1000)
    },
    msg_code: "GetSucc"
  });
});

deviceRouter.get("/helmet/live-state", (_req, res) => {
  const device = getDevice();
  const body: ApiResponse<DeviceLiveState> = {
    success: true,
    data: {
      ...device,
      lastAnalysis: device.lastAnalysis
    }
  };
  res.json(body);
});

deviceRouter.post("/helmet/live-state", (req, res) => {
  const deviceId = String(req.body.deviceId ?? defaultDevice.deviceId);
  const next = updateDevice(deviceId, req.body);
  res.json({ success: true, data: next });
});
