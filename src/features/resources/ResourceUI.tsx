import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChevronRight, Database, Search, X } from "lucide-react";
import type { RMColumn } from "./resourceTypes";

export function RMHeader({ eyebrow = "资源管理", title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="rm-header"><div><span className="rm-eyebrow">{eyebrow}<ChevronRight size={12} /><span>演示数据</span></span><h2>{title}</h2><p>{description}</p></div><div className="rm-actions">{actions}</div></header>;
}
export function RMStats({ items }: { items: { label: string; value: ReactNode; hint?: string; tone?: string; onClick?: () => void }[] }) {
  return <div className="rm-stats">{items.map(item => { const content = <><span className="rm-stat-label">{item.label}</span><strong className={item.tone ? `rm-text-${item.tone}` : ""}>{item.value}</strong><span className="rm-muted">{item.hint || "当前资源档案"}{item.onClick && <ChevronRight size={13} />}</span></>; return item.onClick ? <button className="rm-stat" key={item.label} onClick={item.onClick}>{content}</button> : <div className="rm-stat" key={item.label}>{content}</div>; })}</div>;
}
export function RMPanel({ title, subtitle, actions, children, className = "" }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rm-panel ${className}`}>{(title || actions) && <header className="rm-panel-head"><div>{title && <h3>{title}</h3>}{subtitle && <p>{subtitle}</p>}</div><div className="rm-actions">{actions}</div></header>}{children}</section>;
}
export function RMBadge({ children, tone }: { children: ReactNode; tone?: string }) {
  const value = typeof children === "string" ? children : "";
  const color = tone || (/高风险|超期|离线|停用/.test(value) ? "red" : /中风险|待|维护|草稿|即将/.test(value) ? "orange" : /低风险|在线|启用|已发布|正常|完成|服务中/.test(value) ? "green" : "blue");
  return <span className={`rm-badge rm-badge-${color}`}>{children}</span>;
}
export function RMTable<T>({ columns, rows, rowKey, onRow, selectedId, empty }: { columns: RMColumn<T>[]; rows: T[]; rowKey: (row: T) => string; onRow?: (row: T) => void; selectedId?: string; empty?: ReactNode }) {
  return <div className="rm-table-scroll"><table className="rm-table"><colgroup>{columns.map(c => <col key={c.key} style={{ width: c.width }} />)}</colgroup><thead><tr>{columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={rowKey(row)} className={rowKey(row) === selectedId ? "rm-selected-row" : ""} onClick={onRow ? () => onRow(row) : undefined}>{columns.map(c => <td key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody></table>{!rows.length && (empty || <RMEmpty text="暂无符合条件的记录" />)}</div>;
}
export function RMDialog({ title, children, onClose, footer, drawer = false }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`rm-dialog${drawer ? " rm-record-drawer" : ""}`} aria-labelledby={id} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><header><div><span className="rm-eyebrow">资源管理 · 演示操作</span><h2 id={id}>{title}</h2></div><button type="button" className="rm-icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={19} /></button></header><div className="rm-dialog-body">{children}</div>{footer && <footer className="rm-actions">{footer}</footer>}</dialog>;
}
export function RMTabs({ items, value, onChange }: { items: { key: string; label: string; count?: number }[]; value: string; onChange: (key: string) => void }) {
  return <div className="rm-tabs" role="group" aria-label="内容分类">{items.map(item => <button key={item.key} type="button" aria-pressed={value === item.key} className={value === item.key ? "active" : ""} onClick={() => onChange(item.key)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</div>;
}
export function RMEmpty({ text, onReset }: { text: string; onReset?: () => void }) { return <div className="rm-empty"><Search size={28} /><p>{text}</p>{onReset && <button className="rm-button" onClick={onReset}>重置筛选</button>}</div>; }
export function RMProgress({ value }: { value: number }) { const safe = Math.max(0, Math.min(100, value)); return <span className="rm-progress"><span><i style={{ width: `${safe}%` }} /></span><em>{Math.round(safe)}%</em></span>; }
export function ResourceDataNote({ error }: { error?: string | null }) { return <div className={`rm-data-note${error ? " rm-text-red" : ""}`}><Database size={14} />{error || "演示资源档案 · 本机保存 · 统计根据当前台账计算"}</div>; }
export function downloadCsv(name: string, headers: string[], rows: unknown[][]) {
  const escape = (value: unknown) => { let text = String(value ?? ""); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
  const blob = new Blob(["\ufeff" + [headers, ...rows].map(row => row.map(escape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
