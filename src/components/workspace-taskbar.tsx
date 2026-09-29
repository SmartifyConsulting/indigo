import { useNavigate } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState } from "@/lib/domain/store";
import { useWorkspaceTabs, workspaceTabs } from "@/lib/workspace-tabs";
import type { CaseRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** The cases a role is allowed to open a Live Workspace tab for. */
export function myCases(s: ReturnType<typeof useAppState>): CaseRecord[] {
  const role = s.session.role;
  if (role === "advisor") return s.cases.filter((c) => c.advisorId === s.advisors[0]?.id);
  if (role === "insurer") {
    const me = s.session.insurerId;
    return s.cases.filter((c) => c.applications.some((a) => a.providerId === me));
  }
  return s.cases; // FSP: firm-wide oversight, sees every case
}

/** Bottom taskbar: pinned Search and New tab, then one scrollable tab per open case. Drag to reorder. */
export function WorkspaceTaskbar() {
  const s = useAppState();
  const tabs = useWorkspaceTabs();
  const navigate = useNavigate();
  const [closing, setClosing] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const cases = myCases(s);
  const allowed = new Set(cases.map((c) => c.id));
  const name = (id: string) => s.cases.find((c) => c.id === id);
  const openIds = tabs.ids.filter((id) => allowed.has(id));

  const go = (id: string | null) =>
    void navigate({ to: "/workspace", search: id ? { case: id } : {} });

  const openCase = (id: string) => {
    workspaceTabs.open(id);
    go(id);
    setSearching(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 backdrop-blur">
        <div className="flex shrink-0 items-center gap-1 border-r px-2 py-1.5">
          <button
            type="button"
            aria-label="Search cases"
            onClick={() => setSearching(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="New tab"
            onClick={() => go(null)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5">
          {openIds.map((id) => {
            const i = tabs.ids.indexOf(id);
            const c = name(id);
            if (!c) return null;
            const active = tabs.active === id;
            return (
              <div
                key={id}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag !== null) workspaceTabs.move(drag, i);
                  setDrag(null);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
                  active
                    ? "border-[#4169e1] bg-white text-[#4169e1]"
                    : "border-[#4169e1] bg-[#4169e1] text-white",
                )}
              >
                <button type="button" onClick={() => openCase(id)}>
                  <span className="font-mono">{c.code}</span> · {c.clientName}
                </button>
                <button
                  type="button"
                  aria-label={`Close ${c.clientName}`}
                  onClick={() => setClosing(id)}
                  className="rounded p-0.5 opacity-80 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={searching} onOpenChange={setSearching}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">Search cases</DialogTitle>
          <Command>
            <CommandInput placeholder="Search by client name or case code…" />
            <CommandList>
              <CommandEmpty>No cases found.</CommandEmpty>
              <CommandGroup>
                {cases.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.code} ${c.clientName}`}
                    onSelect={() => openCase(c.id)}
                  >
                    <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    {c.clientName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this case tab?</DialogTitle>
            <DialogDescription>
              Everything is already saved. Closing only removes the tab from your taskbar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (closing) {
                  const wasActive = tabs.active === closing;
                  workspaceTabs.close(closing);
                  if (wasActive) go(null);
                }
                setClosing(null);
              }}
            >
              Save and close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
