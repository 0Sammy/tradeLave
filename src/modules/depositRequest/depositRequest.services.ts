import { AnyBulkWriteOperation, Types } from 'mongoose';
import DepositRequestModel, { DepositRequestDocument } from './depositRequest.model';
import { DepositStatus } from './depositRequest.model';
import axios from 'axios';

// Schemas
import { CreateDepositRequestInput, CreateUserDepositRequestInput, EditUserDepositRequestInput } from './depositRequest.schema';

// Utils
import { coinMap, sanitize, USER_PUBLIC_FIELDS } from '../../utils/format';
import { coingeckoURL } from '../transaction/transaction.controller';
import { COINGECKO_API_KEY } from '../../config';


// Creates a new deposit request.
export async function createDepositRequest(userId: string, dto: CreateDepositRequestInput) {

    const depositData: Record<string, any> = {
        user: userId,
        coin: dto.coin,
        amount: dto.amount,
        coinAmount: dto.coinAmount,
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

        const messagePayload: Record<string, any> = {
            message: details.message,
            at: new Date(),
        };

        if (details.file) {
            messagePayload.file = details.file;
        }

        update.$push = {
            [`details.${details.role}`]: messagePayload
        };
    }

    return DepositRequestModel
        .findByIdAndUpdate(depositId, update, { new: true })
        .lean()
        .exec();
}

// Delete a deposit request.
export async function deleteDepositRequest(id: string) {
    return DepositRequestModel.findByIdAndDelete(id).lean().exec();
}

// Add coinAmount
export const updateAllDepositRequestCoinAmounts = async () => {

    // Fetch prices
    const { data } = await axios.get(coingeckoURL, {
        headers: {
            Accept: 'application/json',
            'x-cg-demo-api-key': COINGECKO_API_KEY,
        },
    });

    const priceData = data;

    // Fetch transactions
    const deposits = await DepositRequestModel.find();

    const bulkOps: AnyBulkWriteOperation<DepositRequestDocument>[] = [];

    // Build bulk operations safely
    for (const dep of deposits) {
        const coinKey = dep.coin.toLowerCase();
        const apiKey = coinMap[coinKey];

        const price = priceData?.[apiKey]?.usd;

        // skip invalid price
        if (!price || price <= 0) continue;

        const coinAmount = Math.ceil((dep.amount / price) * 100) / 100;

        bulkOps.push({
            updateOne: {
                filter: { _id: dep._id },
                update: { coinAmount },
            },
        });
    }

    // Execute bulk write
    if (bulkOps.length > 0) {
        const result = await DepositRequestModel.bulkWrite(bulkOps);

        return {
            updatedCount: result.modifiedCount,
            totalProcessed: deposits.length,
        };
    }

    return { updatedCount: 0, totalProcessed: deposits.length };
};