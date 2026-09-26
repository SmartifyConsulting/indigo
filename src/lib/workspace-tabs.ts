import { useSyncExternalStore } from "react";

/** Open case tabs in the Live Workspace taskbar, kept per browser. */
const KEY = "indigro:workspace-tabs";
type TabsState = { ids: string[]; active: string | null };
const EMPTY: TabsState = { ids: [], active: null };

let cache: TabsState | null = null;
const listeners = new Set<() => void>();

function read(): TabsState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as TabsState) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: TabsState) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* session only */
  }
  listeners.forEach((l) => l());
}

export const workspaceTabs = {
  open(id: string) {
    const s = read();
    write({ ids: s.ids.includes(id) ? s.ids : [...s.ids, id], active: id });
  },
  close(id: string) {
    const s = read();
    const ids = s.ids.filter((x) => x !== id);
    write({ ids, active: s.active === id ? (ids[ids.length - 1] ?? null) : s.active });
  },
  move(from: number, to: number) {
    const ids = [...read().ids];
    const [x] = ids.splice(from, 1);
    if (x === undefined) return;
    ids.splice(to, 0, x);
    write({ ...read(), ids });
  },
};

export function useWorkspaceTabs(): TabsState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
}
