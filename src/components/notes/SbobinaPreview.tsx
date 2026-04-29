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
      <div className="flex flex-1 items-center justify-center text-[var(--noter-text-dim)] text-[14px] italic">
        No subject selected
      </div>
    );
  }

  const paddingClass = compact ? "p-3" : "p-6";

  if (view === "edit") {
    return (
      <textarea
        value={editContent}
        onChange={(e) => {
          setEditContent(e.target.value);
          onChange(e.target.value);
        }}
        className={`h-full w-full resize-none bg-[var(--noter-bg)] ${paddingClass} font-mono text-[13px] leading-relaxed text-[var(--noter-text)] outline-none`}
        placeholder={`# ${subject.name}\n\nNo sbobina yet. Press Deploy to generate the first lesson block.`}
      />
    );
  }

  // Preview mode
  const processedContent = preprocessSbobina(content);

  return (
    <div
      className={`h-full w-full overflow-y-auto bg-[var(--noter-bg)] ${paddingClass}`}
    >
      {content.trim() ? (
        <div className="prose prose-invert max-w-none prose-sm [&_.wikilink]:text-purple-400 [&_.wikilink]:underline [&_mark]:bg-yellow-800/40 [&_mark]:text-yellow-200 [&_mark]:px-0.5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt ?? ""}
                  className="max-w-full rounded border border-[var(--noter-border)]"
                />
              ),
            }}
          >
            {processedContent}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-[14px] italic text-[var(--noter-text-dim)]">
          No sbobina yet. Press Deploy to generate the first lesson block.
        </p>
      )}
    </div>
  );
}
