export default class FolderDTO {
    id;
    name;
    parentId;
    color;
    updatedAt;

    constructor(folder) {
        this.id = folder._id;
        this.name = folder.title;
        this.parentId = folder.parentId;
        this.color = folder.color;
        this.updatedAt = folder.updatedAt;
    }
}
