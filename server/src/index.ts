import cors from "cors";
import express from "express";
import http from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./env.js";
import { deviceRouter } from "./routes/device.routes.js";
import { helmetRouter } from "./routes/helmet.routes.js";
import { visionRouter } from "./routes/vision.routes.js";
import { defaultDevice, updateDevice } from "./state.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "32mb" }));
app.use(express.urlencoded({ extended: true, limit: "32mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "server running" });
});

app.use("/api", deviceRouter);
app.use("/api", visionRouter);
app.use("/api", helmetRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ success: false, message: error instanceof Error ? error.message : "server error" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/ws/device")) {
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
    return;
  }
  socket.destroy();
});

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (message.act === "ca_login") {
        const deviceId = String(message.device_id ?? defaultDevice.deviceId);
        updateDevice(deviceId, { online: true, deviceId });
        ws.send(JSON.stringify({
          cmd: "ca_login",
          status: true,
          msg: "登陆成功！",
          data: {
            user_id: "84990",
            device_id: deviceId,
            mobile: "11111111111",
            real_name: "张伟",
            cap_type: 2,
            account_id: "11444"
          },
          sip_info: {
            sip_id: "1004227",
            sip_pwd: "0000",
            sip_host: "127.0.0.1:11011",
            wss_url: "ws://127.0.0.1:8080/ws/device",
            stun_host: "127.0.0.1:40998",
            turn_host: "127.0.0.1:40998",
            turn_user: "fstest",
            turn_pwd: "123456"
          }
        }));
        return;
      }
      if (message.act === "ca_report_location") {
        const deviceId = String(message.device_id ?? defaultDevice.deviceId);
        updateDevice(deviceId, {
          online: true,
          battery: Number(message.bat_l ?? defaultDevice.battery),
          network: message.net_type === "2" ? "5G" : "4G",
          latestReport: message
        });
        ws.send(JSON.stringify({ cmd: "ca_report_location", status: true, msg: "上报成功" }));
        return;
      }
      ws.send(JSON.stringify({ status: false, msg: "unknown act" }));
    } catch (error) {
      ws.send(JSON.stringify({ status: false, msg: error instanceof Error ? error.message : "bad message" }));
    }
  });
});

server.listen(config.port, () => {
  console.log(`[server] running at http://127.0.0.1:${config.port}`);
  console.log(`[server] device websocket at ws://127.0.0.1:${config.port}/ws/device`);
});
