import { useSyncExternalStore } from "react";

/** Read and archived notification ids (ledger sequence numbers), kept per browser. */
const KEY = "indigro:inbox-state";
type InboxState = { read: number[]; archived: number[] };
const EMPTY: InboxState = { read: [], archived: [] };
let cache: InboxState | null = null;
const listeners = new Set<() => void>();

function get(): InboxState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as InboxState) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}
function set(next: InboxState) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* session only */
  }
  listeners.forEach((l) => l());
}

const add = (xs: number[], x: number) => (xs.includes(x) ? xs : [...xs, x]);

export const inbox = {
  markRead: (seq: number) => set({ ...get(), read: add(get().read, seq) }),
  archive: (seq: number) =>
    set({ read: add(get().read, seq), archived: add(get().archived, seq) }),
  restore: (seq: number) => set({ ...get(), archived: get().archived.filter((x) => x !== seq) }),
};

export function useInboxState(): InboxState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    () => EMPTY,
  );
}
