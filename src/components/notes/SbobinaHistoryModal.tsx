import React, { useState } from "react";
import type { Subject } from "@/lib/types";
import type {
  SbobinaHistoryEntry,
  RawNotesHistoryEntry,
} from "@/settings";

interface Props {
  subject: Subject;
  history: SbobinaHistoryEntry[];
  rawNotesHistory: RawNotesHistoryEntry[];
  onRestore: (entry: SbobinaHistoryEntry) => Promise<void>;
  onOpenRawNotesFile: (path: string) => Promise<void>;
  onClose: () => void;
}

type TabKey = "sbobina" | "raw";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "sbobina", label: "Sbobina versions" },
  { key: "raw", label: "Raw notes" },
];

function fmtTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function fmtChars(n: number): string {
  return `${n.toLocaleString()} chars`;
}

export function SbobinaHistoryModal({
  subject,
  history,
  rawNotesHistory,
  onRestore,
  onOpenRawNotesFile,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("sbobina");

  return (
    <div className="noter-modal-overlay">
      <div className="noter-modal" style={{ maxWidth: "560px" }}>

        {/* Header */}
        <div className="noter-modal-header">
          <div>
            <h2 className="noter-heading">History</h2>
            <p className="noter-help" style={{ marginTop: "2px" }}>
              {subject.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="noter-btn noter-btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "10px 20px 0",
            borderBottom: "1px solid var(--noter-border)",
          }}
        >
          {TABS.map((t) => {
            const count =
              t.key === "sbobina" ? history.length : rawNotesHistory.length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`noter-tab ${
                  activeTab === t.key ? "noter-tab-active" : ""
                }`}
                style={{ padding: "8px 14px" }}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="noter-modal-body">
          {activeTab === "sbobina" ? (
            history.length === 0 ? (
              <p className="noter-help" style={{ fontStyle: "italic" }}>
                No sbobina versions yet. Each successful Save is recorded here.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {history.map((entry) => (
                  <div key={entry.id} className="noter-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--noter-text)",
                          margin: 0,
                        }}
                      >
                        {fmtTimestamp(entry.created_at)}
                      </p>
                      <p className="noter-help" style={{ marginTop: "2px" }}>
                        {entry.source} · {fmtChars(entry.content.length)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onRestore(entry)}
                      className="noter-btn"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : rawNotesHistory.length === 0 ? (
            <p className="noter-help" style={{ fontStyle: "italic" }}>
              No raw notes archived yet. Your notes will be saved here every
              time you press Save after a deploy.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rawNotesHistory.map((entry) => (
                <div key={entry.id} className="noter-card">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--noter-text)",
                        margin: 0,
                      }}
                    >
                      {fmtTimestamp(entry.created_at)}
                    </p>
                    <p
                      className="noter-help"
                      style={{
                        marginTop: "2px",
                        fontFamily: "var(--noter-font-mono)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={entry.file_path}
                    >
                      {entry.file_path} · {fmtChars(entry.content.length)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onOpenRawNotesFile(entry.file_path)}
                    className="noter-btn"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
