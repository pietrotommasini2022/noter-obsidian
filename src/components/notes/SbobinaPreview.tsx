/**
 * SbobinaPreview — renders the sbobina in preview or raw-edit mode.
 * Replaces the original which loaded images from Google Drive.
 * Images are now embedded directly via Obsidian vault paths.
 */

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Subject, Concept } from "@/lib/types";
import { preprocessSbobina } from "@/lib/format";

interface Props {
  subject: Subject | null;
  content: string;
  view: "edit" | "preview";
  concepts: Concept[];
  onChange: (content: string) => void;
  /** When true, renders in a compact layout (used inside LessonDiffPreview). */
  compact?: boolean;
}

export function SbobinaPreview({
  subject,
  content,
  view,
  onChange,
  compact = false,
}: Props) {
  const [editContent, setEditContent] = useState(content);

  // Sync external content changes into edit state
  React.useEffect(() => {
    setEditContent(content);
  }, [content]);

  if (!subject) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{
          color: "var(--noter-text-dim)",
          fontSize: "14px",
          fontStyle: "italic",
        }}
      >
        No subject selected
      </div>
    );
  }

  const padding = compact ? "16px" : "28px 32px";

  if (view === "edit") {
    return (
      <textarea
        value={editContent}
        onChange={(e) => {
          setEditContent(e.target.value);
          onChange(e.target.value);
        }}
        className="h-full w-full noter-textarea"
        style={{
          resize: "none",
          padding,
          fontFamily: "var(--noter-font-mono)",
          fontSize: "14px",
          lineHeight: 1.65,
          background: "var(--noter-bg)",
          border: "none",
          borderRadius: 0,
        }}
        placeholder={`# ${subject.name}\n\nNo sbobina yet. Press Deploy to generate the first lesson block.`}
      />
    );
  }

  // Preview mode
  const processedContent = preprocessSbobina(content);

  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: "var(--noter-bg)", padding }}
    >
      {content.trim() ? (
        <div className="noter-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt ?? ""}
                  style={{
                    maxWidth: "100%",
                    borderRadius: "6px",
                    border: "1px solid var(--noter-border)",
                  }}
                />
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      ) : (
        <p
          style={{
            color: "var(--noter-text-dim)",
            fontStyle: "italic",
            fontSize: "14px",
          }}
        >
          No sbobina yet. Press Deploy to generate the first lesson block.
        </p>
      )}
    </div>
  );
}
