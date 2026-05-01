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
    <div
      className="flex flex-col shrink-0"
      style={{
        width: "320px",
        borderLeft: "1px solid var(--noter-border)",
        background: "var(--noter-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--noter-border)",
        }}
      >
        <span className="noter-label">Output</span>
        <button
          type="button"
          onClick={onClear}
          className="noter-btn noter-btn-ghost"
          style={{ fontSize: "12px", padding: "2px 8px" }}
        >
          clear
        </button>
        <button
          type="button"
          onClick={onClose}
          className="noter-btn noter-btn-ghost ml-auto"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Log lines */}
      <div className="flex-1 overflow-y-auto noter-terminal" style={{ padding: "12px 14px" }}>
        {log.length === 0 ? (
          <span style={{ color: "var(--noter-text-dim)" }}>
            $ noter ready<span className="terminal-cursor" />
          </span>
        ) : (
          log.map((line, i) =>
            line.type === "spacer" ? (
              <div key={i} style={{ height: "4px" }} />
            ) : (
              <div key={i} className={logColors[line.type]}>
                {line.msg}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
