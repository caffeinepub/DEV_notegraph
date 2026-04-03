import Common "common";

module {
  public type Folder = {
    id : Common.FolderId;
    name : Text;
    parentId : ?Common.FolderId;
    createdAt : Common.Timestamp;
  };
};
