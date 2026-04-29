import React from "react";
import type { Subject } from "@/lib/types";
import type { SbobinaHistoryEntry } from "@/settings";

interface Props {
  subject: Subject;
  history: SbobinaHistoryEntry[];
  onRestore: (entry: SbobinaHistoryEntry) => Promise<void>;
  onClose: () => void;
}

export function SbobinaHistoryModal({ subject, history, onRestore, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex max-h-[70vh] w-full max-w-md flex-col border border-[var(--noter-border)] bg-[var(--noter-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--noter-border)] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)]">
            History — {subject.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
          >
            × close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-[13px] italic text-[var(--noter-text-dim)]">No history yet.</p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border border-[var(--noter-border)] px-3 py-2"
              >
                <div>
                  <p className="font-mono text-[11px] text-[var(--noter-text)]">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[var(--noter-text-dim)]">
                    {entry.source} · {entry.content.length} chars
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onRestore(entry)}
                  className="noter-btn text-[11px]"
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
