import { Server } from 'socket.io';

//Services
import {
  createNotification,
  getUserNotifications,
} from '../modules/notifications/notifications.services';
import { updateUserSession } from '../modules/user/user.service';

//Utils
import { allowedOrigins } from './cors';

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) {
          cb(null, origin);
        } else {
          cb(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinRoom', async (user: string) => {
      if (!user || !user.trim()) return;
      socket.join(user);
      await updateUserSession(user);
      const userNotifications = await getUserNotifications(user);
      io.to(user).emit('allNotifications', userNotifications);
      console.log(`User ${user} joined room ${user}`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};

//Function to emit and save a users notifications
export const emitAndSaveNotification = async ({
  user,
  type,
  subType,
  title,
  message,
}: {
  user: string;
  type: 'transaction' | 'system' | 'alert';
  subType: string;
  title: string;
  message: string;
}) => {
  const notification = await createNotification(user, {
    type,
    subType,
    title,
    message,
  });

  if (io) {
    io.to(user).emit('notification', notification);
  }

  return notification;
};
