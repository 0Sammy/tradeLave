import { createClient } from "redis";

//Config
import { REDIS_USERNAME, REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } from "../../config";

const redisClient = createClient({
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT
    },
});

redisClient.on('error', err => console.log('Redis Client Error', err));

const connectRedis = async () => { await redisClient.connect() };

connectRedis();

export default redisClient;