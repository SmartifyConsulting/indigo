import { useNavigate } from "@tanstack/react-router";
import { Plus, RotateCw, X, XCircle } from "lucide-react";
import { useState } from "react";

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
import { cn } from "@/lib/utils";

/** Bottom taskbar: one tab per open case. Drag to reorder. */
export function WorkspaceTaskbar() {
  const s = useAppState();
  const tabs = useWorkspaceTabs();
  const navigate = useNavigate();
  const [closing, setClosing] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const name = (id: string) => s.cases.find((c) => c.id === id);

  const go = (id: string | null) =>
    void navigate({ to: "/workspace", search: id ? { case: id } : {} });

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur">
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <button
            type="button"
            onClick={() => go(null)}
            className="flex shrink-0 items-center gap-1 rounded-full border-2 border-foreground bg-warning px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.ids.map((id, i) => {
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
                <button
                  type="button"
                  onClick={() => {
                    workspaceTabs.open(id);
                    go(id);
                  }}
                >
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
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            aria-label="Refresh"
            onClick={() => go(tabs.active)}
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            aria-label="Close all tabs"
            onClick={() => {
              tabs.ids.forEach((id) => workspaceTabs.close(id));
              go(null);
            }}
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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
