import React from "react";
import { DICTIONARY_TERMS } from "@/lib/dictionary";

interface Props {
  onClose: () => void;
}

export function DictionaryModal({ onClose }: Props) {
  return (
    <div className="noter-modal-overlay">
      <div className="noter-modal" style={{ maxWidth: "560px" }}>

        <div className="noter-modal-header">
          <h2 className="noter-heading">Vocabulary markers</h2>
          <button
            type="button"
            onClick={onClose}
            className="noter-btn noter-btn-ghost"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="noter-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {DICTIONARY_TERMS.map((term) => (
            <div
              key={term.token + term.label}
              style={{
                paddingLeft: "12px",
                borderLeft: `3px solid ${term.color}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
                <code
                  style={{
                    fontFamily: "var(--noter-font-mono)",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: term.color,
                    background: "transparent",
                    padding: 0,
                  }}
                >
                  {term.token}
                </code>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--noter-text)",
                  }}
                >
                  {term.label}
                </span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: "var(--noter-text)",
                  margin: 0,
                }}
              >
                {term.behavior}
              </p>
              <p
                style={{
                  fontFamily: "var(--noter-font-mono)",
                  fontSize: "12px",
                  fontStyle: "italic",
                  color: "var(--noter-text-dim)",
                  marginTop: "6px",
                  marginBottom: 0,
                }}
              >
                {term.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
