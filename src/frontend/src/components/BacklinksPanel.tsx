import { Skeleton } from "@/components/ui/skeleton";
import { useBacklinks } from "@/hooks/useBackend";
import { useStore } from "@/store/useStore";
import { ArrowUpLeft } from "lucide-react";
import { useMemo } from "react";

function wordCount(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatDate(ms: bigint): string {
  return new Date(Number(ms) / 1_000_000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function snippet(html: string, maxLen = 100): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export function BacklinksPanel() {
  const { activeNoteId, notes, folders, setActiveNoteId } = useStore();
  const { data: backlinks = [], isLoading } = useBacklinks(activeNoteId);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  const folderPath = useMemo(() => {
    if (!activeNote?.folderId) return null;
    const f = folders.find((f) => f.id === activeNote.folderId);
    return f?.name ?? null;
  }, [activeNote, folders]);

  const backlinkNotes = useMemo(() => {
    const ids = new Set(backlinks.map((l) => l.fromNoteId));
    return notes.filter((n) => ids.has(n.id));
  }, [notes, backlinks]);

  if (!activeNote) {
    return (
      <div
        data-ocid="backlinks-empty-no-note"
        className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center"
      >
        <p className="text-[11px] text-muted-foreground/60">
          Select a note to see its info
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Note metadata ───────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <h3 className="font-display text-[15px] font-semibold text-foreground truncate mb-3 leading-snug tracking-[-0.01em]">
          {activeNote.title}
        </h3>
        <div className="space-y-1">
          <MetaRow label="Created" value={formatDate(activeNote.createdAt)} />
          <MetaRow label="Modified" value={formatDate(activeNote.updatedAt)} />
          <MetaRow
            label="Words"
            value={wordCount(activeNote.content).toString()}
          />
          {folderPath && <MetaRow label="Folder" value={folderPath} />}
        </div>
        {activeNote.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {activeNote.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] bg-muted/80 text-muted-foreground px-2 py-0.5 rounded font-body"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Backlinks list ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
          Backlinks
          {backlinkNotes.length > 0 && (
            <span className="ml-1.5 text-muted-foreground/50">
              ({backlinkNotes.length})
            </span>
          )}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {["a", "b", "c"].map((k) => (
              <Skeleton key={k} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : backlinkNotes.length === 0 ? (
          <div data-ocid="backlinks-empty-state" className="py-6 text-center">
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              No notes link here yet.
            </p>
            <p className="text-[11px] text-muted-foreground/40 mt-1">
              Use{" "}
              <code className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded">
                [[{activeNote.title}]]
              </code>{" "}
              in another note.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {backlinkNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                data-ocid={`backlink-item-${note.id}`}
                onClick={() => setActiveNoteId(note.id)}
                className="w-full text-left rounded px-2 py-2 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-fast group"
              >
                <div className="flex items-start gap-2">
                  <ArrowUpLeft className="size-3 text-primary/50 mt-0.5 flex-shrink-0 group-hover:text-primary transition-fast" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate leading-snug">
                      {note.title}
                    </p>
                    {note.content && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                        {snippet(note.content)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] text-muted-foreground/50 font-body uppercase tracking-widest w-14 flex-shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground font-body truncate">
        {value}
      </span>
    </div>
  );
}
