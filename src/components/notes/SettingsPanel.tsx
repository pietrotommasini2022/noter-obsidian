/**
 * SettingsPanel — plugin settings UI (BYOK API key, subjects, folder, etc.)
 * Replaces the original SettingsPanel which had Drive/Vault/signOut controls.
 */

import React, { useState } from "react";
import type { NoterPlugin } from "@/types/plugin";
import type { Subject, Concept } from "@/lib/types";

interface Props {
  plugin: NoterPlugin;
  subjects: Subject[];
  concepts: Concept[];
  onAddSubject: (name: string, short: string) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  onDeleteConcept: (titolo: string) => Promise<void>;
  onClose: () => void;
}

export function SettingsPanel({
  plugin,
  subjects,
  concepts,
  onAddSubject,
  onDeleteSubject,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[80vh] w-full max-w-lg flex-col border border-[var(--noter-border)] bg-[var(--noter-surface)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--noter-border)] px-5 py-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--noter-text-dim)]">
            Settings
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
          >
            × close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* API Key */}
          <section>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)] mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full border border-[var(--noter-border)] bg-[var(--noter-bg)] px-3 py-2 font-mono text-[13px] text-[var(--noter-text)] outline-none focus:border-[var(--noter-accent)]"
            />
            <p className="mt-1 text-[12px] text-[var(--noter-text-dim)]">
              Your key is stored locally in data.json and never sent anywhere except directly to Google.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--noter-text)]"
              >
                Get a key →
              </a>
            </p>
          </section>

          {/* Notes folder */}
          <section>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)] mb-2">
              Notes folder (relative to vault root)
            </label>
            <input
              type="text"
              value={notesFolder}
              onChange={(e) => setNotesFolder(e.target.value)}
              placeholder="Notes"
              className="w-full border border-[var(--noter-border)] bg-[var(--noter-bg)] px-3 py-2 font-mono text-[13px] text-[var(--noter-text)] outline-none focus:border-[var(--noter-accent)]"
            />
          </section>

          {/* Max context chars */}
          <section>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)] mb-2">
              Max sbobina context characters
            </label>
            <input
              type="number"
              value={maxChars}
              onChange={(e) => setMaxChars(e.target.value)}
              min={1000}
              max={100000}
              step={1000}
              className="w-full border border-[var(--noter-border)] bg-[var(--noter-bg)] px-3 py-2 font-mono text-[13px] text-[var(--noter-text)] outline-none focus:border-[var(--noter-accent)]"
            />
            <p className="mt-1 text-[12px] text-[var(--noter-text-dim)]">
              Higher = better continuity, more tokens consumed.
            </p>
          </section>

          {/* Subjects */}
          <section>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)] mb-2">
              Subjects ({subjects.length})
            </p>
            <div className="space-y-1 mb-3">
              {subjects.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border border-[var(--noter-border)] px-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color ?? "#f59e0b" }}
                    />
                    <span className="text-[13px] text-[var(--noter-text)]">{s.name}</span>
                    <span className="font-mono text-[11px] text-[var(--noter-text-dim)]">
                      [{s.short}]
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteSubject(s.id)}
                    className="font-mono text-[11px] text-[var(--noter-text-dim)] hover:text-red-400 transition-colors"
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
                className="flex-1 border border-[var(--noter-border)] bg-[var(--noter-bg)] px-3 py-1.5 text-[13px] text-[var(--noter-text)] outline-none focus:border-[var(--noter-accent)]"
              />
              <input
                type="text"
                value={newSubjectShort}
                onChange={(e) => setNewSubjectShort(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABR"
                className="w-16 border border-[var(--noter-border)] bg-[var(--noter-bg)] px-2 py-1.5 font-mono text-[13px] text-[var(--noter-text)] outline-none focus:border-[var(--noter-accent)]"
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
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)] mb-2">
                Concepts ({concepts.length})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {concepts.map((c) => (
                  <div
                    key={c.titolo}
                    className="flex items-center justify-between border border-[var(--noter-border)] px-3 py-1.5"
                  >
                    <span className="text-[13px] text-[var(--noter-text)]">{c.titolo}</span>
                    <button
                      type="button"
                      onClick={() => void onDeleteConcept(c.titolo)}
                      className="font-mono text-[11px] text-[var(--noter-text-dim)] hover:text-red-400 transition-colors"
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
        <div className="border-t border-[var(--noter-border)] px-5 py-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="noter-btn noter-btn-save w-full"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
