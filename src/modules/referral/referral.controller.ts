import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import { findAdminById } from '../admin/admin.service';
import { findUserById } from './../user/user.service';
import { deleteReferral, getAllReferrals, getReferralById, getReferralsByUser } from './referral.services';

// Schemas
import { PaginationInput } from '../general/general.schema';
import { DeleteReferralInput } from './referral.schema';

// Utils
import { sendResponse } from '../../utils/response.utils';


// Fetch a user referrals
export const getUserReferralHandler = async (request: FastifyRequest, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;

    // Fetch user and make sure it exists
    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    // Fetch referrals and return
    const referrals = await getReferralsByUser(userId);
    return sendResponse(reply, 200, true, "Your referral list was fetched successfully", referrals);
}

// Administrative Endpoints

// Fetch all referrals
export const getAllReferrersHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const { page = '1', limit = '50' } = request.query;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");

    // Fetch referrals and return
    const result = await getAllReferrals({ page: Number(page), limit: Number(limit) });
    return sendResponse(reply, 200, true, "All referrals was fetched successfully", result);
}

// Delete a user referral
export const deleteUserReferral = async (request: FastifyRequest<{ Params: DeleteReferralInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const referralId = request.params.referralId;

    // Fetch referral and make sure it exists
    const referral = await getReferralById(referralId);
    if (!referral) return sendResponse(reply, 404, false, "Referral not Found");

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Delete referral
    await deleteReferral(referralId);
    return sendResponse(reply, 204, true, "User referral was deleted successfully");
}