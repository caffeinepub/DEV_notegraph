import Map "mo:core/Map";
import List "mo:core/List";
import Common "../types/common";
import FolderTypes "../types/folders";

module {
  public type FolderMap = Map.Map<Common.FolderId, FolderTypes.Folder>;

  public func getAllFolders(folders : FolderMap) : [FolderTypes.Folder] {
    let result = List.empty<FolderTypes.Folder>();
    for ((_, folder) in folders.entries()) {
      result.add(folder);
    };
    result.toArray()
  };

  public func createFolder(folders : FolderMap, id : Common.FolderId, name : Text, parentId : ?Common.FolderId, now : Common.Timestamp) : FolderTypes.Folder {
    let folder : FolderTypes.Folder = { id; name; parentId; createdAt = now };
    folders.add(id, folder);
    folder
  };

  public func renameFolder(folders : FolderMap, id : Common.FolderId, name : Text) : ?FolderTypes.Folder {
    switch (folders.get(id)) {
      case null null;
      case (?existing) {
        let updated : FolderTypes.Folder = { existing with name };
        folders.add(id, updated);
        ?updated
      };
    }
  };

  public func deleteFolder(folders : FolderMap, id : Common.FolderId) : Bool {
    switch (folders.get(id)) {
      case null false;
      case (?_) {
        folders.remove(id);
        true
      };
    }
  };
};
