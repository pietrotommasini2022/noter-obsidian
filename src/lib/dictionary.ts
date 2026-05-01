/**
 * Dictionary of vocabulary markers used in raw lecture notes.
 *
 * Single source of truth for:
 *  - the in-app DictionaryModal (UI listing)
 *  - the CodeMirror highlight extension in MarkdownEditor.tsx
 *  - the vocabulary section injected into the AI lesson prompt
 *
 * To add or change a marker, edit ONLY this file. The editor regex,
 * highlight classes, and AI prompt wording are all derived from here.
 */

export interface DictionaryTerm {
  /** Token written by the user at the start of a line, including the trailing colon. */
  token: string;
  /** Short human-readable label shown in the modal. */
  label: string;
  /**
   * Full instruction string. Shown verbatim in the modal AND injected into
   * the AI prompt — write it as a directive to the AI in second person /
   * "The AI must …" style.
   */
  behavior: string;
  /** Realistic example a student might actually write. */
  example: string;
  /** CSS class applied to the highlighted line in the CodeMirror editor. */
  cssClass: string;
  /** Hex base color used to derive bg / border / text in the editor theme. */
  color: string;
}

export const DICTIONARY_TERMS: DictionaryTerm[] = [
  {
    token: "def:",
    label: "Definition",
    behavior:
      "The following text is a definition. The AI must rewrite it in clean, explicit, well-formatted form without losing information.",
    example: "def: cardiac output = volume ejected by the heart per minute",
    cssClass: "cm-dict-definition",
    color: "#6dbb8a",
  },
  {
    token: "link:",
    label: "Concept reference",
    behavior:
      "Signals a cross-cutting or already-known topic. The AI must keep the content in the sbobina and, if relevant, add a [[wikilink]] to an existing key concept.",
    example: "link: heart anatomy",
    cssClass: "cm-dict-link",
    color: "#7c9bb5",
  },
  {
    token: "gap:",
    label: "Note gap",
    behavior:
      "Signals an incomplete or misheard point. The sbobina must keep the position of the passage and insert ==MISSING==.",
    example: "gap: artery that irrigates the SA node",
    cssClass: "cm-dict-gap",
    color: "#c98746",
  },
  {
    token: "clar:",
    label: "Clarification needed",
    behavior:
      "Signals a topic the student wants explained from general academic knowledge (as if asking a textbook or a web search), NOT only from the surrounding notes. The AI must generate a clear, accurate explanation of the topic — drawing on its broader subject knowledge — and integrate that explanation contextually into the lecture transcript at the position of the marker. Do not delete the original line; treat the text after `clar:` as the question/topic to expand on.",
    example: "clar: why does stroke volume increase during exercise",
    cssClass: "cm-dict-clarify",
    color: "#7c9bb5",
  },
  {
    token: "imp:",
    label: "Important point",
    behavior:
      "Signals a priority passage. The AI must preserve it and give it more prominence in the sbobina structure.",
    example: "imp: the left ventricle has a thicker wall",
    cssClass: "cm-dict-important",
    color: "#c97070",
  },
  {
    token: "exam:",
    label: "High-priority point",
    behavior:
      "Signals a point to remember very well, potentially relevant for the exam. The AI must highlight it clearly without inventing content.",
    example: "exam: difference between preload and afterload",
    cssClass: "cm-dict-important",
    color: "#c97070",
  },
  {
    token: "ex:",
    label: "Example",
    behavior:
      "The following text is an example. The AI must keep it and clearly distinguish it from theory.",
    example: "ex: what happens during physical exertion",
    cssClass: "cm-dict-example",
    color: "#5eb3b3",
  },
  {
    token: "todo:",
    label: "Follow-up",
    behavior:
      "Signals something to check or study later. The AI must keep it as an operational note or open point.",
    example: "todo: check if the professor said right atrium or left atrium",
    cssClass: "cm-dict-todo",
    color: "#a78bfa",
  },
];

// ─── Derived helpers ──────────────────────────────────────────────────────────

/**
 * Regex that matches a line starting with optional indentation followed by
 * any registered token. Capture groups: 1 = indent, 2 = token (with colon).
 *
 * The tokens are sorted by descending length to guarantee that longer tokens
 * (e.g. `exam:`) are tried before any shorter prefix that would otherwise
 * shadow them under regex alternation semantics. With the current set this
 * is not strictly necessary (no token is a prefix of another), but it is
 * future-proof and cheap.
 */
export const DICTIONARY_LINE_PATTERN: RegExp = (() => {
  const tokens = [...DICTIONARY_TERMS]
    .sort((a, b) => b.token.length - a.token.length)
    .map((t) => t.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`^(\\s*)(${tokens})`);
})();

/** Map of token → DictionaryTerm for O(1) lookup after a regex match. */
export const DICTIONARY_BY_TOKEN: ReadonlyMap<string, DictionaryTerm> = new Map(
  DICTIONARY_TERMS.map((term) => [term.token, term])
);
