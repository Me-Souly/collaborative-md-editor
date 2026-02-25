import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true },
  email_lower: { type: String, required: true, index: true, unique: true },
  login: { type: String, required: true, index: true, unique: true },
  passwordHash: { type: String, required: true },
  name: String,
  about: String,
  avatarUrl: String,
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  isActivated: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

UserSchema.pre('save', function (next) {
  if (this.isModified('email')) this.email_lower = this.email.toLowerCase();
  next();
});

export default model('User', UserSchema);