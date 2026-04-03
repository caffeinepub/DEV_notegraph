import Time "mo:core/Time";
import Common "../types/common";
import FolderTypes "../types/folders";
import FolderLib "../lib/folders";

mixin (folders : FolderLib.FolderMap) {

  public query func getAllFolders() : async [FolderTypes.Folder] {
    FolderLib.getAllFolders(folders)
  };

  public func createFolder(name : Text, parentId : ?Common.FolderId) : async FolderTypes.Folder {
    let id = Time.now().toText();
    FolderLib.createFolder(folders, id, name, parentId, Time.now())
  };

  public func renameFolder(id : Common.FolderId, name : Text) : async ?FolderTypes.Folder {
    FolderLib.renameFolder(folders, id, name)
  };

  public func deleteFolder(id : Common.FolderId) : async Bool {
    FolderLib.deleteFolder(folders, id)
  };

};
