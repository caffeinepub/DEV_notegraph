import Map "mo:core/Map";
import List "mo:core/List";
import Common "types/common";
import NoteTypes "types/notes";
import FolderTypes "types/folders";
import NoteLib "lib/notes";
import FolderLib "lib/folders";
import NotesApi "mixins/notes-api";
import FoldersApi "mixins/folders-api";

actor {
  let notes : NoteLib.NoteMap = Map.empty<Common.NoteId, NoteTypes.Note>();
  let links : NoteLib.LinkList = List.empty<NoteTypes.NoteLink>();
  let folders : FolderLib.FolderMap = Map.empty<Common.FolderId, FolderTypes.Folder>();

  include NotesApi(notes, links);
  include FoldersApi(folders);
};
