/**
 * useSbobine — reads and writes sbobina .md files directly in the Obsidian vault.
 *
 * File layout (relative to plugin.settings.notesFolder):
 *   <notesFolder>/<SubjectName>/<SubjectName>.md   ← main sbobina
 *   <notesFolder>/<SubjectName>/Archive/<filename>  ← per-lesson archive
 *
 * No Supabase, no Drive, no version columns — the vault IS the source of truth.
 */

import { useState, useCallback } from "react";
import { normalizePath, TFile } from "obsidian";
import type { Subject, LogLine } from "@/lib/types";
import {
  sanitizeFileName,
  buildLessonArchiveFilename,
} from "@/lib/format";
import {
  MAX_HISTORY_ENTRIES,
  MAX_RAW_NOTES_HISTORY_ENTRIES,
  type SbobinaHistoryEntry as SettingsHistoryEntry,
  type RawNotesHistoryEntry,
} from "@/settings";
import type { NoterPlugin } from "@/types/plugin";

export function useSbobine(
  plugin: NoterPlugin,
  log: (msg: string, type?: LogLine["type"]) => void
) {
  // In-memory cache: subjectId → markdown content
  const [sbobine, setSbobine] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // ─── Path helpers ───────────────────────────────────────────────────────────

  function sbobinaPath(subject: Subject): string {
    const folder = sanitizeFileName(subject.name);
    const base = plugin.settings.notesFolder;
    return normalizePath(`${base}/${folder}/${folder}.md`);
  }

  function archivePath(subject: Subject): string {
    const folder = sanitizeFileName(subject.name);
    const base = plugin.settings.notesFolder;
    const filename = buildLessonArchiveFilename(subject.name);
    return normalizePath(`${base}/${folder}/Archive/${filename}`);
  }

  function rawNotesPath(subject: Subject): string {
    const folder = sanitizeFileName(subject.name);
    const base = plugin.settings.notesFolder;
    const filename = buildLessonArchiveFilename(subject.name);
    return normalizePath(`${base}/${folder}/RawNotes/${filename}`);
  }

  // ─── Load ───────────────────────────────────────────────────────────────────

  /**
   * Reads the sbobina file for a subject from the vault.
   * Returns empty string if the file doesn't exist yet.
   */
  const loadSbobina = useCallback(
    async (subject: Subject): Promise<string> => {
      const path = sbobinaPath(subject);
      const exists = await plugin.app.vault.adapter.exists(path);
      if (!exists) return "";
      const content = await plugin.app.vault.adapter.read(path);
      setSbobine((prev) => ({ ...prev, [subject.id]: content }));
      return content;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on the stable plugin instance; sbobinaPath is a local helper derived from current plugin settings
    [plugin]
  );

  // ─── Save ───────────────────────────────────────────────────────────────────

  /**
   * Writes (or overwrites) the sbobina file for a subject.
   * Also appends an entry to the local history stored in data.json.
   */
  const saveSbobina = useCallback(
    async (
      subject: Subject,
      content: string,
      source: SettingsHistoryEntry["source"] = "manual"
    ): Promise<void> => {
      setIsSaving(true);
      try {
        const path = sbobinaPath(subject);

        // Ensure parent directory exists
        const dir = path.substring(0, path.lastIndexOf("/"));
        await ensureDir(plugin, dir);

        await plugin.app.vault.adapter.write(path, content);
        setSbobine((prev) => ({ ...prev, [subject.id]: content }));
        log(`Saved: ${path}`, "success");

        // Append to local history
        appendHistory(plugin, subject.id, content, source);
        await plugin.saveData(plugin.settings);
      } catch (err) {
        log(`Save failed: ${String(err)}`, "error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on plugin and log; ensureDir and appendHistory are local helpers and do not need to retrigger this callback
    [plugin, log]
  );

  // ─── Append lesson block ────────────────────────────────────────────────────

  /**
   * Appends a new lesson block to the existing sbobina, then saves.
   * Also writes an archive copy of this lesson's block.
   */
  const appendLessonBlock = useCallback(
    async (subject: Subject, lessonBlock: string): Promise<string> => {
      const existing = await loadSbobina(subject);
      const separator = existing.trim() ? "\n\n" : "";
      const updated = `${existing}${separator}${lessonBlock}`;

      // Write archive copy first (best-effort, non-blocking failure)
      try {
        const aPath = archivePath(subject);
        const aDir = aPath.substring(0, aPath.lastIndexOf("/"));
        await ensureDir(plugin, aDir);
        await plugin.app.vault.adapter.write(aPath, lessonBlock);
      } catch {
        log("Archive copy failed (non-critical)", "warn");
      }

      await saveSbobina(subject, updated, "deploy");
      return updated;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep the callback tied to plugin, load/save handlers, and log; archivePath is a local helper derived from plugin settings
    [plugin, loadSbobina, saveSbobina, log]
  );

  // ─── History ────────────────────────────────────────────────────────────────

  function getHistory(subjectId: string): SettingsHistoryEntry[] {
    return plugin.settings.sbobinaHistoryBySubject[subjectId] ?? [];
  }

  /**
   * Restores a sbobina from a history entry.
   */
  const restoreFromHistory = useCallback(
    async (subject: Subject, entry: SettingsHistoryEntry): Promise<void> => {
      await saveSbobina(subject, entry.content, "manual");
      log(`Restored sbobina from ${entry.created_at}`, "success");
    },
    [saveSbobina, log]
  );

  // ─── Raw notes archival ─────────────────────────────────────────────────────

  /**
   * Persists the user's raw notes for a subject as a timestamped .md file
   * under `<Subject>/RawNotes/`, and indexes the entry in data.json so the
   * History modal can list it. Returns the entry that was just written.
   *
   * Empty/whitespace-only content is a no-op and returns null.
   */
  const saveRawNotes = useCallback(
    async (
      subject: Subject,
      content: string
    ): Promise<RawNotesHistoryEntry | null> => {
      if (!content.trim()) return null;

      const path = rawNotesPath(subject);
      const dir = path.substring(0, path.lastIndexOf("/"));
      await ensureDir(plugin, dir);

      try {
        await plugin.app.vault.adapter.write(path, content);
      } catch (err) {
        log(`Raw notes archive failed: ${String(err)}`, "warn");
        return null;
      }

      const entry: RawNotesHistoryEntry = {
        id: crypto.randomUUID(),
        subject_id: subject.id,
        content,
        file_path: path,
        created_at: new Date().toISOString(),
      };
      const existing =
        plugin.settings.rawNotesHistoryBySubject[subject.id] ?? [];
      plugin.settings.rawNotesHistoryBySubject[subject.id] = [
        entry,
        ...existing,
      ].slice(0, MAX_RAW_NOTES_HISTORY_ENTRIES);
      await plugin.saveData(plugin.settings);

      log(`Raw notes saved: ${path}`, "info");
      return entry;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rawNotesPath is a local helper derived from current plugin settings
    [plugin, log]
  );

  function getRawNotesHistory(subjectId: string): RawNotesHistoryEntry[] {
    return plugin.settings.rawNotesHistoryBySubject[subjectId] ?? [];
  }

  /**
   * Opens a previously saved raw-notes file in a new Obsidian tab. Falls back
   * to a warning log if the file no longer exists (user may have deleted it
   * from the file manager).
   */
  const openRawNotesFile = useCallback(
    async (filePath: string): Promise<void> => {
      const path = normalizePath(filePath);
      const file = plugin.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        log(`File no longer exists: ${path}`, "warn");
        return;
      }
      const leaf = plugin.app.workspace.getLeaf("tab");
      await leaf.openFile(file);
    },
    [plugin, log]
  );

  // ─── Summary helpers ────────────────────────────────────────────────────────

  function getSummary(subjectId: string): string | null {
    return plugin.settings.summariesBySubject[subjectId] ?? null;
  }

  async function saveSummary(subjectId: string, summary: string): Promise<void> {
    plugin.settings.summariesBySubject[subjectId] = summary;
    await plugin.saveData(plugin.settings);
  }

  function getDeployCount(subjectId: string): number {
    return plugin.settings.deployCountBySubject[subjectId] ?? 0;
  }

  async function incrementDeployCount(subjectId: string): Promise<void> {
    plugin.settings.deployCountBySubject[subjectId] =
      getDeployCount(subjectId) + 1;
    await plugin.saveData(plugin.settings);
  }

  return {
    sbobine,
    isSaving,
    loadSbobina,
    saveSbobina,
    appendLessonBlock,
    getHistory,
    restoreFromHistory,
    saveRawNotes,
    getRawNotesHistory,
    openRawNotesFile,
    getSummary,
    saveSummary,
    getDeployCount,
    incrementDeployCount,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function ensureDir(plugin: NoterPlugin, dirPath: string): Promise<void> {
  const exists = await plugin.app.vault.adapter.exists(dirPath);
  if (!exists) {
    await plugin.app.vault.createFolder(dirPath).catch(() => {
      // Already exists race condition — safe to ignore
    });
  }
}

function appendHistory(
  plugin: NoterPlugin,
  subjectId: string,
  content: string,
  source: SettingsHistoryEntry["source"]
): void {
  const entry: SettingsHistoryEntry = {
    id: crypto.randomUUID(),
    subject_id: subjectId,
    content,
    source,
    created_at: new Date().toISOString(),
  };

  const existing = plugin.settings.sbobinaHistoryBySubject[subjectId] ?? [];
  const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  plugin.settings.sbobinaHistoryBySubject[subjectId] = updated;
}
