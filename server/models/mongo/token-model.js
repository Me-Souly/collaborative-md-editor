import { Schema, model } from 'mongoose';

const TokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true },
  type: { type: String, enum: ['refresh', 'reset', 'activation'], default: 'refresh' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model('Token', TokenSchema);
