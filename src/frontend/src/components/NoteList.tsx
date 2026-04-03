import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import type { Note } from "@/types";
import { FileText, Plus, Search } from "lucide-react";
import { useEffect, useRef } from "react";

function formatDate(ts: bigint): string {
  const date = new Date(Number(ts) / 1_000_000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
}

function NoteItem({ note, isActive, onClick }: NoteItemProps) {
  const preview = stripHtml(note.content).slice(0, 80);

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-2.5 transition-fast cursor-pointer",
        "flex flex-col gap-0.5 group rounded",
        isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
      )}
      onClick={onClick}
      data-ocid={`note-item-${note.id}`}
      aria-selected={isActive}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span
          className={cn(
            "text-[13px] font-medium truncate min-w-0 leading-snug",
            isActive ? "text-foreground" : "text-sidebar-foreground",
          )}
        >
          {note.title || "Untitled"}
        </span>
        <span className="flex-shrink-0 text-[10px] text-muted-foreground/50 tabular-nums font-mono pt-px">
          {formatDate(note.updatedAt)}
        </span>
      </div>

      {preview && (
        <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-relaxed text-left">
          {preview}
        </p>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-px rounded bg-muted/80 text-muted-foreground/70 leading-none"
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground/50">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

interface NoteListProps {
  onCreateNote: () => void;
}

export function NoteList({ onCreateNote }: NoteListProps) {
  const {
    notes,
    activeNoteId,
    activeFolderId,
    activeTag,
    searchQuery,
    setActiveNoteId,
    setIsSearchOpen,
    folders,
  } = useStore();

  // Listen for keyboard shortcut to create new note
  const createRef = useRef(onCreateNote);
  createRef.current = onCreateNote;
  useEffect(() => {
    function handler() {
      createRef.current();
    }
    window.addEventListener("kb:new-note", handler);
    return () => window.removeEventListener("kb:new-note", handler);
  }, []);

  // Filter and sort notes
  const filtered = notes
    .filter((note) => {
      if (activeFolderId) return note.folderId === activeFolderId;
      if (activeTag) return note.tags.includes(activeTag);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(q) ||
          stripHtml(note.content).toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => Number(b.updatedAt - a.updatedAt));

  const activeFolderName = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)?.name
    : null;

  const isEmpty = filtered.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* List header */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          {activeFolderName
            ? activeFolderName
            : activeTag
              ? `#${activeTag}`
              : searchQuery
                ? "Results"
                : "All"}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="size-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-fast rounded"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search notes"
            data-ocid="open-search-btn"
          >
            <Search className="size-3" />
          </button>
          <button
            type="button"
            className="size-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-fast rounded"
            onClick={onCreateNote}
            aria-label="New note"
            data-ocid="new-note-btn"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-px"
        data-ocid="note-list"
      >
        {isEmpty ? (
          <EmptyState
            hasFilter={!!activeFolderId || !!activeTag || !!searchQuery}
            onCreateNote={onCreateNote}
          />
        ) : (
          filtered.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={activeNoteId === note.id}
              onClick={() => setActiveNoteId(note.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({
  hasFilter,
  onCreateNote,
}: {
  hasFilter: boolean;
  onCreateNote: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center"
      data-ocid="note-list-empty"
    >
      <FileText className="size-5 text-muted-foreground/30" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">
          {hasFilter ? "No notes here" : "No notes yet"}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {hasFilter ? "Try a different filter." : "Create your first note."}
        </p>
      </div>
      {!hasFilter && (
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground transition-fast underline underline-offset-2"
          onClick={onCreateNote}
          data-ocid="empty-create-note-btn"
        >
          New note
        </button>
      )}
    </div>
  );
}
