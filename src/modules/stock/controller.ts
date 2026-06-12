import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import {
    getUserCryptoBalances,
    getUserStockBalances,
    createDeposit,
    createWithdrawal,
    updateTransactionStatus,
    executeBuyStock,
    executeSellStock,
    getUserTransactions,
    getAllTransactions,
    getAdminTransactionsByUser,
    deleteTransactionById,
    getDashboardStocks,
    getTransactionVolumeTotals,
    getUserTransactionsByStock
} from './service';
import { findUserById } from '../user/user.service';

// Schema
import { StockDepositInput, StockWithdrawInput, StockBuyInput, StockSellInput, UpdateInput, UserIdInput, TransactionIdInput, StockSymbolParams } from './schema';
import { PaginationInput } from '../general/general.schema';

// Utils
import { sendResponse } from '../../utils/response.utils';
import { getPrices } from '../transaction/transaction.service';
import { emitAndSaveNotification } from '../../utils/socket';
import { formatCurrency } from '../../utils/format';

// Get User Balances (Crypto & Stocks)
export const getBalanceHandler = async (request: FastifyRequest, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;

    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not found");

    const cryptoBalances = await getUserCryptoBalances(userId);
    const stockBalances = await getUserStockBalances(userId);
    const totalVolume = await getTransactionVolumeTotals(userId);
    const cryptoPrices = await getPrices();

    return sendResponse(reply, 200, true, "Balances fetched successfully", {
        cryptoBalances,
        stockBalances,
        totalVolume,
        cryptoPrices
    });
};

// Fetch Stock Prices
export const getStockQuotesHandler = async (_: FastifyRequest, reply: FastifyReply) => {

    // You can hardcode popular stocks or pass them as a query array
    const popularStocks = ['AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL'];

    const stockPrices = await getDashboardStocks(popularStocks);
    return sendResponse(reply, 200, true, "Stock quotes fetched successfully", stockPrices);
};

// Stock New Deposit Handler
export const depositHandler = async (request: FastifyRequest<{ Body: StockDepositInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const { cryptoSymbol, cryptoAmount, usdEquivalent, hash } = request.body;

    const deposit = await createDeposit(userId, cryptoSymbol, cryptoAmount, usdEquivalent, hash);

    // Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: "stock_deposit",
        title: `Deposit Received`,
        message: `You deposited ${formatCurrency(deposit.usdAmount)} • ${deposit.cryptoAmount} ${deposit.cryptoSymbol?.toUpperCase()} — available balance updated`,
    });

    return sendResponse(reply, 200, true, "Deposit Successful.");
};

// Stock New Withdrawal Handler
export const withdrawHandler = async (request: FastifyRequest<{ Body: StockWithdrawInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const { cryptoSymbol, cryptoAmount, walletAddress, usdEquivalent } = request.body;

    // Check specific COIN balance
    const balances = await getUserCryptoBalances(userId);
    const currentCoinBalance = balances[cryptoSymbol] || 0;

    if (currentCoinBalance < cryptoAmount) {
        return sendResponse(reply, 400, false, `Insufficient ${cryptoSymbol} balance. You have ${currentCoinBalance}.`);
    }

    // Create pending withdrawal
    const withdrawal = await createWithdrawal(userId, cryptoSymbol, cryptoAmount, walletAddress, usdEquivalent);

    // Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: "stock_withdrawal",
        title: `Withdrawal Processing`,
        message: `A withdrawal of ${formatCurrency(withdrawal.usdAmount)} • ${withdrawal.cryptoAmount} ${withdrawal.cryptoSymbol?.toUpperCase()} was sent — expected to arrive in 1-3 business days`,
    });

    return sendResponse(reply, 200, true, "Withdrawal Successful.");
};

// Buy Stock Handler
export const buyStockHandler = async (request: FastifyRequest<{ Body: StockBuyInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const { stockSymbol, usdInvestmentAmount, cryptoSymbol, currentPrice } = request.body;

    // Buy Stock and Return
    const trade = await executeBuyStock(userId, stockSymbol, usdInvestmentAmount, cryptoSymbol, currentPrice);

    // Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: "stock_buy",
        title: `Shares Purchased`,
        message: `Bought ${trade.shares} shares of ${trade.stockSymbol?.toUpperCase()} at $${trade.pricePerShare} each — total ${formatCurrency((trade.shares || 1) * (trade.pricePerShare || 1))}`,
    });

    return sendResponse(reply, 200, true, `Successfully bought ${stockSymbol}`);
};

// Sell Stock Handler
export const sellStockHandler = async (request: FastifyRequest<{ Body: StockSellInput }>, reply: FastifyReply) => {
    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const { stockSymbol, sharesToSell, cryptoSymbol, currentPrice } = request.body;

    // Sell Stock and Return
    const trade = await executeSellStock(userId, stockSymbol, sharesToSell, cryptoSymbol, currentPrice);

    // Selling Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: "stock_sell",
        title: `Shares Sold`,
        message: `Sold ${trade.sellTx.shares} shares of ${trade.sellTx.stockSymbol?.toUpperCase()} at $${trade.sellTx.pricePerShare} each — total ${formatCurrency((trade.sellTx.shares || 1) * (trade.sellTx.pricePerShare || 1))}`,
    });

    // Settlement Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: "stock_settlement",
        title: `Settlement completed`,
        message: `Proceeds of ${formatCurrency(trade.settlementTx.usdAmount)} from the sale of ${trade.settlementTx.shares} ${trade.settlementTx.stockSymbol?.toUpperCase()} shares have settled and are available in your ${trade.settlementTx.cryptoSymbol} wallet.`,
    });

    return sendResponse(reply, 200, true, `Successfully sold ${stockSymbol}`);
};

// Fetch Transactions 
export const fetchMyTransactionsHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const { userId } = request.user;
    const { page, limit } = request.query;

    const result = await getUserTransactions(userId, parseInt(page || "1"), parseInt(limit || "50"));
    return sendResponse(reply, 200, true, "Transactions fetched successfully", result);
};

// Portfolio
export const getPortfolioHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user;

    // Fetch all raw database data concurrently for speed!
    const [cryptoBalances, stockBalances, volumes, recentHistory] = await Promise.all([
        getUserCryptoBalances(userId),
        getUserStockBalances(userId),
        getTransactionVolumeTotals(userId),
        getUserTransactions(userId, 1, 5)
    ]);

    // Extract arrays of what the user actually owns to fetch prices
    const ownedStocks = Object.keys(stockBalances).filter(sym => stockBalances[sym] > 0);

    // Fetch Live Prices concurrently
    const [liveCryptoPrices, liveStockPrices] = await Promise.all([
        getPrices(),
        ownedStocks.length > 0 ? getDashboardStocks(ownedStocks) : Promise.resolve({}) as Promise<Record<string, number>>
    ]) as [Record<string, { usd: number }>, Record<string, number>];

    // Calculate Crypto Assets & Value
    let totalCryptoValueUsd = 0;
    const cryptoAssets = Object.entries(cryptoBalances).map(([coin, amount]) => {
        const geckoId = coin.includes('tether') ? 'tether' : coin;
        const livePriceUsd = liveCryptoPrices[geckoId]?.usd || 0;
        const totalValueUsd = amount * livePriceUsd;
        totalCryptoValueUsd += totalValueUsd;

        return { symbol: coin, amount, livePriceUsd, totalValueUsd };
    });

    // Calculate Stock Assets & Value
    let totalStockValueUsd = 0;
    const stockAssets = Object.entries(stockBalances).map(([symbol, shares]) => {
        const livePriceUsd = liveStockPrices[symbol] || 0;
        const totalValueUsd = shares * livePriceUsd;
        totalStockValueUsd += totalValueUsd;

        // Only return stocks they actually own currently
        if (shares > 0) {
            return { symbol, shares, livePriceUsd, totalValueUsd };
        }
    }).filter(Boolean);

    // Send the perfectly formatted payload
    return sendResponse(reply, 200, true, "Portfolio fetched successfully", {
        summary: {
            totalPortfolioValueUsd: totalCryptoValueUsd + totalStockValueUsd,
            totalCryptoValueUsd,
            totalStockValueUsd
        },
        volumes,
        assets: {
            crypto: cryptoAssets,
            stocks: stockAssets
        },
        recentActivity: recentHistory.data
    });
};

// Get Stock Transactions
export const fetchMyStockTransactionsHandler = async (request: FastifyRequest<{ Params: StockSymbolParams }>, reply: FastifyReply) => {
    const { userId } = request.user;
    const { stockSymbol } = request.params;

    const result = await getUserTransactionsByStock(userId, stockSymbol);

    return sendResponse(
        reply,
        200,
        true,
        `${stockSymbol} transactions fetched successfully`,
        result
    );
};



// --- ADMIN HANDLERS ---


// Approve Transactions Handler
export const adminApproveTransactionHandler = async (request: FastifyRequest<{ Body: UpdateInput }>, reply: FastifyReply) => {

    const { id, status } = request.body;

    const transaction = await updateTransactionStatus(id, status as "APPROVED" | "REJECTED");
    if (!transaction) return sendResponse(reply, 404, false, "Transaction not found");

    return sendResponse(reply, 200, true, `Transaction marked as ${status}`, transaction);
};

// Fetch all Transactions
export const adminFetchAllTransactionsHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const { page, limit } = request.query;

    const result = await getAllTransactions(parseInt(page || "1"), parseInt(limit || "50"));
    return sendResponse(reply, 200, true, "All transactions fetched successfully", result);
};

// Admin Fetch User Transactions
export const adminFetchTransactionsByUserHandler = async (request: FastifyRequest<{ Params: UserIdInput, Querystring: PaginationInput }>, reply: FastifyReply) => {

    const { userId } = request.params;
    const { page, limit } = request.query;

    const result = await getAdminTransactionsByUser(userId, parseInt(page || "1"), parseInt(limit || "50"));
    return sendResponse(reply, 200, true, "User's transactions fetched successfully", result);
};

// Admin Delete Transaction
export const adminDeleteTransactionHandler = async (request: FastifyRequest<{ Params: TransactionIdInput }>, reply: FastifyReply) => {

    const { transactionId } = request.params;

    const deletedTx = await deleteTransactionById(transactionId);
    if (!deletedTx) return sendResponse(reply, 404, false, "Transaction not found");

    return sendResponse(reply, 200, true, "Transaction deleted successfully");
};