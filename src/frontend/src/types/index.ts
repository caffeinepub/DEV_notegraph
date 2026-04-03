export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: bigint;
}

export interface NoteLink {
  fromNoteId: string;
  toNoteId: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PanelView = "backlinks" | "graph";
