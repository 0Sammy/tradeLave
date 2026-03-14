import mongoose from 'mongoose';
import TransactionModel, { TransactionCoin, TransactionDocument, TransactionStatus, TransactionType } from './transaction.model';
import InvestmentModel, { InvestmentStatus } from '../investment/investment.model';

// Utils
import { USER_PUBLIC_FIELDS } from '../../utils/format';

//Type Declaration
type newTransaction = {
  user: string;
  coin: TransactionCoin;
  transactionType: TransactionType;
  amount: number;
  network?: string;
  status?: string;
  walletAddress?: string;
  transactionHash?: string;
};

//New Transaction
export const createNewTransaction = async (input: newTransaction) => {
  const newTransaction = await TransactionModel.create(input);
  return newTransaction;
};

//Fetch a Particular Transaction
export const getTransactionById = async (id: string) => {
  return await TransactionModel.findById(id);
};

//Get the balance of each coin
export const getUserBalanceByCoin = async (userId: string) => {
  const transactions = await TransactionModel.find({
    user: userId,
    status: TransactionStatus.SUCCESSFUL,
  });

  const investments = await InvestmentModel.find({
    user: userId,
    status: { $ne: InvestmentStatus.CANCELLED },
  });

  // Initialize all coins with 0 balance
  const balanceByCoin: Record<TransactionCoin, number> = Object.values(
    TransactionCoin
  ).reduce((acc, coin) => {
    acc[coin] = 0;
    return acc;
  }, {} as Record<TransactionCoin, number>);

  // 1️Apply transactions
  for (const tx of transactions) {
    const coin = tx.coin;

    if (
      tx.transactionType === TransactionType.DEPOSIT ||
      tx.transactionType === TransactionType.BONUS ||
      tx.transactionType === TransactionType.REFERRAL ||
      tx.transactionType === TransactionType.ROI
    ) {
      balanceByCoin[coin] += tx.amount;
    } else if (
      tx.transactionType === TransactionType.WITHDRAWAL ||
      tx.transactionType === TransactionType.PENALTY
    ) {
      balanceByCoin[coin] -= tx.amount;
    }
  }

  // Deduct locked funds in investments
  for (const inv of investments) {
    const coin = inv.coin;
    balanceByCoin[coin] -= inv.capital;
  }

  return balanceByCoin;
};


// Get a users coin transactions with pagination
export const getCoinTransactions = async (user: string, coin: TransactionCoin, page = 1, limit = 50) => {

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    TransactionModel.find({ user, coin })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    TransactionModel.countDocuments({ user, coin }),
  ]);

  return {
    data: transactions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  };
};

// Dashboard values
export const getDashboardValues = async function getDashboardValues(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [txFacetResult, investmentResult] = await Promise.all([
    TransactionModel.aggregate([
      { $match: { user: userObjectId, status: TransactionStatus.SUCCESSFUL } },
      {
        $facet: {
          added: [
            {
              $match: {
                transactionType: {
                  $in: [
                    TransactionType.DEPOSIT,
                    TransactionType.BONUS,
                    TransactionType.REFERRAL,
                    TransactionType.ROI,
                  ],
                },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          removed: [
            {
              $match: {
                transactionType: {
                  $in: [TransactionType.WITHDRAWAL, TransactionType.PENALTY],
                },
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          rois: [
            { $match: { transactionType: TransactionType.ROI } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          rewards: [
            { $match: { transactionType: TransactionType.REFERRAL } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
        },
      },
    ]),

    // All investments except CANCELLED
    InvestmentModel.aggregate([
      {
        $match: {
          user: userObjectId,
          status: { $ne: InvestmentStatus.CANCELLED },
        },
      },
      { $group: { _id: null, total: { $sum: "$capital" } } },
    ]),
  ]);

  const facet = txFacetResult[0] ?? {};
  const added = (facet.added?.[0]?.total ?? 0) as number;
  const removed = (facet.removed?.[0]?.total ?? 0) as number;

  const rawBalance = added - removed;

  const totalHoldings = (investmentResult[0]?.total ?? 0) as number;
  const totalROIs = (facet.rois?.[0]?.total ?? 0) as number;
  const totalRewards = (facet.rewards?.[0]?.total ?? 0) as number;

  // REAL available balance (funds not locked in investments)
  const totalBalance = rawBalance - totalHoldings;

  return {
    totalBalance,
    totalHoldings,
    totalROIs,
    totalRewards,
  };
};



// Fetch Transaction based on Transaction Types
export const getTransactionsWithTypes = async (user: string, transactionType: TransactionType, page = 1, limit = 50,) => {

  const skip = (page - 1) * limit;

  const filter = { user, transactionType: transactionType };

  const [transactions, total] = await Promise.all([
    TransactionModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    TransactionModel.countDocuments(filter),
  ]);

  return { data: transactions, pagination: { total, page, pages: Math.ceil(total / limit) } };
};

// Add Transaction Hash for users
export const patchTransaction = async (transactionId: string, hash: string) => {

  const data = { transactionHash: hash }
  return await TransactionModel.findByIdAndUpdate(transactionId, data, {
    new: true,
  });
}



//Admin Services

//Fetch all transactions with pagination
export const getTransactions = async (transactionType?: TransactionType, page = 1, limit = 50) => {

  const skip = (page - 1) * limit;
  const filter: any = {};

  if (transactionType) {
    filter.transactionType = transactionType;
  }

  const [transactions, total] = await Promise.all([
    TransactionModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('user', USER_PUBLIC_FIELDS),
    TransactionModel.countDocuments(filter),
  ]);

  return {
    data: transactions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  };
};

//Fetch a specific user transactions
export const getUserTransactions = async (user: string, page = 1, limit = 50, transactionType?: TransactionType) => {

  const skip = (page - 1) * limit;

  const filter: any = { user };
  if (transactionType) {
    filter.transactionType = transactionType;
  }

  const [transactions, total] = await Promise.all([
    TransactionModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    TransactionModel.countDocuments(filter),
  ]);

  return { data: transactions, pagination: { total, page, pages: Math.ceil(total / limit) } };
};

//Update a transaction
export const updateTransaction = async (id: string, data: Partial<TransactionDocument>): Promise<{ success: boolean, reason: string }> => {

  const transaction = await TransactionModel.findById(id);
  if (!transaction) return { success: false, reason: 'Transaction not found' };

  const isGoingSuccessful = data.status === TransactionStatus.SUCCESSFUL;
  const isWithdrawal = transaction.transactionType === TransactionType.WITHDRAWAL;

  if (isGoingSuccessful && isWithdrawal) {
    const balances = await getUserBalanceByCoin(transaction.user.toString());
    const userBalance = balances[transaction.coin] || 0;

    if (userBalance < transaction.amount) {
      return { success: false, reason: 'User has Insufficient balance for transaction' };
    }
  }

  await TransactionModel.findByIdAndUpdate(id, data, { new: true });
  return { success: true, reason: 'Transaction was updated successfully.' };
};

//Delete a transaction
export const deleteTransaction = async (id: string) => {
  return await TransactionModel.findByIdAndDelete(id);
};
