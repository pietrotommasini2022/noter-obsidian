import React from "react";
import type { LogLine } from "@/lib/types";
import { logColors } from "@/components/notes/logColors";

interface Props {
  log: LogLine[];
  onClose: () => void;
  onClear: () => void;
}

export function TerminalDrawer({ log, onClose, onClear }: Props) {
  return (
    <div className="flex w-[300px] shrink-0 flex-col border-l border-[var(--noter-border)] bg-[var(--noter-surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--noter-border)] px-3 py-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--noter-text-dim)]">
          Output
        </span>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[9px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)] transition-colors"
        >
          clear
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto font-mono text-[9px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)] transition-colors"
        >
          × close
        </button>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-[1.8]">
        {log.length === 0 ? (
          <span className="text-[var(--noter-text-dim)]">
            $ noter ready<span className="terminal-cursor" />
          </span>
        ) : (
          log.map((line, i) =>
            line.type === "spacer" ? (
              <div key={i} className="h-1" />
            ) : (
              <div key={i} className={`${logColors[line.type]}`}>
                {line.msg}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
