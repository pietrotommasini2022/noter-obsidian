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

const MODES: ReadonlyArray<{ key: "notes" | "sbobina"; label: string }> = [
  { key: "notes", label: "Notes" },
  { key: "sbobina", label: "Sbobina" },
];

const VIEWS: ReadonlyArray<{ key: "edit" | "preview"; label: string }> = [
  { key: "edit", label: "Edit" },
  { key: "preview", label: "Preview" },
];

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
    <div className="noter-toolbar">

      {/* Mode switcher */}
      <div className="noter-segmented">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onModeChange(m.key)}
            className={`noter-segmented-item ${
              workspaceMode === m.key ? "noter-segmented-item-active" : ""
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Sbobina view switcher */}
      {workspaceMode === "sbobina" && (
        <div className="noter-segmented">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => onSbobinaViewChange(v.key)}
              className={`noter-segmented-item ${
                sbobinaView === v.key ? "noter-segmented-item-active" : ""
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* Gap count badge */}
      {gapCount > 0 && (
        <span className="noter-pill noter-pill-warn">
          {gapCount} gap{gapCount > 1 ? "s" : ""}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">

        <button
          type="button"
          onClick={onToggleDictionary}
          title="Vocabulary"
          className="noter-btn noter-btn-ghost noter-btn-icon"
          aria-label="Vocabulary"
        >
          📖
        </button>
        <button
          type="button"
          onClick={onToggleTerminal}
          title="Output log"
          className="noter-btn noter-btn-ghost noter-btn-icon"
          aria-label="Output log"
        >
          ⌨
        </button>
        <button
          type="button"
          onClick={onHistory}
          title="History"
          className="noter-btn noter-btn-ghost noter-btn-icon"
          aria-label="History"
        >
          ⟲
        </button>
        <button
          type="button"
          onClick={onDownload}
          title="Download .md"
          className="noter-btn noter-btn-ghost noter-btn-icon"
          aria-label="Download"
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
              Save
            </button>
          </>
        )}
        {phase === "processing" && isProcessing && (
          <span className="noter-help animate-pulse">Processing…</span>
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
