import React, { useEffect, useMemo, useState, useRef } from "react";

import { Camera, ChevronLeft, Download, FileText, Headphones, LayoutDashboard, Lightbulb, Mic, MonitorCog, Radio, RefreshCw, Search, SquarePen } from "lucide-react";
import { getHazardScene } from "../data/demoSceneMedia";
import { chatMessages as expertChatMessages, reportReviewInfo, retakeSuggestions, selectedVideo, screenshots as expertScreenshots, suspectedHazards as expertHazards, taskInfo, videoChannels, type ExpertHazard, type ExpertSnapshot, type ExpertVideoChannel } from "../data/expertMockData";
import ExpertSceneSelector from "./ExpertSceneSelector";

import { sendRetakeInstruction, sendTalkbackAudio, startWebrtcCall, stopWebrtcCall } from "../services/expertDeviceAdapter";
import { Button, Pill, toneFor, PageHeader, SectionCard, Modal, downloadText } from "./PrototypeUI";
export default function RemoteExpertCompletePage({ notify, navigate }: { notify: (message: string) => void; navigate: (path: string) => void }) {
  const [hazardReviews, setHazardReviews] = useState<Record<string, {opinion:string;reviewChoice:string;severity:string}>>({});
  const [panel, setPanel] = useState("");
  const [instruction, setInstruction] = useState("请补拍现场全景、关键设备细节和整改后同角度照片。");
  const [reviewResult, setReviewResult] = useState("");
  const [suggestion, setSuggestion] = useState("建议明确整改期限，责任单位完成后由现场检查员提交复查材料。");
  const [suggestionStatus, setSuggestionStatus] = useState("待审核");
  const [reportStatus, setReportStatus] = useState("待复核");
  const [chatDraft, setChatDraft] = useState("");
  const [connected, setConnected] = useState(true);
  const [videoVersion, setVideoVersion] = useState(0);
  const [ptz, setPtz] = useState({ x: 0, y: 0 });
  const [clips, setClips] = useState<string[]>([]);
  type ReviewTab = "隐患审核" | "整改建议审核" | "报告复核";
  type Annotation = { id: string; label: string; tone: string };
  const [activeChannel, setActiveChannel] = useState<ExpertVideoChannel>(selectedVideo);
  const currentTask = activeChannel.id === selectedVideo.id ? taskInfo : {
    id: "未关联检查任务",
    name: `${activeChannel.project} ${activeChannel.point}`,
    inspector: activeChannel.inspector,
    location: `${activeChannel.project} · ${activeChannel.point}`,
    status: activeChannel.status,
    deviceId: activeChannel.deviceId,
  };
  const [hazardsState, setHazardsState] = useState<ExpertHazard[]>(expertHazards);
  const [snapshotsState, setSnapshotsState] = useState<ExpertSnapshot[]>(expertScreenshots);
  const [messages, setMessages] = useState(expertChatMessages);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("隐患审核");
  const [reviewChoice, setReviewChoice] = useState("确认隐患");
  const [severity, setSeverity] = useState("建议重点整改");
  const [opinion, setOpinion] = useState("配电箱门未关闭，建议纳入重点整改，要求立即整改。");
  const [talking, setTalking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [lightOn, setLightOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [ptzOpen, setPtzOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(expertScreenshots[0].id);
  const [preview, setPreview] = useState<ExpertSnapshot | null>(null);
  const focusedHazard = hazardsState.find((item) => item.focused) ?? hazardsState[0];
  const addMessage = (text: string) => setMessages((items) => [...items, { time: "10:31:18", speaker: "王工", text }]);
  const selectHazard = (id: string) => {
    const target = hazardsState.find(item => item.id === id); if (!target) return;
    const nextReviews = {...hazardReviews, [focusedHazard.id]: {opinion,reviewChoice,severity}};
    setHazardReviews(nextReviews); setHazardsState(items => items.map(item => ({...item,focused:item.id===id})));
    const review = nextReviews[id]; setOpinion(review?.opinion || `建议核查${target.name}，补充对应现场证据并明确整改要求。`); setReviewChoice(review?.reviewChoice || "确认隐患"); setSeverity(review?.severity || "一般隐患"); setReviewResult("");
  };
  const saveDraft = () => { sessionStorage.setItem(`safety-prototype-expert-${activeChannel.id}`, JSON.stringify({ hazardsState, snapshotsState, messages, reviewChoice, severity, opinion, suggestion, suggestionStatus, reportStatus, reviewResult, hazardReviews: {...hazardReviews,[focusedHazard.id]:{opinion,reviewChoice,severity}} })); setReviewResult("当前频道会诊草稿已保存，可离开后继续编辑。"); };
  useEffect(() => {
    const titles = ["配电箱未关闭", "消防通道占用", "消防器材状态待核查", "动火作业周边防护待核查", "灭火器压力待核查", "配电设备状态待核查"];
    const seeded = activeChannel.id === selectedVideo.id;
    setHazardsState(seeded ? expertHazards : [{ id: `${activeChannel.id}-hazard`, name: titles[activeChannel.index - 1], risk: activeChannel.risk, confidence: "待核查", source: "场景演示", standard: "按现场检查模板核对适用依据", description: `${activeChannel.project} · ${activeChannel.point}，请结合现场证据判断，素材为演示数据。`, status: "待审核", focused: true }]);
    setSnapshotsState(seeded ? expertScreenshots : [{ id: `${activeChannel.id}-frame`, title: activeChannel.point, src: activeChannel.thumbnail, time: activeChannel.time, sourceNote: "频道参考素材 · 演示数据" }]);
    setMessages(seeded ? expertChatMessages : []); setOpinion(seeded ? "配电箱门未关闭，建议纳入重点整改，要求立即整改。" : "建议核对现场情况，补充必要证据后确认整改要求。");
    setHazardReviews({}); setReviewChoice("确认隐患"); setSeverity("建议重点整改"); setReviewResult(""); setSubmitted(false); setAnnotations([]); setClips([]); setPtz({x:0,y:0}); setZoom(1); setConnected(true); setTalking(false); setRecording(false); setSuggestionStatus("待审核"); setReportStatus("待复核");
    setSuggestion("建议明确整改期限，责任单位完成后由现场检查员提交复查材料。");
    try { const saved = JSON.parse(sessionStorage.getItem(`safety-prototype-expert-${activeChannel.id}`) || "null"); if (saved && Array.isArray(saved.hazardsState) && saved.hazardsState.length && Array.isArray(saved.snapshotsState) && Array.isArray(saved.messages)) { setHazardsState(saved.hazardsState); setSnapshotsState(saved.snapshotsState); setMessages(saved.messages); setReviewChoice(saved.reviewChoice); setSeverity(saved.severity); setOpinion(saved.opinion); setSuggestion(saved.suggestion); setSuggestionStatus(saved.suggestionStatus); setReportStatus(saved.reportStatus); setReviewResult(saved.reviewResult); setHazardReviews(saved.hazardReviews || {}); } } catch { notify("会诊草稿读取失败，已展示该频道初始演示内容"); }
  }, [activeChannel.id]);
  const switchChannel = (channel: ExpertVideoChannel) => { saveDraft(); setActiveChannel(channel); setSelectedSnapshot(""); };

  const capture = () => { const next = { id: `shot-${Date.now()}`, time: "10:31:18", title: activeChannel.point, src: activeChannel.thumbnail, sourceNote: "演示频道封面 · 模拟截图" }; setSnapshotsState((items) => [next, ...items].slice(0, 8)); setSelectedSnapshot(next.id); notify("截图已保存"); };
  const toggleTalk = async () => {
    try {
      if (!talking) {
        await startWebrtcCall(activeChannel.deviceId);
        await sendTalkbackAudio(activeChannel.deviceId, `请说明${activeChannel.point}的现场情况。`);
        setTalking(true);
        addMessage(`演示对讲已开始，请说明${activeChannel.point}的现场情况。`);
        notify("演示对讲已建立");
      } else {
        await stopWebrtcCall(activeChannel.deviceId);
        setTalking(false);
        notify("语音对讲已结束");
      }
    } catch {
      notify("对讲指令未能下发，请稍后重试");
    }
  };
  const sendRetake = () => { setPanel("补拍指令"); };
  const submitReview = () => { if (!opinion.trim()) { setReviewResult("请填写审核意见后提交。"); return; } setPanel("提交专家审核"); };
  const confirmReview = () => {
    setHazardsState(items => items.map(item => item.id === focusedHazard.id ? { ...item, status: "已提交" } : item)); setSubmitted(true);
    const result = `${focusedHazard.name} · ${reviewChoice} · ${severity} · ${opinion}`;
    setReviewResult(`审核已记录：${result}`); addMessage(`审核意见：${result}`);
    sessionStorage.setItem(`safety-prototype-expert-${activeChannel.id}`, JSON.stringify({ hazardsState: hazardsState.map(item => item.id === focusedHazard.id ? {...item,status:"已提交"} : item), snapshotsState,messages,reviewChoice,severity,opinion,suggestion,suggestionStatus,reportStatus,reviewResult: `审核已记录：${result}`, hazardReviews: {...hazardReviews,[focusedHazard.id]:{opinion,reviewChoice,severity}} }));
    if (reviewChoice === "确认隐患" || reviewChoice === "部分属实") sessionStorage.setItem("safety-prototype-hazard-handoff-v1", JSON.stringify({ id: focusedHazard.id, title: focusedHazard.name, project: activeChannel.project, taskId: currentTask.id, taskName: currentTask.name, source: "专家审核", inspector: activeChannel.inspector, risk: focusedHazard.risk === "-" ? "中风险" : focusedHazard.risk, image: getHazardScene(focusedHazard.name)?.src || activeChannel.thumbnail, description: focusedHazard.description, measure: opinion, checkType: /消防|灭火|通道/.test(focusedHazard.name) ? "消防安全检查" : /动火/.test(focusedHazard.name) ? "动火临电" : "用电安全检查", foundTime: new Date().toLocaleString("sv-SE") }));
    setPanel(""); notify("专家审核已记录到当前频道");
  };
  const markFocus = () => { setHazardsState((items) => items.map((item) => ({ ...item, focused: item.id === focusedHazard.id, status: item.id === focusedHazard.id ? "已审核" : item.status }))); setSeverity("建议重点整改"); setReviewResult("当前隐患已标记为建议重点整改"); notify("已标记为重点整改建议"); };
  const addAnnotation = (label: string) => { setAnnotations((items) => [...items, { id: `${label}-${Date.now()}`, label, tone: label === "圆形" ? "circle" : label === "文字" ? "text" : "rect" }]); notify(`已添加${label}标注`); };
  const generateMinutes = () => { downloadText("EXPERT20250516001.txt", `专家会诊记录\n编号：EXPERT20250516001\n任务：${currentTask.name}\n专家：王工\n审核结论：${opinion}\n${messages.map((item) => `${item.time} ${item.speaker}：${item.text}`).join("\n")}`); notify("专家会诊记录已生成"); };
  return <div className="page-stack expert-complete"><PageHeader eyebrow="EXPERT DESK / 05" title="远程专家" description="专家查看第一视角、证据链和整改进度，发起远程复核与补拍指令。" actions={<><Button variant="secondary" icon={Download} onClick={() => { downloadText("专家会诊证据包.json", JSON.stringify({ channel: activeChannel, task: currentTask, snapshots: snapshotsState, hazards: hazardsState, messages, reviewChoice, severity, opinion, suggestion, suggestionStatus, reportStatus, clips }, null, 2), "application/json"); notify("专家证据包已导出"); }}>导出证据包</Button><Button icon={talking ? SquarePen : Headphones} onClick={toggleTalk}>{talking ? "结束对讲" : "开始对讲"}</Button></>} />
    <div className="expert-meta-strip"><span><b>专家：</b>王工</span><span><b>专家类型：</b>电气安全专家</span><Pill tone="success">在线</Pill><span>任务：{currentTask.name}</span><span>设备：{currentTask.deviceId}</span><Button variant="ghost" onClick={() => setPanel("会诊消息")}>消息 <Pill tone="danger">6</Pill></Button><Button variant="ghost" onClick={() => setPanel("专家待办")}>待办 <Pill tone="warning">12</Pill></Button></div>
    <ExpertSceneSelector channels={videoChannels} activeId={activeChannel.id} onSelect={switchChannel} />
    <div className="expert-console-layout"><section className="expert-stage section-card"><div className="section-card-head"><div><div className="eyebrow">FIELD VIDEO / {activeChannel.deviceId}</div><h2>场景演示 · {activeChannel.project} {activeChannel.point}</h2></div><div className="button-row"><Pill tone={activeChannel.status === "离线" ? "danger" : "success"}>{activeChannel.status}</Pill><span>{activeChannel.inspector}</span></div></div><div className="expert-video-frame">{(activeChannel.status === "离线" || !connected) ? <img src={activeChannel.thumbnail} alt={`${activeChannel.point}参考图`} /> : <video style={{ transform: `scale(${zoom}) translate(${ptz.x}px, ${ptz.y}px)` }} key={`${activeChannel.id}-${videoVersion}`} src={activeChannel.video} poster={activeChannel.thumbnail} muted={muted} autoPlay loop playsInline />}<div className="video-overlay"><span>{activeChannel.status === "离线" ? "离线示例 · 暂无现场视频" : "图片轮播演示 · 非现场录像"}</span><span>{activeChannel.resolution} · {activeChannel.latency}</span></div>{annotations.map((item) => <div key={item.id} className={`expert-annotation ${item.tone}`}><span>{item.label}</span></div>)}<div className="expert-annotation-tools">{["箭头", "矩形", "圆形", "画笔", "文字", "马赛克"].map((label) => <Button variant="ghost" key={label} onClick={() => addAnnotation(label)}>{label}</Button>)}<Button variant="ghost" onClick={() => { setAnnotations((items) => items.slice(0, -1)); notify("已撤销最后一个标注"); }}><ChevronLeft size={15} />撤销</Button><Button variant="ghost" onClick={() => { setAnnotations([]); notify("已清空专家标注"); }}>清空</Button></div><div className="expert-video-controls"><Button onClick={toggleTalk}><Mic size={16} />语音对讲</Button><Button onClick={capture}><Camera size={16} />截图</Button><Button variant={recording ? "danger" : "primary"} onClick={() => { setRecording(value => !value); if (recording) setClips(items => [...items, `${activeChannel.point} · ${new Date().toLocaleTimeString()}（演示片段）`]); }}><Radio size={16} />录制</Button><Button variant="ghost" onClick={() => { setVideoVersion(v => v + 1); setConnected(true); }}><RefreshCw size={16} />刷新</Button><Button variant={muted ? "secondary" : "ghost"} onClick={() => setMuted((value) => !value)}>静音</Button><Button variant={micOn ? "secondary" : "ghost"} onClick={() => setMicOn((value) => !value)}><Mic size={16} />麦克风</Button><Button variant={lightOn ? "secondary" : "ghost"} onClick={() => { setLightOn((value) => !value); notify("补光灯指令已下发"); }}><Lightbulb size={16} />补光灯</Button><Button variant="ghost" onClick={() => { const next = zoom === 1 ? 1.5 : zoom === 1.5 ? 2 : 1; setZoom(next); notify(`已切换到 ${next.toFixed(1)}x`); }}><Search size={16} />{zoom.toFixed(1)}x</Button><Button variant="ghost" onClick={() => setPtzOpen((value) => !value)}><MonitorCog size={16} />云台控制</Button></div>{ptzOpen && <div className="ptz-popover"><Button variant="ghost" onClick={() => setPtz(p => ({x:p.x+(0),y:p.y+(-12)}))}>上</Button><Button variant="ghost" onClick={() => setPtz(p => ({x:p.x+(-12),y:p.y+(0)}))}>左</Button><Button variant="ghost" onClick={() => setPtz({x:0,y:0})}>复位</Button><Button variant="ghost" onClick={() => setPtz(p => ({x:p.x+(12),y:p.y+(0)}))}>右</Button><Button variant="ghost" onClick={() => setPtz(p => ({x:p.x+(0),y:p.y+(12)}))}>下</Button></div>}</div><div className="expert-command-state"><span>{connected ? "演示接入中" : "已停止演示接入"}</span><span>{recording ? "正在模拟录制" : `已保存 ${clips.length} 个演示片段`}</span><span>补光：{lightOn ? "开" : "关"}</span><span>麦克风：{micOn ? "开" : "关"}</span><span>云台演示：{ptz.x}, {ptz.y}</span></div></section>
      <aside className="expert-review section-card"><div className="section-card-head"><div><div className="eyebrow">EXPERT REVIEW</div><h2>专家意见录入</h2></div></div><div className="review-tabs">{(["隐患审核", "整改建议审核", "报告复核"] as ReviewTab[]).map((tab) => <button type="button" key={tab} className={reviewTab === tab ? "active" : ""} onClick={() => setReviewTab(tab)}>{tab}</button>)}</div>{reviewTab === "隐患审核" && <div className="review-content"><div className="hazard-review-list">{hazardsState.map((hazard) => <article key={hazard.id} className={hazard.focused ? "focused" : ""} onClick={() => { if (!hazard.focused) selectHazard(hazard.id); }}><header><strong>{hazard.name}</strong><Pill tone={toneFor(hazard.risk)}>{hazard.risk}</Pill></header><small>依据标准：{hazard.standard}</small><p>{hazard.description}</p>{hazard.focused && <><div className="choice-row">{["确认隐患", "部分属实", "不属实，需说明", "需补拍"].map((item) => <label key={item}><input type="radio" name="expert-choice" checked={reviewChoice === item} onChange={() => setReviewChoice(item)} />{item}</label>)}</div><div className="choice-row">{["一般隐患", "较大隐患", "建议重点整改"].map((item) => <label key={item}><input type="radio" name="expert-risk" checked={severity === item} onChange={() => setSeverity(item)} />{item}</label>)}</div><textarea aria-label="专家审核意见" value={opinion} onChange={(e) => setOpinion(e.target.value)} /></>}</article>)}</div><div className="retake-box"><h3>补拍提示区</h3><ul>{retakeSuggestions.map((item) => <li key={item}>{item}</li>)}</ul><Button onClick={sendRetake}>发送补拍提示</Button></div>{reviewResult && <div className="expert-review-result" role="status">{reviewResult}</div>}<div className="detail-actions"><Button variant="secondary" onClick={saveDraft}>暂存意见</Button><Button onClick={submitReview}>{submitted ? "重新提交审核" : "提交审核"}</Button><Button variant="secondary" onClick={markFocus}>建议纳入重点整改</Button></div></div>}{reviewTab === "整改建议审核" && <div className="review-simple"><h3>AI生成整改建议</h3><ol><li>核查“{focusedHazard.name}”及周边环境，明确责任人。</li><li>按适用检查依据制定整改措施并完成现场处理。</li><li>补拍整改后照片并保留同角度对比。</li></ol><h3>关联依据</h3><p>{focusedHazard.standard}</p><textarea aria-label="整改建议审核意见" value={suggestion} onChange={e => setSuggestion(e.target.value)} /><p className="expert-review-result">当前状态：{suggestionStatus}</p><div className="detail-actions"><Button onClick={() => { if (!suggestion.trim()) return; setSuggestionStatus("已通过"); addMessage("整改建议已通过：" + suggestion); } }>通过建议</Button><Button variant="secondary" onClick={() => { if (!suggestion.trim()) return; setSuggestionStatus("已保存修改"); addMessage("整改建议已保存修改：" + suggestion); } }>修改建议</Button><Button variant="secondary" onClick={() => { if (!suggestion.trim()) return; setSuggestionStatus("已退回重新生成"); addMessage("整改建议已退回重新生成：" + suggestion); } }>退回重生成</Button></div></div>}{reviewTab === "报告复核" && <div className="review-simple"><h3>{activeChannel.project}检查报告复核</h3><p className="expert-review-result">复核状态：{reportStatus}</p><p>报告类型：<b>{reportReviewInfo.type}</b></p><p>已引用证据：<b>{snapshotsState.length}</b></p><p>已审核隐患：<b>{hazardsState.filter(h => h.status !== "待审核").length} / {hazardsState.length}</b></p><p>请结合当前场景的证据与审核记录复核报告。</p><div className="detail-actions"><Button onClick={() => { setReportStatus("复核通过"); addMessage("报告复核通过，进入报告中心完成归档。"); }}>复核通过</Button><Button variant="secondary" onClick={() => { setReportStatus("退回修改"); addMessage("报告退回修改，请补充证据与审核意见。"); }}>退回修改</Button><Button variant="secondary" onClick={() => navigate("/reports")}>进入报告中心</Button></div></div>}</aside></div>
    <div className="expert-bottom-layout"><SectionCard title="截图 / 关键帧列表" eyebrow="EVIDENCE SNAPSHOTS"><div className="snapshot-grid">{snapshotsState.map((shot) => <button type="button" key={shot.id} className={selectedSnapshot === shot.id ? "active" : ""} onClick={() => { setSelectedSnapshot(shot.id); setPreview(shot); }}><img src={shot.src} alt={shot.title} /><span>{shot.time}</span></button>)}</div><p className="muted-note">参考素材 · 点击查看大图与来源</p></SectionCard><SectionCard title="对话记录" eyebrow="TALKBACK LOG"><div className="chat-log">{messages.map((message, index) => <p key={`${message.time}-${index}`}><time>{message.time}</time><b>{message.speaker}：</b>{message.text}</p>)}</div><form className="expert-message-form" onSubmit={e => { e.preventDefault(); if (chatDraft.trim()) { addMessage(chatDraft.trim()); setChatDraft(""); } }}><input aria-label="会诊文字消息" placeholder="填写现场沟通内容" value={chatDraft} onChange={e => setChatDraft(e.target.value)} /><Button type="submit" disabled={!chatDraft.trim()}>记录</Button></form></SectionCard><SectionCard title="检查任务信息" eyebrow="TASK CONTEXT"><dl className="detail-grid"><span>任务编号</span><strong>{currentTask.id}</strong><span>任务名称</span><strong>{currentTask.name}</strong><span>检查人员</span><strong>{currentTask.inspector}</strong><span>检查地点</span><strong>{currentTask.location}</strong><span>任务状态</span><strong><Pill tone="warning">{currentTask.status}</Pill></strong></dl></SectionCard></div>
    <div className="expert-bottom-actions"><Button variant="secondary" onClick={saveDraft}>暂存</Button><Button onClick={submitReview}>提交审核</Button><Button onClick={generateMinutes}><FileText size={16} />生成专家会诊记录</Button><Button onClick={() => navigate("/reports")}><LayoutDashboard size={16} />进入报告中心</Button><Button variant="secondary" onClick={() => setPanel("停止演示接入")}>停止接入</Button></div>
    <Modal title={preview?.title ?? "截图预览"} open={Boolean(preview)} onClose={() => setPreview(null)}><img className="preview-image" src={preview?.src} alt={preview?.title} /><p className="muted-note">{preview?.sourceNote}</p><div className="modal-foot"><Button variant="secondary" onClick={() => { if (preview) { const link=document.createElement("a"); link.href=preview.src; link.download=`${preview.title}.jpg`; link.click(); } }}>下载证据</Button><Button onClick={() => setPreview(null)}>关闭</Button></div></Modal>
    <Modal title={panel} open={Boolean(panel)} onClose={() => setPanel("")} wide>
      {panel === "补拍指令" && <><p>当前现场：{activeChannel.project} · {activeChannel.point} · {activeChannel.inspector}</p><label className="field"><span>补拍要求</span><textarea value={instruction} onChange={e => setInstruction(e.target.value)} /></label><p className="muted-note">提交后记录到当前会诊对话，并下发补拍提示。</p><div className="modal-foot"><Button disabled={!instruction.trim()} onClick={async () => { try { await sendRetakeInstruction(activeChannel.deviceId, instruction.trim()); addMessage(`补拍要求：${instruction.trim()}`); setPanel(""); setReviewResult("补拍要求已加入当前会诊记录"); notify("补拍提示已下发"); } catch { notify("补拍指令未能下发，请稍后重试"); } }}>记录补拍指令</Button></div></>}
      {panel === "提交专家审核" && <><dl className="detail-grid"><span>疑似隐患</span><strong>{focusedHazard.name}</strong><span>审核结论</span><strong>{reviewChoice}</strong><span>建议等级</span><strong>{severity}</strong><span>审核意见</span><strong>{opinion}</strong></dl><p className="muted-note">确认后保存审核结果；确认隐患可继续进入隐患登记。</p><div className="modal-foot"><Button variant="secondary" onClick={() => setPanel("")}>返回编辑</Button><Button onClick={confirmReview}>确认提交审核</Button></div></>}
      {panel === "停止演示接入" && <><p>将暂停当前现场的演示回放与对讲，已保存的会诊记录和证据保留。</p><div className="modal-foot"><Button onClick={() => { saveDraft(); setConnected(false); setTalking(false); setRecording(false); setPanel(""); }}>确认停止</Button></div></>}
      {panel === "会诊消息" && <div className="prototype-workflow-list">{messages.map((m,i) => <article key={i}><h3>{m.speaker} · {m.time}</h3><p>{m.text}</p></article>)}{!messages.length && <p>当前频道暂无会诊消息。</p>}</div>}
      {panel === "专家待办" && <div className="prototype-workflow-list">{hazardsState.map(h => <article key={h.id}><h3>{h.name} · {h.status}</h3><p>{h.description}</p><Button onClick={() => { selectHazard(h.id); setReviewTab("隐患审核"); setPanel(""); }}>处理此项</Button></article>)}<Button onClick={() => navigate("/hazards")}>进入隐患登记</Button><Button variant="secondary" onClick={() => navigate("/reports")}>查看待复核报告</Button></div>}
    </Modal>
  </div>;
}

