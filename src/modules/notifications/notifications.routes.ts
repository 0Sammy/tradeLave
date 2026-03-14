import { FastifyInstance } from 'fastify';

// Handlers
import { deleteNotificationHandler, getNotificationsHandler, markNotificationReadHandler, sendNotificationHandler } from './notifications.controller';

// Middlewares
import { hasPermission } from '../../middlewares/auth';

// Schemas
import { CreateAdminNotificationInput, notificationRef, ReadNotificationInput } from './notifications.schema';
import { generalRef } from '../general/general.schema';

export default async function notificationRoutes(app: FastifyInstance) {

  //Get user notifications
  app.get('/getNotifications', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Notifications', 'Users'],
      security: [{ bearerAuth: [] }],
    },
  },
    getNotificationsHandler
  );

  //Mark a notification as read
  app.patch<{ Params: ReadNotificationInput }>('/markRead/:notificationId',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['Notifications', 'Users'],
        security: [{ bearerAuth: [] }],
        params: notificationRef('readNotificationSchema'),
        response: {
          200: notificationRef('generalNotificationResponseSchema'),
          403: generalRef('forbiddenSchema'),
        },
      },
    },
    markNotificationReadHandler
  );

  //Delete notification
  app.delete<{ Params: ReadNotificationInput }>(
    '/delete/:notificationId',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['Notifications', 'Users'],
        security: [{ bearerAuth: [] }],
        params: notificationRef('readNotificationSchema'),
        response: {
          200: generalRef('responseSchema'),
          404: generalRef('unavailableSchema'),
        },
      },
    },
    deleteNotificationHandler
  );

  // Admin Route
  app.post<{ Body: CreateAdminNotificationInput }>(
    '/create',
    {
      preHandler: [
        app.authenticate,
        hasPermission(["super_admin"])
      ],
      schema: {
        tags: ['Notifications', 'Admins'],
        security: [{ bearerAuth: [] }],
        body: notificationRef('createAdminNotificationSchema'),
        response: {
          200: notificationRef('generalNotificationResponseSchema'),
          401: generalRef('unauthorizedSchema'),
          403: generalRef('forbiddenSchema'),
        },
      },
    },
    sendNotificationHandler
  );
}
