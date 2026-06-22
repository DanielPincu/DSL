import mongoose, { Schema, Document } from 'mongoose';
import type { Correction, Language } from '@dls/shared';

export interface IAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  missionId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  language: Language;
  userInput: string;
  aiReply: string;
  corrections: Correction[];
  score: number;
  feedback: string;
  createdAt: Date;
}

const correctionSchema = new Schema<Correction>(
  {
    original: { type: String, required: true },
    corrected: { type: String, required: true },
    explanation: { type: String, required: true },
    type: { type: String, enum: ['grammar', 'vocabulary', 'word_order', 'spelling', 'phrase'], required: true },
  },
  { _id: false }
);

const attemptSchema = new Schema<IAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    language: { type: String, enum: ['da', 'es'], required: true, default: 'da' },
    userInput: { type: String, required: true },
    aiReply: { type: String, required: true },
    corrections: [correctionSchema],
    score: { type: Number, min: 0, max: 100, required: true },
    feedback: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: { transform(_doc, ret) { ret.id = ret._id.toString(); return ret; } },
  }
);

export default mongoose.model<IAttempt>('Attempt', attemptSchema);
