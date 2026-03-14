import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import plugin from 'fastify-plugin';

// Middlewares
import { authenticate } from './middlewares/auth';

// Schemas
import { userSchemas } from './modules/user/user.schema';
import { generalSchemas } from './modules/general/general.schema';
import { authSchemas } from './modules/auth/auth.schema';
import { transactionSchemas } from './modules/transaction/transaction.schema';
import { adminSchemas } from './modules/admin/admin.schema';
import { notificationSchemas } from './modules/notifications/notifications.schema';
import { depositRequestSchemas } from './modules/depositRequest/depositRequest.schema';
import { planSchemas } from './modules/plans/plans.schema';
import { referralSchemas } from './modules/referral/referral.schema';
import { investmentSchemas } from './modules/investment/investment.schema';

// Routes
import userRoutes from './modules/user/user.route';
import authRoutes from './modules/auth/auth.route';
import transactionRoutes from './modules/transaction/transaction.route';
import adminRoutes from './modules/admin/admin.route';
import notificationRoutes from './modules/notifications/notifications.routes';
import depositRequestRoutes from './modules/depositRequest/depositRequest.route';
import plansRoutes from './modules/plans/plans.route';
import referralRoutes from './modules/referral/referral.routes';
import investmentRoutes from './modules/investment/investment.routes';

//  Utils
import { sendResponse } from './utils/response.utils';
import { setupSwagger } from './utils/swagger';
import { corsOptions } from './utils/cors';

// Configs and Consts
import { FILE_SIZE, JWT_SECRET } from './config';
import { investmentCronJob } from './cron/investment.cron';
const MAX_FILE_SIZE_BYTES = FILE_SIZE * 1024 * 1024;

// Extend Fastify Types (Must be at the top level)
declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      jti: string;
      role: Role;
    };

    user: {
      userId: string;
      jti: string;
      role: Role;
    };
  }
}

export const app: FastifyInstance = Fastify({
  logger: { level: 'info' },
  trustProxy: true,
});

// Build the Fastify app
export const buildApp = async (): Promise<FastifyInstance> => {
  //For the documentation
  setupSwagger(app);

  //Cors
  app.register(cors, corsOptions);

  // Register JWT plugin
  app.register(fastifyJwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  //Register Multipart Plugin
  app.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
  });

  //Register the Decorators(Middlewares)
  app.register(plugin(authenticate));

  // Register routes and schemas
  for (const schema of [
    ...userSchemas,
    ...generalSchemas,
    ...authSchemas,
    ...transactionSchemas,
    ...adminSchemas,
    ...notificationSchemas,
    ...depositRequestSchemas,
    ...planSchemas,
    ...referralSchemas,
    ...investmentSchemas,
  ]) {
    app.addSchema(schema);
  }

  app.register(userRoutes, { prefix: '/v1/api/users' });
  app.register(authRoutes, { prefix: '/v1/api/auth' });
  app.register(transactionRoutes, { prefix: '/v1/api/transactions' });
  app.register(adminRoutes, { prefix: '/v1/api/admins' });
  app.register(notificationRoutes, { prefix: '/v1/api/notifications' });
  app.register(depositRequestRoutes, { prefix: '/v1/api/requests' });
  app.register(plansRoutes, { prefix: '/v1/api/plans' });
  app.register(referralRoutes, { prefix: '/v1/api/referrals' });
  app.register(investmentRoutes, { prefix: '/v1/api/investments' });


  // Register cron jobs
  await investmentCronJob(app);

  // Health Check Endpoint
  app.get('/health', async () => {
    return { status: 'Health check complete.' };
  });

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    return sendResponse(reply, 500, false, error.message);
  });

  return app;
};
