import Time "mo:core/Time";
import Common "../types/common";
import NoteTypes "../types/notes";
import NoteLib "../lib/notes";

mixin (notes : NoteLib.NoteMap, links : NoteLib.LinkList) {

  public query func getAllNotes() : async [NoteTypes.Note] {
    NoteLib.getAllNotes(notes)
  };

  public query func getNoteById(id : Common.NoteId) : async ?NoteTypes.Note {
    NoteLib.getNoteById(notes, id)
  };

  public query func getNotesByFolder(folderId : Common.FolderId) : async [NoteTypes.Note] {
    NoteLib.getNotesByFolder(notes, folderId)
  };

  public query func getNotesByTag(tag : Common.Tag) : async [NoteTypes.Note] {
    NoteLib.getNotesByTag(notes, tag)
  };

  public query func searchNotes(searchQuery : Text) : async [NoteTypes.Note] {
    NoteLib.searchNotes(notes, searchQuery)
  };

  public query func getAllTags() : async [NoteTypes.TagCount] {
    NoteLib.getAllTags(notes)
  };

  public query func getBacklinks(noteId : Common.NoteId) : async [NoteTypes.NoteLink] {
    NoteLib.getBacklinks(links, noteId)
  };

  public query func getAllLinks() : async [NoteTypes.NoteLink] {
    NoteLib.getAllLinks(links)
  };

  public query func getLinksByNote(noteId : Common.NoteId) : async [NoteTypes.NoteLink] {
    NoteLib.getLinksByNote(links, noteId)
  };

  public func createNote(title : Text, content : Text, folderId : ?Common.FolderId, tags : [Common.Tag]) : async NoteTypes.Note {
    let id = Time.now().toText();
    NoteLib.createNote(notes, id, title, content, folderId, tags, Time.now())
  };

  public func updateNote(id : Common.NoteId, title : Text, content : Text, folderId : ?Common.FolderId, tags : [Common.Tag]) : async ?NoteTypes.Note {
    NoteLib.updateNote(notes, id, title, content, folderId, tags, Time.now())
  };

  public func deleteNote(id : Common.NoteId) : async Bool {
    NoteLib.deleteNote(notes, id)
  };

  public func setNoteLinks(fromNoteId : Common.NoteId, toNoteIds : [Common.NoteId]) : async () {
    NoteLib.setNoteLinks(links, fromNoteId, toNoteIds)
  };

};
