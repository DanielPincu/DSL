import mongoose, { Schema, Document } from 'mongoose';
import type { MistakeType, Language } from '@dls/shared';

export interface IMistake extends Document {
  userId: mongoose.Types.ObjectId;
  missionId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  language: Language;
  originalText: string;
  correctedText: string;
  explanation: string;
  type: MistakeType;
  mastered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mistakeSchema = new Schema<IMistake>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    language: { type: String, enum: ['da', 'es'], required: true, default: 'da' },
    originalText: { type: String, required: true },
    correctedText: { type: String, required: true },
    explanation: { type: String, required: true },
    type: { type: String, enum: ['grammar', 'vocabulary', 'word_order', 'spelling', 'phrase'], required: true },
    mastered: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { transform(_doc, ret) { ret.id = ret._id.toString(); return ret; } },
  }
);

export default mongoose.model<IMistake>('Mistake', mistakeSchema);
