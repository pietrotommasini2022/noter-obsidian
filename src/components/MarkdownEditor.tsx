/**
 * MarkdownEditor — CodeMirror-based markdown editor for noter.
 *
 * Adapted from the Next.js version:
 *  - Removed "use client" directive (not needed in Obsidian plugin context)
 *  - Simplified prop API: onImagePaste receives a single File
 *  - controllerRef replaces the onEditorReady callback pattern
 *  - Theme uses Obsidian CSS variables as fallbacks
 */

import React, { useMemo, useRef, type RefObject } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { EditorSelection, RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import {
  DICTIONARY_TERMS,
  DICTIONARY_LINE_PATTERN,
  DICTIONARY_BY_TOKEN,
} from "@/lib/dictionary";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ─── Theme ────────────────────────────────────────────────────────────────────

const noterTheme = createTheme({
  // Obsidian itself can be in dark or light mode — we let the CSS variables
  // resolve the actual colors. CodeMirror's `theme` field below is just a
  // hint for built-in scrollbar styling, so we keep it on "dark" but the
  // real colors come from the user's Obsidian theme.
  theme: "dark",
  settings: {
    background: "var(--noter-bg)",
    foreground: "var(--noter-text)",
    caret: "var(--noter-accent)",
    selection: "var(--noter-hover)",
    selectionMatch: "var(--noter-hover)",
    lineHighlight: "var(--noter-surface)",
    gutterBackground: "var(--noter-bg)",
    gutterForeground: "var(--noter-text-faint)",
    gutterBorder: "transparent",
    fontFamily: "var(--noter-font-mono)",
  },
  styles: [
    { tag: [t.heading1, t.heading2], color: "var(--noter-accent)", fontWeight: "bold" },
    { tag: t.heading3, color: "var(--noter-text)", fontWeight: "600" },
    { tag: [t.heading4, t.heading5, t.heading6], color: "var(--noter-text-dim)" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.link, color: "var(--noter-accent)" },
    { tag: t.url, color: "var(--noter-accent)" },
    { tag: t.monospace, fontFamily: "var(--noter-font-mono)" },
    { tag: t.quote, fontStyle: "italic", color: "var(--noter-text-dim)" },
  ],
});

// ─── Dictionary marker highlight extension ────────────────────────────────────

/** Convert a #rrggbb hex string to "r,g,b" so we can compose rgba() at runtime. */
function hexToRgbTriplet(hex: string): string {
  const m = hex.replace(/^#/, "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

/**
 * Theme is built from DICTIONARY_TERMS so that classes and colors can never
 * drift out of sync with the dictionary again. Background opacity bumped from
 * .15 to .25 and border from .4 to .6 to make the highlight readable on the
 * dark Obsidian background — the previous values were nearly invisible.
 */
const dictionaryTheme = EditorView.theme(
  Object.fromEntries(
    // Deduplicate by cssClass — multiple tokens (imp/exam) can share one class.
    Array.from(
      new Map(DICTIONARY_TERMS.map((term) => [term.cssClass, term])).values()
    ).map((term) => {
      const rgb = hexToRgbTriplet(term.color);
      return [
        `& .${term.cssClass}`,
        {
          backgroundColor: `rgba(${rgb},.25)`,
          border: `1px solid rgba(${rgb},.6)`,
          borderRadius: "2px",
          color: term.color,
          padding: "0 2px",
        },
      ];
    })
  )
);

const gapPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }
    build(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (let n = 1; n <= view.state.doc.lines; n++) {
        const line = view.state.doc.line(n);
        const match = line.text.match(DICTIONARY_LINE_PATTERN);
        if (!match) continue;
        const [, indent = "", token = ""] = match;
        const term = DICTIONARY_BY_TOKEN.get(token);
        if (!term) continue;
        const from = line.from + indent.length;
        builder.add(from, line.to, Decoration.mark({ class: term.cssClass }));
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

const baseExtensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  dictionaryTheme,
  gapPlugin,
  EditorView.lineWrapping,
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface MarkdownEditorController {
  focus: () => void;
  insertText: (text: string) => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImagePaste?: (file: File) => void;
  controllerRef?: RefObject<MarkdownEditorController | null>;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  onImagePaste,
  controllerRef,
}: Props) {
  const viewRef = useRef<EditorView | null>(null);

  const pasteExtension = useMemo(
    () =>
      EditorView.domEventHandlers({
        paste: (event) => {
          if (!onImagePaste) return false;
          const files = Array.from(event.clipboardData?.files ?? []).filter(
            (f) => f.type.startsWith("image/") && f.size <= MAX_IMAGE_BYTES
          );
          if (files.length === 0) return false;
          event.preventDefault();
          files.forEach((f) => onImagePaste(f));
          return true;
        },
      }),
    [onImagePaste]
  );

  // Expose controller via ref
  useMemo(() => {
    if (!controllerRef) return;
    (controllerRef as React.MutableRefObject<MarkdownEditorController>).current = {
      focus: () => viewRef.current?.focus(),
      insertText: (text) => {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: EditorSelection.cursor(from + text.length),
        });
        view.focus();
      },
    };
  }, [controllerRef]);

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={noterTheme}
        extensions={[...baseExtensions, pasteExtension]}
        placeholder={placeholder ?? "Start writing..."}
        onCreateEditor={(view) => { viewRef.current = view; }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          bracketMatching: false,
          closeBrackets: false,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
          searchKeymap: false,
          defaultKeymap: true,
          historyKeymap: true,
        }}
        className="noter-editor flex-1 min-h-0"
        height="100%"
      />
    </div>
  );
}
