import Common "common";

module {
  public type Note = {
    id : Common.NoteId;
    title : Text;
    content : Text;
    folderId : ?Common.FolderId;
    tags : [Common.Tag];
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };

  public type NoteLink = {
    fromNoteId : Common.NoteId;
    toNoteId : Common.NoteId;
  };

  public type TagCount = {
    tag : Common.Tag;
    count : Nat;
  };
};
