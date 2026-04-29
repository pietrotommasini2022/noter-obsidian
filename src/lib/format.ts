import { GAP_MARKER_REGEX, type TranscriptSegment } from "@/lib/types";

const GAP_CONTEXT_MAX_ITEMS = 3;

// ─── Sbobina rendering ────────────────────────────────────────────────────────

/**
 * Transforms raw Obsidian-flavoured markdown into HTML-ready strings for
 * React rendering. Handles noter image blocks, ==highlights==, and [[wikilinks]].
 */
export function preprocessSbobina(text: string): string {
  return text
    .replace(
      /<!--\s*NOTER-IMAGE(?:\s+alt="([^"]*)")?\s*-->\s*!?\[\[([^\]]+)\]\]/g,
      (_, altText: string | undefined, imagePath: string) => {
        const safeAlt = escapeHtml(altText?.trim() || "Lecture image");
        const safePath = escapeHtml(imagePath.trim());
        return `<img src="${safePath}" alt="${safeAlt}" data-noter-image="true" data-noter-path="${safePath}" />`;
      }
    )
    .replace(/==([^=]+)==/g, "<mark>$1</mark>")
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Gemini response parsing ──────────────────────────────────────────────────

export function extractGeminiText(data: unknown): string {
  return (
    (
      data as {
        candidates?: {
          content?: { parts?: { text?: string }[] };
        }[];
      }
    ).candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  );
}

export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// ─── Gap marker utilities ─────────────────────────────────────────────────────

export function countGapMarkers(text: string): number {
  return (text.match(GAP_MARKER_REGEX) ?? []).length;
}

export function extractGapQueries(rawNotes: string): string[] {
  return rawNotes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /(?:^|\s)gap:/i.test(line))
    .map((line) => line.replace(/^.*?gap:\s*/i, "").trim())
    .filter(Boolean);
}

export function buildGapContextSection(
  rawNotes: string,
  transcriptSegments?: TranscriptSegment[] | null
): string {
  if (!transcriptSegments?.length) return "";

  const gapQueries = extractGapQueries(rawNotes);
  if (gapQueries.length === 0) return "";

  const lines: string[] = [];
  let renderedGapCount = 0;

  gapQueries.forEach((query) => {
    const queryTokens = tokenizeForGapSearch(query);
    if (queryTokens.length === 0) return;

    const matches = transcriptSegments
      .map((segment) => {
        const segmentTokens = new Set(tokenizeForGapSearch(segment.text));
        const score = queryTokens.reduce(
          (sum, token) => sum + (segmentTokens.has(token) ? 1 : 0),
          0
        );
        return { segment, score };
      })
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.segment.start_ms - b.segment.start_ms
      )
      .slice(0, GAP_CONTEXT_MAX_ITEMS);

    if (matches.length === 0) return;

    renderedGapCount += 1;
    lines.push(`GAP ${renderedGapCount}: ${query}`);
    matches.forEach(({ segment }) => {
      lines.push(
        `- [${formatSegmentTime(segment.start_ms)}-${formatSegmentTime(segment.end_ms)}] ${segment.text.trim()}`
      );
    });
  });

  if (lines.length === 0) return "";

  return `RELEVANT AUDIO SEGMENTS FOR GAPS:\n${lines.join("\n")}`;
}

// ─── Name / path sanitization ─────────────────────────────────────────────────

export function sanitizeFileName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeImageAltText(value: string): string {
  const cleaned = value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Lecture image";
}

export function normalizeConceptTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Image block helpers ──────────────────────────────────────────────────────

export function buildProtectedImageBlock(
  imagePath: string,
  altText: string
): string {
  const safeAlt = altText.replace(/"/g, "'");
  return `<!-- NOTER-IMAGE alt="${safeAlt}" -->\n![[${imagePath}]]`;
}

export function extractNoterImagePaths(content: string): string[] {
  const matches = content.matchAll(
    /<!--\s*NOTER-IMAGE(?:\s+alt="[^"]*")?\s*-->\s*!?\[\[([^\]]+)\]\]/g
  );
  const paths = new Set<string>();
  for (const match of matches) {
    const imagePath = match[1]?.trim();
    if (imagePath) paths.add(imagePath);
  }
  return [...paths];
}

// ─── Filename builders ────────────────────────────────────────────────────────

export function buildLessonArchiveFilename(
  subjectName: string,
  date = new Date()
): string {
  const stamp = [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
  const time = [
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    padDatePart(date.getSeconds()),
  ].join("-");
  return `${sanitizeFileName(subjectName)} - ${stamp} ${time}.md`;
}

export function buildImageFilename(
  originalName: string,
  date = new Date()
): string {
  const extensionMatch = originalName.match(/\.([a-z0-9]+)$/i);
  const extension = extensionMatch?.[1]?.toLowerCase() ?? "png";
  const baseName = sanitizeFileName(sanitizeImageAltText(originalName))
    .toLowerCase()
    .replace(/\s+/g, "-");
  const stamp = [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    padDatePart(date.getSeconds()),
  ].join("");
  return `${baseName || "image"}-${stamp}.${extension}`;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatSegmentTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function tokenizeForGapSearch(value: string): string[] {
  return normalizeConceptTitle(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}
