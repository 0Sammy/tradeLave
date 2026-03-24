import mongoose, { AnyBulkWriteOperation } from 'mongoose';
import TransactionModel, { TransactionCoin, TransactionDocument, TransactionStatus, TransactionType } from './transaction.model';
import InvestmentModel, { InvestmentStatus } from '../investment/investment.model';
import axios from 'axios';
import { COINGECKO_API_KEY } from '../../config';

// Utils
import { coinMap, USER_PUBLIC_FIELDS } from '../../utils/format';
import { coingeckoURL } from './transaction.controller';

// Constants
const cache = new Map();
const CACHE_KEY = 'prices';
const CACHE_TTL = 2 * 60 * 1000;

//Type Declaration
type newTransaction = {
  user: string;
  coin: TransactionCoin;
  transactionType: TransactionType;
  amount: number;
  coinAmount: number;
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


export const getPrices = async () => {
  const now = Date.now();
  const cached = cache.get(CACHE_KEY);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data } = await axios.get(coingeckoURL, {
    headers: {
      Accept: 'application/json',
      'x-cg-demo-api-key': COINGECKO_API_KEY,
    },
  });

  cache.set(CACHE_KEY, { data, timestamp: now });

  return data;
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
      balanceByCoin[coin] += tx.coinAmount;
    } else if (
      tx.transactionType === TransactionType.WITHDRAWAL ||
      tx.transactionType === TransactionType.PENALTY
    ) {
      balanceByCoin[coin] -= tx.coinAmount;
    }
  }

  // Deduct locked funds in investments
  for (const inv of investments) {
    const coin = inv.coin;
    balanceByCoin[coin] -= (inv.capital / inv.rate);
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
export const getDashboardValues = async (userId: string) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Fetch prices (cached)
  const priceData = await getPrices();

  // Aggregate transactions PER COIN
  const txs = await TransactionModel.aggregate([
    {
      $match: {
        user: userObjectId,
        status: 'successful',
      },
    },
    {
      $group: {
        _id: {
          coin: '$coin',
          type: '$transactionType',
        },
        total: { $sum: '$coinAmount' },
      },
    },
  ]);

  // Aggregate ACTIVE investments ONLY (for holdings)
  const investments = await InvestmentModel.aggregate([
    {
      $match: {
        user: userObjectId,
        status: InvestmentStatus.ACTIVE,
      },
    },
    {
      $group: {
        _id: '$coin',
        total: { $sum: '$capital' },
      },
    },
  ]);

  // Build coin balance map (ONLY transactions)
  const balanceByCoin = await getUserBalanceByCoin(userId)
  let totalROIs = 0;
  let totalRewards = 0;

  for (const tx of txs) {
    const type = tx._id.type;
    const amount = tx.total;

    if (type === 'roi') totalROIs += amount;
    if (type === 'referral') totalRewards += amount;
  }

  // Convert transaction balances → USD
  let totalBalance = 0;

  for (const coin in balanceByCoin) {
    const apiKey = coinMap[coin];
    const price = priceData?.[apiKey]?.usd ?? 0;

    totalBalance += balanceByCoin[coin as TransactionCoin] * price;
  }

  // Compute ONLY total holdings (ACTIVE investments)
  let activeStakes = 0;

  for (const inv of investments) {
    activeStakes += inv.total;
  }

  return {
    totalBalance,
    activeStakes,
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

// Add coinAmount
export const updateAllTransactionCoinAmounts = async () => {

  // Fetch prices
  const { data } = await axios.get(coingeckoURL, {
    headers: {
      Accept: 'application/json',
      'x-cg-demo-api-key': COINGECKO_API_KEY,
    },
  });

  const priceData = data;

  // Fetch transactions
  const transactions = await TransactionModel.find();

  const bulkOps: AnyBulkWriteOperation<TransactionDocument>[] = [];

  // Build bulk operations safely
  for (const tx of transactions) {
    const coinKey = tx.coin.toLowerCase();
    const apiKey = coinMap[coinKey];

    const price = priceData?.[apiKey]?.usd;

    // skip invalid price
    if (!price || price <= 0) continue;

    const coinAmount = Math.ceil((tx.amount / price) * 100) / 100;

    bulkOps.push({
      updateOne: {
        filter: { _id: tx._id },
        update: { coinAmount },
      },
    });
  }

  // Execute bulk write
  if (bulkOps.length > 0) {
    const result = await TransactionModel.bulkWrite(bulkOps);

    return {
      updatedCount: result.modifiedCount,
      totalProcessed: transactions.length,
    };
  }

  return { updatedCount: 0, totalProcessed: transactions.length };
};



// Admin Services

// Fetch all transactions with pagination
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

// Fetch a specific user transactions
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

// Update a transaction
export const updateTransaction = async (id: string, data: Partial<TransactionDocument>): Promise<{ success: boolean, reason: string }> => {

  const transaction = await TransactionModel.findById(id);
  if (!transaction) return { success: false, reason: 'Transaction not found' };

  const isGoingSuccessful = data.status === TransactionStatus.SUCCESSFUL;
  const isWithdrawal = transaction.transactionType === TransactionType.WITHDRAWAL;

  if (isGoingSuccessful && isWithdrawal) {
    const balances = await getUserBalanceByCoin(transaction.user.toString());
    const userBalance = balances[transaction.coin] || 0;

    if (userBalance < transaction.coinAmount) {
      return { success: false, reason: 'User has Insufficient balance for transaction' };
    }
  }

  await TransactionModel.findByIdAndUpdate(id, data, { new: true });
  return { success: true, reason: 'Transaction was updated successfully.' };
};

// Delete a transaction
export const deleteTransaction = async (id: string) => {
  return await TransactionModel.findByIdAndDelete(id);
};
