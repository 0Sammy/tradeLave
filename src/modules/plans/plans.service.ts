import PlanModel from './plans.model';

// Schemas
import { CreatePlanInput, UpdatePlanInput } from './plans.schema';

// Utils
import { sanitize } from '../../utils/format';

// Create plan
export const createPlan = async (data: CreatePlanInput) => {
    return await PlanModel.create(data);
};

// Get plan by Id
export const getPlanById = async (planId: string) => {
    return await PlanModel.findById(planId);
};

// Get all plans
export const getAllPlans = async () => {
    return await PlanModel.find().sort({ createdAt: -1 });
};

// Update a plan
export const updatePlan = async (data: UpdatePlanInput) => {
    const { planId, ...update } = data;

    const updateData = sanitize(update);

    return await PlanModel.findByIdAndUpdate(planId, updateData, {
        new: true,
    });
};

// Delete a plan
export const deletePlan = async (planId: string) => {
    return await PlanModel.findByIdAndDelete(planId);
};
