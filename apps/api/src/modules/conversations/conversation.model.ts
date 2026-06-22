import mongoose, { Schema, Document } from 'mongoose';
import type { Message, ConversationStatus } from '@dls/shared';

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  missionId: mongoose.Types.ObjectId;
  messages: Message[];
  status: ConversationStatus;
  finalScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<Message>(
  {
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    missionId: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
    messages: [messageSchema],
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    finalScore: { type: Number, min: 0, max: 100 },
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

export default mongoose.model<IConversation>('Conversation', conversationSchema);
