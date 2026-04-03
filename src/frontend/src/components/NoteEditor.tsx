import { TagEditor } from "@/components/TagEditor";
import { WikiLinkInput } from "@/components/WikiLinkInput";
import {
  useCreateNote,
  useSetNoteLinks,
  useUpdateNote,
} from "@/hooks/useBackend";
import { useStore } from "@/store/useStore";
import type { Note } from "@/types";
import { Calendar, Check, Clock, Download, Edit2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { toast } from "sonner";

// ── Wikilink helpers ──────────────────────────────────────────────────────────

function extractWikiLinks(html: string): string[] {
  const found: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m = re.exec(html);
  while (m !== null) {
    found.push(m[1].trim());
    m = re.exec(html);
  }
  return found;
}

function resolveToIds(titles: string[], notes: Note[]): string[] {
  return titles
    .map((t) => notes.find((n) => n.title === t)?.id)
    .filter((id): id is string => !!id);
}

// ── Quill toolbar config ──────────────────────────────────────────────────────

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "blockquote",
  "code-block",
  "link",
];

// ── Word count ────────────────────────────────────────────────────────────────

function wordCount(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

// ── Export helpers ────────────────────────────────────────────────────────────

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "_$1_")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── View mode renderer ────────────────────────────────────────────────────────

interface NoteViewProps {
  content: string;
  allNotes: Note[];
  onNavigate: (noteId: string) => void;
}

function NoteView({ content, allNotes, onNavigate }: NoteViewProps) {
  const processedHtml = useMemo(() => {
    return content.replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => {
      const found = allNotes.find(
        (n) => n.title.toLowerCase() === title.trim().toLowerCase(),
      );
      if (found) {
        return `<span class="wikilink-chip" data-note-id="${found.id}" tabindex="0" role="link" aria-label="Open note: ${title.trim()}">${title.trim()}</span>`;
      }
      return `<span class="wikilink-chip wikilink-missing" title="Note not found">${title.trim()}</span>`;
    });
  }, [content, allNotes]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as Element).closest(
        ".wikilink-chip[data-note-id]",
      );
      if (target) {
        const noteId = target.getAttribute("data-note-id");
        if (noteId) onNavigate(noteId);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as Element;
      if (
        (e.key === "Enter" || e.key === " ") &&
        target.classList.contains("wikilink-chip")
      ) {
        const noteId = target.getAttribute("data-note-id");
        if (noteId) onNavigate(noteId);
      }
    }

    container.addEventListener("click", handleClick);
    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [onNavigate]);

  if (!content || content === "<p><br></p>" || content.trim() === "") {
    return (
      <p className="text-muted-foreground/40 text-sm italic font-body">
        No content yet. Click Edit to start writing.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="note-view-content ql-editor"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional Quill HTML rendering
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NoteEditor() {
  const activeNoteId = useStore((s) => s.activeNoteId);
  const notes = useStore((s) => s.notes);
  const isEditMode = useStore((s) => s.isEditMode);
  const setIsEditMode = useStore((s) => s.setIsEditMode);
  const setActiveNoteId = useStore((s) => s.setActiveNoteId);
  const replaceNote = useStore((s) => s.replaceNote);

  const note = notes.find((n) => n.id === activeNoteId) ?? null;

  const { mutateAsync: setNoteLinksRemote } = useSetNoteLinks();
  const { mutateAsync: updateNoteRemote, isPending: isSaving } =
    useUpdateNote();
  const { mutateAsync: createNoteRemote } = useCreateNote();

  const titleRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [savedState, setSavedState] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [wikilinkQuery, setWikilinkQuery] = useState<string | null>(null);
  const [wikilinkPos, setWikilinkPos] = useState({ top: 0, left: 0 });

  const noteTitle = note?.title ?? "";
  const noteContent2 = note?.content ?? "";
  const noteTags = note?.tags ?? [];
  useEffect(() => {
    if (note && isEditMode) {
      setDraftTitle(noteTitle);
      setDraftContent(noteContent2);
      setDraftTags(noteTags);
      setSavedState({ title: noteTitle, content: noteContent2 });
    }
  }, [note, isEditMode, noteTitle, noteContent2, noteTags]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally track note identity
  useEffect(() => {
    setWikilinkQuery(null);
    setJustSaved(false);
  }, [note?.id]);

  useEffect(() => {
    if (isEditMode && draftTitle === "Untitled" && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditMode, draftTitle]);

  useEffect(() => {
    function onInsertLink() {
      if (!isEditMode) return;
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      const range = editor.getSelection(true);
      editor.insertText(range.index, "[[]]");
      editor.setSelection(range.index + 2, 0);
    }
    window.addEventListener("kb:insert-link", onInsertLink);
    return () => window.removeEventListener("kb:insert-link", onInsertLink);
  }, [isEditMode]);

  useEffect(() => {
    function onSave() {
      if (isEditMode) handleSave();
    }
    window.addEventListener("kb:save-note", onSave);
    return () => window.removeEventListener("kb:save-note", onSave);
  });

  const handleContentChange = useCallback((html: string) => {
    setDraftContent(html);

    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const text = editor.getText(0, sel.index);
    const openBracket = text.lastIndexOf("[[");
    if (openBracket !== -1 && openBracket >= text.length - 80) {
      const afterOpen = text.slice(openBracket + 2);
      if (!afterOpen.includes("]]")) {
        const bounds = editor.getBounds(sel.index);
        if (bounds) {
          setWikilinkPos({ top: bounds.bottom + 4, left: bounds.left });
        }
        setWikilinkQuery(afterOpen);
        return;
      }
    }
    setWikilinkQuery(null);
  }, []);

  const handleWikilinkSelect = useCallback((title: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const sel = editor.getSelection();
    if (!sel) return;
    const text = editor.getText(0, sel.index);
    const openBracket = text.lastIndexOf("[[");
    if (openBracket === -1) return;
    const deleteLen = sel.index - openBracket;
    editor.deleteText(openBracket, deleteLen);
    editor.insertText(openBracket, `[[${title}]]`);
    editor.setSelection(openBracket + title.length + 4, 0);
    setWikilinkQuery(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!note || isSaving) return;
    try {
      const isLocalNote = note.id.startsWith("local-");

      if (isLocalNote) {
        // Optimistic note: create on backend, then replace temp note
        const created = await createNoteRemote({
          title: draftTitle || "Untitled",
          content: draftContent,
          folderId: note.folderId,
          tags: draftTags,
        });
        replaceNote(note.id, created);

        const titles = extractWikiLinks(draftContent);
        const ids = resolveToIds(titles, notes);
        if (ids.length > 0) {
          await setNoteLinksRemote({ fromNoteId: created.id, toNoteIds: ids });
        }
      } else {
        // Update existing note — onSuccess in useUpdateNote updates the store
        const updated = await updateNoteRemote({
          id: note.id,
          title: draftTitle || "Untitled",
          content: draftContent,
          folderId: note.folderId,
          tags: draftTags,
        });

        const titles = extractWikiLinks(draftContent);
        const ids = resolveToIds(titles, notes);
        await setNoteLinksRemote({ fromNoteId: updated.id, toNoteIds: ids });
      }

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      setIsEditMode(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    }
  }, [
    note,
    isSaving,
    draftTitle,
    draftContent,
    draftTags,
    notes,
    createNoteRemote,
    updateNoteRemote,
    setNoteLinksRemote,
    replaceNote,
    setIsEditMode,
  ]);

  const handleEnterEdit = useCallback(() => {
    if (!note) return;
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftTags(note.tags);
    setSavedState({ title: note.title, content: note.content });
    setIsEditMode(true);
  }, [note, setIsEditMode]);

  const handleExportMd = useCallback(() => {
    if (!note) return;
    const md = `# ${note.title}\n\n${htmlToMarkdown(note.content)}`;
    downloadFile(md, `${note.title}.md`, "text/markdown");
  }, [note]);

  const handleExportJson = useCallback(() => {
    if (!note) return;
    downloadFile(
      JSON.stringify(
        {
          ...note,
          createdAt: note.createdAt.toString(),
          updatedAt: note.updatedAt.toString(),
        },
        null,
        2,
      ),
      `${note.title}.json`,
      "application/json",
    );
  }, [note]);

  const isDirty = useMemo(() => {
    if (!savedState) return false;
    return (
      draftTitle !== savedState.title || draftContent !== savedState.content
    );
  }, [draftTitle, draftContent, savedState]);

  const noteContent = note?.content ?? "";
  const words = useMemo(() => wordCount(noteContent), [noteContent]);

  // ── Empty state ──────────────────────────────────────────────────────────

  if (!note) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-16 bg-background"
        data-ocid="editor-empty-state"
      >
        <h2 className="text-2xl font-display font-semibold text-foreground tracking-[-0.02em] leading-snug">
          No note selected
        </h2>
        <p className="text-[13px] text-muted-foreground max-w-[260px] leading-relaxed">
          Select a note or press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">
            ⌘N
          </kbd>{" "}
          to create a new one.
        </p>
      </div>
    );
  }

  const createdDate = new Date(
    Number(note.createdAt) / 1_000_000,
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const updatedDate = new Date(
    Number(note.updatedAt) / 1_000_000,
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="note-editor-root flex flex-col flex-1 min-h-0 bg-background"
      data-ocid="note-editor"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border shrink-0">
        {/* Left: mode indicator / unsaved badge */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditMode ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-body">
              <Edit2 className="size-2.5" />
              Editing
            </span>
          ) : justSaved ? (
            <span
              className="flex items-center gap-1.5 text-[11px] text-primary font-body"
              data-ocid="saved-indicator"
            >
              <Check className="size-2.5" />
              Saved
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/30 font-body">
              Viewing
            </span>
          )}
          {isEditMode && isDirty && (
            <span
              className="text-[11px] text-muted-foreground/50 font-body"
              data-ocid="unsaved-indicator"
            >
              · Unsaved
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1">
          {/* Export buttons */}
          <button
            type="button"
            onClick={handleExportMd}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-muted-foreground/50 hover:text-foreground transition-fast rounded font-mono"
            aria-label="Export as Markdown"
            data-ocid="export-md-btn"
            title="Export as Markdown"
          >
            <Download size={11} />
            .md
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-muted-foreground/50 hover:text-foreground transition-fast rounded font-mono"
            aria-label="Export as JSON"
            data-ocid="export-json-btn"
            title="Export as JSON"
          >
            <Download size={11} />
            .json
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Edit / Save buttons */}
          {isEditMode ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium text-primary hover:bg-primary/8 disabled:opacity-40 transition-fast"
              aria-label="Save note"
              data-ocid="save-btn"
              title="Save (⌘S)"
            >
              <Save size={12} />
              {isSaving ? "Saving…" : "Save"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnterEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-fast"
              aria-label="Edit note"
              data-ocid="edit-btn"
              title="Edit note"
            >
              <Edit2 size={12} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[680px] px-12 pt-10 pb-16">
          {/* Title */}
          {isEditMode ? (
            <input
              ref={titleRef}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  quillRef.current?.focus();
                }
              }}
              placeholder="Untitled"
              className="w-full bg-transparent text-[28px] font-display font-semibold text-foreground placeholder:text-muted-foreground/25 border-0 outline-none focus:outline-none mb-2 resize-none leading-tight tracking-[-0.02em]"
              data-ocid="note-title-input"
              aria-label="Note title"
            />
          ) : (
            <h1
              className="text-[28px] font-display font-semibold text-foreground mb-2 leading-tight break-words tracking-[-0.02em]"
              data-ocid="note-title-view"
            >
              {note.title || "Untitled"}
            </h1>
          )}

          {/* Editor / View */}
          <div
            className={`mode-transition ${isEditMode ? "mode-edit" : "mode-view"}`}
          >
            {isEditMode ? (
              <div className="relative quill-themed">
                <ReactQuill
                  ref={quillRef}
                  value={draftContent}
                  onChange={handleContentChange}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  theme="snow"
                  placeholder="Start writing…  Use [[ to link to another note."
                />

                {wikilinkQuery !== null && (
                  <WikiLinkInput
                    query={wikilinkQuery}
                    position={wikilinkPos}
                    onSelect={handleWikilinkSelect}
                    onClose={() => setWikilinkQuery(null)}
                  />
                )}
              </div>
            ) : (
              <NoteView
                content={note.content}
                allNotes={notes}
                onNavigate={setActiveNoteId}
              />
            )}
          </div>

          {/* Metadata footer */}
          <div className="mt-12 pt-6 border-t border-border space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/60">
              <span className="flex items-center gap-1.5">
                <Calendar size={11} />
                Created {createdDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={11} />
                Modified {updatedDate}
              </span>
              <span className="ml-auto font-mono text-muted-foreground/40">
                {words}w
              </span>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground/40 mb-2 uppercase tracking-widest">
                Tags
              </p>
              <TagEditor
                tags={isEditMode ? draftTags : note.tags}
                onChange={isEditMode ? setDraftTags : () => {}}
                readOnly={!isEditMode}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{QUILL_THEME_CSS}</style>
    </div>
  );
}

// ── Quill theme CSS ───────────────────────────────────────────────────────────

const QUILL_THEME_CSS = `
/* Mode transition */
.mode-transition {
  transition: opacity 0.15s ease;
}
.mode-view { opacity: 1; }
.mode-edit { opacity: 1; }

/* View mode */
.note-view-content {
  padding: 0;
  min-height: 120px;
  color: oklch(var(--foreground));
  background: transparent;
  font-family: var(--font-body, sans-serif);
  font-size: 1rem;
  line-height: 1.65;
  cursor: default;
  max-width: 65ch;
}
.note-view-content h1 {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: oklch(var(--foreground));
  margin: 1.5em 0 0.4em;
  line-height: 1.15;
}
.note-view-content h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: oklch(var(--foreground));
  margin: 1.4em 0 0.35em;
  line-height: 1.2;
}
.note-view-content h3 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 500;
  color: oklch(var(--foreground));
  margin: 1.2em 0 0.3em;
  line-height: 1.3;
}
.note-view-content p {
  margin: 0 0 0.85em;
}
.note-view-content a {
  color: oklch(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
.note-view-content blockquote {
  border-left: 2px solid oklch(var(--border));
  padding-left: 1.1rem;
  margin: 1.2em 0;
  color: oklch(var(--muted-foreground));
  font-style: italic;
}
.note-view-content pre {
  background: oklch(var(--muted));
  color: oklch(var(--foreground));
  border-radius: 0.25rem;
  padding: 0.85rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  overflow-x: auto;
  border: none;
}
.note-view-content code {
  background: oklch(var(--muted));
  color: oklch(var(--foreground));
  border-radius: 0.2rem;
  padding: 0.1em 0.35em;
  font-family: var(--font-mono);
  font-size: 0.8125em;
}
.note-view-content ul,
.note-view-content ol {
  padding-left: 1.4em;
  margin: 0.5em 0;
}
.note-view-content li {
  margin: 0.25em 0;
}

/* Wikilink chips */
.wikilink-chip {
  display: inline;
  color: oklch(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.wikilink-chip:hover {
  opacity: 0.75;
}
.wikilink-chip:focus-visible {
  outline: 2px solid oklch(var(--ring));
  outline-offset: 2px;
  border-radius: 2px;
}
.wikilink-chip.wikilink-missing {
  color: oklch(var(--muted-foreground));
  text-decoration-style: dashed;
  cursor: default;
  opacity: 0.6;
}

/* Quill editor */
.quill-themed .ql-toolbar {
  border: none;
  border-bottom: 1px solid oklch(var(--border));
  background: transparent;
  border-radius: 0;
  padding: 6px 0;
}
.quill-themed .ql-container {
  border: none;
  font-family: var(--font-body, sans-serif);
  font-size: 1rem;
  line-height: 1.65;
  color: oklch(var(--foreground));
  background: transparent;
}
.quill-themed .ql-editor {
  padding: 1rem 0 0;
  min-height: 320px;
  color: oklch(var(--foreground));
  background: transparent;
  caret-color: oklch(var(--primary));
  max-width: 65ch;
}
.quill-themed .ql-editor.ql-blank::before {
  color: oklch(var(--muted-foreground) / 0.35);
  font-style: normal;
  left: 0;
}
.quill-themed .ql-editor h1 {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: oklch(var(--foreground));
  margin: 1.5em 0 0.4em;
  line-height: 1.15;
}
.quill-themed .ql-editor h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: oklch(var(--foreground));
  margin: 1.4em 0 0.35em;
  line-height: 1.2;
}
.quill-themed .ql-editor h3 {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 500;
  color: oklch(var(--foreground));
  margin: 1.2em 0 0.3em;
}
.quill-themed .ql-editor p {
  margin: 0 0 0.85em;
}
.quill-themed .ql-editor a {
  color: oklch(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
.quill-themed .ql-editor blockquote {
  border-left: 2px solid oklch(var(--border));
  padding-left: 1.1rem;
  margin: 1.2em 0;
  color: oklch(var(--muted-foreground));
  font-style: italic;
}
.quill-themed .ql-editor pre.ql-syntax {
  background: oklch(var(--muted));
  color: oklch(var(--foreground));
  border-radius: 0.25rem;
  padding: 0.85rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  overflow-x: auto;
  border: none;
}
.quill-themed .ql-editor code {
  background: oklch(var(--muted));
  color: oklch(var(--foreground));
  border-radius: 0.2rem;
  padding: 0.1em 0.35em;
  font-family: var(--font-mono);
  font-size: 0.8125em;
}
.quill-themed .ql-toolbar .ql-stroke {
  stroke: oklch(var(--muted-foreground) / 0.5);
}
.quill-themed .ql-toolbar .ql-fill {
  fill: oklch(var(--muted-foreground) / 0.5);
}
.quill-themed .ql-toolbar .ql-picker {
  color: oklch(var(--muted-foreground) / 0.7);
}
.quill-themed .ql-toolbar .ql-picker-options {
  background: oklch(var(--popover));
  border: 1px solid oklch(var(--border));
  border-radius: 0.25rem;
  box-shadow: 0 4px 12px 0 rgb(0 0 0 / 0.06);
}
.quill-themed .ql-toolbar button:hover .ql-stroke,
.quill-themed .ql-toolbar button.ql-active .ql-stroke {
  stroke: oklch(var(--foreground));
}
.quill-themed .ql-toolbar button:hover .ql-fill,
.quill-themed .ql-toolbar button.ql-active .ql-fill {
  fill: oklch(var(--foreground));
}
.quill-themed .ql-toolbar .ql-picker-label:hover,
.quill-themed .ql-toolbar .ql-picker-label.ql-active {
  color: oklch(var(--foreground));
}
.quill-themed .ql-editor ul,
.quill-themed .ql-editor ol {
  padding-left: 1.4em;
  margin: 0.5em 0;
}
.quill-themed .ql-editor li {
  margin: 0.25em 0;
}
`;
