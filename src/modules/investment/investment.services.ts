import InvestmentModel, { InvestmentStatus } from "./investment.model";
import PlanModel from "../plans/plans.model";
import TransactionModel, { TransactionStatus, TransactionType } from "../transaction/transaction.model";

// Utils
import { USER_PUBLIC_FIELDS } from "../../utils/format";
import mongoose from "mongoose";

// Create Investment
export const createInvestment = async ({ user, coin, plan, capital }: { user: string, coin: string, plan: string, capital: number }) => {

    // Fetch plan data
    const planDoc = await PlanModel.findById(plan);
    if (!planDoc) throw new Error("Plan not found");

    const planName = planDoc.title;
    const roi = planDoc.roi;
    const duration = planDoc.durationDays;
    const returnAmount = capital + (capital * (roi/100));

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + duration * 24 * 60 * 60 * 1000);

    return await InvestmentModel.create({ user, coin, plan: planName, capital, roi, returnAmount, durationInDays: duration, startedAt, endsAt });
};

// Get Investment by ID
export const getInvestmentById = async (id: string) => {
    return await InvestmentModel.findById(id)
        .populate("user", USER_PUBLIC_FIELDS);
};

// Get a users investments
export const getUserInvestments = async (userId: string, page = 1, limit = 50) => {
    const skip = (page - 1) * limit;

    return await InvestmentModel.find({ user: userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
};

// Get all investments
export const findInvestments = async (userId: string, planName: string) => {
    return await InvestmentModel.find({ user: userId, plan: planName })
        .sort({ createdAt: -1 })
};

// Update Investment Status
export const updateInvestmentStatus = async (investmentId: string, status: string) => {
    return await InvestmentModel.findByIdAndUpdate(
        investmentId,
        { status },
        { new: true }
    )
};

// Get all investments
export const getAllInvestments = async ({ page = 1, limit = 20 }: { page?: number; limit?: number }) => {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        InvestmentModel.find({})
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

            .populate("user", USER_PUBLIC_FIELDS),

        InvestmentModel.countDocuments(),
    ]);

    return { total, page, limit, pages: Math.ceil(total / limit), data };
};

// Cron
export const processMaturedInvestments = async () => {
    const now = new Date();

    // Pull a small batch each run to keep latency predictable (tune this).
    const matured = (await InvestmentModel.find(
        {
            status: InvestmentStatus.ACTIVE,
            endsAt: { $lte: now },
            $or: [{ roiTransactionId: null }, { roiTransactionId: { $exists: false } }],
        },
        {
            _id: 1,
            user: 1,
            coin: 1,
            returnAmount: 1,
            endsAt: 1,
            status: 1,
            roiTransactionId: 1,
        }
    )
        .sort({ endsAt: 1 })
        .limit(200)
        .lean()) as InvestmentCron[];

    if (matured.length === 0) return;

    for (const inv of matured) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                // Re-check + lock via conditional update to prevent race/double-processing.
                const locked = await InvestmentModel.findOneAndUpdate(
                    {
                        _id: inv._id,
                        status: InvestmentStatus.ACTIVE,
                        endsAt: { $lte: now },
                        $or: [{ roiTransactionId: null }, { roiTransactionId: { $exists: false } }],
                    },
                    {
                        $set: {
                            status: InvestmentStatus.COMPLETED,
                        },
                    },
                    {
                        new: true,
                        session,
                    }
                ).lean();

                if (!locked) return;

                const roiTx = await TransactionModel.create(
                    [
                        {
                            user: inv.user,
                            coin: inv.coin,
                            transactionType: TransactionType.ROI,
                            amount: inv.returnAmount,
                            network: null,
                            status: TransactionStatus.SUCCESSFUL,
                            walletAddress: "",
                            transactionHash: "",
                            details: {
                                investmentId: String(inv._id),
                                reason: "Investment ROI payout",
                            },
                        },
                    ],
                    { session }
                );

                await InvestmentModel.updateOne(
                    { _id: inv._id },
                    { $set: { roiTransactionId: roiTx[0]._id } },
                    { session }
                );
            });
        } finally {
            session.endSession();
        }
    }
}