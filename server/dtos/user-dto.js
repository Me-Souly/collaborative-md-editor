export default class UserDto {
    id;
    email;
    login;
    name;
    role;
    isActivated;
    avatarUrl;
    about;

    constructor(model) {
        this.id = model._id;
        this.email = model.email;
        this.login = model.login;
        this.name = model.name || model.login; // если имя не задано — показываем логин
        this.role = model.roleId?.name || model.roleId || 'user';
        this.isActivated = model.isActivated;
        this.avatarUrl = model.avatarUrl || null;
        this.about = model.about || null;
    }
}
