/**
 * useConcepts — manages the cross-subject concept vault in plugin data.json.
 *
 * No Supabase. Concepts are global to the plugin (not per-subject), mirroring
 * the original vault-wide concept memory.
 */

import { useState, useCallback } from "react";
import type { Concept } from "@/lib/types";
import { normalizeConceptTitle } from "@/lib/format";
import type { NoterPlugin } from "@/types/plugin";

export function useConcepts(plugin: NoterPlugin) {
  const [concepts, setConcepts] = useState<Concept[]>(
    () => plugin.settings.concepts
  );

  const saveConcepts = useCallback(
    async (next: Concept[]) => {
      plugin.settings.concepts = next;
      await plugin.saveData(plugin.settings);
      setConcepts([...next]);
    },
    [plugin]
  );

  /**
   * Adds new concepts, skipping any whose normalised title already exists.
   * Returns the concepts that were actually inserted.
   */
  const addConcepts = useCallback(
    async (candidates: Concept[]): Promise<Concept[]> => {
      const existingKeys = new Set(concepts.map((c) => normalizeConceptTitle(c.titolo)));
      const toAdd = candidates.filter(
        (c) => !existingKeys.has(normalizeConceptTitle(c.titolo))
      );
      if (toAdd.length > 0) {
        await saveConcepts([...concepts, ...toAdd]);
      }
      return toAdd;
    },
    [concepts, saveConcepts]
  );

  const deleteConcept = useCallback(
    async (titolo: string) => {
      await saveConcepts(
        concepts.filter(
          (c) =>
            normalizeConceptTitle(c.titolo) !== normalizeConceptTitle(titolo)
        )
      );
    },
    [concepts, saveConcepts]
  );

  const updateConcept = useCallback(
    async (titolo: string, patch: Partial<Concept>) => {
      const next = concepts.map((c) =>
        normalizeConceptTitle(c.titolo) === normalizeConceptTitle(titolo)
          ? { ...c, ...patch }
          : c
      );
      await saveConcepts(next);
    },
    [concepts, saveConcepts]
  );

  return { concepts, addConcepts, deleteConcept, updateConcept };
}
