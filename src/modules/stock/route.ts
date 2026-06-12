import { FastifyInstance } from 'fastify';

// Handlers
import * as StockHandlers from './controller';

// Middlewares
import { isAdmin, isSuperAdmin } from '../../middlewares/role';

// Schemas
import { StockBuyInput, StockDepositInput, stockRef, StockSellInput, StockSymbolParams, StockWithdrawInput, TransactionIdInput, UpdateInput, UserIdInput } from './schema';
import { generalRef, PaginationInput } from '../general/general.schema';

export default async function stockRoutes(app: FastifyInstance) {

    // Get Stock Prices
    app.get("/stock-prices", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
        },
    }, StockHandlers.getStockQuotesHandler);

    // Get balance
    app.get("/balance", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
        },
    }, StockHandlers.getBalanceHandler);

    // Deposit
    app.post<{ Body: StockDepositInput }>("/deposit", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
            body: stockRef('depositSchema'),
        },
    }, StockHandlers.depositHandler);

    // Withdraw
    app.post<{ Body: StockWithdrawInput }>("/withdraw", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
            body: stockRef('withdrawSchema'),
        },
    }, StockHandlers.withdrawHandler);

    // Buy Stock
    app.post<{ Body: StockBuyInput }>("/trade/buy", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
            body: stockRef('buySchema'),
        },
    }, StockHandlers.buyStockHandler);

    // Sell Stock
    app.post<{ Body: StockSellInput }>("/trade/sell", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
            body: stockRef('sellSchema'),
        },
    }, StockHandlers.sellStockHandler);

    // Fetch History
    app.get<{ Querystring: PaginationInput }>("/my-history", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema')
        },
    }, StockHandlers.fetchMyTransactionsHandler);

    // Get Portfolio
    app.get("/portfolio", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
        },
    }, StockHandlers.getPortfolioHandler
    )

    // Get Stock Transactions
    app.get<{ Params: StockSymbolParams }>("/history/:stockSymbol", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stocks', 'Users'],
            security: [{ bearerAuth: [] }],
            params: stockRef('stockSymbolParamsSchema'),
        }
    }, StockHandlers.fetchMyStockTransactionsHandler);



    // --- ADMIN ROUTES ---

    // Update Status
    app.put<{ Body: UpdateInput }>("/status", {
        preHandler: [app.authenticate, isSuperAdmin],
        schema: {
            tags: ['Admins', 'Stocks'],
            security: [{ bearerAuth: [] }],
            body: stockRef('updateSchema')
        },
    }, StockHandlers.adminApproveTransactionHandler);

    // Fetch All Transactions
    app.get<{ Querystring: PaginationInput }>("/history/all", {
        preHandler: [app.authenticate, isAdmin],
        schema: {
            tags: ['Stocks', 'Admins'],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema')
        }
    }, StockHandlers.adminFetchAllTransactionsHandler);

    // Fetch User Transactions
    app.get<{ Params: UserIdInput, Querystring: PaginationInput }>("/history/user/:userId", {
        preHandler: [app.authenticate, isAdmin],
        schema: {
            tags: ['Stocks', 'Admins'],
            security: [{ bearerAuth: [] }],
            params: stockRef('userIdParamsSchema'),
            querystring: generalRef('paginationSchema')
        }
    }, StockHandlers.adminFetchTransactionsByUserHandler);

    // Delete Transactions
    app.delete<{ Params: TransactionIdInput }>("/history/:transactionId", {
        preHandler: [app.authenticate, isSuperAdmin],
        schema: {
            tags: ['Stocks', 'Admins'],
            security: [{ bearerAuth: [] }],
            params: stockRef('transactionIdParamsSchema')
        }
    }, StockHandlers.adminDeleteTransactionHandler);
}