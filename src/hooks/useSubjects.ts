/**
 * useSubjects — manages the subject list stored in plugin data.json.
 *
 * No Supabase. No network. Subjects live entirely in NoterPluginSettings.subjects.
 */

import { useState, useCallback } from "react";
import type { Subject } from "@/lib/types";
import { SUBJECT_COLOR_TOKENS } from "@/lib/colors";
import type { NoterPlugin } from "@/types/plugin";

export function useSubjects(plugin: NoterPlugin) {
  const [subjects, setSubjects] = useState<Subject[]>(
    () => plugin.settings.subjects
  );

  const saveSubjects = useCallback(
    async (next: Subject[]) => {
      plugin.settings.subjects = next;
      await plugin.saveData(plugin.settings);
      setSubjects([...next]);
    },
    [plugin]
  );

  const addSubject = useCallback(
    async (name: string, short: string): Promise<Subject> => {
      const id = crypto.randomUUID();
      const colorIndex = subjects.length % SUBJECT_COLOR_TOKENS.length;
      const color = SUBJECT_COLOR_TOKENS[colorIndex] ?? "#f59e0b";
      const subject: Subject = { id, name, short, color };
      await saveSubjects([...subjects, subject]);
      return subject;
    },
    [subjects, saveSubjects]
  );

  const updateSubject = useCallback(
    async (id: string, patch: Partial<Omit<Subject, "id">>) => {
      const next = subjects.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      );
      await saveSubjects(next);
    },
    [subjects, saveSubjects]
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      await saveSubjects(subjects.filter((s) => s.id !== id));
    },
    [subjects, saveSubjects]
  );

  return { subjects, addSubject, updateSubject, deleteSubject };
}
