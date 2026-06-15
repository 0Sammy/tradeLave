import StockRequest, { PurchaseStatus } from './model';
import { StockTransaction } from '../stock/model';

// Utils and Services
import { deleteFileFromS3 } from '../../libs/upload';
import { getPaginationMeta } from '../stock/service';
import { USER_PUBLIC_FIELDS } from '../../utils/format';

// Create Request
export const createPurchaseRequest = async (userId: string, stockSymbol: string, shares: number, livePrice: number) => {
    const usdAmount = shares * livePrice;

    return await StockRequest.create({
        user: userId,
        stockSymbol,
        shares,
        usdAmount
    });
};

// Fetch Users Request
export const fetchPurchaseRequest = async (userId: string) => {
    const requests = StockRequest.find({ user: userId }).sort({ createdAt: -1 });
    return requests;
}

// Update Request (Chat & File Upload)
export const updatePurchaseRequest = async (purchaseId: string, role: string, hasPaid: boolean, message?: string, fileUrl?: string, status?: string) => {


    const request = await StockRequest.findById(purchaseId);
    if (!request) throw new Error("Purchase request not found");

    if (message?.trim()) {
        // Initialize the role array if it doesn't exist in the Map
        if (!request.details.has(role)) {
            request.details.set(role, []);
        }

        // Add the new message
        request.details.get(role)?.push({
            message,
            file: fileUrl,
            at: new Date()
        });
    }

    // Update hasPaid status
    if (hasPaid) request.hasPaid = true;

    // Check if this is the FIRST time it's being marked successful
    const isFirstApproval = request.status !== "successful" && status === "successful";

    if (status) request.status = status as PurchaseStatus;

    console.log("It reached here")

    if (isFirstApproval) {
        // Automatically add the shares to their portfolio!
        await StockTransaction.create({
            userId: request.user,
            type: 'BUY',
            status: 'COMPLETED',
            usdAmount: request.usdAmount,
            stockSymbol: request.stockSymbol,
            shares: request.shares,
            pricePerShare: request.usdAmount / request.shares
        });
    }

    return await request.save();
};

// Admin

// Fetch All Request
export const getAllRequests = async (page: number, limit: number) => {

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        StockRequest.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', USER_PUBLIC_FIELDS),
        StockRequest.countDocuments()
    ]);

    return { data, meta: getPaginationMeta(total, page, limit) };
};

// Delete Request & Clean up S3 (ADMIN ONLY)
export const deletePurchaseRequest = async (purchaseId: string) => {
    const request = await StockRequest.findById(purchaseId);
    if (!request) throw new Error("Purchase request not found");

    // Loop through the details map to find any uploaded files
    for (const [_, messages] of request.details.entries()) {
        for (const msg of messages) {
            if (msg.file) {
                try {
                    await deleteFileFromS3(msg.file);
                } catch (error) {
                    console.error(`Failed to delete S3 file: ${msg.file}`, error);
                }
            }
        }
    }

    // Finally, delete the database record
    await request.deleteOne();
    return true;
};