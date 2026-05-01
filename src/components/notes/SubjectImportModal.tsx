/**
 * SubjectImportModal — checkbox list shown after the user picks (or rescans)
 * a notes folder. Lets the user select which subdirectories should be imported
 * as subjects. All candidates are checked by default.
 *
 * Three exits:
 *  - Confirm with ≥1 box checked → onConfirm(selectedNames)
 *  - Confirm with 0 boxes checked → onConfirm([]) (folder is set, no subjects added)
 *  - Cancel / × → onCancel()  (caller decides whether to discard the folder choice)
 */

import React, { useState, useMemo } from "react";

interface Props {
  /** The folder being imported from, displayed in the header for context. */
  folderPath: string;
  /** Subdirectory names found inside `folderPath` (already filtered/sorted). */
  candidates: string[];
  /** Names that already exist as subjects — shown disabled & marked. */
  alreadyImported?: string[];
  onConfirm: (selectedNames: string[]) => void;
  onCancel: () => void;
}

export function SubjectImportModal({
  folderPath,
  candidates,
  alreadyImported = [],
  onConfirm,
  onCancel,
}: Props) {
  const alreadyImportedSet = useMemo(
    () => new Set(alreadyImported.map((n) => n.toLowerCase())),
    [alreadyImported]
  );

  // Default-check everything that is NOT already imported. Already-imported
  // candidates are shown for context but cannot be re-selected.
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        candidates.filter((c) => !alreadyImportedSet.has(c.toLowerCase()))
      )
  );

  const selectableCount = candidates.filter(
    (c) => !alreadyImportedSet.has(c.toLowerCase())
  ).length;
  const allChecked = selected.size === selectableCount && selectableCount > 0;

  const toggle = (name: string) => {
    if (alreadyImportedSet.has(name.toLowerCase())) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(
        new Set(
          candidates.filter((c) => !alreadyImportedSet.has(c.toLowerCase()))
        )
      );
    }
  };

  const empty = candidates.length === 0;

  return (
    <div className="noter-modal-overlay" style={{ zIndex: 60 }}>
      <div className="noter-modal" style={{ maxWidth: "480px" }}>

        {/* Header */}
        <div className="noter-modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="noter-heading">Import subjects</h2>
            <p
              className="noter-help"
              style={{
                fontFamily: "var(--noter-font-mono)",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {folderPath || "/ (vault root)"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="noter-btn noter-btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        {empty ? (
          <div className="noter-modal-body">
            <p className="noter-help">
              No subdirectories found in this folder. You can still set it as
              your notes folder — new subjects will create subfolders inside it
              on first save.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                padding: "10px 20px",
                borderBottom: "1px solid var(--noter-border)",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "var(--noter-text-dim)",
                  cursor: selectableCount === 0 ? "not-allowed" : "pointer",
                  opacity: selectableCount === 0 ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  disabled={selectableCount === 0}
                />
                Select all ({selectableCount})
              </label>
            </div>
            <div className="noter-modal-body" style={{ padding: "12px 12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {candidates.map((name) => {
                  const isAlreadyImported = alreadyImportedSet.has(
                    name.toLowerCase()
                  );
                  return (
                    <label
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        cursor: isAlreadyImported ? "not-allowed" : "pointer",
                        opacity: isAlreadyImported ? 0.5 : 1,
                        transition: "background-color 0.12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isAlreadyImported) {
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--noter-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          isAlreadyImported ? true : selected.has(name)
                        }
                        onChange={() => toggle(name)}
                        disabled={isAlreadyImported}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontSize: "14px",
                          color: "var(--noter-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {name}
                      </span>
                      {isAlreadyImported && (
                        <span
                          className="noter-help"
                          style={{ fontSize: "11px" }}
                        >
                          already imported
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="noter-modal-footer">
          <button
            type="button"
            onClick={onCancel}
            className="noter-btn"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(Array.from(selected))}
            className="noter-btn noter-btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {empty || selected.size === 0
              ? "Set folder, skip import"
              : `Import ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}
