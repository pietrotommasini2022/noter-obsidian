import React from "react";
import { DICTIONARY_TERMS } from "@/lib/dictionary";

interface Props {
  onClose: () => void;
}

export function DictionaryModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex max-h-[70vh] w-full max-w-md flex-col border border-[var(--noter-border)] bg-[var(--noter-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--noter-border)] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--noter-text-dim)]">
            Vocabulary markers
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] text-[var(--noter-text-dim)] hover:text-[var(--noter-text)]"
          >
            × close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {DICTIONARY_TERMS.map((term) => (
            <div key={term.token} className="border-l-2 border-[var(--noter-border)] pl-3">
              <div className="flex items-center gap-2 mb-1">
                <code className="font-mono text-[12px] text-amber-400">{term.token}</code>
                <span className="text-[12px] text-[var(--noter-text-dim)]">{term.label}</span>
              </div>
              <p className="text-[13px] text-[var(--noter-text)]">{term.behavior}</p>
              <p className="mt-1 font-mono text-[11px] italic text-[var(--noter-text-dim)]">
                {term.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
