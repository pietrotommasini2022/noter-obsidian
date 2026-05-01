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

export function AudioRecorder({
  plugin,
  subject,
  transcriptsHook,
  onRequireConsent,
}: Props) {
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
    <div
      className="flex items-center gap-2 shrink-0"
      style={{
        borderTop: "1px solid var(--noter-border)",
        background: "var(--noter-surface)",
        padding: "8px 12px",
      }}
    >
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={recorderStatus === "processing"}
        className={`noter-btn ${
          recorderStatus === "recording"
            ? "noter-btn-danger"
            : recorderStatus === "paused"
            ? "noter-pill-warn"
            : ""
        }`}
        style={
          recorderStatus === "paused"
            ? { borderColor: "#d8a059", color: "#d8a059" }
            : undefined
        }
      >
        {recorderStatus === "idle" && "⏺ Record"}
        {recorderStatus === "recording" && `⏸ ${formatDuration(durationSeconds)}`}
        {recorderStatus === "paused" && `▶ ${formatDuration(durationSeconds)}`}
        {recorderStatus === "processing" && "⏳ Transcribing…"}
      </button>

      {(recorderStatus === "recording" || recorderStatus === "paused") && (
        <>
          <button
            type="button"
            onClick={() => void handleStop()}
            className="noter-btn noter-btn-save"
          >
            ⏹ Stop & transcribe
          </button>
          <button
            type="button"
            onClick={cancelRecording}
            className="noter-btn noter-btn-ghost"
          >
            Cancel
          </button>
        </>
      )}

      {recorderError && (
        <span
          className="noter-help"
          style={{ color: "#d97a7a", marginLeft: "auto" }}
        >
          {recorderError}
        </span>
      )}
    </div>
  );
}
