/**
 * NotesWorkspace — the raw notes editor area (left column).
 */

import React, { type RefObject, type ReactNode } from "react";
import type { Subject } from "@/lib/types";
import { MarkdownEditor, type MarkdownEditorController } from "@/components/MarkdownEditor";

interface Props {
  subject: Subject | null;
  notes: string;
  onChange: (value: string) => void;
  onImagePaste: (file: File) => void;
  editorControllerRef: RefObject<MarkdownEditorController | null>;
  children?: ReactNode;
}

export function NotesWorkspace({
  subject,
  notes,
  onChange,
  onImagePaste,
  editorControllerRef,
  children,
}: Props) {
  if (!subject) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--noter-bg)]">
        <p className="text-[14px] italic text-[var(--noter-text-dim)]">
          No subject selected. Add one in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--noter-bg)]">
      <MarkdownEditor
        value={notes}
        onChange={onChange}
        onImagePaste={onImagePaste}
        controllerRef={editorControllerRef}
        placeholder={`Raw notes for ${subject.name}...\nUse def:, gap:, imp:, exam: markers.`}
      />
      {children}
    </div>
  );
}
