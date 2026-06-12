import type { FastifyReply, FastifyRequest } from "fastify";

// Services
import { findAdminById } from "../modules/admin/admin.service";

// Utils
import { sendResponse } from "../utils/response.utils";

// Ensure Admin
export const isAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract the decoded user
    const decodedAdmin = request.user;

    if (!decodedAdmin || !decodedAdmin.userId) {
        return sendResponse(reply, 401, false, "Unauthorized access. Token missing or invalid.");
    }

    // Fetch admin
    const admin = await findAdminById(decodedAdmin.userId);

    // Verify admin exist
    if (!admin) {
        return sendResponse(reply, 403, false, "Sorry, but you are not authorized to perform this action.");
    }
};

// Ensure Super Admin
export const isSuperAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract the decoded user
    const decodedAdmin = request.user as any;

    if (!decodedAdmin || !decodedAdmin.userId) {
        return sendResponse(reply, 401, false, "Unauthorized access. Token missing or invalid.");
    }

    // Fetch admin
    const admin = await findAdminById(decodedAdmin.userId);

    // Verify Admin Exist
    if (!admin) {
        return sendResponse(reply, 403, false, "Sorry, but you are not authorized to perform this action.");
    }

    // Verify their specific role
    if (admin.role !== 'super_admin') {
        return sendResponse(reply, 403, false, "Sorry, you are not authorized enough to perform this action.");
    }
};