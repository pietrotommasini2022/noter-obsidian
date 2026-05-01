import type { Concept, TranscriptSegment } from "@/lib/types";
import { buildGapContextSection } from "@/lib/format";
import { DICTIONARY_TERMS } from "@/lib/dictionary";

/**
 * Vocabulary section injected into both the system prompt and the user prompt.
 * Built from DICTIONARY_TERMS so the AI receives the same rich behavior strings
 * that are shown to the user in the in-app dictionary modal — keeping the three
 * surfaces (modal / editor / AI) in sync.
 */
const VOCABULARY_SECTION = DICTIONARY_TERMS.map(
  (term) => `- \`${term.token}\` (${term.label}) — ${term.behavior}`
).join("\n");

// ─── System prompts ───────────────────────────────────────────────────────────

export const LESSON_BLOCK_PROMPT = `You are an academic assistant that transforms raw university notes into structured transcript blocks for Obsidian.

MAIN OBJECTIVE:
Use the existing transcript only as context. You must exclusively generate the new markdown block for the current lecture, ready to be appended to the existing transcript.

MANDATORY RULES:
1. Do not rewrite, summarize, or return the existing transcript.
2. Return only the new content of the current lecture.
3. Do not lose any information present in the new notes.
4. You may reorganize, clarify, and better format the text, but without omissions.
5. Maintain explanations of already known concepts; if useful, add [[wikilinks]] to existing concepts.
6. Vocabulary markers apply until the end of the line.
7. Where you find "gap:", insert the exact placeholder ==MISSING==.
8. Image blocks marked with "<!-- NOTER-IMAGE" are protected: do not modify, remove, move, or alter the image path.
9. If you use the audio transcription to complete or clarify a passage, always rewrite the content in a clean academic form. Do not copy the speech verbatim, except for technical terms, formulas, precise definitions, or explicit quotes from the professor.
10. For \`clar:\` markers specifically, you ARE expected to use your own broader subject knowledge to produce the explanation — do not limit yourself to information already present in the notes or audio.

OPERATIONAL VOCABULARY (apply these behaviors strictly when you encounter the corresponding marker at the start of a line):
${VOCABULARY_SECTION}

OUTPUT FORMAT:
1. Respond only in pure markdown.
2. Start with a section title for the lecture, e.g., "## Lecture of DD/MM/YYYY".
3. Do not use JSON.
4. Do not use markdown fences.
5. Do not add introductory or concluding text outside the lecture block.`;

export const CONCEPTS_PROMPT = `You are an academic assistant that extracts cross-cutting key concepts from university notes and a newly generated transcript block.

RULES:
1. Propose only new, stable, and reusable concepts for future use.
2. Do not propose duplicates or variants of existing concepts.
3. Key concepts are not lecture summaries, but cross-cutting nodes in the vault.
4. Propose a maximum of 5 concepts.

Respond ONLY with this JSON:
{
  "nuovi_concetti": [
    { "titolo": "Concept Name", "descrizione": "Brief definition in 1-2 lines" }
  ]
}`;

export const CONCEPT_DEDUP_PROMPT = `You are an academic assistant tasked with eliminating duplicate or nearly duplicate concepts.

RULES:
1. A candidate should NOT be kept if it duplicates an already existing concept.
2. Consider duplicates even:
- differences in capitalization
- accents or punctuation
- nearly equivalent formulations
- Italian/English translations
- variants like "Fourier Transform" vs "Fourier Analysis" if the conceptual core is the same
3. A candidate should NOT be kept if it duplicates another candidate in the same list.
4. Keep only truly new and reusable candidates.
5. If in strong doubt, be conservative and DO NOT keep it.

Respond ONLY with this JSON:
{
  "keep_candidate_ids": ["C1", "C3"]
}`;

export const SBOBINA_SUMMARY_PROMPT = `You are an academic assistant that compresses a long university transcript into a stable context memory for future deployments.

RULES:
1. Summarize only the content already consolidated in the transcript.
2. Maintain core concepts, definitions, formulas, connections between lectures, and still-open points.
3. Do not rewrite the transcript in its entirety.
4. Do not add invented information.
5. Maintain a dry and operational tone.
6. Return only pure markdown, without fences.
7. Target length: 12-20 bullets, maximum 2500 characters.`;

// ─── User prompt builders ─────────────────────────────────────────────────────

export function buildLessonPrompt(
  subjectName: string,
  rawNotes: string,
  existingSbobina: string | null,
  existingConcepts: Concept[],
  maxSbobinaContextChars: number,
  existingSummary?: string | null,
  transcript?: string | null,
  transcriptSegments?: TranscriptSegment[] | null
): string {
  const conceptList =
    existingConcepts.length > 0
      ? existingConcepts.map((c) => `- ${c.titolo}`).join("\n")
      : "No concepts saved yet.";

  const contextualSbobina = buildSbobinaContext(
    existingSbobina,
    maxSbobinaContextChars
  );

  const summarySection = existingSummary?.trim()
    ? `SUMMARY OF PREVIOUS LECTURES:\n${existingSummary.trim()}`
    : "SUMMARY OF PREVIOUS LECTURES:\nNo summary available.";

  const sbobinaSection = contextualSbobina
    ? `${summarySection}\n\nFINAL WINDOW OF THE EXISTING TRANSCRIPT FOR ${subjectName.toUpperCase()} (CONTEXT ONLY, DO NOT REWRITE IT):\n${contextualSbobina}`
    : `COMPLETE EXISTING TRANSCRIPT FOR ${subjectName.toUpperCase()}:\nNo previous transcript. This is the first lecture.`;

  const gapContextSection = buildGapContextSection(rawNotes, transcriptSegments);

  const transcriptSection = transcript?.trim()
    ? `AUDIO TRANSCRIPTION OF THE LECTURE:\nUse it to fill gaps in the notes, but prioritize the user's note structure.\nDo not copy speech verbatim: extract useful information and rewrite it in a clear, concise academic register.\nKeep verbatim only technical terms, formulas, nomenclature, precise definitions, or necessary brief quotes.\n${gapContextSection ? `${gapContextSection}\n\n` : ""}FULL TRANSCRIPTION:\n${transcript.trim()}`
    : `AUDIO TRANSCRIPTION OF THE LECTURE:\nNo audio transcription available.`;

  return `${sbobinaSection}

EXISTING CONCEPTS IN THE VAULT:
These concepts are cross-cutting memory reusable in future subjects.
If any of these topics reappear in the notes:
- still maintain the content in the transcript
- do not replace it with a summary or a simple reference
- add a [[wikilink]] to the existing concept if useful for further study
- do not create a duplicate if the concept is already present

VOCABULARY TO INTERPRET (each marker carries a specific instruction — follow it exactly):
${VOCABULARY_SECTION}

PROTECTED BLOCKS:
- Lines/blocks marked with "<!-- NOTER-IMAGE" and the relative embed ![[...]] are images: do not modify, move, or rewrite them.

${conceptList}

${transcriptSection}

NEW NOTES TO BE INTEGRATED:
${rawNotes}

Lecture date: ${new Date().toLocaleDateString("en-US")}`;
}

export function buildConceptsPrompt(
  subjectName: string,
  rawNotes: string,
  lessonBlock: string,
  existingConcepts: Concept[]
): string {
  const conceptList =
    existingConcepts.length > 0
      ? existingConcepts.map((c) => `- ${c.titolo}`).join("\n")
      : "No concepts saved yet.";

  return `SUBJECT: ${subjectName}

EXISTING CONCEPTS IN THE VAULT:
${conceptList}

NEW NOTES:
${rawNotes}

NEW LECTURE MARKDOWN BLOCK:
${lessonBlock}`;
}

export function buildConceptDedupPrompt(
  subjectName: string,
  existingConcepts: Concept[],
  candidateConcepts: Concept[]
): string {
  const existingList =
    existingConcepts.length > 0
      ? existingConcepts
        .map((concept, index) => `E${index + 1}. ${concept.titolo} - ${concept.descrizione}`)
        .join("\n")
      : "No existing concepts.";

  const candidateList = candidateConcepts
    .map((concept, index) => `C${index + 1}. ${concept.titolo} - ${concept.descrizione}`)
    .join("\n");

  return `SUBJECT: ${subjectName}

EXISTING CONCEPTS:
${existingList}

CANDIDATE CONCEPTS TO EVALUATE:
${candidateList}`;
}

export function buildSbobinaSummaryPrompt(
  subjectName: string,
  content: string,
  existingSummary?: string | null
): string {
  const previousSummary = existingSummary?.trim()
    ? `PREVIOUS SUMMARY:\n${existingSummary.trim()}`
    : "PREVIOUS SUMMARY:\nNo previous summary.";

  return `SUBJECT: ${subjectName}

${previousSummary}

COMPLETE TRANSCRIPT TO COMPACT:
${content}`;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildSbobinaContext(
  existingSbobina: string | null,
  maxChars: number
): string | null {
  if (!existingSbobina?.trim()) return null;
  if (existingSbobina.length <= maxChars) return existingSbobina;
  return [
    "[Context truncated to stay within token budget — maintain continuity with this final portion of the sbobina.]",
    existingSbobina.slice(-maxChars),
  ].join("\n\n");
}
