/**
 * useKeyboardShortcuts — attaches keyboard shortcuts to the noter view.
 *
 * Obsidian already owns many shortcuts, so we only intercept those
 * that make sense in the noter editor context.
 *
 * Active shortcuts:
 *   Cmd/Ctrl + Enter  → Deploy
 *   Cmd/Ctrl + S      → Save (when result is pending)
 *   Escape            → Cancel deploy
 *   Cmd/Ctrl + 1-9   → Switch to subject by index
 */

import { useEffect } from "react";
import type { Subject } from "@/lib/types";
import type { DeployPhase } from "@/hooks/useDeploy";

interface Args {
  phase: DeployPhase;
  subjects: Subject[];
  onDeploy: () => void;
  onSave: () => void;
  onCancel: () => void;
  onSwitchSubject: (subject: Subject) => void;
  /** Attach shortcuts only when the noter view is focused. */
  enabled: boolean;
}

export function useKeyboardShortcuts({
  phase,
  subjects,
  onDeploy,
  onSave,
  onCancel,
  onSwitchSubject,
  enabled,
}: Args) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd+Enter → Deploy (only in editor phase)
      if (e.key === "Enter" && phase === "editor") {
        e.preventDefault();
        onDeploy();
        return;
      }

      // Cmd+S → Save (only when result is pending)
      if (e.key === "s" && phase === "processing") {
        e.preventDefault();
        onSave();
        return;
      }

      // Escape → Cancel
      if (e.key === "Escape" && phase !== "editor") {
        onCancel();
        return;
      }

      // Cmd+1..9 → Switch subject
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= 9) {
        const subject = subjects[digit - 1];
        if (subject) {
          e.preventDefault();
          onSwitchSubject(subject);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, phase, subjects, onDeploy, onSave, onCancel, onSwitchSubject]);
}
