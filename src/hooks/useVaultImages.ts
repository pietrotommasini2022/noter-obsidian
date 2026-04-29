/**
 * useVaultImages — handles pasting images into the editor.
 *
 * Saves pasted images directly to the vault under:
 *   <notesFolder>/<SubjectName>/Images/<filename>
 *
 * Replaces useDrive.ts / uploadImage (no Google Drive API).
 */

import { useCallback } from "react";
import { normalizePath } from "obsidian";
import type { Subject, LogLine } from "@/lib/types";
import {
  buildProtectedImageBlock,
  buildImageFilename,
  sanitizeImageAltText,
} from "@/lib/format";
import type { NoterPlugin } from "@/types/plugin";

export function useVaultImages(
  plugin: NoterPlugin,
  log: (msg: string, type?: LogLine["type"]) => void
) {
  /**
   * Saves an image File/Blob to the vault and returns the Obsidian
   * protected image block string to insert into the editor.
   */
  const saveImage = useCallback(
    async (file: File, subject: Subject): Promise<string | null> => {
      try {
        const filename = buildImageFilename(file.name || "image.png");
        const altText = sanitizeImageAltText(file.name || "image");
        const subjectFolder = subject.name.replace(/[\\/:*?"<>|]/g, "-").trim();
        const base = plugin.settings.notesFolder;
        const dir = normalizePath(`${base}/${subjectFolder}/Images`);
        const path = normalizePath(`${dir}/${filename}`);

        // Ensure directory exists
        const dirExists = await plugin.app.vault.adapter.exists(dir);
        if (!dirExists) {
          await plugin.app.vault.createFolder(dir).catch(() => {});
        }

        // Read file bytes and write to vault
        const arrayBuffer = await file.arrayBuffer();
        await plugin.app.vault.adapter.writeBinary(path, arrayBuffer);

        log(`Image saved: ${filename}`, "info");

        // Return Obsidian embed syntax wrapped in noter protection comment
        return buildProtectedImageBlock(path, altText);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`Failed to save image: ${msg}`, "error");
        return null;
      }
    },
    [plugin, log]
  );

  return { saveImage };
}
