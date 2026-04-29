import type { LogLine } from "@/lib/types";

export const logColors: Record<LogLine["type"], string> = {
  info: "text-[var(--noter-text-dim)]",
  system: "text-[#7c9bb5]",
  success: "text-[#6dbb8a]",
  error: "text-[#c97070]",
  warn: "text-[#c9a870]",
  concept: "text-[#c084fc]",
  hint: "text-[#7c9bb5] italic",
  spacer: "",
};
