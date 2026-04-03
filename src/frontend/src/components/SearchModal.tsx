import { useStore } from "@/store/useStore";
import type { Folder, Note } from "@/types";
import { FileText, Folder as FolderIcon, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${escapeRegex(query.trim())})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, idx) =>
    regex.test(part) ? (
      <mark
        key={`hl-${idx}-${part}`}
        className="bg-primary/20 text-foreground rounded-[1px]"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function getSnippet(plainText: string, query: string, maxLen = 140): string {
  if (!query.trim()) return plainText.slice(0, maxLen);
  const idx = plainText.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return plainText.slice(0, maxLen);
  const start = Math.max(0, idx - 50);
  const end = Math.min(plainText.length, idx + query.length + 90);
  return (
    (start > 0 ? "…" : "") +
    plainText.slice(start, end) +
    (end < plainText.length ? "…" : "")
  );
}

interface SearchResult {
  note: Note;
  folder: Folder | null;
  snippet: string;
  plain: string;
}

function useSearchResults(
  query: string,
  notes: Note[],
  folders: Folder[],
): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return notes
    .filter((n) => {
      const titleMatch = n.title.toLowerCase().includes(q);
      const plain = stripHtml(n.content);
      const contentMatch = plain.toLowerCase().includes(q);
      return titleMatch || contentMatch;
    })
    .slice(0, 50)
    .map((note) => {
      const plain = stripHtml(note.content);
      return {
        note,
        folder: folders.find((f) => f.id === note.folderId) ?? null,
        snippet: getSnippet(plain, query),
        plain,
      };
    });
}

function syncQueryParam(q: string) {
  const url = new URL(window.location.href);
  if (q) {
    url.searchParams.set("q", q);
  } else {
    url.searchParams.delete("q");
  }
  history.pushState({}, "", url.toString());
}

// ── Result item ────────────────────────────────────────────────────────────

interface ResultItemProps {
  result: SearchResult;
  query: string;
  isActive: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

function ResultItem({
  result,
  query,
  isActive,
  onSelect,
  onMouseEnter,
}: ResultItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  return (
    <button
      ref={ref}
      data-ocid="search-result-item"
      type="button"
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={[
        "w-full text-left px-4 py-3 flex items-start gap-3 transition-fast outline-none",
        "border-b border-border/40 last:border-0",
        isActive ? "bg-muted/60" : "hover:bg-muted/40",
      ].join(" ")}
    >
      <FileText className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium truncate mb-0.5 text-foreground leading-snug">
          {highlight(result.note.title || "Untitled", query)}
        </div>
        {result.snippet && (
          <div className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5 leading-relaxed">
            {highlight(result.snippet, query)}
          </div>
        )}
        {result.folder && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <FolderIcon className="size-2.5" />
            {result.folder.name}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────

export function SearchModal() {
  const { isSearchOpen, setIsSearchOpen, notes, folders, setActiveNoteId } =
    useStore();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useSearchResults(query, notes, folders);

  const updateQuery = useCallback((q: string) => {
    setQuery(q);
    setActiveIdx(0);
  }, []);

  useEffect(() => {
    if (isSearchOpen) syncQueryParam(query);
  }, [query, isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get("q") ?? "";
      updateQuery(urlQuery);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      syncQueryParam("");
    }
  }, [isSearchOpen, updateQuery]);

  const close = useCallback(() => {
    setIsSearchOpen(false);
    updateQuery("");
  }, [setIsSearchOpen, updateQuery]);

  const openNote = useCallback(
    (noteId: string) => {
      setActiveNoteId(noteId);
      close();
    },
    [setActiveNoteId, close],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      openNote(results[activeIdx]?.note.id ?? results[0].note.id);
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div
      data-ocid="search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{
        background: "oklch(from var(--background) l c h / 0.75)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.12s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === "Escape") close();
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <dialog
        open
        data-ocid="search-modal-panel"
        className="w-full max-w-lg bg-popover border border-border rounded-lg shadow-elevated overflow-hidden p-0 m-0"
        style={{ animation: "fadeIn 0.15s cubic-bezier(0.4,0,0.2,1)" }}
        aria-label="Search notes"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="size-3.5 text-muted-foreground/50 shrink-0" />
          <input
            ref={inputRef}
            data-ocid="search-input"
            type="text"
            placeholder="Search notes…"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 py-3.5 bg-transparent text-foreground placeholder:text-muted-foreground/40 text-[13px] outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              data-ocid="search-clear"
              onClick={() => updateQuery("")}
              className="text-muted-foreground/40 hover:text-foreground transition-fast p-1 rounded"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center text-[10px] text-muted-foreground/40 border border-border/60 rounded px-1.5 py-0.5 font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {query.trim() ? (
          <div className="max-h-[55vh] overflow-y-auto">
            {results.length > 0 ? (
              results.map((r, i) => (
                <ResultItem
                  key={r.note.id}
                  result={r}
                  query={query}
                  isActive={i === activeIdx}
                  onSelect={() => openNote(r.note.id)}
                  onMouseEnter={() => setActiveIdx(i)}
                />
              ))
            ) : (
              <div className="py-10 text-center text-muted-foreground text-[13px]">
                No results for{" "}
                <span className="text-foreground font-medium">"{query}"</span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground/40">
            <span>
              {notes.length} note{notes.length !== 1 ? "s" : ""}
            </span>
            <span className="flex gap-3 font-mono">
              <span>
                <kbd className="border border-border/50 rounded px-1 py-0.5 bg-muted/40">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span>
                <kbd className="border border-border/50 rounded px-1 py-0.5 bg-muted/40">
                  ↵
                </kbd>{" "}
                open
              </span>
            </span>
          </div>
        )}
      </dialog>
    </div>
  );
}
