import bcrypt from 'bcrypt';

async function initDatabase(roleRepo, userRepo) {
    // Инициализация ролей
    const roles = ['moderator', 'user'];
    for (const roleName of roles) {
        let role = await roleRepo.findOneBy({ name: roleName });
        if (!role) {
            await roleRepo.create({ name: roleName });
            console.log(`Role "${roleName}" created`);
        }
    }

    // Создание модератора
    let admin = await userRepo.findOneBy({ email: process.env.MODERATOR_EMAIL });
    if (!admin) {
        const role = await roleRepo.findOneBy({ name: 'moderator' });
        const passwordHash = await bcrypt.hash(process.env.MODERATOR_PASSWORD, 10);
        const newAdmin = {
            email: process.env.MODERATOR_EMAIL,
            email_lower: process.env.MODERATOR_EMAIL.toLowerCase(),
            login: process.env.MODERATOR_LOGIN,
            passwordHash: passwordHash,
            name: 'Moderator',
            roleId: role._id,
            isActivated: true
        };
        await userRepo.create(newAdmin);
        console.log(`User "${process.env.MODERATOR_LOGIN}" created with role "${role}"`);
    }
}

export default initDatabase;
