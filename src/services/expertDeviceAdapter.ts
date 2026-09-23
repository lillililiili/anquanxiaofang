type AdapterResult = {
  success: true;
  message: string;
  deviceId: string;
  issuedAt: string;
};

const success = (deviceId: string, message: string): AdapterResult => ({
  success: true,
  message,
  deviceId,
  issuedAt: new Date().toISOString()
});

export const openHelmetStream = async (deviceId: string) => success(deviceId, "视频接入指令已下发");

export const stopHelmetStream = async (deviceId: string) => success(deviceId, "视频停止指令已下发");

export const sendTalkbackAudio = async (deviceId: string, message: string) => success(deviceId, `语音对讲指令已下发：${message}`);

export const startWebrtcCall = async (deviceId: string) => success(deviceId, "WebRTC通话指令已下发");

export const stopWebrtcCall = async (deviceId: string) => success(deviceId, "WebRTC通话结束指令已下发");

export const sendRetakeInstruction = async (deviceId: string, instruction: string) => success(deviceId, `补拍提示已下发：${instruction}`);
