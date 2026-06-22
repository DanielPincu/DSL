import mongoose, { Schema, Document } from 'mongoose';
import type { CEFRLevel, LearningTarget, LevelSource } from '@dls/shared';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  estimatedLevel?: CEFRLevel;
  selectedLevel?: CEFRLevel;
  levelSource?: LevelSource;
  levelConfidence?: number;
  placementCompleted: boolean;
  target?: LearningTarget;
  strengths: string[];
  weaknesses: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedLevel: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2'],
    },
    selectedLevel: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2'],
    },
    levelSource: {
      type: String,
      enum: ['assessment', 'user_override'],
    },
    levelConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    placementCompleted: {
      type: Boolean,
      default: false,
    },
    target: {
      type: String,
      enum: ['daily_life', 'work', 'citizenship', 'exam'],
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        const obj = ret as Record<string, unknown>;
        obj.id = obj._id?.toString();
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

export default mongoose.model<IUser>('User', userSchema);
