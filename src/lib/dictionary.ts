export interface DictionaryTerm {
  token: string;
  label: string;
  behavior: string;
  example: string;
}

export const DICTIONARY_TERMS: DictionaryTerm[] = [
  {
    token: "def:",
    label: "Definition",
    behavior:
      "The following text is a definition. The AI must rewrite it in clean, explicit, well-formatted form without losing information.",
    example: "def: cardiac output = volume ejected by the heart per minute",
  },
  {
    token: "link:",
    label: "Concept reference",
    behavior:
      "Signals a cross-cutting or already-known topic. The AI must keep the content in the sbobina and, if relevant, add a [[wikilink]] to an existing key concept.",
    example: "link: heart anatomy",
  },
  {
    token: "gap:",
    label: "Note gap",
    behavior:
      "Signals an incomplete or misheard point. The sbobina must keep the position of the passage and insert ==MISSING==.",
    example: "gap: artery that irrigates the SA node",
  },
  {
    token: "clar:",
    label: "Clarification needed",
    behavior:
      "Signals an unclear passage. The AI must clarify and integrate it contextually using the notes, without deleting the original content.",
    example: "clar: why does stroke volume increase during exercise",
  },
  {
    token: "imp:",
    label: "Important point",
    behavior:
      "Signals a priority passage. The AI must preserve it and give it more prominence in the sbobina structure.",
    example: "imp: the left ventricle has a thicker wall",
  },
  {
    token: "exam:",
    label: "High-priority point",
    behavior:
      "Signals a point to remember very well, potentially relevant for the exam. The AI must highlight it clearly without inventing content.",
    example: "exam: difference between preload and afterload",
  },
  {
    token: "ex:",
    label: "Example",
    behavior:
      "The following text is an example. The AI must keep it and clearly distinguish it from theory.",
    example: "ex: what happens during physical exertion",
  },
  {
    token: "todo:",
    label: "Follow-up",
    behavior:
      "Signals something to check or study later. The AI must keep it as an operational note or open point.",
    example: "todo: check if the professor said right atrium or left atrium",
  },
];
