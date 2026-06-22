import mongoose, { Schema, Document } from 'mongoose';
import type { CEFRLevel, MissionCategory } from '@dls/shared';

export interface IMission extends Document {
  title: string;
  slug: string;
  category: MissionCategory;
  level: CEFRLevel;
  description: string;
  scenarioPrompt: string;
  npcName: string;
  npcRole: string;
  requiredPhrases: string[];
  createdAt: Date;
  updatedAt: Date;
}

const missionSchema = new Schema<IMission>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: [
        'health', 'housing', 'shopping', 'work', 'social',
        'technology', 'education', 'government', 'finance', 'citizenship',
      ],
      required: true,
    },
    level: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2'],
      required: true,
    },
    description: { type: String, required: true },
    scenarioPrompt: { type: String, required: true },
    npcName: { type: String, required: true },
    npcRole: { type: String, required: true },
    requiredPhrases: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

export default mongoose.model<IMission>('Mission', missionSchema);
