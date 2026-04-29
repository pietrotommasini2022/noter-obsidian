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
    <div className="flex w-[380px] shrink-0 flex-col border-l border-[var(--noter-border)] bg-[var(--noter-surface)]">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--noter-border)] px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)]">
          Review — {subject.name}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-[10px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
        >
          × cancel
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
        <div className="border-t border-[var(--noter-border)] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--noter-text-dim)] mb-2">
            Proposed concepts
          </p>
          <div className="space-y-1.5">
            {proposedConcepts.map((c, i) => (
              <button
                key={c.titolo}
                type="button"
                onClick={() => toggleConcept(i)}
                className={`flex w-full items-start gap-2 border px-2 py-1.5 text-left transition-colors ${
                  approvedConcepts[i]
                    ? "border-purple-800 bg-purple-950/20"
                    : "border-[var(--noter-border)] opacity-40"
                }`}
              >
                <span className="mt-0.5 shrink-0 font-mono text-[10px] text-purple-400">
                  {approvedConcepts[i] ? "✓" : "○"}
                </span>
                <div>
                  <p className="font-mono text-[12px] text-[var(--noter-text)]">{c.titolo}</p>
                  <p className="text-[12px] italic text-[var(--noter-text-dim)]">{c.descrizione}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback + regen */}
      <div className="border-t border-[var(--noter-border)] px-4 py-3">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback for regeneration (optional)..."
          rows={2}
          className="w-full resize-none border border-[var(--noter-border)] bg-[var(--noter-bg)] px-3 py-2 text-[13px] text-[var(--noter-text)] outline-none focus:border-[var(--noter-accent)] placeholder:text-[var(--noter-text-dim)]"
        />
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onRegenerateRequest}
            disabled={isRegenerating}
            className="noter-btn flex-1"
          >
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isRegenerating}
            className="noter-btn noter-btn-save flex-1"
          >
            Save ✓
          </button>
        </div>
      </div>
    </div>
  );
}
