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

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ─── Theme ────────────────────────────────────────────────────────────────────

const noterTheme = createTheme({
  theme: "dark",
  settings: {
    background: "var(--noter-bg, #0f0f0d)",
    foreground: "var(--noter-text, #e8e4d8)",
    caret: "var(--noter-accent, #7c6f5a)",
    selection: "var(--noter-border, #2a2a26)",
    selectionMatch: "var(--noter-border, #2a2a26)",
    lineHighlight: "var(--noter-surface, #161614)",
    gutterBackground: "var(--noter-bg, #0f0f0d)",
    gutterForeground: "var(--noter-text-dim, #4a4a44)",
    gutterBorder: "transparent",
    fontFamily: "'JetBrains Mono', monospace",
  },
  styles: [
    { tag: [t.heading1, t.heading2], color: "var(--noter-accent, #7c6f5a)", fontWeight: "bold" },
    { tag: t.heading3, color: "var(--noter-text, #e8e4d8)", fontWeight: "600" },
    { tag: [t.heading4, t.heading5, t.heading6], color: "var(--noter-text-dim, #4a4a44)" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.link, color: "#7c9bb5" },
    { tag: t.url, color: "#7c9bb5" },
    { tag: t.monospace, fontFamily: "'JetBrains Mono', monospace" },
    { tag: t.quote, fontStyle: "italic", color: "var(--noter-text-dim, #4a4a44)" },
  ],
});

// ─── Dictionary marker highlight extension ────────────────────────────────────

const dictionaryTheme = EditorView.theme({
  "& .cm-dict-gap":        { backgroundColor: "rgba(196,135,70,.15)", border: "1px solid rgba(196,135,70,.4)", borderRadius: "2px", color: "#c98746", padding: "0 2px" },
  "& .cm-dict-clarify":    { backgroundColor: "rgba(124,155,181,.15)", border: "1px solid rgba(124,155,181,.4)", borderRadius: "2px", color: "#7c9bb5", padding: "0 2px" },
  "& .cm-dict-important":  { backgroundColor: "rgba(201,112,112,.15)", border: "1px solid rgba(201,112,112,.4)", borderRadius: "2px", color: "#c97070", padding: "0 2px" },
  "& .cm-dict-definition": { backgroundColor: "rgba(109,187,138,.15)", border: "1px solid rgba(109,187,138,.4)", borderRadius: "2px", color: "#6dbb8a", padding: "0 2px" },
  "& .cm-dict-link":       { backgroundColor: "rgba(124,155,181,.15)", border: "1px solid rgba(124,155,181,.4)", borderRadius: "2px", color: "#7c9bb5", padding: "0 2px" },
});

const dictionaryLinePattern = /^(\s*)(def:|link:|gap:|clar:|imp:|exam:|ex:|todo:)/;

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
        const match = line.text.match(dictionaryLinePattern);
        if (!match) continue;
        const [, indent = "", token = ""] = match;
        const from = line.from + indent.length;
        let cls = "cm-dict-gap";
        if (token === "def:")                 cls = "cm-dict-definition";
        else if (token === "link:")           cls = "cm-dict-link";
        else if (token === "clar:")           cls = "cm-dict-clarify";
        else if (token === "imp:" || token === "exam:") cls = "cm-dict-important";
        builder.add(from, line.to, Decoration.mark({ class: cls }));
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
