import type { Folder, Note, NoteLink, TagCount } from "@/types";
import { create } from "zustand";

interface AppState {
  // Data
  notes: Note[];
  folders: Folder[];
  links: NoteLink[];
  tags: TagCount[];

  // UI state
  activeNoteId: string | null;
  activeFolderId: string | null;
  activeTag: string | null;
  searchQuery: string;
  isSidebarOpen: boolean;
  isRightPanelOpen: boolean;
  isSearchOpen: boolean;
  isEditMode: boolean; // view mode by default, NOT persisted
  theme: "dark" | "light";

  // Data setters
  setNotes: (notes: Note[]) => void;
  setFolders: (folders: Folder[]) => void;
  setLinks: (links: NoteLink[]) => void;
  setTags: (tags: TagCount[]) => void;

  // Merge helpers: server data replaces confirmed items but preserves optimistic (local-*) items
  mergeNotes: (serverNotes: Note[]) => void;
  mergeFolders: (serverFolders: Folder[]) => void;

  // Note CRUD
  addNote: (note: Note) => void;
  updateNote: (id: string, partial: Partial<Note>) => void;
  removeNote: (id: string) => void;
  replaceNote: (tempId: string, note: Note) => void;
  createLocalNote: (folderId?: string | null, tags?: string[]) => void;

  // Folder CRUD
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, partial: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
  replaceFolder: (tempId: string, folder: Folder) => void;

  // Link management
  setNoteLinks: (fromNoteId: string, toNoteIds: string[]) => void;

  // UI actions
  setActiveNoteId: (id: string | null) => void;
  setActiveFolderId: (id: string | null) => void;
  setActiveTag: (tag: string | null) => void;
  setSearchQuery: (q: string) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setIsSearchOpen: (open: boolean) => void;
  setIsEditMode: (edit: boolean) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("kb-theme", theme);
  } catch {}
}

function getInitialTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem("kb-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useStore = create<AppState>((set) => ({
  notes: [],
  folders: [],
  links: [],
  tags: [],

  activeNoteId: null,
  activeFolderId: null,
  activeTag: null,
  searchQuery: "",
  isSidebarOpen: true,
  isRightPanelOpen: true,
  isSearchOpen: false,
  isEditMode: false, // always start in view mode
  theme: initialTheme,

  setNotes: (notes) => set({ notes }),
  setFolders: (folders) => set({ folders }),
  setLinks: (links) => set({ links }),
  setTags: (tags) => set({ tags }),

  // Merge server state while preserving optimistic local items (id starts with "local-")
  mergeNotes: (serverNotes) =>
    set((s) => {
      const localOnly = s.notes.filter((n) => n.id.startsWith("local-"));
      return { notes: [...localOnly, ...serverNotes] };
    }),
  mergeFolders: (serverFolders) =>
    set((s) => {
      const localOnly = s.folders.filter((f) => f.id.startsWith("local-"));
      return { folders: [...localOnly, ...serverFolders] };
    }),

  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  updateNote: (id, partial) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...partial } : n)),
    })),
  removeNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
    })),
  replaceNote: (tempId, note) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === tempId ? note : n)),
      activeNoteId: s.activeNoteId === tempId ? note.id : s.activeNoteId,
    })),
  createLocalNote: (folderId = null, tags = []) => {
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const localNote: Note = {
      id: `local-${Date.now()}`,
      title: "Untitled",
      content: "",
      folderId: folderId ?? null,
      tags: tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      notes: [localNote, ...s.notes],
      activeNoteId: localNote.id,
      isEditMode: true,
    }));
  },

  addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),
  updateFolder: (id, partial) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...partial } : f)),
    })),
  removeFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      activeFolderId: s.activeFolderId === id ? null : s.activeFolderId,
    })),
  replaceFolder: (tempId, folder) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === tempId ? folder : f)),
      activeFolderId:
        s.activeFolderId === tempId ? folder.id : s.activeFolderId,
    })),

  setNoteLinks: (fromNoteId, toNoteIds) =>
    set((s) => {
      const filtered = s.links.filter((l) => l.fromNoteId !== fromNoteId);
      const newLinks = toNoteIds.map((toNoteId) => ({ fromNoteId, toNoteId }));
      return { links: [...filtered, ...newLinks] };
    }),

  setActiveNoteId: (id) => set({ activeNoteId: id, isEditMode: false }),
  setActiveFolderId: (id) => set({ activeFolderId: id, activeTag: null }),
  setActiveTag: (tag) => set({ activeTag: tag, activeFolderId: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleRightPanel: () =>
    set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  setIsSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
  setIsEditMode: (isEditMode) => set({ isEditMode }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      return { theme: next };
    }),
}));
