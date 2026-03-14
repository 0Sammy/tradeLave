import mongoose from 'mongoose';
import { buildApp } from './app';
import { PORT, DATABASE_URL } from './config';
import { initSocket } from './utils/socket';

const startServer = async () => {
  const app = await buildApp();

  async function connectToDatabase() {
    try {
      await mongoose.connect(DATABASE_URL);
      app.log.info('MongoDB connected');
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  }

  try {
    await connectToDatabase();

    const address = await app.listen({ port: PORT, host: '0.0.0.0' });

    const server = app.server;
    initSocket(server);

    app.log.info(`Server listening at ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

startServer();
