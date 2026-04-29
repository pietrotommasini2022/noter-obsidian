import React from "react";
import type { NoterPlugin } from "@/types/plugin";

interface Props {
  plugin: NoterPlugin;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function AudioSettingsModal({ onConfirm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex w-full max-w-sm flex-col border border-[var(--noter-border)] bg-[var(--noter-surface)] shadow-2xl p-6 gap-4">
        <h2 className="font-mono text-[13px] uppercase tracking-widest text-[var(--noter-text)]">
          Audio recording
        </h2>
        <p className="text-[13px] leading-relaxed text-[var(--noter-text-dim)]">
          noter will record your lecture audio and send it to Gemini for
          transcription using your API key. Audio chunks are saved locally in
          your vault under <code className="font-mono text-[12px]">Notes/Audio/</code>.
        </p>
        <p className="text-[13px] leading-relaxed text-[var(--noter-text-dim)]">
          Make sure you have permission to record in your location and comply
          with your institution's policies.
        </p>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="noter-btn flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="noter-btn noter-btn-save flex-1"
          >
            Enable recording
          </button>
        </div>
      </div>
    </div>
  );
}
