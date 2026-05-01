/**
 * SettingsPanel — plugin settings UI (BYOK API key, subjects, folder, etc.)
 * Replaces the original SettingsPanel which had Drive/Vault/signOut controls.
 */

import React, { useState } from "react";
import type { NoterPlugin } from "@/types/plugin";
import type { Subject, Concept } from "@/lib/types";
import { pickVaultFolder } from "@/lib/folderPicker";
import { SubjectImportModal } from "@/components/notes/SubjectImportModal";

interface Props {
  plugin: NoterPlugin;
  subjects: Subject[];
  concepts: Concept[];
  onAddSubject: (name: string, short: string) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  /** Read-only scan: returns subdirectory names of `folderPath`. */
  onScanFolderForCandidates: (
    folderPath: string
  ) => Promise<{ candidates: string[]; folderMissing: boolean }>;
  /** Bulk-add subjects by name (case-insensitive de-dup). */
  onAddSubjectsByNames: (names: string[]) => Promise<string[]>;
  onDeleteConcept: (titolo: string) => Promise<void>;
  onClose: () => void;
}

/** Pending state for the SubjectImportModal once a folder has been scanned. */
interface ImportPending {
  /** Folder the user just picked or is rescanning. */
  folderPath: string;
  /** Subdirectory names found inside `folderPath`. */
  candidates: string[];
  /**
   * If true, the user reached this modal via Browse and confirming should
   * persist the new folderPath to settings. If false (Rescan flow), the
   * folder is already saved.
   */
  persistFolder: boolean;
}

export function SettingsPanel({
  plugin,
  subjects,
  concepts,
  onAddSubject,
  onDeleteSubject,
  onScanFolderForCandidates,
  onAddSubjectsByNames,
  onDeleteConcept,
  onClose,
}: Props) {
  const [apiKey, setApiKey] = useState(plugin.settings.geminiApiKey);
  const [notesFolder, setNotesFolder] = useState(plugin.settings.notesFolder);
  const [maxChars, setMaxChars] = useState(String(plugin.settings.maxSbobinaContextChars));
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectShort, setNewSubjectShort] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [importPending, setImportPending] = useState<ImportPending | null>(null);

  /** Names already in the subjects list — used to mark them in the modal. */
  const existingNames = subjects.map((s) => s.name);

  /** Set a status message that auto-clears after a few seconds. */
  const flashStatus = (msg: string) => {
    setScanStatus(msg);
    setTimeout(() => setScanStatus(null), 6000);
  };

  /**
   * Native Obsidian folder picker → scan → open SubjectImportModal.
   * The folder choice is NOT persisted until the user confirms in the modal,
   * so cancelling preserves their previous setting.
   */
  const handleBrowse = async () => {
    setScanStatus(null);
    const folder = await pickVaultFolder(plugin.app);
    if (!folder) return; // user dismissed the picker
    const path = folder.path; // "" for vault root
    setScanning(true);
    try {
      const scan = await onScanFolderForCandidates(path);
      if (scan.folderMissing) {
        flashStatus(`Folder "${path}" not found.`);
        return;
      }
      setImportPending({
        folderPath: path,
        candidates: scan.candidates,
        persistFolder: true,
      });
    } catch (err) {
      flashStatus(
        `Scan failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setScanning(false);
    }
  };

  /**
   * Rescan the currently configured folder (taken from the input field —
   * not yet persisted, so the user can rescan a path they've just typed).
   */
  const handleRescan = async () => {
    setScanStatus(null);
    setScanning(true);
    try {
      const path = notesFolder.trim() || "Notes";
      const scan = await onScanFolderForCandidates(path);
      if (scan.folderMissing) {
        flashStatus(`Folder "${path}" not found.`);
        return;
      }
      setImportPending({
        folderPath: path,
        candidates: scan.candidates,
        persistFolder: false,
      });
    } catch (err) {
      flashStatus(
        `Scan failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setScanning(false);
    }
  };

  /** Confirm callback for SubjectImportModal — applies the import. */
  const handleImportConfirm = async (selectedNames: string[]) => {
    const pending = importPending;
    if (!pending) return;

    if (pending.persistFolder) {
      plugin.settings.notesFolder = pending.folderPath || "Notes";
      await plugin.saveData(plugin.settings);
      setNotesFolder(pending.folderPath);
    }
    let added: string[] = [];
    if (selectedNames.length > 0) {
      added = await onAddSubjectsByNames(selectedNames);
    }
    setImportPending(null);

    if (added.length > 0) {
      flashStatus(`Imported ${added.length}: ${added.join(", ")}`);
    } else if (pending.persistFolder) {
      flashStatus(
        pending.folderPath
          ? `Folder set to "${pending.folderPath}" (no subjects imported).`
          : `Folder set to vault root (no subjects imported).`
      );
    } else {
      flashStatus("No subjects imported.");
    }
  };

  const save = async () => {
    setSaving(true);
    plugin.settings.geminiApiKey = apiKey.trim();
    plugin.settings.notesFolder = notesFolder.trim() || "Notes";
    plugin.settings.maxSbobinaContextChars = Math.max(1000, parseInt(maxChars, 10) || 15000);
    await plugin.saveData(plugin.settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddSubject = async () => {
    const name = newSubjectName.trim();
    const short = newSubjectShort.trim() || name.substring(0, 3).toUpperCase();
    if (!name) return;
    await onAddSubject(name, short);
    setNewSubjectName("");
    setNewSubjectShort("");
  };

  return (
    <div className="noter-modal-overlay">
      <div className="noter-modal" style={{ maxWidth: "560px", maxHeight: "85vh" }}>

        {/* Header */}
        <div className="noter-modal-header">
          <h2 className="noter-heading">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="noter-btn noter-btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="noter-modal-body" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* API Key */}
          <section>
            <label className="noter-label" style={{ display: "block", marginBottom: "8px" }}>
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="noter-input"
              style={{ fontFamily: "var(--noter-font-mono)" }}
            />
            <p className="noter-help" style={{ marginTop: "6px" }}>
              Your key is stored locally in data.json and never sent anywhere except directly to Google.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", color: "var(--noter-accent)" }}
              >
                Get a key →
              </a>
            </p>
          </section>

          {/* Notes folder */}
          <section>
            <label className="noter-label" style={{ display: "block", marginBottom: "8px" }}>
              Notes folder
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={notesFolder}
                onChange={(e) => setNotesFolder(e.target.value)}
                placeholder="Notes"
                className="noter-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => void handleBrowse()}
                disabled={scanning}
                className="noter-btn"
                title="Browse vault folders and pick which subdirectories to import as subjects"
              >
                Browse…
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => void handleRescan()}
                disabled={scanning}
                className="noter-btn"
                title="Re-scan the current folder and pick which subdirectories to import"
              >
                {scanning ? "Scanning…" : "Rescan folder"}
              </button>
              {scanStatus && (
                <span className="noter-help" style={{ flex: 1, minWidth: 0 }}>
                  {scanStatus}
                </span>
              )}
            </div>
            <p className="noter-help" style={{ marginTop: "8px" }}>
              Use Browse to pick a folder from the vault — you'll then choose which subdirectories become subjects.{" "}
              <code>Audio</code> and <code>Concepts</code> are reserved.
            </p>
          </section>

          {/* Max context chars */}
          <section>
            <label className="noter-label" style={{ display: "block", marginBottom: "8px" }}>
              Max sbobina context characters
            </label>
            <input
              type="number"
              value={maxChars}
              onChange={(e) => setMaxChars(e.target.value)}
              min={1000}
              max={100000}
              step={1000}
              className="noter-input"
              style={{ fontFamily: "var(--noter-font-mono)" }}
            />
            <p className="noter-help" style={{ marginTop: "6px" }}>
              Higher = better continuity, more tokens consumed.
            </p>
          </section>

          {/* Subjects */}
          <section>
            <p className="noter-label" style={{ marginBottom: "8px" }}>
              Subjects ({subjects.length})
            </p>
            <div className="flex flex-col gap-1.5 mb-3">
              {subjects.map((s) => (
                <div key={s.id} className="noter-card">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color ?? "#f59e0b" }}
                    aria-hidden
                  />
                  <span style={{ flex: 1, color: "var(--noter-text)" }}>{s.name}</span>
                  <span
                    style={{
                      fontFamily: "var(--noter-font-mono)",
                      fontSize: "11px",
                      color: "var(--noter-text-dim)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {s.short}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDeleteSubject(s.id)}
                    className="noter-btn noter-btn-ghost noter-btn-icon noter-btn-danger"
                    aria-label={`Delete ${s.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Subject name"
                className="noter-input"
                style={{ flex: 1 }}
              />
              <input
                type="text"
                value={newSubjectShort}
                onChange={(e) => setNewSubjectShort(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABR"
                className="noter-input noter-input-narrow"
              />
              <button
                type="button"
                onClick={() => void handleAddSubject()}
                className="noter-btn"
              >
                Add
              </button>
            </div>
          </section>

          {/* Concepts */}
          {concepts.length > 0 && (
            <section>
              <p className="noter-label" style={{ marginBottom: "8px" }}>
                Concepts ({concepts.length})
              </p>
              <div className="flex flex-col gap-1.5" style={{ maxHeight: "200px", overflowY: "auto" }}>
                {concepts.map((c) => (
                  <div key={c.titolo} className="noter-card">
                    <span style={{ flex: 1, color: "var(--noter-text)" }}>{c.titolo}</span>
                    <button
                      type="button"
                      onClick={() => void onDeleteConcept(c.titolo)}
                      className="noter-btn noter-btn-ghost noter-btn-icon noter-btn-danger"
                      aria-label={`Delete ${c.titolo}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="noter-modal-footer">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="noter-btn noter-btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
          </button>
        </div>
      </div>

      {/* Subject import modal — opened by Browse… or Rescan flow. */}
      {importPending && (
        <SubjectImportModal
          folderPath={importPending.folderPath}
          candidates={importPending.candidates}
          alreadyImported={existingNames}
          onConfirm={(names) => void handleImportConfirm(names)}
          onCancel={() => setImportPending(null)}
        />
      )}
    </div>
  );
}
