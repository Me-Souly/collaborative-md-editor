import { roleRepository } from '../repositories/index.js';

class RoleService {
    async findOneBy(filter) {
        return await roleRepository.findOneBy(filter);
    }
}

export default new RoleService();