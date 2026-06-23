import mongoose, { Schema, Document } from 'mongoose';
import type { Language, LanguageProgress } from '../../types.js';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  activeLanguage: Language;
  progress: Record<string, LanguageProgress>;
  learnedVocab: string[];
  passedLevelQuizzes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const languageProgressSchema = new Schema<LanguageProgress>(
  {
    selectedLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    activeLanguage: { type: String, enum: ['da'], default: 'da' },
    progress: { type: Schema.Types.Mixed, default: {} },
    learnedVocab: [{ type: String }],
    passedLevelQuizzes: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const obj = ret as Record<string, unknown>;
        obj.id = obj._id?.toString();
        if (!obj.progress) obj.progress = {};
        // Ensure default progress exists
        for (const lang of ['da']) {
          if (!(obj.progress as Record<string, unknown>)[lang]) {
            (obj.progress as Record<string, unknown>)[lang] = { selectedLevel: 'A1', strengths: [], weaknesses: [] };
          }
        }
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

export default mongoose.model<IUser>('User', userSchema);
