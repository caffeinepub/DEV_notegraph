import type { backendInterface } from "../backend";

const now = BigInt(Date.now()) * BigInt(1_000_000);

const sampleFolders = [
  {
    id: "folder-1",
    name: "Research",
    createdAt: now,
    parentId: undefined,
  },
  {
    id: "folder-2",
    name: "Projects",
    createdAt: now,
    parentId: undefined,
  },
  {
    id: "folder-3",
    name: "Reading Notes",
    createdAt: now,
    parentId: "folder-1",
  },
];

const sampleNotes = [
  {
    id: "note-1",
    title: "Welcome to Knowledge Base",
    content:
      "<h2>Getting Started</h2><p>This is your personal knowledge base. Create notes, link them together, and explore the graph view to see connections.</p><p>Use <strong>Cmd+N</strong> to create a new note, <strong>Cmd+K</strong> to search, and <strong>Cmd+Shift+L</strong> to insert a note link.</p>",
    createdAt: now,
    updatedAt: now,
    tags: ["meta", "guide"],
    folderId: undefined,
  },
  {
    id: "note-2",
    title: "Zettelkasten Method",
    content:
      "<h2>Overview</h2><p>The Zettelkasten method is a personal knowledge management system. Each note should be atomic — one idea per note.</p><h3>Key Principles</h3><ul><li>Unique identifiers for each note</li><li>Links between related notes</li><li>Index notes for navigation</li></ul>",
    createdAt: now,
    updatedAt: now,
    tags: ["methodology", "pkm"],
    folderId: "folder-1",
  },
  {
    id: "note-3",
    title: "Building a Second Brain",
    content:
      "<h2>PARA Method</h2><p>Tiago Forte's PARA method organizes information into Projects, Areas, Resources, and Archives.</p><p>See also: [[Zettelkasten Method]] for atomic note-taking.</p>",
    createdAt: now,
    updatedAt: now,
    tags: ["methodology", "pkm", "productivity"],
    folderId: "folder-1",
  },
  {
    id: "note-4",
    title: "Graph Theory Basics",
    content:
      "<h2>Nodes and Edges</h2><p>A graph consists of vertices (nodes) connected by edges. In a knowledge graph, notes are nodes and links are edges.</p><pre><code>G = (V, E)\nwhere V = vertices, E = edges</code></pre>",
    createdAt: now,
    updatedAt: now,
    tags: ["math", "computer-science"],
    folderId: "folder-2",
  },
  {
    id: "note-5",
    title: "Deep Work by Cal Newport",
    content:
      "<h2>Core Thesis</h2><p>Deep work is the ability to focus without distraction on cognitively demanding tasks. It's becoming increasingly rare and valuable.</p><blockquote>Clarity about what matters provides clarity about what does not.</blockquote>",
    createdAt: now,
    updatedAt: now,
    tags: ["books", "productivity"],
    folderId: "folder-3",
  },
];

const sampleLinks = [
  { fromNoteId: "note-3", toNoteId: "note-2" },
  { fromNoteId: "note-4", toNoteId: "note-1" },
  { fromNoteId: "note-5", toNoteId: "note-3" },
];

export const mockBackend: backendInterface = {
  createFolder: async (name, _parentId) => ({
    id: `folder-${Date.now()}`,
    name,
    createdAt: now,
    parentId: undefined,
  }),

  createNote: async (title, content, folderId, tags) => ({
    id: `note-${Date.now()}`,
    title,
    content,
    createdAt: now,
    updatedAt: now,
    tags,
    folderId: folderId ?? undefined,
  }),

  deleteFolder: async (_id) => true,

  deleteNote: async (_id) => true,

  getAllFolders: async () => sampleFolders,

  getAllLinks: async () => sampleLinks,

  getAllNotes: async () => sampleNotes,

  getAllTags: async () => [
    { tag: "meta", count: BigInt(1) },
    { tag: "guide", count: BigInt(1) },
    { tag: "methodology", count: BigInt(2) },
    { tag: "pkm", count: BigInt(2) },
    { tag: "productivity", count: BigInt(2) },
    { tag: "math", count: BigInt(1) },
    { tag: "computer-science", count: BigInt(1) },
    { tag: "books", count: BigInt(1) },
  ],

  getBacklinks: async (noteId) =>
    sampleLinks.filter((l) => l.toNoteId === noteId),

  getLinksByNote: async (noteId) =>
    sampleLinks.filter((l) => l.fromNoteId === noteId),

  getNoteById: async (id) => sampleNotes.find((n) => n.id === id) ?? null,

  getNotesByFolder: async (folderId) =>
    sampleNotes.filter((n) => n.folderId === folderId),

  getNotesByTag: async (tag) =>
    sampleNotes.filter((n) => n.tags.includes(tag)),

  renameFolder: async (id, name) => {
    const folder = sampleFolders.find((f) => f.id === id);
    return folder ? { ...folder, name } : null;
  },

  searchNotes: async (query) =>
    sampleNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase())
    ),

  setNoteLinks: async (_fromNoteId, _toNoteIds) => undefined,

  updateNote: async (id, title, content, folderId, tags) => {
    const note = sampleNotes.find((n) => n.id === id);
    return note
      ? { ...note, title, content, folderId: folderId ?? undefined, tags, updatedAt: now }
      : null;
  },
};
