import { FastifyRequest, FastifyReply } from 'fastify';

//Services
import { deleteNotification, getUserNotifications, isNotificationOwnedByUser, markAsRead } from './notifications.services';

//Schemas
import {
  CreateAdminNotificationInput,
  ReadNotificationInput,
} from './notifications.schema';

//Utils
import { sendResponse } from '../../utils/response.utils';
import { findAdminById } from '../admin/admin.service';
import { emitAndSaveNotification } from '../../utils/socket';

//Get a user notifications
export const getNotificationsHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const user = decodedDetails.userId;

  const notifications = await getUserNotifications(user);
  return sendResponse(reply, 200, true, 'Your notifications was fetched successfully', notifications);
};

//Mark a notification as read
export const markNotificationReadHandler = async (request: FastifyRequest<{ Params: ReadNotificationInput }>, reply: FastifyReply) => {

  const { notificationId } = request.params;

  const decodedDetails = request.user;
  const user = decodedDetails.userId;

  //Make sure it is the user that owns the notification
  const exists = await isNotificationOwnedByUser(notificationId, user);
  if (!exists) return sendResponse(reply, 403, false, "Sorry, you can't perform this action");

  const updated = await markAsRead(notificationId);
  return sendResponse(reply, 200, true, 'Notification was marked as read successfully', updated);
};

//Delete a notification
export const deleteNotificationHandler = async (request: FastifyRequest<{ Params: ReadNotificationInput }>, reply: FastifyReply) => {

  const { notificationId } = request.params;

  const decodedDetails = request.user;
  const user = decodedDetails.userId;

  //Make sure it is the user that owns the notification
  const exists = await isNotificationOwnedByUser(notificationId, user);
  if (!exists) return sendResponse(reply, 403, false, "Sorry, you can't perform this action");

  const deleted = await deleteNotification(notificationId);

  if (!deleted) { return sendResponse(reply, 404, false, 'Notification not found'); }

  return sendResponse(reply, 200, true, 'Notification was deleted successfully');
};

//Admin Endpoint

//Send Notification to any user
export const sendNotificationHandler = async (request: FastifyRequest<{ Body: CreateAdminNotificationInput }>, reply: FastifyReply) => {

  const decodedAdmin = request.user;

  //Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 401, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  const newNotification = await emitAndSaveNotification(request.body);
  return sendResponse(reply, 200, true, 'Notification was sent successfully', newNotification);
};
