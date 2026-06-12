import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import redisClient from '../modules/redis/connect';

// Utils
import { sendResponse } from '../utils/response.utils';

const SESSION_PREFIX = 'session:';


export async function authenticate(app: FastifyInstance) {
    app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Verify JWT
            await request.jwtVerify();

            const { userId, jti } = request.user as {
                userId?: string;
                jti?: string;
            };

            if (!userId || !jti) {
                return sendResponse(reply, 401, false, 'Invalid token payload');
            }

            // Check session existence in Redis
            const sessionKey = `${SESSION_PREFIX}${jti}`;
            const sessionData = await redisClient.get(sessionKey);

            if (!sessionData) {
                return sendResponse(reply, 401, false, 'Session expired. Please log in again.');
            }

            // Parse session & refresh lastSeen
            const session = JSON.parse(sessionData);
            session.lastSeen = Date.now();

            const ttl = await redisClient.ttl(sessionKey);
            if (ttl > 0) {
                await redisClient.set(sessionKey, JSON.stringify(session), { EX: ttl });
            }
            
            return;

        } catch (err) {
            app.log.error({ err }, 'JWT Error');
            return sendResponse(reply, 401, false, 'Unauthorized');
        }
    });
}