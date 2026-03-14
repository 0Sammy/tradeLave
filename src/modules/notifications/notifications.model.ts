import mongoose, { model, Schema, Document } from 'mongoose';

export enum NotificationType {
  TRANSACTION = 'transaction',
  SYSTEM = 'system',
  ALERT = 'alert',
}

export type NotificationDocument = Document & {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  subType: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<NotificationDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.SYSTEM,
    },
    subType: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const NotificationModel = model<NotificationDocument>(
  'Notification',
  notificationSchema
);

export default NotificationModel;
