import NotificationModel from './notifications.model';

//Schemas
import { CreateNotificationInput } from './notifications.schema';

//Create new notification
export const createNotification = async (
  user: string,
  input: CreateNotificationInput
) => {
  const notification = await NotificationModel.create({ user, ...input });

  return notification;
};

//Get a users notifications
export const getUserNotifications = async (user: string) => {
  return NotificationModel.find({ user }).sort({ createdAt: -1 });
};

//Mark a notification as read
export const markAsRead = async (notificationId: string) => {
  return NotificationModel.findByIdAndUpdate(
    notificationId,
    { read: true },
    { new: true }
  );
};

//Delete a notification
export const deleteNotification = async (notificationId: string) => {
  return NotificationModel.findByIdAndDelete(notificationId);
};

//Check a user actually owns the notificationId
export const isNotificationOwnedByUser = async (
  notificationId: string,
  user: string
): Promise<boolean> => {
  const notification = await NotificationModel.findOne({
    _id: notificationId,
    user,
  });

  return !!notification;
};
