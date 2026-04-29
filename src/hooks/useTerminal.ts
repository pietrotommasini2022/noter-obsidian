/**
 * useTerminal — manages the processing log displayed in the terminal drawer.
 * Pure React state — no changes needed from the original.
 */

import { useState, useCallback } from "react";
import type { LogLine } from "@/lib/types";

export function useTerminal() {
  const [processingLog, setProcessingLog] = useState<LogLine[]>([]);

  const log = useCallback((msg: string, type: LogLine["type"] = "info") => {
    const line: LogLine = { msg, type, ts: new Date().toISOString() };
    setProcessingLog((prev) => [...prev, line]);
  }, []);

  const clearLog = useCallback(() => {
    setProcessingLog([]);
  }, []);

  const spacer = useCallback(() => {
    log("", "spacer");
  }, [log]);

  return { processingLog, log, clearLog, spacer };
}
