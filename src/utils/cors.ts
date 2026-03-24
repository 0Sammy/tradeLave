import { FastifyCorsOptions } from '@fastify/cors';

export const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tradelave.com',
];

export const corsOptions: FastifyCorsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
};
