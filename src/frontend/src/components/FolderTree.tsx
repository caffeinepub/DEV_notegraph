import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import type { Folder } from "@/types";
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  noteCountByFolder: Record<string, number>;
  activeFolderId: string | null;
  depth: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function FolderNode({
  folder,
  allFolders,
  noteCountByFolder,
  activeFolderId,
  depth,
  onSelect,
  onDelete,
}: FolderNodeProps) {
  const children = allFolders.filter((f) => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(true);
  const isActive = activeFolderId === folder.id;
  const count = noteCountByFolder[folder.id] ?? 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded transition-fast",
          "hover:bg-sidebar-accent",
          isActive && "bg-sidebar-accent",
        )}
        style={{ paddingLeft: `${depth * 10 + 8}px`, paddingRight: "6px" }}
      >
        {/* Chevron toggle */}
        <button
          type="button"
          className={cn(
            "flex-shrink-0 size-4 flex items-center justify-center rounded transition-fast",
            "text-muted-foreground/40 hover:text-muted-foreground",
            !hasChildren && "invisible",
          )}
          onClick={() => setExpanded((v) => !v)}
          tabIndex={-1}
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
        >
          <ChevronRight
            className={cn(
              "size-3 transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
        </button>

        {/* Main folder button */}
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 flex-1 min-w-0 py-1.5 text-left transition-fast cursor-pointer",
            isActive ? "text-foreground" : "text-sidebar-foreground/80",
          )}
          onClick={() => onSelect(folder.id)}
          data-ocid={`folder-item-${folder.id}`}
          aria-pressed={isActive}
        >
          <span className="flex-shrink-0 text-muted-foreground/50">
            {isActive || expanded ? (
              <FolderOpen className="size-3" />
            ) : (
              <FolderIcon className="size-3" />
            )}
          </span>
          <span className="flex-1 min-w-0 text-[12px] truncate">
            {folder.name}
          </span>
          {count > 0 && (
            <span className="text-[10px] text-muted-foreground/40 tabular-nums font-mono">
              {count}
            </span>
          )}
        </button>

        {/* Delete button */}
        <button
          type="button"
          className={cn(
            "flex-shrink-0 size-5 flex items-center justify-center rounded transition-fast",
            "text-muted-foreground/30 opacity-0 group-hover:opacity-100",
            "hover:text-destructive",
          )}
          onClick={() => onDelete(folder.id)}
          tabIndex={-1}
          aria-label={`Delete folder ${folder.name}`}
          data-ocid={`delete-folder-${folder.id}`}
        >
          <Trash2 className="size-2.5" />
        </button>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              noteCountByFolder={noteCountByFolder}
              activeFolderId={activeFolderId}
              depth={depth + 1}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeProps {
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onDeleteFolder: (id: string) => void;
}

export function FolderTree({
  onCreateFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const folders = useStore((s) => s.folders);
  const notes = useStore((s) => s.notes);
  const activeFolderId = useStore((s) => s.activeFolderId);
  const setActiveFolderId = useStore((s) => s.setActiveFolderId);
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const rootFolders = folders.filter((f) => f.parentId === null);

  const noteCountByFolder = folders.reduce<Record<string, number>>(
    (acc, folder) => {
      acc[folder.id] = notes.filter((n) => n.folderId === folder.id).length;
      return acc;
    },
    {},
  );

  function handleCreate() {
    const name = newFolderName.trim();
    if (!name) return;
    onCreateFolder(name, null);
    setNewFolderName("");
    setIsAdding(false);
  }

  return (
    <div className="space-y-0">
      {rootFolders.length === 0 && !isAdding && (
        <p className="text-[11px] text-muted-foreground/50 px-4 py-1.5 italic">
          No folders yet
        </p>
      )}

      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          allFolders={folders}
          noteCountByFolder={noteCountByFolder}
          activeFolderId={activeFolderId}
          depth={0}
          onSelect={(id) =>
            setActiveFolderId(activeFolderId === id ? null : id)
          }
          onDelete={onDeleteFolder}
        />
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1.5 px-3 py-1">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewFolderName("");
              }
            }}
            placeholder="Folder name…"
            className={cn(
              "flex-1 min-w-0 text-[12px] px-2 py-1 rounded border border-input bg-background",
              "text-foreground placeholder:text-muted-foreground/40 outline-none",
              "focus:ring-1 focus:ring-ring/50 transition-fast",
            )}
            data-ocid="new-folder-input"
            ref={(el) => el?.focus()}
          />
          <button
            type="button"
            className="size-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-fast rounded"
            onClick={handleCreate}
            aria-label="Confirm new folder"
          >
            <Plus className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 w-full px-4 py-1.5 text-[11px]",
            "text-muted-foreground/50 hover:text-foreground transition-fast cursor-pointer",
          )}
          onClick={() => setIsAdding(true)}
          data-ocid="add-folder-btn"
        >
          <Plus className="size-3 flex-shrink-0" />
          New folder
        </button>
      )}
    </div>
  );
}
