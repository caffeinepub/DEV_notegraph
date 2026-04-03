import { Separator } from "@/components/ui/separator";
import { useCreateFolder, useDeleteFolder } from "@/hooks/useBackend";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { ChevronRight, FolderIcon, Hash, StickyNote, X } from "lucide-react";
import { useState } from "react";
import { FolderTree } from "./FolderTree";
import { NoteList } from "./NoteList";
import { TagPanel } from "./TagPanel";

type Section = "folders" | "tags" | "notes";

interface SectionHeaderProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  count?: number;
}

function SectionHeader({
  label,
  icon,
  isOpen,
  onToggle,
  count,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 text-left transition-fast",
        "hover:bg-sidebar-accent group",
      )}
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span className="text-muted-foreground/60 flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-fast truncate leading-none">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">
          {count}
        </span>
      )}
      <ChevronRight
        className={cn(
          "size-3 text-muted-foreground/40 transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-90",
        )}
      />
    </button>
  );
}

export function Sidebar() {
  const {
    folders,
    tags,
    notes,
    activeFolderId,
    activeTag,
    setActiveFolderId,
    setActiveTag,
    createLocalNote,
  } = useStore();

  const [openSections, setOpenSections] = useState<Set<Section>>(
    () => new Set(["folders", "tags", "notes"]),
  );

  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();

  function toggleSection(section: Section) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  function handleCreateNote() {
    createLocalNote(activeFolderId ?? null, activeTag ? [activeTag] : []);
  }

  function handleCreateFolder(name: string, parentId?: string | null) {
    const tempId = `local-folder-${Date.now()}`;
    createFolder.mutate({ name, parentId, tempId });
  }

  function handleDeleteFolder(id: string) {
    deleteFolder.mutate(id);
  }

  const hasActiveFilter = !!activeFolderId || !!activeTag;

  return (
    <div className="flex flex-col h-full min-h-0 bg-sidebar text-sidebar-foreground">
      {/* Sidebar identity header */}
      <div className="flex items-center gap-2 px-4 h-11 flex-shrink-0 border-b border-sidebar-border">
        <span className="font-display font-semibold text-[13px] text-foreground tracking-[-0.01em] truncate leading-none">
          Library
        </span>
      </div>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <div
          className="flex items-center gap-1.5 mx-3 mt-3 px-2.5 py-1.5 rounded bg-primary/8 border border-primary/15"
          data-ocid="active-filter-indicator"
        >
          <span className="text-[11px] text-primary font-medium truncate flex-1 min-w-0 leading-none">
            {activeFolderId
              ? `${folders.find((f) => f.id === activeFolderId)?.name ?? "…"}`
              : `#${activeTag}`}
          </span>
          <button
            type="button"
            className="flex-shrink-0 text-primary/60 hover:text-primary transition-fast rounded"
            onClick={() => {
              setActiveFolderId(null);
              setActiveTag(null);
            }}
            aria-label="Clear filter"
            data-ocid="clear-filter-btn"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Scrollable sections */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-0">
        {/* ── Folders section ── */}
        <div>
          <SectionHeader
            label="Folders"
            icon={<FolderIcon className="size-3" />}
            isOpen={openSections.has("folders")}
            onToggle={() => toggleSection("folders")}
            count={folders.length}
          />
          {openSections.has("folders") && (
            <div className="overflow-hidden pb-1" data-ocid="folders-section">
              <FolderTree
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
              />
            </div>
          )}
        </div>

        <Separator
          className="my-1 mx-3 bg-sidebar-border w-auto"
          style={{ width: "calc(100% - 24px)" }}
        />

        {/* ── Tags section ── */}
        <div>
          <SectionHeader
            label="Tags"
            icon={<Hash className="size-3" />}
            isOpen={openSections.has("tags")}
            onToggle={() => toggleSection("tags")}
            count={tags.length}
          />
          {openSections.has("tags") && (
            <div className="pb-1" data-ocid="tags-section">
              <TagPanel />
            </div>
          )}
        </div>

        <Separator
          className="my-1 mx-3 bg-sidebar-border"
          style={{ width: "calc(100% - 24px)" }}
        />

        {/* ── Notes section ── */}
        <div className="flex flex-col min-h-0" style={{ flex: "1 1 auto" }}>
          <SectionHeader
            label="Notes"
            icon={<StickyNote className="size-3" />}
            isOpen={openSections.has("notes")}
            onToggle={() => toggleSection("notes")}
            count={notes.length}
          />
          {openSections.has("notes") && (
            <div
              className="flex flex-col"
              style={{ minHeight: "120px" }}
              data-ocid="notes-section"
            >
              <NoteList onCreateNote={handleCreateNote} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
