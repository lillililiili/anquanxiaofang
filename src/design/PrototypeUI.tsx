import React, { useEffect, useRef } from "react";
import "./prototype-workflows.css";
import { TrendingUp, X } from "lucide-react";
export const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");
export function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick}>{children}</button>;
}
export function Button({ children, icon: Icon, variant = "primary", className, type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ElementType; variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cx("ui-button", variant, className)} type={type} {...props}>{Icon && <Icon size={16} />}<span>{children}</span></button>;
}
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) { return <span className={cx("status-pill", tone)}>{children}</span>; }
export function toneFor(value: string) {
  if (["在线", "已完成", "已整改", "已处理", "有效", "已发布", "已更新", "启用"].includes(value)) return "success";
  if (["处理中", "整改中", "待复查", "待更新", "即将到期", "进行中", "任务中", "待派发"].includes(value)) return "warning";
  if (["高风险", "重大隐患", "已超期", "离线", "待响应"].includes(value)) return "danger";
  if (["草稿", "AI识别", "安全帽视频"].includes(value)) return "info";
  if (["中风险", "较大隐患"].includes(value)) return "warning";
  if (["低风险", "已销号", "待执行"].includes(value)) return "success";
  return "neutral";
}
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div><div className="page-actions">{actions}</div></div>;
}
export function SectionCard({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="section-card"><div className="section-card-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}
export function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: React.ElementType; tone: string }) {
  return <div className={cx("metric-card", tone)}><div className="metric-card-top"><span>{label}</span><span className="metric-icon"><Icon size={18} /></span></div><strong>{value}</strong><div className="metric-card-foot"><span>{detail}</span><TrendingUp size={14} /></div></div>;
}
export function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={cx("field", wide && "wide")}><span>{label}</span>{children}</label>; }
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) { return <div className={cx("toolbar", className)}>{children}</div>; }
export function Modal({ title, open, onClose, children, wide = false }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); return () => dialog?.close(); }, [open]);
  if (!open) return null;
  return <dialog ref={ref} className={cx("modal prototype-dialog", wide && "wide")} aria-label={title} onCancel={onClose} onClick={e => { if (e.target !== e.currentTarget) return; const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose(); }}><div className="modal-head"><div><div className="eyebrow">操作面板</div><h2>{title}</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></div>{children}</dialog>;
}
export function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (open && !dialog?.open) dialog?.showModal(); return () => dialog?.close(); }, [open]);
  if (!open) return null;
  return <dialog ref={ref} className="drawer prototype-drawer" aria-label={title} onCancel={onClose}><div className="drawer-head"><div><div className="eyebrow">详情视图</div><h2>{title}</h2></div><IconButton label="关闭详情" onClick={onClose}><X size={18} /></IconButton></div>{children}</dialog>;
}
export function DataTable({ headers, rows, onAction, actionLabel = "查看详情" }: { headers: string[]; rows: string[][]; onAction?: (row: string[]) => void; actionLabel?: string }) {
  return <div className="table-wrap"><table className="data-table generic-table">
    <colgroup>{headers.map((head, index) => <col key={head} className={index === 0 ? "table-col-main" : /时间|日期|期限/.test(head) ? "table-col-time" : /状态|风险|超期/.test(head) ? "table-col-status" : undefined} />)}{onAction && <col className="table-col-action" />}</colgroup>
    <thead><tr>{headers.map((head) => <th key={head}>{head}</th>)}{onAction && <th>操作</th>}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell + index}>{index === 0 ? <span className="table-primary-text" title={cell}>{cell}</span> : index === row.length - 1 ? <Pill tone={toneFor(cell)}>{cell}</Pill> : <span className="table-text" title={cell}>{cell}</span>}</td>)}{onAction && <td><Button variant="ghost" onClick={() => onAction(row)}>{actionLabel}</Button></td>}</tr>)}</tbody>
  </table></div>;
}

export function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

