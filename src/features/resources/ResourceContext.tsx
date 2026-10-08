import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { seedCustomers, seedProjects, seedDevices, seedTemplates, seedMembers, seedRoles, seedRules } from "../../data/mockData";
import type { ResourceLog, ResourceState } from "./resourceTypes";
import { isResourceState, parseResourceSnapshot } from "./resourceValidation";

const storageKey = "guokong-safety-resources-v1";
const seed: ResourceState = { customers: seedCustomers, projects: seedProjects, devices: seedDevices, templates: seedTemplates, members: seedMembers, roles: seedRoles, rules: seedRules, logs: [
  { id: "LOG-SEED-1", time: "2026-09-23 09:00:00", actor: "系统管理员", action: "演示初始化 / 资源档案建档", target: "资源管理演示数据" }
] };
export function makeId(prefix: string) { return `${prefix}-${crypto.randomUUID().slice(0, 8)}`; }
type Snapshot = { kind: "valid"; state: ResourceState } | { kind: "empty" } | { kind: "invalid"; raw: string } | { kind: "unavailable" };
type Operation = { recipe: (state: ResourceState) => ResourceState; log: ResourceLog };
function readSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return { kind: "empty" };
    const state = parseResourceSnapshot(raw);
    return state ? { kind: "valid", state } : { kind: "invalid", raw };
  } catch { return { kind: "unavailable" }; }
}
function loadInitial(): { state: ResourceState; error: string } {
  const snapshot = readSnapshot();
  return {
    state: snapshot.kind === "valid" ? snapshot.state : seed,
    error: snapshot.kind === "invalid" ? "本机缓存格式异常，原始缓存已保留，当前展示初始演示档案；保存修改前将先备份原始缓存。"
      : snapshot.kind === "unavailable" ? "无法读取本机存储，当前展示初始演示档案。" : "",
  };
}
/** Recipes are pure transforms. Replaying pending saves preserves changes when storage recovers. */
function applyOperations(base: ResourceState, operations: Operation[]) {
  return operations.reduce((current, operation) => {
    if (current.logs.some(log => log.id === operation.log.id)) return current;
    const next = operation.recipe(current);
    if (!isResourceState(next)) throw new Error("invalid resource state");
    return { ...next, logs: [operation.log, ...next.logs].slice(0, 300) };
  }, base);
}
type ResourceContextValue = { state: ResourceState; storageError: string; change: (action: string, target: string, recipe: (state: ResourceState) => ResourceState) => void };
const ResourceContext = createContext<ResourceContextValue | null>(null);
export function ResourceProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitial);
  const [state, setState] = useState(initial.state);
  const [storageError, setStorageError] = useState(initial.error);
  const lastValid = useRef(initial.state);
  const pending = useRef<Operation[]>([]);

  useEffect(() => {
    function syncStorage(event: StorageEvent) {
      if (event.key !== storageKey && event.key !== null) return;
      const snapshot = readSnapshot();
      if (snapshot.kind === "invalid") {
        setStorageError("另一页面写入的缓存格式异常，已保留原始缓存与本页有效档案；保存修改前将先备份原始缓存。"); return;
      }
      if (snapshot.kind === "unavailable") { setStorageError("无法读取本机存储，保留当前档案；修改仅在当前会话中保留。"); return; }
      const base = snapshot.kind === "valid" ? snapshot.state : seed;
      try {
        const next = applyOperations(base, pending.current);
        lastValid.current = base;
        setState(next);
        setStorageError(pending.current.length ? `已同步其他页面更新，本页另有 ${pending.current.length} 项修改尚未写入本机存储；后续操作将再次尝试保存。`
          : snapshot.kind === "empty" ? "本机档案已由另一页面清除，当前展示初始演示档案。" : "");
      } catch { setStorageError("其他页面更新与本页未保存修改无法合并，已保留当前档案，未覆盖本机缓存。"); }
    }
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);

  function change(action: string, target: string, recipe: (current: ResourceState) => ResourceState) {
    const snapshot = readSnapshot();
    const base = snapshot.kind === "valid" ? snapshot.state : snapshot.kind === "empty" ? seed : lastValid.current;
    const operation: Operation = { recipe, log: { id: makeId("LOG"), time: new Date().toLocaleString("sv-SE"), actor: "系统管理员", action, target } };
    const operations = [...pending.current, operation];
    let next: ResourceState;
    try { next = applyOperations(base, operations); }
    catch { setStorageError("修改后的档案结构不完整，本次操作未应用，原有档案与缓存保持不变。"); return; }

    let recoveryKey = "";
    try {
      if (snapshot.kind === "unavailable") throw new Error("storage unavailable");
      if (snapshot.kind === "invalid") {
        recoveryKey = `${storageKey}-recovery-${Date.now()}-${makeId("COPY")}`;
        localStorage.setItem(recoveryKey, snapshot.raw);
        // Never replace an invalid cache unless its exact original contents were preserved.
        if (localStorage.getItem(recoveryKey) !== snapshot.raw) throw new Error("backup failed");
      }
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, state: next }));
      lastValid.current = next;
      pending.current = [];
      setStorageError(recoveryKey ? `异常缓存已备份至 ${recoveryKey}，当前档案已保存。` : "");
    } catch {
      lastValid.current = base;
      pending.current = operations;
      setStorageError(snapshot.kind === "invalid"
        ? "异常缓存未被覆盖；备份或保存失败，本次修改仅在当前会话中保留，后续操作将再次尝试保存。"
        : "本机存储写入失败，本次修改仅在当前会话中保留，后续操作将再次尝试保存。");
    }
    // Commit concrete values so React never replays storage writes, recipes or log creation.
    setState(next);
  }
  return <ResourceContext.Provider value={{ state, change, storageError }}>{children}</ResourceContext.Provider>;
}
export function useResources() { const context = useContext(ResourceContext); if (!context) throw new Error("ResourceProvider is required"); return context; }
