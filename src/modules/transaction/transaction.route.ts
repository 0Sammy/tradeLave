import { FastifyInstance } from 'fastify';

//Handlers
import { createNewTransactionHandler, createUserTransactionHandler, deleteUserTransactionHandler, fetchAllTransactionsHandler, fetchAllUserTransactionsHandler, fetchCoinDetailsHandler, fetchPricesHandler, fetchTransactionHandler, fetchUserTransactionHandler, getCoinTransactionsHandler, getDashboardValuesHandler, getTypeTransactionHandler, getUserBalanceHandler, patchTransactionHandler, updateCoinAmountsHandler, updateTransactionHandler } from './transaction.controller';

//Schemas
import { CreateTransactionInput, CreateUserTransactionInput, FetchTransactionInput, FetchUserBalanceInput, GetCoinDetailsInput, GetTransactionsWithTypeInput, GetTransactionWithTypesInput, GetUserTransactionInput, PatchTransactionInput, transactionRef, UpdateTransactionInput } from './transaction.schema';
import { generalRef, PaginationInput } from '../general/general.schema';

//Transaction Routes
export default async function transactionRoutes(app: FastifyInstance) {

  // Create new transaction
  app.post<{ Body: CreateTransactionInput }>('/create', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      body: transactionRef('createTransactionSchema'),
      response: {
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
      },
    },
  },
    createNewTransactionHandler
  );

  // Fetches the price list
  app.get('/fetchPrices', {
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
    },
  },
    fetchPricesHandler
  );

  // Fetch coin details
  app.get<{ Params: GetCoinDetailsInput }>('/getCoinDetails/:coin', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('getCoinDetailsSchema'),
    },
  },
    fetchCoinDetailsHandler
  );

  // Fetch a single transaction
  app.get<{ Params: FetchTransactionInput }>('/getTransaction/:transactionId', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('fetchTransactionSchema'),
      response: {
        200: transactionRef('getTransactionResponseSchema'),
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
      },
    },
  },
    fetchTransactionHandler
  );

  // Fetch all transactions of a user
  app.get<{ Querystring: PaginationInput }>('/userTransactions', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      querystring: generalRef('paginationSchema'),
    },
  },
    fetchAllUserTransactionsHandler
  );

  // Get Coin Transactions
  app.get<{ Params: GetCoinDetailsInput; Querystring: PaginationInput }>('/getCoinTransactions/:coin', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('getCoinDetailsSchema'),
      querystring: generalRef('paginationSchema'),
      response: {
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
      },
    },
  },
    getCoinTransactionsHandler
  );

  // Get Dashboard Values
  app.get('/dashboardValues', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
    },
  },
    getDashboardValuesHandler
  );

  // Get Transactions with Types
  app.get<{ Params: GetTransactionWithTypesInput; Querystring: PaginationInput }>("/typeTransactions/:type", {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('getTransactionWithTypesSchema'),
      querystring: generalRef('paginationSchema'),
      response: {
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
      },
    },
  },
    getTypeTransactionHandler
  )

  // Update Transaction
  app.patch<{ Body: PatchTransactionInput }>("/update", {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Users'],
      security: [{ bearerAuth: [] }],
      body: transactionRef('patchTransactionSchema'),
      response: {
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
      },
    },
  },
    patchTransactionHandler
  )

  // Update coin amount
  app.get('/coinAmount', {
    schema: {
      tags: ['Transactions', 'Users'],
    },
  },
    updateCoinAmountsHandler
  );


  // Admin Routes

  // Create a new transaction for a user
  app.post<{ Body: CreateUserTransactionInput }>('/createUserTransaction', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Admins'],
      security: [{ bearerAuth: [] }],
      body: transactionRef('createUserTransactionSchema'),
      response: {
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
      },
    },
  },
    createUserTransactionHandler
  );

  // Fetch all transactions
  app.get<{ Params: GetTransactionsWithTypeInput; Querystring: PaginationInput }>('/getAllTransactions/:transactionType', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Admins'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('getTransactionsWithTypeSchema'),
      querystring: generalRef('paginationSchema'),
    },
  },
    fetchAllTransactionsHandler
  );

  // Update Transactions
  app.patch<{ Body: UpdateTransactionInput }>('/updateTransaction', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Admins'],
      security: [{ bearerAuth: [] }],
      body: transactionRef('updateTransactionSchema'),
      response: {
        400: generalRef('badRequestSchema'),
        403: generalRef('forbiddenSchema'),
        404: generalRef('unavailableSchema'),
      },
    },
  },
    updateTransactionHandler
  );

  // Fetch User Transactions
  app.post<{ Body: GetUserTransactionInput; Querystring: PaginationInput }>('/getUserTransactions',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['Transactions', 'Admins'],
        security: [{ bearerAuth: [] }],
        body: transactionRef('getUserTransactionsSchema'),
        querystring: generalRef('paginationSchema'),
        response: {
          400: generalRef('badRequestSchema'),
        },
      },
    },
    fetchUserTransactionHandler
  );

  // Get a User Balance
  app.post<{ Params: FetchUserBalanceInput }>('/getUserBalance/:userId', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Admins'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('fetchUserBalanceSchema'),
      response: {
        200: transactionRef('getBalanceResponseSchema'),
        400: generalRef('badRequestSchema'),
      },
    },
  },
    getUserBalanceHandler
  );

  // Delete a transaction
  app.delete<{ Params: FetchTransactionInput }>('/delete/:transactionId', {
    preHandler: app.authenticate,
    schema: {
      tags: ['Transactions', 'Admins'],
      security: [{ bearerAuth: [] }],
      params: transactionRef('fetchTransactionSchema'),
    },
  },
    deleteUserTransactionHandler
  );
}
