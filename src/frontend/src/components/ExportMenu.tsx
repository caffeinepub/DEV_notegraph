import { useStore } from "@/store/useStore";
import type { Note, NoteLink } from "@/types";
import {
  Archive,
  ChevronDown,
  Download,
  FileJson,
  FileText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ── HTML-to-Markdown helpers ────────────────────────────────────────────────

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "_$1_")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(
      /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi,
      "```\n$1\n```\n\n",
    )
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul[^>]*>|<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>|<\/ol>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts)).toISOString().split("T")[0];
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

// ── Single note exporters ───────────────────────────────────────────────────

function noteToMarkdown(
  note: Note,
  backlinks: NoteLink[],
  allNotes: Note[],
): string {
  const lines: string[] = [];
  lines.push(`# ${note.title || "Untitled"}`);
  lines.push("");
  lines.push("---");
  lines.push(`date: ${formatDate(note.createdAt)}`);
  lines.push(`updated: ${formatDate(note.updatedAt)}`);
  if (note.tags.length > 0) lines.push(`tags: [${note.tags.join(", ")}]`);
  if (note.folderId) lines.push(`folderId: ${note.folderId}`);
  lines.push("---");
  lines.push("");
  lines.push(htmlToMarkdown(note.content));

  if (backlinks.length > 0) {
    lines.push("");
    lines.push("## Backlinks");
    lines.push("");
    for (const bl of backlinks) {
      const src = allNotes.find((n) => n.id === bl.fromNoteId);
      if (src) lines.push(`- [[${src.title || "Untitled"}]]`);
    }
  }

  return lines.join("\n");
}

function noteToJson(
  note: Note,
  allLinks: NoteLink[],
  allNotes: Note[],
): object {
  const outbound = allLinks
    .filter((l) => l.fromNoteId === note.id)
    .map((l) => {
      const target = allNotes.find((n) => n.id === l.toNoteId);
      return { id: l.toNoteId, title: target?.title ?? "Unknown" };
    });
  const backlinks = allLinks
    .filter((l) => l.toNoteId === note.id)
    .map((l) => {
      const src = allNotes.find((n) => n.id === l.fromNoteId);
      return { id: l.fromNoteId, title: src?.title ?? "Unknown" };
    });
  return {
    ...note,
    createdAt: Number(note.createdAt),
    updatedAt: Number(note.updatedAt),
    outboundLinks: outbound,
    backlinks,
  };
}

// ── Download helpers ────────────────────────────────────────────────────────

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadZip(notes: Note[], links: NoteLink[]) {
  // Try JSZip if available, else trigger individual downloads
  type JSZipCtor = new () => {
    file: (n: string, d: string) => void;
    generateAsync: (o: { type: string }) => Promise<Blob>;
  };
  let JSZip: JSZipCtor | null = null;
  try {
    // @ts-expect-error - optional dependency may not be installed
    JSZip = (await import("jszip")).default as JSZipCtor;
  } catch {}

  if (JSZip) {
    const zip = new JSZip();
    for (const note of notes) {
      const backlinks = links.filter((l) => l.toNoteId === note.id);
      const md = noteToMarkdown(note, backlinks, notes);
      zip.file(`${slugify(note.title || "untitled")}.md`, md);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-base-export.zip";
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Fallback: download each file individually
    for (const note of notes) {
      const backlinks = links.filter((l) => l.toNoteId === note.id);
      const md = noteToMarkdown(note, backlinks, notes);
      downloadText(
        md,
        `${slugify(note.title || "untitled")}.md`,
        "text/markdown",
      );
      await new Promise((r) => setTimeout(r, 80)); // stagger downloads
    }
  }
}

// ── ExportMenu ──────────────────────────────────────────────────────────────

interface ExportMenuProps {
  /** If provided, single-note export options are shown first */
  noteId?: string | null;
}

export function ExportMenu({ noteId }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes, links } = useStore();

  const activeNote = noteId ? notes.find((n) => n.id === noteId) : null;

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [open]);

  // ── Actions ──

  function exportNoteMarkdown() {
    if (!activeNote) return;
    const backlinks = links.filter((l) => l.toNoteId === activeNote.id);
    const md = noteToMarkdown(activeNote, backlinks, notes);
    downloadText(
      md,
      `${slugify(activeNote.title || "untitled")}.md`,
      "text/markdown",
    );
    toast.success("Exported as Markdown");
    setOpen(false);
  }

  function exportNoteJson() {
    if (!activeNote) return;
    const obj = noteToJson(activeNote, links, notes);
    downloadText(
      JSON.stringify(obj, null, 2),
      `${slugify(activeNote.title || "untitled")}.json`,
      "application/json",
    );
    toast.success("Exported as JSON");
    setOpen(false);
  }

  async function exportAllZip() {
    if (notes.length === 0) {
      toast.error("No notes to export");
      return;
    }
    toast.loading("Generating archive…", { id: "export-zip" });
    try {
      await downloadZip(notes, links);
      toast.success("Archive downloaded", { id: "export-zip" });
    } catch {
      toast.error("Export failed", { id: "export-zip" });
    }
    setOpen(false);
  }

  function exportAllJson() {
    if (notes.length === 0) {
      toast.error("No notes to export");
      return;
    }
    const data = notes.map((n) => noteToJson(n, links, notes));
    downloadText(
      JSON.stringify(data, null, 2),
      "knowledge-base-export.json",
      "application/json",
    );
    toast.success(`Exported ${notes.length} notes as JSON`);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      data-ocid="export-menu-container"
    >
      <button
        type="button"
        data-ocid="export-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md",
          "text-muted-foreground hover:text-foreground border border-border/60",
          "hover:bg-muted/60 transition-fast outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open ? "bg-muted/60 text-foreground" : "",
        ].join(" ")}
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown
          className={`w-3 h-3 transition-fast ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          data-ocid="export-menu-dropdown"
          className="absolute right-0 mt-1.5 w-52 bg-popover border border-border rounded-lg shadow-elevated z-30 overflow-hidden"
          style={{ animation: "fadeInDown 0.12s cubic-bezier(0.4,0,0.2,1)" }}
        >
          <style>{`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {activeNote && (
            <>
              <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                This note
              </div>
              <MenuItem
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Export as Markdown"
                onClick={exportNoteMarkdown}
              />
              <MenuItem
                icon={<FileJson className="w-3.5 h-3.5" />}
                label="Export as JSON"
                onClick={exportNoteJson}
              />
              <div className="my-1 border-t border-border" />
            </>
          )}

          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            All notes
          </div>
          <MenuItem
            icon={<Archive className="w-3.5 h-3.5" />}
            label="Export all as ZIP"
            onClick={exportAllZip}
          />
          <MenuItem
            icon={<FileJson className="w-3.5 h-3.5" />}
            label="Export all as JSON"
            onClick={exportAllJson}
          />
          <div className="h-1.5" />
        </div>
      )}
    </div>
  );
}

// ── Shared menu item ────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted/70 transition-fast text-left outline-none focus-visible:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}
