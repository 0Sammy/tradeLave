import { Types } from 'mongoose';
import DepositRequestModel from './depositRequest.model';
import { DepositStatus } from './depositRequest.model';

// Schemas
import { CreateDepositRequestInput, CreateUserDepositRequestInput, EditUserDepositRequestInput } from './depositRequest.schema';

// Utils
import { sanitize, USER_PUBLIC_FIELDS } from '../../utils/format';


// Creates a new deposit request.
export async function createDepositRequest(userId: string, dto: CreateDepositRequestInput) {
    
    const depositData: Record<string, any> = {
        user: userId,
        coin: dto.coin,
        amount: dto.amount
    };

    if (dto.notes) {
        depositData.details = {
            user: [
                {
                    message: dto.notes,
                    at: new Date()
                }
            ]
        };
    }

    return DepositRequestModel.create(depositData);
}

// Creates a new deposit request by the admin.
export async function adminCreateDepositRequest(dto: CreateUserDepositRequestInput) {
    const newDepositRequest = await DepositRequestModel.create(dto);
    return newDepositRequest;
}

// Fetch a single deposit request by its id.
export async function getDepositRequestById(id: string) {
    return DepositRequestModel.findById(id).lean().exec();
}

// Fetch a user's pending requests
export async function getPendingRequests(userId: string) {
    return DepositRequestModel.find({ user: userId, status: "pending" }).sort('-createdAt').exec();
}

// Fetch all deposit requests (with optional pagination and filtering).
export async function getAllDepositRequests({ page = 1, limit = 50, sort = { 'createdAt': -1 }, filters = {} }: {
    page?: number;
    limit?: number;
    sort?: string | Record<string, 1 | -1>;
    filters?: Record<string, any>;
} = {}) {
    const skip = (page - 1) * limit;
    const query = DepositRequestModel.find(filters)
        .populate('user', USER_PUBLIC_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

    const [items, total] = await Promise.all([
        query.exec(),
        DepositRequestModel.countDocuments(filters).exec()
    ]);

    return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
    };
}

// Fetch pending deposit requests (all or paginated).
export async function getPendingDepositRequests({ page = 1, limit = 50, sort = { 'createdAt': -1 } }: {
    page?: number;
    limit?: number;
    sort?: string | Record<string, 1 | -1>;
} = {}) {
    return getAllDepositRequests({
        page,
        limit,
        sort,
        filters: { status: DepositStatus.PENDING }
    });
}

// Fetch all requests for a single user (by user id).
export async function getUserDepositRequests(userId: string | Types.ObjectId, {
    page = 1,
    limit = 50,
    sort = { 'createdAt': -1 }
}: {
    page?: number;
    limit?: number;
    sort?: string | Record<string, 1 | -1>;
} = {}) {
    return getAllDepositRequests({
        page,
        limit,
        sort,
        filters: { user: new Types.ObjectId(userId) }
    });
}

// Update Deposit Request Details
export async function updateDepositRequest(input: EditUserDepositRequestInput) {

    const allowed = sanitize(input);
    const { depositId, details, ...updateFields } = allowed;

    const update: Record<string, any> = {};

    if (Object.keys(updateFields).length > 0) {
        update.$set = updateFields;
    }

    if (details?.message !== undefined && details?.role) {
        update.$push = {
            [`details.${details.role}`]: {
                message: details.message,
                at: new Date()
            }
        };
    }

    return DepositRequestModel.findByIdAndUpdate(depositId, update, { new: true }).lean().exec();
}

// Delete a deposit request.
export async function deleteDepositRequest(id: string) {
    return DepositRequestModel.findByIdAndDelete(id).lean().exec();
}
