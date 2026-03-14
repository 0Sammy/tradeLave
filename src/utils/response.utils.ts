import { type FastifyReply } from "fastify";


export function sendResponse<T>(reply: FastifyReply, status: number, success: boolean, message: string, data?: T): FastifyReply {
    const response: ApiResponse<T> = {
        status,
        success,
        message,
        data,
    };

    return reply.status(status).send(response);
}
