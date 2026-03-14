import redisClient from "../redis/connect";

const SESSION_PREFIX = 'session:';
const USER_SESSION_PREFIX = 'userSession:';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

//Create a new user session
export const createSession = async (jti: string, userId: string, data: Record<string, any>) => {
    const sessionKey = `${SESSION_PREFIX}${jti}`;
    const userKey = `${USER_SESSION_PREFIX}${userId}`;

    // If user already has a session, delete it
    const existingJti = await redisClient.get(userKey);
    if (existingJti) {
        await redisClient.del(`${SESSION_PREFIX}${existingJti}`);
    }

    // Store the new session
    await redisClient.set(sessionKey, JSON.stringify(data), { EX: SESSION_TTL });

    // Map userId → current session jti
    await redisClient.set(userKey, jti, { EX: SESSION_TTL });
};

//Get a user's session
export const getSession = async (jti: string) => {
    const key = `${SESSION_PREFIX}${jti}`;
    const session = await redisClient.get(key);
    return session ? JSON.parse(session) : null;
};

//Delete a user's session
export const deleteSession = async (jti: string, userId?: string) => {
    const sessionKey = `${SESSION_PREFIX}${jti}`;
    await redisClient.del(sessionKey);
    if (userId) {
        const userKey = `${USER_SESSION_PREFIX}${userId}`;
        await redisClient.del(userKey);
    }
};

// Check if a user has an active session
export const hasActiveSession = async (userId: string) => {
    const userKey = `${USER_SESSION_PREFIX}${userId}`;
    const jti = await redisClient.get(userKey);
    if (!jti) return null;

    const session = await getSession(jti);
    if (!session) {
        await redisClient.del(userKey);
        return null;
    }

    return session;
};