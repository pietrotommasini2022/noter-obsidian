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
    <div className="noter-tabbar shrink-0">
      {subjects.map((s, i) => {
        const isActive = s.id === activeSubjectId;
        const color = getSubjectColor(s, i);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSwitch(s)}
            title={s.name}
            className={`noter-tab ${isActive ? "noter-tab-active" : ""}`}
            style={isActive ? { color, borderBottomColor: color } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span>{s.name}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onSettings}
        title="Settings"
        className="noter-btn noter-btn-ghost noter-btn-icon ml-auto my-1"
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  );
}
