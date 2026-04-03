import { createActor } from "@/backend";
import type { backendInterface } from "@/backend";
import { useStore } from "@/store/useStore";
import type { Folder, Note, NoteLink, TagCount } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Actor helper ──────────────────────────────────────────────────────────────

function useBackendActor() {
  return useActor(createActor);
}

function getActor(
  actor: backendInterface | null | undefined,
): backendInterface {
  if (!actor) throw new Error("Actor not ready — please wait and try again.");
  return actor as backendInterface;
}

// ── Type normalizers ──────────────────────────────────────────────────────────

/**
 * Backend returns Folder with `parentId?: FolderId` (undefined for root).
 * Our local Folder type uses `parentId: string | null`.
 * Normalize here so the rest of the app can do `f.parentId === null` safely.
 */
function normalizeFolder(raw: unknown): Folder {
  const f = raw as Record<string, unknown>;
  return {
    id: f.id as string,
    name: f.name as string,
    createdAt: f.createdAt as bigint,
    parentId: (f.parentId as string | undefined) ?? null,
  };
}

function normalizeNote(raw: unknown): Note {
  const n = raw as Record<string, unknown>;
  return {
    id: n.id as string,
    title: n.title as string,
    content: n.content as string,
    createdAt: n.createdAt as bigint,
    updatedAt: n.updatedAt as bigint,
    tags: n.tags as string[],
    folderId: (n.folderId as string | undefined) ?? null,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useAllNotes() {
  const { actor, isFetching } = useBackendActor();
  const mergeNotes = useStore((s) => s.mergeNotes);
  return useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      const a = getActor(actor);
      const raw = await a.getAllNotes();
      const notes = raw.map(normalizeNote) as Note[];
      // Merge: keep any optimistic (local-) notes not yet confirmed by server
      mergeNotes(notes);
      return notes;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllFolders() {
  const { actor, isFetching } = useBackendActor();
  const mergeFolders = useStore((s) => s.mergeFolders);
  return useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: async () => {
      const a = getActor(actor);
      const raw = await a.getAllFolders();
      const folders = raw.map(normalizeFolder) as Folder[];
      // Merge: keep any optimistic (local-) folders not yet confirmed by server
      mergeFolders(folders);
      return folders;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllTags() {
  const { actor, isFetching } = useBackendActor();
  const setTags = useStore((s) => s.setTags);
  return useQuery<TagCount[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const a = getActor(actor);
      const raw = await a.getAllTags();
      // Backend returns count as bigint; local TagCount uses number
      const tags = raw.map((t) => ({
        tag: t.tag,
        count: Number(t.count),
      })) as TagCount[];
      setTags(tags);
      return tags;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllLinks() {
  const { actor, isFetching } = useBackendActor();
  const setLinks = useStore((s) => s.setLinks);
  return useQuery<NoteLink[]>({
    queryKey: ["links"],
    queryFn: async () => {
      const a = getActor(actor);
      const links = (await a.getAllLinks()) as NoteLink[];
      setLinks(links);
      return links;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBacklinks(noteId: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<NoteLink[]>({
    queryKey: ["backlinks", noteId],
    queryFn: async () => {
      if (!noteId) return [];
      const a = getActor(actor);
      const result = await a.getBacklinks(noteId);
      return result as NoteLink[];
    },
    enabled: !!actor && !isFetching && !!noteId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateNote() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      content?: string;
      folderId?: string | null;
      tags?: string[];
    }) => {
      const a = getActor(actor);
      const created = await a.createNote(
        input.title || "Untitled",
        input.content ?? "",
        input.folderId ?? null,
        input.tags ?? [],
      );
      return normalizeNote(created as Note);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateNote() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  const updateNoteStore = useStore((s) => s.updateNote);

  return useMutation({
    mutationFn: async (partial: Partial<Note> & { id: string }) => {
      const a = getActor(actor);
      // Backend signature: updateNote(id, title, content, folderId, tags) → Note | null
      const updated = await a.updateNote(
        partial.id,
        partial.title ?? "",
        partial.content ?? "",
        partial.folderId ?? null,
        partial.tags ?? [],
      );
      if (!updated) throw new Error("Note not found — save failed.");
      return normalizeNote(updated as Note);
    },
    onSuccess: (note) => {
      updateNoteStore(note.id, note);
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteNote() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  const removeNote = useStore((s) => s.removeNote);

  return useMutation({
    mutationFn: async (id: string) => {
      if (actor) {
        const a = getActor(actor);
        await a.deleteNote(id);
      }
      return id;
    },
    onSuccess: (id) => {
      removeNote(id);
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useCreateFolder() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  const addFolder = useStore((s) => s.addFolder);
  const replaceFolder = useStore((s) => s.replaceFolder);

  return useMutation({
    mutationFn: async (input: {
      name: string;
      parentId?: string | null;
      tempId: string;
    }) => {
      const a = getActor(actor);
      const created = await a.createFolder(input.name, input.parentId ?? null);
      return {
        folder: normalizeFolder(created as Folder),
        tempId: input.tempId,
      };
    },
    onMutate: ({ name, parentId, tempId }) => {
      // Optimistic: add immediately with temp ID
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      addFolder({
        id: tempId,
        name,
        parentId: parentId ?? null,
        createdAt: now,
      });
    },
    onSuccess: ({ folder, tempId }) => {
      // Atomically swap temp folder with real server folder
      replaceFolder(tempId, folder);
      // Invalidate so next refetch syncs server state (but store already has it)
      qc.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (_err, { tempId }) => {
      // Roll back optimistic folder on failure
      useStore.getState().removeFolder(tempId);
    },
  });
}

export function useDeleteFolder() {
  const { actor } = useBackendActor();
  const removeFolder = useStore((s) => s.removeFolder);

  return useMutation({
    mutationFn: async (id: string) => {
      if (actor) {
        const a = getActor(actor);
        await a.deleteFolder(id);
      }
      return id;
    },
    onSuccess: (id) => {
      removeFolder(id);
    },
  });
}

export function useSetNoteLinks() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  const setNoteLinks = useStore((s) => s.setNoteLinks);

  return useMutation({
    mutationFn: async ({
      fromNoteId,
      toNoteIds,
    }: {
      fromNoteId: string;
      toNoteIds: string[];
    }) => {
      if (actor) {
        const a = getActor(actor);
        await a.setNoteLinks(fromNoteId, toNoteIds);
      }
      return { fromNoteId, toNoteIds };
    },
    onSuccess: ({ fromNoteId, toNoteIds }) => {
      setNoteLinks(fromNoteId, toNoteIds);
      qc.invalidateQueries({ queryKey: ["links"] });
      qc.invalidateQueries({ queryKey: ["backlinks", fromNoteId] });
    },
  });
}

// ── Bootstrap hook (call once at app root) ────────────────────────────────────

export function useBootstrap() {
  useAllNotes();
  useAllFolders();
  useAllTags();
  useAllLinks();
}
