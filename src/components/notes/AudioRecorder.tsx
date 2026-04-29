import React from "react";
import type { Subject } from "@/lib/types";
import type { NoterPlugin } from "@/types/plugin";
import type { useTranscripts } from "@/hooks/useTranscripts";

interface Props {
  plugin: NoterPlugin;
  subject: Subject;
  transcriptsHook: ReturnType<typeof useTranscripts>;
  onRequireConsent: () => void;
  log: (msg: string, type?: "info" | "success" | "warn" | "error") => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioRecorder({ plugin, subject, transcriptsHook, onRequireConsent }: Props) {
  const {
    recorderStatus,
    durationSeconds,
    recorderError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndTranscribe,
    cancelRecording,
  } = transcriptsHook;

  const enabled = plugin.settings.audioRecordingEnabled;
  const acknowledged = plugin.settings.audioDisclaimerAcknowledged;

  const handleToggle = async () => {
    if (!enabled || !acknowledged) {
      onRequireConsent();
      return;
    }
    if (recorderStatus === "idle") {
      await startRecording(subject);
    } else if (recorderStatus === "recording") {
      pauseRecording();
    } else if (recorderStatus === "paused") {
      resumeRecording();
    }
  };

  const handleStop = async () => {
    await stopAndTranscribe(subject);
  };

  return (
    <div className="flex items-center gap-2 border-t border-[var(--noter-border)] bg-[var(--noter-surface)] px-3 py-1.5">
      {/* Record / Pause / Resume button */}
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={recorderStatus === "processing"}
        className={`noter-btn font-mono text-[11px] ${
          recorderStatus === "recording"
            ? "text-red-400 border-red-800"
            : recorderStatus === "paused"
            ? "text-amber-400 border-amber-800"
            : ""
        }`}
      >
        {recorderStatus === "idle" && "⏺ Rec"}
        {recorderStatus === "recording" && `⏸ ${formatDuration(durationSeconds)}`}
        {recorderStatus === "paused" && `▶ ${formatDuration(durationSeconds)}`}
        {recorderStatus === "processing" && "⏳ Transcribing..."}
      </button>

      {/* Stop button */}
      {(recorderStatus === "recording" || recorderStatus === "paused") && (
        <>
          <button
            type="button"
            onClick={() => void handleStop()}
            className="noter-btn font-mono text-[11px] text-green-400 border-green-800"
          >
            ⏹ Stop + Transcribe
          </button>
          <button
            type="button"
            onClick={cancelRecording}
            className="noter-btn font-mono text-[11px] text-[var(--noter-text-dim)]"
          >
            × Cancel
          </button>
        </>
      )}

      {recorderError && (
        <span className="font-mono text-[10px] text-red-400">{recorderError}</span>
      )}
    </div>
  );
}
