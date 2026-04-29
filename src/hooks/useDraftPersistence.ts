/**
 * useDraftPersistence — autosaves in-progress notes to plugin data.json.
 *
 * Replaces localStorage + Supabase draft sync with a single debounced write
 * to the Obsidian plugin data file. No network required.
 */

import { useCallback, useEffect, useRef } from "react";
import type { NoterPlugin } from "@/types/plugin";

const AUTOSAVE_DEBOUNCE_MS = 700;

export function useDraftPersistence(plugin: NoterPlugin) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flush on unload
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        void plugin.saveData(plugin.settings);
      }
    };
  }, [plugin]);

  const saveDraftNow = useCallback(async () => {
    await plugin.saveData(plugin.settings);
  }, [plugin]);

  /**
   * Saves the current notes draft for a subject with debounce.
   */
  const setNotesDraft = useCallback(
    (subjectId: string, notes: string) => {
      const draft = plugin.settings.draft;
      draft.draftsBySubject[subjectId] = {
        ...(draft.draftsBySubject[subjectId] ?? {
          notes: "",
          sbobina: "",
          updatedAt: new Date().toISOString(),
        }),
        notes,
        updatedAt: new Date().toISOString(),
      };

      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void plugin.saveData(plugin.settings);
        saveTimerRef.current = null;
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [plugin]
  );

  const getNotesDraft = useCallback(
    (subjectId: string): string => {
      return plugin.settings.draft.draftsBySubject[subjectId]?.notes ?? "";
    },
    [plugin]
  );

  const clearNotesDraft = useCallback(
    async (subjectId: string) => {
      const d = plugin.settings.draft.draftsBySubject[subjectId];
      if (d) {
        d.notes = "";
        d.updatedAt = new Date().toISOString();
        await plugin.saveData(plugin.settings);
      }
    },
    [plugin]
  );

  const setActiveSubject = useCallback(
    async (subjectId: string | null) => {
      plugin.settings.draft.activeSubjectId = subjectId;
      await plugin.saveData(plugin.settings);
    },
    [plugin]
  );

  const setWorkspaceMode = useCallback(
    async (mode: "notes" | "sbobina") => {
      plugin.settings.draft.workspaceMode = mode;
      await plugin.saveData(plugin.settings);
    },
    [plugin]
  );

  return {
    saveDraftNow,
    setNotesDraft,
    getNotesDraft,
    clearNotesDraft,
    setActiveSubject,
    setWorkspaceMode,
  };
}
