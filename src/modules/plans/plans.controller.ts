import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import { findAdminById } from '../admin/admin.service';
import { findUserById } from './../user/user.service';
import { createPlan, deletePlan, getAllPlans, getPlanById, updatePlan } from './plans.service';

// Schemas
import { CreatePlanInput, DeletePlanInput, UpdatePlanInput } from './plans.schema';

// Utils
import { sendResponse } from '../../utils/response.utils';


// Create a new plan
export const createPlanHandler = async (request: FastifyRequest<{ Body: CreatePlanInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const data = request.body;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Create plan and return
    await createPlan(data);
    return sendResponse(reply, 201, true, "The plan was created successfully.");
}

// Edit an existing plan
export const updatePlanHandler = async (request: FastifyRequest<{ Body: UpdatePlanInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const data = request.body;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Make sure the plan exists
    const plan = await getPlanById(data.planId);
    if (!plan) return sendResponse(reply, 404, false, "Plan not Found");

    // Update plan and return;
    await updatePlan(data);
    return sendResponse(reply, 200, true, "Plan was updated successfully");
}

// Fetch all plans
export const getAllPlansHandler = async (request: FastifyRequest, reply: FastifyReply) => {

    // Make sure the user is actually a user
    const decodedUser = request.user;
    const id = decodedUser.userId;

    // Fetch admin and make sure the user exists
    const admin = await findAdminById(id);
    const user = await findUserById(id)
    if (!admin && !user) return sendResponse(reply, 401, false, "Unauthorized!!!");

    const plans = await getAllPlans();
    return sendResponse(reply, 200, true, "All plans was fetched successfully", plans);
}

// Delete plan
export const deletePlanHandler = async (request: FastifyRequest<{ Params: DeletePlanInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const planId = request.params.planId;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Make sure the plan exists
    const plan = await getPlanById(planId);
    if (!plan) return sendResponse(reply, 404, false, "Plan not Found");

    // Delete plan and return
    await deletePlan(planId);
    return sendResponse(reply, 204, true, "The plan was deleted successfully");
}