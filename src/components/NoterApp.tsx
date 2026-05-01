/**
 * NoterApp — root React component mounted inside the Obsidian ItemView.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { NoterPlugin } from "@/types/plugin";
import { useSubjects } from "@/hooks/useSubjects";
import { useConcepts } from "@/hooks/useConcepts";
import { useSbobine } from "@/hooks/useSbobine";
import { useDeploy } from "@/hooks/useDeploy";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useTranscripts } from "@/hooks/useTranscripts";
import { useVaultImages } from "@/hooks/useVaultImages";
import { useTerminal } from "@/hooks/useTerminal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SubjectTabs } from "@/components/notes/SubjectTabs";
import { NotesWorkspace } from "@/components/notes/NotesWorkspace";
import { SbobinaPreview } from "@/components/notes/SbobinaPreview";
import { TerminalDrawer } from "@/components/notes/TerminalDrawer";
import { LessonDiffPreview } from "@/components/notes/LessonDiffPreview";
import { DictionaryModal } from "@/components/notes/DictionaryModal";
import { AudioRecorder } from "@/components/notes/AudioRecorder";
import { AudioSettingsModal } from "@/components/notes/AudioSettingsModal";
import { SbobinaHistoryModal } from "@/components/notes/SbobinaHistoryModal";
import { SettingsPanel } from "@/components/notes/SettingsPanel";
import { WorkspaceToolbar } from "@/components/notes/WorkspaceToolbar";
import type { MarkdownEditorController } from "@/components/MarkdownEditor";
import { countGapMarkers } from "@/lib/format";
import { getSubjectColor } from "@/lib/colors";
import type { Subject } from "@/lib/types";

interface Props {
  plugin: NoterPlugin;
}

export function NoterApp({ plugin }: Props) {
  // ─── UI state ────────────────────────────────────────────────────────────────
  const [workspaceMode, setWorkspaceMode] = useState<"notes" | "sbobina">(
    () => plugin.settings.draft.workspaceMode
  );
  const [sbobinaView, setSbobinaView] = useState<"edit" | "preview">("edit");
  const [showDictionary, setShowDictionary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    // Restore drafts from data.json
    const drafts = plugin.settings.draft.draftsBySubject;
    return Object.fromEntries(
      Object.entries(drafts).map(([id, d]) => [id, d.notes])
    );
  });
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    () => plugin.settings.draft.activeSubjectId
  );

  const editorControllerRef = useRef<MarkdownEditorController | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ─── Hooks ───────────────────────────────────────────────────────────────────
  const { processingLog, log, clearLog } = useTerminal();
  const subjectsHook = useSubjects(plugin);
  const conceptsHook = useConcepts(plugin);
  const sbobinaHook = useSbobine(plugin, log);
  const draftHook = useDraftPersistence(plugin);
  const imageHook = useVaultImages(plugin, log);
  const transcriptsHook = useTranscripts(plugin, log);

  const { subjects } = subjectsHook;
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? null;

  // Load sbobina for active subject when it changes
  useEffect(() => {
    if (activeSubject) {
      void sbobinaHook.loadSbobina(activeSubject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the selected subject id changes; the hook object identity is not relevant here
  }, [activeSubject?.id]);

  // ─── Deploy hook ─────────────────────────────────────────────────────────────
  const activeTranscript = activeSubject
    ? transcriptsHook.transcriptsBySubject[activeSubject.id] ?? null
    : null;

  const deployHook = useDeploy({
    plugin,
    activeSubject,
    notes,
    transcript: activeTranscript?.text ?? null,
    transcriptSegments: activeTranscript?.segments ?? null,
    log,
    sbobinaHook,
    conceptsHook,
    onNotesCleared: (subjectId) => {
      setNotes((prev) => ({ ...prev, [subjectId]: "" }));
      void draftHook.clearNotesDraft(subjectId);
    },
  });

  // ─── Terminal auto-open/close ─────────────────────────────────────────────────

  // Wrap deploy/save/cancel to drive terminal visibility automatically
  const handleDeploy = useCallback(async () => {
    setShowTerminal(true);
    await deployHook.handleDeploy();
  }, [deployHook]);

  const handleSave = useCallback(async () => {
    await deployHook.handleSave();
    setShowTerminal(false);
  }, [deployHook]);

  const handleCancel = useCallback(() => {
    deployHook.handleCancel();
    setShowTerminal(false);
  }, [deployHook]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────
  useKeyboardShortcuts({
    phase: deployHook.phase,
    subjects,
    enabled: true,
    onDeploy: () => void handleDeploy(),
    onSave: () => void handleSave(),
    onCancel: handleCancel,
    onSwitchSubject: (s) => void switchSubject(s),
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const switchSubject = useCallback(
    async (subject: Subject) => {
      setActiveSubjectId(subject.id);
      await draftHook.setActiveSubject(subject.id);
      if (workspaceMode === "sbobina") {
        await sbobinaHook.loadSbobina(subject);
      }
      deployHook.handleReset();
    },
    [draftHook, sbobinaHook, deployHook, workspaceMode]
  );

  const handleNotesChange = useCallback(
    (subjectId: string, value: string) => {
      setNotes((prev) => ({ ...prev, [subjectId]: value }));
      draftHook.setNotesDraft(subjectId, value);
    },
    [draftHook]
  );

  const handleImagePaste = useCallback(
    async (file: File) => {
      if (!activeSubject) return;
      const block = await imageHook.saveImage(file, activeSubject);
      if (block) {
        editorControllerRef.current?.insertText(block);
      }
    },
    [activeSubject, imageHook]
  );

  const handleWorkspaceModeChange = useCallback(
    async (mode: "notes" | "sbobina") => {
      setWorkspaceMode(mode);
      await draftHook.setWorkspaceMode(mode);
      if (mode === "sbobina" && activeSubject) {
        await sbobinaHook.loadSbobina(activeSubject);
      }
    },
    [draftHook, sbobinaHook, activeSubject]
  );

  const handleManualSbobinaSave = useCallback(
    async (content: string) => {
      if (!activeSubject) return;
      await sbobinaHook.saveSbobina(activeSubject, content, "manual");
    },
    [activeSubject, sbobinaHook]
  );

  const handleDownload = useCallback(() => {
    if (!activeSubject) return;
    const content = sbobinaHook.sbobine[activeSubject.id] ?? "";
    const blob = new Blob([content], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${activeSubject.name}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [activeSubject, sbobinaHook]);

  // ─── Derived values ──────────────────────────────────────────────────────────

  const currentNotes = activeSubject ? (notes[activeSubject.id] ?? "") : "";
  const currentSbobina = activeSubject
    ? (sbobinaHook.sbobine[activeSubject.id] ?? "")
    : "";
  const gapCount = countGapMarkers(currentNotes);
  const activeColor = getSubjectColor(activeSubject, subjects.indexOf(activeSubject ?? ({} as Subject)));

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="noter-plugin-container flex flex-col h-full overflow-hidden">

      {/* Subject tabs */}
      <SubjectTabs
        subjects={subjects}
        activeSubjectId={activeSubjectId}
        onSwitch={(s) => void switchSubject(s)}
        onAddSubject={(name, short) => {
          void (async () => {
            const s = await subjectsHook.addSubject(name, short);
            await switchSubject(s);
          })();
        }}
        onSettings={() => setShowSettings(true)}
      />

      {/* Workspace toolbar */}
      <WorkspaceToolbar
        workspaceMode={workspaceMode}
        sbobinaView={sbobinaView}
        phase={deployHook.phase}
        gapCount={gapCount}
        isProcessing={deployHook.isProcessing}
        onModeChange={(m) => void handleWorkspaceModeChange(m)}
        onSbobinaViewChange={setSbobinaView}
        onDeploy={() => void handleDeploy()}
        onSave={() => void handleSave()}
        onCancel={handleCancel}
        onToggleDictionary={() => setShowDictionary((v) => !v)}
        onToggleTerminal={() => setShowTerminal((v) => !v)}
        onDownload={handleDownload}
        onHistory={() => setShowHistory(true)}
        activeColor={activeColor}
      />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Editor / Sbobina panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {workspaceMode === "notes" ? (
            <NotesWorkspace
              subject={activeSubject}
              notes={currentNotes}
              onChange={(v) =>
                activeSubject && handleNotesChange(activeSubject.id, v)
              }
              onImagePaste={(file) => void handleImagePaste(file)}
              editorControllerRef={editorControllerRef}
            >
              {/* Audio recorder lives inside notes workspace */}
              {activeSubject && (
                <AudioRecorder
                  plugin={plugin}
                  subject={activeSubject}
                  transcriptsHook={transcriptsHook}
                  onRequireConsent={() => setShowAudioSettings(true)}
                  log={log}
                />
              )}
            </NotesWorkspace>
          ) : (
            <SbobinaPreview
              subject={activeSubject}
              content={currentSbobina}
              view={sbobinaView}
              concepts={conceptsHook.concepts}
              onChange={(content) => void handleManualSbobinaSave(content)}
            />
          )}
        </div>

        {/* Diff preview (visible when deploy result is pending) */}
        {deployHook.pendingResult && activeSubject && (
          <LessonDiffPreview
            subject={activeSubject}
            existingSbobina={currentSbobina}
            pendingBlock={deployHook.pendingResult.lessonBlock}
            proposedConcepts={deployHook.pendingResult.nuovi_concetti}
            onSave={() => void handleSave()}
            onCancel={handleCancel}
            onRegenerateRequest={() => void handleDeploy()}
            isRegenerating={deployHook.isProcessing}
          />
        )}

        {/* Terminal drawer */}
        {showTerminal && (
          <TerminalDrawer
            log={processingLog}
            onClose={() => setShowTerminal(false)}
            onClear={clearLog}
          />
        )}
      </div>

      {/* ── Modals ── */}

      {showDictionary && (
        <DictionaryModal onClose={() => setShowDictionary(false)} />
      )}

      {showHistory && activeSubject && (
        <SbobinaHistoryModal
          subject={activeSubject}
          history={sbobinaHook.getHistory(activeSubject.id)}
          rawNotesHistory={sbobinaHook.getRawNotesHistory(activeSubject.id)}
          onRestore={(entry) => {
            void (async () => {
              await sbobinaHook.restoreFromHistory(activeSubject, entry);
              setShowHistory(false);
            })();
          }}
          onOpenRawNotesFile={(path) => sbobinaHook.openRawNotesFile(path)}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showAudioSettings && (
        <AudioSettingsModal
          plugin={plugin}
          onClose={() => setShowAudioSettings(false)}
          onConfirm={() => {
            void (async () => {
              plugin.settings.audioRecordingEnabled = true;
              plugin.settings.audioDisclaimerAcknowledged = true;
              await plugin.saveData(plugin.settings);
              setShowAudioSettings(false);
            })();
          }}
        />
      )}

      {showSettings && (
        <SettingsPanel
          plugin={plugin}
          subjects={subjects}
          concepts={conceptsHook.concepts}
          onAddSubject={(name, short) => {
            void subjectsHook.addSubject(name, short);
          }}
          onDeleteSubject={subjectsHook.deleteSubject}
          onScanFolderForCandidates={subjectsHook.scanFolderForCandidates}
          onAddSubjectsByNames={subjectsHook.addSubjectsByNames}
          onDeleteConcept={conceptsHook.deleteConcept}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Hidden file input for image upload via button */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImagePaste(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
