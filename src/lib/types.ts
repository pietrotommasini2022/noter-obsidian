// Core types for the noter Obsidian plugin.
// No Supabase, no Next.js, no Google Drive — fully local-first.

export interface Subject {
  id: string;
  name: string;
  short: string;
  color?: string | null;
}

export interface Concept {
  titolo: string;
  descrizione: string;
}

export interface DeployResult {
  lessonBlock: string;
  nuovi_concetti: Concept[];
  baseSbobina?: string;
  /**
   * Snapshot of the user's raw notes at the moment Deploy was pressed.
   * Persisted on Save so the original input is never lost when the editor
   * is cleared. Allows the History modal to surface the raw notes alongside
   * the AI-generated sbobina versions.
   */
  rawNotes?: string;
}

export interface LogLine {
  msg: string;
  type:
    | "info"
    | "system"
    | "success"
    | "error"
    | "warn"
    | "concept"
    | "hint"
    | "spacer";
  ts: string;
}

export interface TranscriptSegment {
  chunk_index: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface Transcript {
  id: string;
  subject_id: string;
  recording_id: string;
  /** Paths relative to the vault root, e.g. "Notes/Audio/rec-001-0.webm" */
  audio_paths: string[];
  text: string;
  lang: string;
  segments?: TranscriptSegment[];
  created_at: string;
}

export interface SbobinaHistoryEntry {
  id: string;
  subject_id: string;
  content: string;
  source: "deploy" | "manual";
  created_at: string;
}

// ─── Draft state persisted locally in data.json ──────────────────────────────

export interface SubjectDraftState {
  notes: string;
  sbobina: string;
  updatedAt: string;
}

export interface NoterDraftState {
  activeSubjectId: string | null;
  workspaceMode: "notes" | "sbobina";
  draftsBySubject: Record<string, SubjectDraftState>;
}

// ─── Vocabulary markers ───────────────────────────────────────────────────────

export const GAP_MARKER_REGEX = /(?:^|\s)gap:/gm;

// ─── Default settings (overridable by user) ───────────────────────────────────

/** Default max characters of existing sbobina sent to Gemini as context. */
export const DEFAULT_MAX_SBOBINA_CONTEXT_CHARS = 15_000;

/** Regenerate sbobina summary every N deploys to control token budget. */
export const SUMMARY_REFRESH_EVERY_VERSIONS = 3;
