import { BaseRepository } from '../base/index.js';

class MongoBaseRepository extends BaseRepository {
  constructor(model) {
    super();
    this.model = model;
  }

  async findOneBy(filter) {
    return this.model.findOne({ ...filter });
  }

  async findBy(filter = {}) {
    return this.model.find({ ...filter });
  }

  async findById(id) {
    return this.model.findById(id);
  }

  async create(data) {
    return this.model.create(data);
  }

  async updateByIdAtomic(id, updateData, options = {}) {
    const finalOptions = { new: true, ...options };
    return this.model.findByIdAndUpdate(id, { $set: { ...updateData } }, finalOptions);
  }

  async updateOneAtomic(filter, updateData, options = {}) {
    const finalOptions = { new: true, ...options };
    return this.model.findOneAndUpdate({ ...filter }, { $set: { ...updateData } }, finalOptions);
  }

  async upsertOneAtomic(filter, data, options = {}) {
    const finalOptions = { new: true, upsert: true, ...options };
    return this.model.findOneAndUpdate({ ...filter }, { $set: { ...data } }, finalOptions);
  }

  async save(entity) {
    return entity.save();
  }

  async softDelete(id) {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    return doc;
  }

  async findAll() {
    return this.model.find();
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }

  async deleteOne(filter) {
    return this.model.deleteOne({ ...filter });
  }

  async deleteMany(filter) {
    return this.model.deleteMany({ ...filter });
  }

  async count(filter = {}) {
    return this.model.countDocuments({ ...filter });
  }
}

export default MongoBaseRepository;
