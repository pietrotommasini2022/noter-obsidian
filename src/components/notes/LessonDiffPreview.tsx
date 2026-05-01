/**
 * LessonDiffPreview — side panel shown after deploy, before save.
 * Displays the new lesson block and proposed concepts for review.
 */

import React, { useState } from "react";
import type { Subject, Concept } from "@/lib/types";
import { SbobinaPreview } from "@/components/notes/SbobinaPreview";

interface Props {
  subject: Subject;
  existingSbobina: string;
  pendingBlock: string;
  proposedConcepts: Concept[];
  onSave: () => void;
  onCancel: () => void;
  onRegenerateRequest: () => void;
  isRegenerating: boolean;
}

export function LessonDiffPreview({
  subject,
  existingSbobina,
  pendingBlock,
  proposedConcepts,
  onSave,
  onCancel,
  onRegenerateRequest,
  isRegenerating,
}: Props) {
  const [feedback, setFeedback] = useState("");
  const [approvedConcepts, setApprovedConcepts] = useState<boolean[]>(
    () => proposedConcepts.map(() => true)
  );

  const mergedContent =
    existingSbobina.trim()
      ? `${existingSbobina.trim()}\n\n${pendingBlock.trim()}`
      : pendingBlock.trim();

  const toggleConcept = (i: number) => {
    setApprovedConcepts((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: "420px",
        borderLeft: "1px solid var(--noter-border)",
        background: "var(--noter-surface)",
      }}
    >

      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--noter-border)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2 className="noter-heading">Review</h2>
          <p className="noter-help" style={{ marginTop: "2px" }}>
            {subject.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="noter-btn noter-btn-ghost"
          aria-label="Cancel"
        >
          × Cancel
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SbobinaPreview
          subject={subject}
          content={mergedContent}
          view="preview"
          concepts={[]}
          onChange={() => {}}
          compact
        />
      </div>

      {/* Proposed concepts */}
      {proposedConcepts.length > 0 && (
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--noter-border)",
          }}
        >
          <p className="noter-label" style={{ marginBottom: "8px" }}>
            Proposed concepts
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {proposedConcepts.map((c, i) => (
              <button
                key={c.titolo}
                type="button"
                onClick={() => toggleConcept(i)}
                className="noter-card noter-card-clickable"
                style={{
                  textAlign: "left",
                  alignItems: "flex-start",
                  borderColor: approvedConcepts[i]
                    ? "var(--noter-accent)"
                    : "var(--noter-border)",
                  opacity: approvedConcepts[i] ? 1 : 0.5,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    marginTop: "2px",
                    flexShrink: 0,
                    fontSize: "14px",
                    color: "var(--noter-accent)",
                    width: "16px",
                  }}
                >
                  {approvedConcepts[i] ? "✓" : "○"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--noter-text)",
                      margin: 0,
                    }}
                  >
                    {c.titolo}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color: "var(--noter-text-dim)",
                      marginTop: "2px",
                      marginBottom: 0,
                    }}
                  >
                    {c.descrizione}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback + regen */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--noter-border)",
        }}
      >
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback for regeneration (optional)…"
          rows={2}
          className="noter-textarea"
          style={{ resize: "none" }}
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button
            type="button"
            onClick={onRegenerateRequest}
            disabled={isRegenerating}
            className="noter-btn"
            style={{ flex: 1, justifyContent: "center" }}
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isRegenerating}
            className="noter-btn noter-btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Save ✓
          </button>
        </div>
      </div>
    </div>
  );
}
