import type { Subject } from "@/lib/types";

export const SUBJECT_COLOR_TOKENS = [
  "#f59e0b",
  "#38bdf8",
  "#4ade80",
  "#fb7185",
  "#c084fc",
  "#2dd4bf",
];

export function getSubjectColor(
  subject: Pick<Subject, "color"> | null | undefined,
  index = 0
): string {
  return (
    subject?.color ??
    SUBJECT_COLOR_TOKENS[index % SUBJECT_COLOR_TOKENS.length] ??
    "#f59e0b"
  );
}
