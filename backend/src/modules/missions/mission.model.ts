import mongoose, { Schema, Document } from 'mongoose';
import type { CEFRLevel, MissionCategory, Language } from '../../types.js';

export interface IMission extends Document {
  title: string;
  slug: string;
  language: Language;
  category: MissionCategory;
  level: CEFRLevel;
  order: number;
  description: string;
  scenarioPrompt: string;
  npcName: string;
  npcRole: string;
  requiredPhrases: string[];
  vocabulary: { danish: string; english: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const missionSchema = new Schema<IMission>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    language: { type: String, enum: ['da'], required: true, default: 'da' },
    category: {
      type: String,
      enum: ['health', 'housing', 'shopping', 'work', 'social',
        'technology', 'education', 'government', 'finance', 'citizenship'],
      required: true,
    },
    level: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1'], required: true },
    description: { type: String, required: true },
    scenarioPrompt: { type: String, required: true },
    npcName: { type: String, required: true },
    npcRole: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
    requiredPhrases: [{ type: String }],
    vocabulary: [{ danish: { type: String, required: true }, english: { type: String, required: true } }],
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { transform(_doc, ret) { ret.id = ret._id.toString(); return ret; } },
  }
);

export default mongoose.model<IMission>('Mission', missionSchema);
