/**
 * Native Obsidian folder picker.
 *
 * Wraps `FuzzySuggestModal<TFolder>` so the rest of the plugin can `await`
 * a folder choice as a promise. Resolves to the chosen `TFolder`, or `null`
 * if the user dismissed the modal without picking anything.
 */

import { FuzzySuggestModal, TFolder, type App } from "obsidian";

/**
 * Walk the vault's folder tree depth-first and return every folder, including
 * the root. The root has `path === ""` — we render it as "/" in the picker.
 */
function getAllFolders(app: App): TFolder[] {
  const out: TFolder[] = [];
  const visit = (folder: TFolder) => {
    out.push(folder);
    for (const child of folder.children) {
      if (child instanceof TFolder) visit(child);
    }
  };
  visit(app.vault.getRoot());
  return out;
}

class FolderPickerModal extends FuzzySuggestModal<TFolder> {
  private folders: TFolder[];
  private chosen = false;
  private resolveFn: (folder: TFolder | null) => void;

  constructor(app: App, resolveFn: (folder: TFolder | null) => void) {
    super(app);
    this.folders = getAllFolders(app);
    this.resolveFn = resolveFn;
    this.setPlaceholder("Pick a folder for your notes…");
  }

  getItems(): TFolder[] {
    return this.folders;
  }

  getItemText(folder: TFolder): string {
    return folder.path === "" ? "/ (vault root)" : folder.path;
  }

  onChooseItem(folder: TFolder): void {
    this.chosen = true;
    this.resolveFn(folder);
  }

  onClose(): void {
    super.onClose();
    // FuzzySuggestModal doesn't have a "cancelled" callback — distinguishing a
    // pick from a dismiss requires checking the flag set in onChooseItem.
    if (!this.chosen) this.resolveFn(null);
  }
}

/** Open the folder picker. Resolves to the picked TFolder or null on cancel. */
export function pickVaultFolder(app: App): Promise<TFolder | null> {
  return new Promise((resolve) => {
    new FolderPickerModal(app, resolve).open();
  });
}
