import React from "react";
import type { Subject } from "@/lib/types";
import { getSubjectColor } from "@/lib/colors";

interface Props {
  subjects: Subject[];
  activeSubjectId: string | null;
  onSwitch: (subject: Subject) => void;
  onAddSubject: (name: string, short: string) => Promise<void>;
  onSettings: () => void;
}

export function SubjectTabs({
  subjects,
  activeSubjectId,
  onSwitch,
  onSettings,
}: Props) {
  return (
    <div className="flex items-center gap-0 border-b border-[var(--noter-border)] bg-[var(--noter-surface)] overflow-x-auto shrink-0">
      {subjects.map((s, i) => {
        const isActive = s.id === activeSubjectId;
        const color = getSubjectColor(s, i);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSwitch(s)}
            title={s.name}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? "border-current text-[var(--noter-text)]"
                : "border-transparent text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
            }`}
            style={{ borderColor: isActive ? color : undefined }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            {s.short}
          </button>
        );
      })}

      {/* Settings button */}
      <button
        type="button"
        onClick={onSettings}
        title="Settings"
        className="ml-auto px-4 py-2 font-mono text-[11px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)] transition-colors"
      >
        ⚙
      </button>
    </div>
  );
}
