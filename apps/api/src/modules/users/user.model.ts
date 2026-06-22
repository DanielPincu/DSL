import mongoose, { Schema, Document } from 'mongoose';
import type { Language, LanguageProgress } from '@dls/shared';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  activeLanguage: Language;
  progress: Record<string, LanguageProgress>;
  createdAt: Date;
  updatedAt: Date;
}

const languageProgressSchema = new Schema<LanguageProgress>(
  {
    estimatedLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
    selectedLevel: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
    levelSource: { type: String, enum: ['assessment', 'user_override'] },
    levelConfidence: { type: Number, min: 0, max: 100 },
    placementCompleted: { type: Boolean, default: false },
    target: { type: String, enum: ['daily_life', 'work', 'citizenship', 'exam'] },
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
    activeLanguage: { type: String, enum: ['da', 'es'], default: 'da' },
    progress: { type: Schema.Types.Mixed, default: {} },
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
        for (const lang of ['da', 'es']) {
          if (!(obj.progress as Record<string, unknown>)[lang]) {
            (obj.progress as Record<string, unknown>)[lang] = {
              placementCompleted: false,
              strengths: [],
              weaknesses: [],
            };
          }
        }
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

export default mongoose.model<IUser>('User', userSchema);
