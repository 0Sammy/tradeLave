import ReferralModel from './referral.model';

// Utils
import { USER_PUBLIC_FIELDS } from '../../utils/format';

// Schemas
import { CreateReferralInput, UpdateReferralInput } from './referral.schema';

// Create referral
export const createReferral = async (data: CreateReferralInput) => {
    return await ReferralModel.create(data);
};

// Get user referrals
export const getReferralsByUser = async (userId: string) => {
    return await ReferralModel.find({
        referrer: userId,
    }).populate('referredUser', USER_PUBLIC_FIELDS);
};

// Get who referred user
export const getUserReferrer = async (userId: string) => {
    return await ReferralModel.findOne({
        referredUser: userId,
    }).populate('referrer', USER_PUBLIC_FIELDS);
};

// Get referral by Id
export const getReferralById = async (referralId: string) => {
    return await ReferralModel.findById(referralId);
};

// Update referral
export const updateReferral = async (data: UpdateReferralInput) => {
    return await ReferralModel.findByIdAndUpdate(data.referralId,
        { $inc: { rewardClaimed: data.rewardClaimed } },
        { new: true }
    );
};

// Get all referrals
export const getAllReferrals = async ({ page = 1, limit = 50 }: { page?: number; limit?: number; }) => {

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        ReferralModel.find({})
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .populate('referrer', USER_PUBLIC_FIELDS)
            .populate('referredUser', USER_PUBLIC_FIELDS),

        ReferralModel.countDocuments(),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), data };
};

// Delete a referral
export const deleteReferral = async (referralId: string) => {
    return await ReferralModel.findByIdAndDelete(referralId);
};
