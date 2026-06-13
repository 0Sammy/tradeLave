import mongoose from 'mongoose';
import { StockTransaction, CryptoCoin } from "./model";
import axios from 'axios';

// Services
import { getPrices } from '../transaction/transaction.service';

// Utils and Configs
import { USER_PUBLIC_FIELDS } from '../../utils/format';
import { STOCKS_API } from '../../config';

const stockCache = new Map<string, { price: number, timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;


// Get Stoke Prices
export const getStockPrice = async (symbol: string): Promise<number> => {

    const uppercaseSymbol = symbol.toUpperCase();
    const now = Date.now();
    const cached = stockCache.get(uppercaseSymbol);

    // Return cached price if it's less than 60 seconds old
    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }
    // Fetch live data from Finnhub
    const { data } = await axios.get(`https://finnhub.io/api/v1/quote`, {
        params: {
            symbol: uppercaseSymbol,
            token: STOCKS_API
        }
    });

    // Finnhub returns the current price in the 'c' property (Current price)
    const currentPrice = data.c;

    if (currentPrice === 0 || currentPrice === null) {
        throw new Error(`Invalid stock symbol or market closed for ${uppercaseSymbol}`);
    }

    // Update the cache and return
    stockCache.set(uppercaseSymbol, { price: currentPrice, timestamp: now });
    return currentPrice;
};

// Get Dashboard Stocks
export const getDashboardStocks = async (symbols: string[]): Promise<Record<string, number>> => {

    const prices: Record<string, number> = {};

    // Use Promise.all to fetch them concurrently for speed
    await Promise.all(symbols.map(async (symbol) => {
        try {
            prices[symbol.toUpperCase()] = await getStockPrice(symbol);
        } catch (error) {
            // If one fails, we just set it to 0 or null so it doesn't crash the whole dashboard
            prices[symbol.toUpperCase()] = 0;
        }
    }));

    return prices;
};

// Calculate crypto balance
export const getUserCryptoBalances = async (userId: string): Promise<Record<string, number>> => {
    // Run the aggregation to get sums for coins the user HAS used
    const result = await StockTransaction.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                status: { $in: ['APPROVED', 'COMPLETED'] },
                cryptoSymbol: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$cryptoSymbol',
                balance: { $sum: '$cryptoAmount' }
            }
        }
    ]);

    // Initialize the balance object with 0 for every coin in the enum.
    const balances: Record<string, number> = {};

    Object.values(CryptoCoin).forEach((coin) => {
        balances[coin] = 0;
    });

    // Map the aggregation results onto our initialized object.
    result.forEach(item => {
        if (item._id in balances) {
            balances[item._id] = item.balance;
        }
    });

    return balances;
};

// Calculate total deposit and withdrawal
export const getTransactionVolumeTotals = async (userId: string) => {
    // Run the aggregation grouping by BOTH Type and Crypto Symbol
    const result = await StockTransaction.aggregate([
        {
            // Filter by User, successful status, and ensure it's a crypto transaction
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                status: { $in: ['APPROVED'] },
                type: { $in: ['DEPOSIT', 'WITHDRAWAL'] },
                cryptoSymbol: { $exists: true, $ne: null }
            }
        },
        {
            // Group by both to separate BTC deposits from ETH deposits, etc.
            $group: {
                _id: {
                    type: '$type',
                    cryptoSymbol: '$cryptoSymbol'
                },
                totalCoinAmount: { $sum: '$cryptoAmount' }
            }
        }
    ]);

    // Initialize the stats object that we will return
    const stats = {
        totalDeposits: 0,
        totalWithdrawals: 0
    };

    // Fetch live prices ONCE before looping
    const liveCryptoPrices = await getPrices();

    // Loop through the database results, convert to USD, and sum them up
    result.forEach(item => {
        const transactionType = item._id.type;
        const coinSymbol = item._id.cryptoSymbol;

        // Use Math.abs() in case withdrawals were saved as negative numbers in the DB
        const rawCoinAmount = Math.abs(item.totalCoinAmount);

        const coinGeckoId = coinSymbol.includes('tether') ? 'tether' : coinSymbol;

        // Safely get the live price, defaulting to 0 if the API fails
        const coinLiveUsdPrice = liveCryptoPrices[coinGeckoId]?.usd || 0;

        // Calculate the actual USD volume for this specific group
        const usdVolume = rawCoinAmount * coinLiveUsdPrice;

        // Add it to the correct total bucket
        if (transactionType === 'DEPOSIT') {
            stats.totalDeposits += usdVolume;
        } else if (transactionType === 'WITHDRAWAL') {
            stats.totalWithdrawals += usdVolume;
        }
    });

    return stats;
};

// Get ONLY Stock Holdings (Buys and Sells)
export const getUserStockBalances = async (userId: string): Promise<Record<string, number>> => {
    const result = await StockTransaction.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                status: 'COMPLETED',
                stockSymbol: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$stockSymbol',
                totalShares: { $sum: '$shares' }
            }
        }
    ]);

    const balances: Record<string, number> = {};
    result.forEach(item => { balances[item._id] = item.totalShares; });
    return balances;
};

// Create Deposit
export const createDeposit = async (userId: string, cryptoSymbol: CryptoCoin, cryptoAmount: number, usdEquivalent: number, hash?: string) => {
    return await StockTransaction.create({
        userId,
        type: 'DEPOSIT',
        status: 'PENDING',
        cryptoSymbol,
        cryptoAmount,
        usdAmount: usdEquivalent,
        ...(hash ? { hash } : {}),
    });
};

// Create Withdrawal
export const createWithdrawal = async (
    userId: string,
    cryptoSymbol: CryptoCoin,
    cryptoAmount: number,
    walletAddress: string,
    usdEquivalent: number,
) => {
    return await StockTransaction.create({
        userId,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        cryptoSymbol,
        cryptoAmount: -Math.abs(cryptoAmount),
        walletAddress,
        usdAmount: -Math.abs(usdEquivalent)
    });
};

// Buy Stock
export const executeBuyStock = async (
    userId: string,
    stockSymbol: string,
    usdInvestmentAmount: number,
    fundingCoin: CryptoCoin,
    currentStockPrice: number,
) => {
    // Get user's crypto balances and live crypto prices
    const cryptoBalances = await getUserCryptoBalances(userId);
    const liveCryptoPrices = await getPrices();

    const userCoinAmount = cryptoBalances[fundingCoin] || 0;
    const coinGeckoId = fundingCoin.includes('tether') ? 'tether' : fundingCoin;
    const coinLiveUsdPrice = liveCryptoPrices[coinGeckoId]?.usd;

    if (!coinLiveUsdPrice) throw new Error("Could not fetch live crypto price");

    // Calculate if they have enough USD value in that specific coin
    const userCoinUsdValue = userCoinAmount * coinLiveUsdPrice;
    if (userCoinUsdValue < usdInvestmentAmount) {
        throw new Error(`Insufficient funds. You only have $${userCoinUsdValue.toFixed(2)} worth of ${fundingCoin}.`);
    }

    // Calculate how much crypto to deduct, and how many shares to add
    const cryptoToDeduct = usdInvestmentAmount / coinLiveUsdPrice;
    const sharesToBuy = usdInvestmentAmount / currentStockPrice;

    // Create the COMPLETED transaction
    return await StockTransaction.create({
        userId,
        type: 'BUY',
        status: 'COMPLETED',
        usdAmount: usdInvestmentAmount,
        cryptoSymbol: fundingCoin,
        cryptoAmount: -Math.abs(cryptoToDeduct),
        stockSymbol,
        shares: sharesToBuy,
        pricePerShare: currentStockPrice
    });
};

// Sell Stock
export const executeSellStock = async (
    userId: string,
    stockSymbol: string,
    sharesToSell: number,
    receivingCoin: CryptoCoin,
    currentStockPrice: number
) => {
    // Check balances and calculate prices (Same as before)
    const stockBalances = await getUserStockBalances(userId);
    const currentShares = stockBalances[stockSymbol] || 0;

    if (currentShares < sharesToSell) {
        throw new Error(`Insufficient shares. You only have ${currentShares} shares of ${stockSymbol}.`);
    }

    const usdRevenue = sharesToSell * currentStockPrice;
    const liveCryptoPrices = await getPrices();
    const coinGeckoId = receivingCoin.includes('tether') ? 'tether' : receivingCoin;
    const coinLiveUsdPrice = liveCryptoPrices[coinGeckoId]?.usd;

    if (!coinLiveUsdPrice) throw new Error("Could not fetch live crypto price");

    const cryptoToAdd = usdRevenue / coinLiveUsdPrice;

    // Start a MongoDB Session for Data Safety!
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // StockTransaction A: Deduct the stock
        const sellTx = await StockTransaction.create([{
            userId,
            type: 'SELL',
            status: 'COMPLETED',
            usdAmount: usdRevenue,
            stockSymbol,
            shares: -Math.abs(sharesToSell),
            pricePerShare: currentStockPrice
        }], { session });

        // StockTransaction B: Add the crypto using our new type
        const settlementTx = await StockTransaction.create([{
            userId,
            type: 'TRADE_SETTLEMENT',
            status: 'COMPLETED',
            usdAmount: usdRevenue,
            cryptoSymbol: receivingCoin,
            cryptoAmount: cryptoToAdd,
        }], { session });

        // Commit both to the database
        await session.commitTransaction();

        return { sellTx: sellTx[0], settlementTx: settlementTx[0] };

    } catch (error) {
        await session.abortTransaction();
        throw new Error("Trade failed during database settlement. No assets were moved.");
    } finally {
        session.endSession();
    }
};

// Helper
export const getPaginationMeta = (total: number, page: number, limit: number) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
});

// Fetch User Transactions
export const getUserTransactions = async (userId: string, page: number, limit: number) => {

    const skip = (page - 1) * limit;
    const query = { userId: new mongoose.Types.ObjectId(userId) };

    const [data, total] = await Promise.all([
        StockTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        StockTransaction.countDocuments(query)
    ]);

    return { data, meta: getPaginationMeta(total, page, limit) };
};

// Get Users Stock Transactions
export const getUserTransactionsByStock = async (userId: string, stockSymbol: string) => {

    const query = {
        userId: new mongoose.Types.ObjectId(userId),
        stockSymbol: stockSymbol
    };

    // Run both the data fetch and the total count concurrently for speed
    const data = await StockTransaction.find(query).sort({ createdAt: -1 });

    return data;
};

// --- ADMIN SERVICES ---


// Update StockTransaction
export const updateTransactionStatus = async (transactionId: string, status: 'APPROVED' | 'REJECTED') => {
    return await StockTransaction.findByIdAndUpdate(
        transactionId,
        { status },
        { new: true }
    );
};

// Get All Transactions
export const getAllTransactions = async (page: number, limit: number) => {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        StockTransaction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', USER_PUBLIC_FIELDS),
        StockTransaction.countDocuments()
    ]);

    return { data, meta: getPaginationMeta(total, page, limit) };
};

// Get User Transactions
export const getAdminTransactionsByUser = async (targetUserId: string, page: number, limit: number) => {
    const skip = (page - 1) * limit;
    const query = { userId: new mongoose.Types.ObjectId(targetUserId) };

    const [data, total] = await Promise.all([
        StockTransaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', USER_PUBLIC_FIELDS),
        StockTransaction.countDocuments(query)
    ]);

    return { data, meta: getPaginationMeta(total, page, limit) };
};

// Delete Transaction
export const deleteTransactionById = async (transactionId: string) => {
    return await StockTransaction.findByIdAndDelete(transactionId);
};