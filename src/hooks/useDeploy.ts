/**
 * useDeploy — orchestrates the two-step Gemini deploy flow.
 *
 * Step 1: Generate the new lesson block (markdown).
 * Step 2: Extract new concepts (JSON).
 * Step 3 (on save): append block to sbobina, write to vault, update concepts.
 *
 * No Supabase, no Google Drive, no rate-limiting proxy.
 * All persistence is via useSbobine (vault .md files) and plugin.saveData.
 */

import { useState, useCallback } from "react";
import type { Subject, Concept, LogLine, TranscriptSegment, DeployResult } from "@/lib/types";
import {
  LESSON_BLOCK_PROMPT,
  CONCEPTS_PROMPT,
  CONCEPT_DEDUP_PROMPT,
  SBOBINA_SUMMARY_PROMPT,
  buildLessonPrompt,
  buildConceptsPrompt,
  buildConceptDedupPrompt,
  buildSbobinaSummaryPrompt,
} from "@/lib/prompts";
import { countGapMarkers, stripMarkdownFences } from "@/lib/format";
import { callGeminiText } from "@/GeminiClient";
import { SUMMARY_REFRESH_EVERY_VERSIONS } from "@/lib/types";
import type { NoterPlugin } from "@/types/plugin";
import type { useSbobine } from "@/hooks/useSbobine";
import type { useConcepts } from "@/hooks/useConcepts";

export type DeployPhase = "editor" | "processing" | "done";

export interface UseDeployArgs {
  plugin: NoterPlugin;
  activeSubject: Subject | null;
  notes: Record<string, string>;
  transcript: string | null;
  transcriptSegments: TranscriptSegment[] | null;
  log: (msg: string, type?: LogLine["type"]) => void;
  sbobinaHook: ReturnType<typeof useSbobine>;
  conceptsHook: ReturnType<typeof useConcepts>;
  onNotesCleared: (subjectId: string) => void;
}

export function useDeploy({
  plugin,
  activeSubject,
  notes,
  transcript,
  transcriptSegments,
  log,
  sbobinaHook,
  conceptsHook,
  onNotesCleared,
}: UseDeployArgs) {
  const [phase, setPhase] = useState<DeployPhase>("editor");
  const [pendingResult, setPendingResult] = useState<DeployResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Deploy (generate) ───────────────────────────────────────────────────────

  const handleDeploy = useCallback(async () => {
    if (!activeSubject) {
      log("No subject selected", "warn");
      return;
    }

    const rawNotes = notes[activeSubject.id] ?? "";
    if (!rawNotes.trim()) {
      log("Notes are empty — nothing to deploy", "warn");
      return;
    }

    const apiKey = plugin.settings.geminiApiKey;
    if (!apiKey) {
      log("Gemini API key not set. Open Settings to add your key.", "error");
      return;
    }

    setPhase("processing");
    setIsProcessing(true);
    setPendingResult(null);

    try {
      // ── Load existing sbobina ──
      const existingSbobina = await sbobinaHook.loadSbobina(activeSubject);
      const existingSummary = sbobinaHook.getSummary(activeSubject.id);
      const { concepts } = conceptsHook;
      const maxChars = plugin.settings.maxSbobinaContextChars;

      const gapCount = countGapMarkers(rawNotes);
      if (gapCount > 0) {
        log(`Found ${gapCount} gap marker(s) — will fill with ==COMPLETARE==`, "hint");
      }

      // ── Step 1: Generate lesson block ──
      log("Generating lesson block...", "system");
      const lessonPrompt = buildLessonPrompt(
        activeSubject.name,
        rawNotes,
        existingSbobina,
        concepts,
        maxChars,
        existingSummary,
        transcript,
        transcriptSegments
      );

      const lessonResponse = await callGeminiText({
        apiKey,
        system: LESSON_BLOCK_PROMPT,
        prompt: lessonPrompt,
        maxOutputTokens: 8192,
      });

      const lessonBlock = stripMarkdownFences(lessonResponse.text);
      if (!lessonBlock.trim()) {
        throw new Error("Gemini returned an empty lesson block");
      }
      log("Lesson block ready ✓", "success");

      // ── Step 2: Extract concepts ──
      log("Extracting new concepts...", "system");
      const conceptsPrompt = buildConceptsPrompt(
        activeSubject.name,
        rawNotes,
        lessonBlock,
        concepts
      );

      let nuovi_concetti: Concept[] = [];
      try {
        const conceptsResponse = await callGeminiText({
          apiKey,
          system: CONCEPTS_PROMPT,
          prompt: conceptsPrompt,
          maxOutputTokens: 1024,
        });

        const parsed = parseConceptsJson(conceptsResponse.text);
        nuovi_concetti = parsed;

        // ── Step 2b: Dedup against existing concepts ──
        if (nuovi_concetti.length > 0 && concepts.length > 0) {
          log("Deduplicating concepts...", "system");
          const dedupPrompt = buildConceptDedupPrompt(
            activeSubject.name,
            concepts,
            nuovi_concetti
          );
          const dedupResponse = await callGeminiText({
            apiKey,
            system: CONCEPT_DEDUP_PROMPT,
            prompt: dedupPrompt,
            maxOutputTokens: 256,
          });
          nuovi_concetti = filterDedupedConcepts(nuovi_concetti, dedupResponse.text);
        }
      } catch {
        log("Concept extraction failed (non-critical)", "warn");
      }

      if (nuovi_concetti.length > 0) {
        log(`Proposed ${nuovi_concetti.length} new concept(s)`, "concept");
      }

      setPendingResult({ lessonBlock, nuovi_concetti });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Deploy failed: ${msg}`, "error");
      setPhase("editor");
    } finally {
      setIsProcessing(false);
    }
  }, [plugin, activeSubject, notes, transcript, transcriptSegments, log, sbobinaHook, conceptsHook]);

  // ─── Save (finalise) ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!activeSubject || !pendingResult) return;

    const { lessonBlock, nuovi_concetti } = pendingResult;
    const apiKey = plugin.settings.geminiApiKey;

    try {
      // Append lesson block to vault sbobina
      const updatedSbobina = await sbobinaHook.appendLessonBlock(activeSubject, lessonBlock);
      await sbobinaHook.incrementDeployCount(activeSubject.id);

      // Save new concepts (deduped)
      if (nuovi_concetti.length > 0) {
        const added = await conceptsHook.addConcepts(nuovi_concetti);
        if (added.length > 0) {
          // Write individual concept files to vault
          await writeConceptFiles(plugin, added);
          log(`Saved ${added.length} new concept(s)`, "concept");
        }
      }

      // Refresh summary if threshold reached
      if (apiKey) {
        const deployCount = sbobinaHook.getDeployCount(activeSubject.id);
        if (deployCount % SUMMARY_REFRESH_EVERY_VERSIONS === 0) {
          void refreshSummary(plugin, activeSubject, updatedSbobina, sbobinaHook, log);
        }
      }

      onNotesCleared(activeSubject.id);
      setPhase("done");
      setPendingResult(null);
      log("All saved ✓", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Save failed: ${msg}`, "error");
    }
  }, [plugin, activeSubject, pendingResult, log, sbobinaHook, conceptsHook, onNotesCleared]);

  // ─── Cancel ─────────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    setPendingResult(null);
    setPhase("editor");
  }, []);

  const handleReset = useCallback(() => {
    setPhase("editor");
    setPendingResult(null);
  }, []);

  return {
    phase,
    isProcessing,
    pendingResult,
    handleDeploy,
    handleSave,
    handleCancel,
    handleReset,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function parseConceptsJson(text: string): Concept[] {
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { nuovi_concetti?: Concept[] };
    return Array.isArray(parsed.nuovi_concetti) ? parsed.nuovi_concetti : [];
  } catch {
    return [];
  }
}

function filterDedupedConcepts(
  candidates: Concept[],
  dedupResponseText: string
): Concept[] {
  try {
    const cleaned = dedupResponseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { keep_candidate_ids?: string[] };
    const keepIds = new Set(parsed.keep_candidate_ids ?? []);
    return candidates.filter((_, i) => keepIds.has(`C${i + 1}`));
  } catch {
    return candidates;
  }
}

async function writeConceptFiles(plugin: NoterPlugin, concepts: Concept[]): Promise<void> {
  const base = plugin.settings.notesFolder;
  for (const concept of concepts) {
    try {
      const safeName = concept.titolo.replace(/[\\/:*?"<>|]/g, "-").trim();
      const dir = `${base}/Concepts`;
      const path = `${dir}/${safeName}.md`;
      const exists = await plugin.app.vault.adapter.exists(dir);
      if (!exists) {
        await plugin.app.vault.createFolder(dir).catch(() => {});
      }
      const content = `# ${concept.titolo}\n\n${concept.descrizione}\n`;
      await plugin.app.vault.adapter.write(path, content);
    } catch {
      // Non-critical
    }
  }
}

async function refreshSummary(
  plugin: NoterPlugin,
  subject: Subject,
  sbobinaContent: string,
  sbobinaHook: ReturnType<typeof useSbobine>,
  log: (msg: string, type?: LogLine["type"]) => void
): Promise<void> {
  const apiKey = plugin.settings.geminiApiKey;
  if (!apiKey) return;

  try {
    const existingSummary = sbobinaHook.getSummary(subject.id);
    const summaryPrompt = buildSbobinaSummaryPrompt(
      subject.name,
      sbobinaContent,
      existingSummary
    );
    const response = await callGeminiText({
      apiKey,
      system: SBOBINA_SUMMARY_PROMPT,
      prompt: summaryPrompt,
      maxOutputTokens: 1024,
    });
    if (response.text.trim()) {
      await sbobinaHook.saveSummary(subject.id, response.text.trim());
      log("Summary refreshed", "info");
    }
  } catch {
    // Non-critical
  }
}
