import React from "react";
import type { DeployPhase } from "@/hooks/useDeploy";

interface Props {
  workspaceMode: "notes" | "sbobina";
  sbobinaView: "edit" | "preview";
  phase: DeployPhase;
  gapCount: number;
  isProcessing: boolean;
  activeColor: string;
  onModeChange: (mode: "notes" | "sbobina") => void;
  onSbobinaViewChange: (view: "edit" | "preview") => void;
  onDeploy: () => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleDictionary: () => void;
  onToggleTerminal: () => void;
  onDownload: () => void;
  onHistory: () => void;
}

export function WorkspaceToolbar({
  workspaceMode,
  sbobinaView,
  phase,
  gapCount,
  isProcessing,
  activeColor,
  onModeChange,
  onSbobinaViewChange,
  onDeploy,
  onSave,
  onCancel,
  onToggleDictionary,
  onToggleTerminal,
  onDownload,
  onHistory,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--noter-border)] bg-[var(--noter-surface)] px-3 py-1.5 shrink-0 overflow-x-auto">

      {/* Mode switcher */}
      <div className="flex rounded border border-[var(--noter-border)] overflow-hidden">
        {(["notes", "sbobina"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
              workspaceMode === mode
                ? "bg-[var(--noter-border)] text-[var(--noter-text)]"
                : "text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Sbobina view switcher */}
      {workspaceMode === "sbobina" && (
        <div className="flex rounded border border-[var(--noter-border)] overflow-hidden">
          {(["edit", "preview"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onSbobinaViewChange(view)}
              className={`px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                sbobinaView === view
                  ? "bg-[var(--noter-border)] text-[var(--noter-text)]"
                  : "text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      )}

      {/* Gap count badge */}
      {gapCount > 0 && (
        <span className="font-mono text-[10px] text-amber-500 border border-amber-800 px-1.5 py-0.5">
          {gapCount} gap{gapCount > 1 ? "s" : ""}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">

        {/* Secondary actions */}
        <button
          type="button"
          onClick={onToggleDictionary}
          title="Vocabulary"
          className="noter-btn"
        >
          📖
        </button>
        <button
          type="button"
          onClick={onToggleTerminal}
          title="Output log"
          className="noter-btn"
        >
          ⌨
        </button>
        <button
          type="button"
          onClick={onHistory}
          title="History"
          className="noter-btn"
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={onDownload}
          title="Download .md"
          className="noter-btn"
        >
          ↓
        </button>

        {/* Primary action */}
        {phase === "editor" && (
          <button
            type="button"
            onClick={onDeploy}
            disabled={isProcessing}
            className="noter-btn noter-btn-deploy"
            style={{ borderColor: activeColor, color: activeColor }}
          >
            Deploy
          </button>
        )}
        {phase === "processing" && !isProcessing && (
          <>
            <button type="button" onClick={onCancel} className="noter-btn">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="noter-btn noter-btn-save"
            >
              Save ✓
            </button>
          </>
        )}
        {phase === "processing" && isProcessing && (
          <span className="font-mono text-[10px] text-[var(--noter-text-dim)] animate-pulse">
            Processing...
          </span>
        )}
        {phase === "done" && (
          <button
            type="button"
            onClick={onDeploy}
            className="noter-btn noter-btn-deploy"
            style={{ borderColor: activeColor, color: activeColor }}
          >
            Deploy again
          </button>
        )}
      </div>
    </div>
  );
}
