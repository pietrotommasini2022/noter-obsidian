import React from "react";
import type { NoterPlugin } from "@/types/plugin";

interface Props {
  plugin: NoterPlugin;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function AudioSettingsModal({ onConfirm, onClose }: Props) {
  return (
    <div className="noter-modal-overlay">
      <div className="noter-modal" style={{ maxWidth: "440px" }}>

        <div className="noter-modal-header">
          <h2 className="noter-heading">Audio recording</h2>
          <button
            type="button"
            onClick={onClose}
            className="noter-btn noter-btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          className="noter-modal-body"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <p style={{ fontSize: "14px", lineHeight: 1.55, color: "var(--noter-text)", margin: 0 }}>
            noter will record your lecture audio and send it to Gemini for
            transcription using your API key. Audio chunks are saved locally
            in your vault under <code>Notes/Audio/</code>.
          </p>
          <p
            className="noter-help"
            style={{ margin: 0 }}
          >
            Make sure you have permission to record in your location and
            comply with your institution's policies.
          </p>
        </div>

        <div className="noter-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="noter-btn"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            className="noter-btn noter-btn-primary"
            style={{ flex: 1, justifyContent: "center" }}
          >
            Enable recording
          </button>
        </div>
      </div>
    </div>
  );
}
