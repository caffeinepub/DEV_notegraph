import Map "mo:core/Map";
import List "mo:core/List";
import Common "../types/common";
import NoteTypes "../types/notes";

module {
  public type NoteMap = Map.Map<Common.NoteId, NoteTypes.Note>;
  public type LinkList = List.List<NoteTypes.NoteLink>;

  public func getAllNotes(notes : NoteMap) : [NoteTypes.Note] {
    let result = List.empty<NoteTypes.Note>();
    for ((_, note) in notes.entries()) {
      result.add(note);
    };
    result.toArray()
  };

  public func getNoteById(notes : NoteMap, id : Common.NoteId) : ?NoteTypes.Note {
    notes.get(id)
  };

  public func getNotesByFolder(notes : NoteMap, folderId : Common.FolderId) : [NoteTypes.Note] {
    let result = List.empty<NoteTypes.Note>();
    for ((_, note) in notes.entries()) {
      switch (note.folderId) {
        case (?f) if (f == folderId) result.add(note);
        case null {};
      };
    };
    result.toArray()
  };

  public func getNotesByTag(notes : NoteMap, tag : Common.Tag) : [NoteTypes.Note] {
    let result = List.empty<NoteTypes.Note>();
    for ((_, note) in notes.entries()) {
      let hasTag = List.fromArray(note.tags).find(func(t : Text) : Bool { t == tag });
      if (hasTag != null) result.add(note);
    };
    result.toArray()
  };

  public func searchNotes(notes : NoteMap, searchTerm : Text) : [NoteTypes.Note] {
    let lower = searchTerm.toLower();
    let result = List.empty<NoteTypes.Note>();
    for ((_, note) in notes.entries()) {
      if (note.title.toLower().contains(#text lower) or note.content.toLower().contains(#text lower)) {
        result.add(note);
      };
    };
    result.toArray()
  };

  public func getAllTags(notes : NoteMap) : [NoteTypes.TagCount] {
    let tagCounts = Map.empty<Text, Nat>();
    for ((_, note) in notes.entries()) {
      for (tag in note.tags.values()) {
        let current = switch (tagCounts.get(tag)) {
          case (?c) c;
          case null 0;
        };
        tagCounts.add(tag, current + 1);
      };
    };
    let result = List.empty<NoteTypes.TagCount>();
    for ((tag, count) in tagCounts.entries()) {
      result.add({ tag; count });
    };
    result.toArray()
  };

  public func createNote(notes : NoteMap, id : Common.NoteId, title : Text, content : Text, folderId : ?Common.FolderId, tags : [Common.Tag], now : Common.Timestamp) : NoteTypes.Note {
    let note : NoteTypes.Note = {
      id;
      title;
      content;
      folderId;
      tags;
      createdAt = now;
      updatedAt = now;
    };
    notes.add(id, note);
    note
  };

  public func updateNote(notes : NoteMap, id : Common.NoteId, title : Text, content : Text, folderId : ?Common.FolderId, tags : [Common.Tag], now : Common.Timestamp) : ?NoteTypes.Note {
    switch (notes.get(id)) {
      case null null;
      case (?existing) {
        let updated : NoteTypes.Note = { existing with title; content; folderId; tags; updatedAt = now };
        notes.add(id, updated);
        ?updated
      };
    }
  };

  public func deleteNote(notes : NoteMap, id : Common.NoteId) : Bool {
    switch (notes.get(id)) {
      case null false;
      case (?_) {
        notes.remove(id);
        true
      };
    }
  };

  public func getBacklinks(links : LinkList, noteId : Common.NoteId) : [NoteTypes.NoteLink] {
    links.filter(func(l : NoteTypes.NoteLink) : Bool { l.toNoteId == noteId }).toArray()
  };

  public func getAllLinks(links : LinkList) : [NoteTypes.NoteLink] {
    links.toArray()
  };

  public func getLinksByNote(links : LinkList, noteId : Common.NoteId) : [NoteTypes.NoteLink] {
    links.filter(func(l : NoteTypes.NoteLink) : Bool { l.fromNoteId == noteId }).toArray()
  };

  public func setNoteLinks(links : LinkList, fromNoteId : Common.NoteId, toNoteIds : [Common.NoteId]) {
    let retained = links.filter(func(l : NoteTypes.NoteLink) : Bool { l.fromNoteId != fromNoteId });
    links.clear();
    links.append(retained);
    for (toNoteId in toNoteIds.values()) {
      links.add({ fromNoteId; toNoteId });
    };
  };
};
