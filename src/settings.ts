/**
 * NoterPluginSettings — everything persisted in data.json by Obsidian.
 *
 * Replaces Supabase as the source of truth for subjects, concepts, and
 * user preferences. The vault file system holds the actual .md notes.
 */

import type { Subject, Concept, NoterDraftState } from "@/lib/types";
import { DEFAULT_MAX_SBOBINA_CONTEXT_CHARS } from "@/lib/types";

export interface NoterPluginSettings {
  // ─── API ────────────────────────────────────────────────────────────────────
  /** User's own Gemini API key (BYOK). Never logged or sent anywhere else. */
  geminiApiKey: string;

  // ─── Subjects ────────────────────────────────────────────────────────────────
  subjects: Subject[];

  // ─── Concepts (cross-subject vault memory) ──────────────────────────────────
  concepts: Concept[];

  // ─── Vault paths ─────────────────────────────────────────────────────────────
  /**
   * Root folder inside the Obsidian vault where noter writes its files.
   * Default: "Notes"
   * Structure inside:
   *   <notesFolder>/<Subject>/<Subject>.md       — main sbobina
   *   <notesFolder>/<Subject>/Archive/            — per-lesson AI block archives
   *   <notesFolder>/<Subject>/RawNotes/           — per-lesson verbatim raw input
   *   <notesFolder>/<Subject>/Images/             — pasted images
   *   <notesFolder>/Audio/                        — recorded audio chunks
   *   <notesFolder>/Concepts/<Title>.md           — concept files
   */
  notesFolder: string;

  // ─── AI tuning ───────────────────────────────────────────────────────────────
  /**
   * Maximum characters of existing sbobina sent to Gemini as context.
   * Larger = better continuity, more tokens consumed.
   */
  maxSbobinaContextChars: number;

  // ─── Sbobina summaries (per subject) ────────────────────────────────────────
  /**
   * Cached summaries keyed by subject ID.
   * Regenerated automatically every SUMMARY_REFRESH_EVERY_VERSIONS deploys.
   */
  summariesBySubject: Record<string, string>;

  /** Deploy count per subject, used to decide when to refresh the summary. */
  deployCountBySubject: Record<string, number>;

  // ─── Sbobina history (per subject, append-only, last N entries) ─────────────
  sbobinaHistoryBySubject: Record<string, SbobinaHistoryEntry[]>;

  // ─── Raw-notes history (per subject) ───────────────────────────────────────
  /**
   * Append-only index of the user's raw notes captured at every successful
   * deploy. Each entry references a .md file written under
   * `<Subject>/RawNotes/`; `content` is also stored in data.json so the
   * History modal can display it without hitting the disk.
   */
  rawNotesHistoryBySubject: Record<string, RawNotesHistoryEntry[]>;

  // ─── UI state ────────────────────────────────────────────────────────────────
  draft: NoterDraftState;

  // ─── Audio ───────────────────────────────────────────────────────────────────
  audioRecordingEnabled: boolean;
  audioDisclaimerAcknowledged: boolean;
}

// Re-export for convenience
export type { Subject, Concept };

// ─── History entry (local version, no Supabase IDs) ──────────────────────────

export interface SbobinaHistoryEntry {
  id: string;
  subject_id: string;
  content: string;
  source: "deploy" | "manual";
  created_at: string;
}

export interface RawNotesHistoryEntry {
  id: string;
  subject_id: string;
  /** Verbatim copy of the raw notes the user wrote before pressing Deploy. */
  content: string;
  /** Vault-relative path where the .md file was written. */
  file_path: string;
  created_at: string;
}

/** Maximum sbobina history entries kept per subject (oldest are pruned). */
export const MAX_HISTORY_ENTRIES = 20;

/** Maximum raw-notes history entries kept per subject (oldest are pruned). */
export const MAX_RAW_NOTES_HISTORY_ENTRIES = 50;

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: NoterPluginSettings = {
  geminiApiKey: "",
  subjects: [],
  concepts: [],
  notesFolder: "Notes",
  maxSbobinaContextChars: DEFAULT_MAX_SBOBINA_CONTEXT_CHARS,
  summariesBySubject: {},
  deployCountBySubject: {},
  sbobinaHistoryBySubject: {},
  rawNotesHistoryBySubject: {},
  draft: {
    activeSubjectId: null,
    workspaceMode: "notes",
    draftsBySubject: {},
  },
  audioRecordingEnabled: false,
  audioDisclaimerAcknowledged: false,
};
