import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import redisClient from '../modules/redis/connect';

//Utils
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

export const hasPermission = (requiredRoles: string[]) => {
    return async function (request: FastifyRequest, reply: FastifyReply) {

        const user = request.user;

        //Return if there is no user
        if (!user) return sendResponse(reply, 401, false, 'Unauthorized');

        //Make sure the user is under required role
        if (!requiredRoles.includes(user.role)) {
            return sendResponse(reply, 403, false, "Forbidden: insufficient permissions");
        }

        // Allow the request to continue
        return;
    };
};