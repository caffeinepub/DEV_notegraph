import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type NoteId = string;
export type Tag = string;
export type Timestamp = bigint;
export interface Folder {
    id: FolderId;
    name: string;
    createdAt: Timestamp;
    parentId?: FolderId;
}
export interface TagCount {
    tag: Tag;
    count: bigint;
}
export interface NoteLink {
    toNoteId: NoteId;
    fromNoteId: NoteId;
}
export type FolderId = string;
export interface Note {
    id: NoteId;
    title: string;
    content: string;
    createdAt: Timestamp;
    tags: Array<Tag>;
    updatedAt: Timestamp;
    folderId?: FolderId;
}
export interface backendInterface {
    createFolder(name: string, parentId: FolderId | null): Promise<Folder>;
    createNote(title: string, content: string, folderId: FolderId | null, tags: Array<Tag>): Promise<Note>;
    deleteFolder(id: FolderId): Promise<boolean>;
    deleteNote(id: NoteId): Promise<boolean>;
    getAllFolders(): Promise<Array<Folder>>;
    getAllLinks(): Promise<Array<NoteLink>>;
    getAllNotes(): Promise<Array<Note>>;
    getAllTags(): Promise<Array<TagCount>>;
    getBacklinks(noteId: NoteId): Promise<Array<NoteLink>>;
    getLinksByNote(noteId: NoteId): Promise<Array<NoteLink>>;
    getNoteById(id: NoteId): Promise<Note | null>;
    getNotesByFolder(folderId: FolderId): Promise<Array<Note>>;
    getNotesByTag(tag: Tag): Promise<Array<Note>>;
    renameFolder(id: FolderId, name: string): Promise<Folder | null>;
    searchNotes(searchQuery: string): Promise<Array<Note>>;
    setNoteLinks(fromNoteId: NoteId, toNoteIds: Array<NoteId>): Promise<void>;
    updateNote(id: NoteId, title: string, content: string, folderId: FolderId | null, tags: Array<Tag>): Promise<Note | null>;
}
