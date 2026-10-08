import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, List, Search, UserRound, X } from "lucide-react";
import type { ExpertVideoChannel } from "../data/expertMockData";
import "./expert-scene-selector.css";

type Props = { channels: ExpertVideoChannel[]; activeId: string; onSelect: (channel: ExpertVideoChannel) => void };
type FilterProps = { query: string; status: string; onQuery: (value: string) => void; onStatus: (value: string) => void; onReset: () => void };
const PAGE_SIZE = 5;

function SceneFilters({ query, status, onQuery, onStatus, onReset }: FilterProps) {
  return <div className="scene-filters"><label className="scene-search"><Search size={16} /><input aria-label="搜索现场" placeholder="搜索项目、检查内容或检查员" value={query} onChange={e => onQuery(e.target.value)} /></label><select aria-label="现场状态" value={status} onChange={e => onStatus(e.target.value)}><option value="all">全部状态</option><option>演示回放</option><option>离线</option></select>{(query || status !== "all") && <button className="scene-text-button" type="button" onClick={onReset}>重置</button>}</div>;
}
function SceneStatus({ channel }: { channel: ExpertVideoChannel }) {
  return <span className={`scene-status ${channel.status === "离线" ? "offline" : "playback"}`}><i />{channel.status}</span>;
}
function SceneRisk({ risk }: { risk: ExpertVideoChannel["risk"] }) {
  const tone = risk === "高风险" ? "high" : risk === "中风险" ? "medium" : risk === "低风险" ? "low" : "unknown";
  return <span className={`scene-risk ${tone}`}>{risk === "-" ? "暂无评估" : risk}</span>;
}

function AllScenes({ rows, total, activeId, filters, onSelect, onClose }: { rows: ExpertVideoChannel[]; total: number; activeId: string; filters: FilterProps; onSelect: Props["onSelect"]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const title = useId();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); const currentPage = Math.min(page, pages);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => setPage(1), [filters.query, filters.status]);
  return <dialog ref={dialog} className="scene-directory" aria-labelledby={title} onCancel={onClose}>
    <header className="scene-directory-head"><div><span className="eyebrow">FIELD DIRECTORY</span><h2 id={title}>全部现场 <small>共 {total} 个</small></h2><p>每个现场一行，选择后切换下方画面与现场信息。</p></div><button type="button" className="scene-arrow" aria-label="关闭全部现场" onClick={onClose}><X size={20} /></button></header>
    <div className="scene-directory-filter"><SceneFilters {...filters} /><span role="status">筛选结果 {rows.length} 个</span></div>
    <div className="scene-directory-table"><table><colgroup><col style={{ width: "24%" }} /><col style={{ width: "18%" }} /><col style={{ width: "10%" }} /><col style={{ width: "11%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} /></colgroup><thead><tr><th>项目 / 现场</th><th>检查内容</th><th>检查员</th><th>画面时间</th><th>现场状态</th><th>风险等级</th><th>操作</th></tr></thead><tbody>{rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(channel => <tr key={channel.id} className={channel.id === activeId ? "selected" : ""}><td><div className="scene-directory-project"><img src={channel.thumbnail} alt="" /><div><span title={channel.project}>{channel.project}</span><small>{channel.deviceId}</small></div></div></td><td><span className="scene-ellipsis" title={channel.point}>{channel.point}</span></td><td>{channel.inspector}</td><td><time>{channel.time}</time></td><td><SceneStatus channel={channel} /></td><td><SceneRisk risk={channel.risk} /></td><td><button type="button" className="scene-text-button" aria-label={`查看现场：${channel.project} ${channel.point}`} onClick={() => { onSelect(channel); onClose(); }}>{channel.id === activeId ? <><Check size={14} />当前现场</> : <>查看现场<ChevronRight size={14} /></>}</button></td></tr>)}</tbody></table>
      {!rows.length && <div className="scene-directory-empty"><Search size={27} /><strong>没有找到匹配的现场</strong><span>请尝试其他项目、检查员或状态</span><button type="button" className="scene-text-button" onClick={filters.onReset}>清除筛选</button></div>}
    </div><footer className="scene-directory-foot"><span>共 {rows.length} 个 · 每页 {PAGE_SIZE} 个</span><div><button type="button" className="scene-arrow" aria-label="上一页现场" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>第 {currentPage} / {pages} 页</span><button type="button" className="scene-arrow" aria-label="下一页现场" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></footer>
  </dialog>;
}

export default function ExpertSceneSelector({ channels, activeId, onSelect }: Props) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [allOpen, setAllOpen] = useState(false);
  const [edges, setEdges] = useState({ back: false, forward: false });
  const rail = useRef<HTMLUListElement>(null); const titleId = useId(); const railId = useId();
  const rows = useMemo(() => channels.filter(channel => [channel.project, channel.point, channel.inspector, channel.deviceId].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (status === "all" || channel.status === status)), [channels, query, status]);
  const active = channels.find(channel => channel.id === activeId);
  const selectedVisible = rows.some(channel => channel.id === activeId);
  const reset = () => { setQuery(""); setStatus("all"); };
  const filters: FilterProps = { query, status, onQuery: setQuery, onStatus: setStatus, onReset: reset };
  const measure = () => { const element = rail.current; if (element) setEdges({ back: element.scrollLeft > 2, forward: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 }); };
  const motion = (): ScrollBehavior => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  useEffect(() => { const element = rail.current; if (!element) return; const observer = new ResizeObserver(measure); observer.observe(element); measure(); return () => observer.disconnect(); }, []);
  useEffect(() => { rail.current?.scrollTo({ left: 0, behavior: "instant" }); measure(); }, [query, status]);
  useEffect(() => {
    const element = rail.current; const card = element?.querySelector<HTMLElement>("button[aria-pressed='true']");
    if (element && card) { const left = card.offsetLeft; if (left < element.scrollLeft || left + card.offsetWidth > element.scrollLeft + element.clientWidth) element.scrollTo({ left: Math.max(0, left - (element.clientWidth - card.offsetWidth) / 2), behavior: motion() }); }
    measure();
  }, [activeId, rows]);
  function move(direction: -1 | 1) { const element = rail.current; if (element) { const cardWidth = (element.firstElementChild as HTMLElement | null)?.offsetWidth || 310; const step = (cardWidth + 12) * Math.max(1, Math.floor(element.clientWidth / (cardWidth + 12))); element.scrollBy({ left: direction * step, behavior: motion() }); } }
  function keyboard(event: KeyboardEvent<HTMLUListElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
    if (event.key === "Home" || event.key === "End") { event.preventDefault(); rail.current?.scrollTo({ left: event.key === "Home" ? 0 : rail.current.scrollWidth, behavior: motion() }); }
  }
  return <section className="expert-scenes" aria-labelledby={titleId}><header className="scene-selector-head"><div><h2 id={titleId}>现场列表 <small>共 {channels.length} 个</small></h2><span>选择现场，查看画面与检查信息</span></div><div className="scene-selector-actions"><SceneFilters {...filters} /><button type="button" className="scene-all-button" onClick={() => setAllOpen(true)}><List size={16} />查看全部</button><div className="scene-paging"><button type="button" className="scene-arrow" aria-label="向左浏览现场" aria-controls={railId} disabled={!edges.back} onClick={() => move(-1)}><ChevronLeft size={18} /></button><button type="button" className="scene-arrow" aria-label="向右浏览现场" aria-controls={railId} disabled={!edges.forward} onClick={() => move(1)}><ChevronRight size={18} /></button></div></div></header>
    <div className={`scene-rail-wrap${edges.forward ? " has-more" : ""}`}><ul id={railId} className="scene-rail" ref={rail} aria-label="现场横向列表" tabIndex={0} onKeyDown={keyboard} onScroll={measure}>{rows.map(channel => <li key={channel.id}><button type="button" className={`scene-card${activeId === channel.id ? " active" : ""}`} aria-pressed={activeId === channel.id} aria-label={`${channel.project} ${channel.point}，检查员${channel.inspector}，${channel.status}，${channel.risk === "-" ? "暂无风险评估" : channel.risk}`} onClick={() => onSelect(channel)}><div className="scene-card-image"><img src={channel.thumbnail} alt="" /><span>{String(channel.index).padStart(2, "0")}</span></div><div className="scene-card-info"><span className="scene-card-project" title={channel.project}>{channel.project}</span><strong title={channel.point}>{channel.point}</strong><span className="scene-card-person"><UserRound size={12} />{channel.inspector}<i /><Clock3 size={12} /><time>{channel.time}</time></span></div><div className="scene-card-footer"><SceneStatus channel={channel} /><SceneRisk risk={channel.risk} /><span className="scene-selected">{activeId === channel.id && <><Check size={13} />当前现场</>}</span></div></button></li>)}</ul>
      {!rows.length && <div className="scene-rail-empty"><Search size={23} /><span>没有找到匹配的现场</span><button type="button" className="scene-text-button" onClick={reset}>清除筛选</button></div>}
    </div><footer className="scene-selector-foot"><span title={active ? `${active.project} · ${active.point}` : undefined}>当前：{active ? `${active.project} · ${active.point}` : "未选择现场"}{!selectedVisible && active && "（不在筛选结果中）"}</span><span role="status">{query || status !== "all" ? `筛选结果 ${rows.length} / ${channels.length} 个` : "左右翻看或拖动滚动条查看更多现场"}</span></footer>
    {allOpen && <AllScenes rows={rows} total={channels.length} activeId={activeId} filters={filters} onSelect={onSelect} onClose={() => setAllOpen(false)} />}
  </section>;
}
