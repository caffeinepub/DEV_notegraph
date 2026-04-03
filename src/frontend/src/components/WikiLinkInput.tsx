import { useStore } from "@/store/useStore";
import { useEffect, useRef } from "react";

interface WikiLinkInputProps {
  query: string;
  onSelect: (noteTitle: string) => void;
  onClose: () => void;
  /** Pixel offset from container top-left for positioning */
  position: { top: number; left: number };
}

export function WikiLinkInput({
  query,
  onSelect,
  onClose,
  position,
}: WikiLinkInputProps) {
  const notes = useStore((s) => s.notes);

  const filtered = notes
    .filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  // Track active index in a ref to avoid stale closures in keyboard handler
  const activeIdxRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on each new query (runs during render — safe for this pattern)
  activeIdxRef.current = Math.min(
    activeIdxRef.current,
    Math.max(filtered.length - 1, 0),
  );

  // Reset index whenever query changes (track previous via ref)
  const prevQueryRef2 = useRef("");
  if (prevQueryRef2.current !== query) {
    prevQueryRef2.current = query;
    activeIdxRef.current = 0;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdxRef.current = Math.min(
          activeIdxRef.current + 1,
          filtered.length - 1,
        );
        highlightItem();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdxRef.current = Math.max(activeIdxRef.current - 1, 0);
        highlightItem();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIdxRef.current];
        if (item) onSelect(item.title);
        else onClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    function highlightItem() {
      const children = listRef.current?.children;
      if (!children) return;
      Array.from(children).forEach((child, i) => {
        const el = child as HTMLElement;
        const isActive = i === activeIdxRef.current;
        el.dataset.active = isActive ? "true" : "false";
        if (isActive) el.scrollIntoView({ block: "nearest" });
      });
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [filtered, onSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div
        className="absolute z-50 min-w-[200px] max-w-[320px] rounded-lg border border-border bg-popover shadow-elevated text-xs text-muted-foreground px-3 py-2"
        style={{ top: position.top, left: position.left }}
      >
        No matching notes
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="absolute z-50 min-w-[200px] max-w-[320px] rounded-lg border border-border bg-popover shadow-elevated overflow-y-auto max-h-52 py-1"
      style={{ top: position.top, left: position.left }}
      data-ocid="wikilink-dropdown"
    >
      {filtered.map((note, i) => (
        <div
          key={note.id}
          data-active={i === 0 ? "true" : "false"}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(note.title);
          }}
          onMouseEnter={() => {
            activeIdxRef.current = i;
          }}
          className="px-3 py-1.5 cursor-pointer text-sm truncate transition-fast data-[active=true]:bg-accent/20 data-[active=true]:text-foreground text-popover-foreground hover:bg-muted"
        >
          {note.title}
        </div>
      ))}
    </div>
  );
}
