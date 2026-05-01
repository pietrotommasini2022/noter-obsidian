/**
 * useSubjects — manages the subject list stored in plugin data.json.
 *
 * No Supabase. No network. Subjects live entirely in NoterPluginSettings.subjects.
 *
 * In addition to manual CRUD, exposes `importSubjectsFromFolder` which scans
 * the configured notesFolder for subdirectories and imports each one as a
 * subject (skipping reserved folders and any name already present).
 */

import { useState, useCallback } from "react";
import { normalizePath } from "obsidian";
import type { Subject } from "@/lib/types";
import { SUBJECT_COLOR_TOKENS } from "@/lib/colors";
import type { NoterPlugin } from "@/types/plugin";

/**
 * Subfolders that live inside `notesFolder` for plugin bookkeeping but are
 * NOT subject folders. Must stay in sync with the layout documented in
 * settings.ts.
 */
const RESERVED_SUBFOLDERS: ReadonlySet<string> = new Set(["Audio", "Concepts"]);

export interface ImportFromFolderResult {
  /** Subjects newly added to the list during this scan. */
  added: string[];
  /** Subdirectory names skipped because a matching subject already existed. */
  skipped: string[];
  /** True if the configured notesFolder does not exist on disk. */
  folderMissing: boolean;
}

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

  /**
   * Read the immediate subdirectories of `folderPath` from the vault and
   * return them as candidate subject names. Pure read — does NOT mutate
   * the subjects list. Reserved subfolders are filtered out.
   *
   * Used to populate the SubjectImportModal so the user can pick which
   * subdirectories actually correspond to subjects.
   */
  const scanFolderForCandidates = useCallback(
    async (
      folderPath: string
    ): Promise<{ candidates: string[]; folderMissing: boolean }> => {
      const base = normalizePath(folderPath || "Notes");
      const exists = await plugin.app.vault.adapter.exists(base);
      if (!exists) return { candidates: [], folderMissing: true };

      // adapter.list returns vault-relative paths; we want only leaf names.
      const listing = await plugin.app.vault.adapter.list(base);
      const candidates = (listing.folders ?? [])
        .map((path) => path.split("/").filter(Boolean).pop() ?? "")
        .filter((name) => name.length > 0 && !RESERVED_SUBFOLDERS.has(name))
        .sort((a, b) => a.localeCompare(b));
      return { candidates, folderMissing: false };
    },
    [plugin]
  );

  /**
   * Append the given names to the subjects list, skipping anything that
   * already exists (case-insensitive). Returns the names actually added.
   */
  const addSubjectsByNames = useCallback(
    async (names: string[]): Promise<string[]> => {
      const existing = new Set(subjects.map((s) => s.name.toLowerCase()));
      const toAdd: string[] = [];
      for (const name of names) {
        const trimmed = name.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        toAdd.push(trimmed);
      }
      if (toAdd.length === 0) return [];

      const next: Subject[] = [...subjects];
      for (const name of toAdd) {
        const colorIndex = next.length % SUBJECT_COLOR_TOKENS.length;
        const color = SUBJECT_COLOR_TOKENS[colorIndex] ?? "#f59e0b";
        next.push({
          id: crypto.randomUUID(),
          name,
          short: name.substring(0, 3).toUpperCase(),
          color,
        });
      }
      await saveSubjects(next);
      return toAdd;
    },
    [subjects, saveSubjects]
  );

  /**
   * Convenience wrapper used by callers that want the original
   * "scan-and-import-all" behavior in one shot. Newer UI prefers the
   * two-step flow (scan → user picks → addSubjectsByNames) so it can
   * show the candidates in a checkbox modal first.
   */
  const importSubjectsFromFolder =
    useCallback(async (): Promise<ImportFromFolderResult> => {
      const scan = await scanFolderForCandidates(
        plugin.settings.notesFolder
      );
      if (scan.folderMissing) {
        return { added: [], skipped: [], folderMissing: true };
      }
      const added = await addSubjectsByNames(scan.candidates);
      const addedSet = new Set(added.map((n) => n.toLowerCase()));
      const skipped = scan.candidates.filter(
        (n) => !addedSet.has(n.toLowerCase())
      );
      return { added, skipped, folderMissing: false };
    }, [plugin, scanFolderForCandidates, addSubjectsByNames]);

  return {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    scanFolderForCandidates,
    addSubjectsByNames,
    importSubjectsFromFolder,
  };
}
