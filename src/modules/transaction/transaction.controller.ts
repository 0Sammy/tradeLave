import { FastifyReply, FastifyRequest } from 'fastify';
import axios from 'axios';

// Services
import { createNewTransaction, deleteTransaction, getCoinTransactions, getDashboardValues, getPrices, getTransactionById, getTransactions, getTransactionsWithTypes, getUserBalanceByCoin, getUserTransactions, patchTransaction, updateTransaction } from './transaction.service';
import { findUserById } from '../user/user.service';
import { findAdminById } from '../admin/admin.service';
import { getUserReferrer, updateReferral } from '../referral/referral.services';

// Schemas
import { CreateTransactionInput, CreateUserTransactionInput, FetchTransactionInput, FetchUserBalanceInput, GetCoinDetailsInput, GetTransactionsWithTypeInput, GetTransactionWithTypesInput, GetUserTransactionInput, PatchTransactionInput, UpdateTransactionInput } from './transaction.schema';
import { PaginationInput } from '../general/general.schema';
import { TransactionCoin, TransactionType } from './transaction.model';

// Utils, Enums and Configs
import { generateTransactionHash } from '../../utils/generate';
import { sendResponse } from '../../utils/response.utils';
import { coinIds } from '../../enums';
import { COINGECKO_API_KEY, REFERRAL_PERCENT } from '../../config';
import { emitAndSaveNotification } from '../../utils/socket';
import { formatAddress, formatNowUtc } from '../../utils/format';
import { sendAdminEmail, sendEmail } from '../../libs/mailer';
import { formatCurrency } from '../../utils/format';

// Email Templates
import withdrawal from '../../emails/UserMails/withdrawal';
import deposit from '../../emails/UserMails/deposit';
import generalTemplate from '../../emails/AdminMails/general';

// Constants
export const coingeckoURL = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;

// Create a new transaction
export const createNewTransactionHandler = async (request: FastifyRequest<{ Body: CreateTransactionInput }>, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  // Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) return sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  // Throw an error if user is suspended
  if (user && user.isSuspended) return sendResponse(reply, 403, false, 'Account suspended. Transaction cannot be completed.');

  // Fetch user balance and make sure user has that amount
  if (request.body.transactionType === "withdrawal") {
    const balance = await getUserBalanceByCoin(userId);
    if (balance[request.body.coin] < request.body.amount) {
      return sendResponse(reply, 409, false, `Transaction Incomplete. Insufficient ${request.body.coin} Balance`);
    }
  }

  // Generate hash, create new transaction and send a notification
  const newTransaction = await createNewTransaction({ ...request.body, user: userId });
  await emitAndSaveNotification({
    user: userId,
    type: 'transaction',
    subType: request.body.transactionType,
    title: `${request.body.coin} ${request.body.transactionType}`,
    message: `Your ${request.body.coin} ${request.body.transactionType} is pending, kindly wait while we process it.`,
  });

  // Send Emails
  if (newTransaction.transactionType === "withdrawal") {
    const withdrawalEmail = withdrawal({
      name: user.userName,
      coin: newTransaction.coin,
      amount: newTransaction.amount,
      coinAmount: newTransaction.coinAmount,
      walletAddress: formatAddress(newTransaction.walletAddress),
      date: formatNowUtc(),
      status: 'pending',
    });

    await sendEmail({
      to: user.email,
      subject: withdrawalEmail.subject,
      html: withdrawalEmail.html,
    });
  }

  if (newTransaction.transactionType === 'deposit') {
    const depositEmail = deposit({
      name: user.userName,
      coin: newTransaction.coin,
      hash: newTransaction.transactionHash,
      amount: formatCurrency(newTransaction.amount),
      coinAmount: newTransaction.coinAmount,
      date: formatNowUtc(),
      status: newTransaction.status
    });

    await sendEmail({
      to: user.email,
      subject: depositEmail.subject,
      html: depositEmail.html,
    });
  }

  // Admin Email Notification
  const template = generalTemplate({
    action: "A User Performed a Transaction",
    message: `The user with the email ${user.email} and username ${user.userName} just created a new transaction of type: ${newTransaction.transactionType}, amount: ${formatCurrency(newTransaction.amount)}, coin: ${newTransaction.coin}. Kindly login and continue`,
    name: user.userName,
    email: user.email,
  })
  await sendAdminEmail(template.html);

  return sendResponse(reply, 201, true, 'Your transaction was created successfully');
};

// Fetch Prices
export const fetchPricesHandler = async (_: FastifyRequest, reply: FastifyReply) => {

  // Fetch Prices and return
  const data = await getPrices();
  return sendResponse(reply, 200, true, 'Coins prices fetched successfully', data);
};

// Fetch the prices of a coin
export const fetchCoinDetailsHandler = async (request: FastifyRequest<{ Params: GetCoinDetailsInput }>, reply: FastifyReply) => {

  const coin = request.params.coin;
  const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${coin}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        Accept: 'application/json',
        'x-cg-demo-api-key': COINGECKO_API_KEY,
      },
    });

    return sendResponse(reply, 200, true, 'Coins details was fetched successfully', data);
  } catch (error) {
    console.log(`Failed to fetch ${coin} details:`, error);
    return sendResponse(reply, 500, false, `Failed to fetch ${coin} details. Please try again later.`);
  }
};

// Fetch a single Transaction
export const fetchTransactionHandler = async (request: FastifyRequest<{ Params: FetchTransactionInput }>, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  const transaction = await getTransactionById(request.params.transactionId);

  //Throw an error if the transactionID does not exist
  if (!transaction) return sendResponse(reply, 400, false, 'No record of a transaction matching the given identifier was found.');

  //Throw an error if the logged user isn't the same with the user
  if (transaction.user.toString() !== userId) return sendResponse(reply, 403, false, 'You do not have permission to view the details of this transaction.');

  return sendResponse(reply, 200, true, 'Transaction Details was fetched successfully.');
};

// Fetch all transaction
export const fetchAllUserTransactionsHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

  const { page = '1', limit = '50' } = request.query;

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  //Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  //Throw an error if user is suspended
  if (user && user.isSuspended) return sendResponse(reply, 403, false, 'Account suspended. Transaction cannot be completed.');

  //Fetch transactions and return them
  const transactions = await getUserTransactions(userId, parseInt(page), parseInt(limit));
  return sendResponse(reply, 200, true, 'All Transactions was fetched successfully', transactions);
};

// Get user balance
export const getBalanceHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  //Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  const userBalance = await getUserBalanceByCoin(userId);
  return sendResponse(reply, 200, true, 'Your balance was fetched successfully', userBalance);
};

// Get a coin transactions
export const getCoinTransactionsHandler = async (request: FastifyRequest<{ Params: GetCoinDetailsInput; Querystring: PaginationInput; }>, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;
  const coin = request.params.coin;
  const { page = '1', limit = '50' } = request.query;

  //Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  //Fetch transactions and return them
  const transactions = await getCoinTransactions(userId, coin as TransactionCoin, parseInt(page), parseInt(limit));
  return sendResponse(reply, 200, true, 'All Transactions was fetched successfully', transactions);
}

// Dashboard Values
export const getDashboardValuesHandler = async (request: FastifyRequest, reply: FastifyReply) => {

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  //Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  const dashboardValues = await getDashboardValues(userId);
  return sendResponse(reply, 200, true, 'Your dashboard values was fetched successfully', dashboardValues);
}

// Fetch Transaction Based on Transaction Type
export const getTypeTransactionHandler = async (request: FastifyRequest<{ Params: GetTransactionWithTypesInput; Querystring: PaginationInput; }>, reply: FastifyReply) => {

  const type = request.params.type;
  const { page = '1', limit = '50' } = request.query;

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  //Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  const transactions = await getTransactionsWithTypes(userId, type, parseInt(page), parseInt(limit));
  return sendResponse(reply, 200, true, "Transactions was fetched successfully", transactions);
}

// Patch Transaction
export const patchTransactionHandler = async (request: FastifyRequest<{ Body: PatchTransactionInput }>, reply: FastifyReply) => {

  const { hash, Id } = request.body;

  const decodedDetails = request.user;
  const userId = decodedDetails.userId;

  //Make sure the user still exists
  const user = await findUserById(userId);
  if (!user) sendResponse(reply, 400, false, 'Sorry, that user account could not be found. Please verify the information and try again.');

  await patchTransaction(Id, hash);
  return sendResponse(reply, 200, true, "Your transaction was updated successfully.")
}



// Administrative Endpoint

// Create a new transaction
export const createUserTransactionHandler = async (request: FastifyRequest<{ Body: CreateUserTransactionInput }>, reply: FastifyReply) => {

  const { user, coin, coinAmount, walletAddress, transactionType, amount, status } = request.body;
  const decodedAdmin = request.user;

  // Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 400, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  // Fetch user
  const userDetails = await findUserById(user);
  if (!userDetails) return sendResponse(reply, 400, false, 'Selected user details could not be found, kindly try again.');

  // Generate hash, create new transaction and send a notification
  const transactionHash = generateTransactionHash();
  const newTransaction = await createNewTransaction({ ...request.body, transactionHash });

  if (transactionType === 'withdrawal') {
    const withdrawalEmail = withdrawal({
      name: userDetails.userName,
      coin,
      amount,
      coinAmount,
      walletAddress: formatAddress(newTransaction.walletAddress),
      date: formatNowUtc(),
      status,
    });

    await sendEmail({
      to: userDetails.email,
      subject: withdrawalEmail.subject,
      html: withdrawalEmail.html,
    });
  }

  if (transactionType === 'deposit') {
    const depositEmail = deposit({
      name: userDetails.userName,
      coin,
      hash: transactionHash,
      amount: formatCurrency(amount),
      coinAmount,
      date: formatNowUtc(),
      status: newTransaction.status
    });
    await sendEmail({
      to: userDetails.email,
      subject: depositEmail.subject,
      html: depositEmail.html,
    });
  }

  const formattedMessage =
    transactionType === 'withdrawal'
      ? `You withdrawal ${amount} ${coin.toUpperCase()} to ${walletAddress ? formatAddress(walletAddress) : "No Wallet Address"}`
      : `${amount} ${coin.toUpperCase()} was deposited.`;

  await emitAndSaveNotification({
    user: user,
    type: 'transaction',
    subType: transactionType,
    title: `${coin} ${transactionType}`,
    message: formattedMessage,
  });

  return sendResponse(reply, 201, true, 'Your transaction was created successfully', newTransaction);
};

// Fetch all transaction
export const fetchAllTransactionsHandler = async (request: FastifyRequest<{ Params: GetTransactionsWithTypeInput; Querystring: PaginationInput; }>, reply: FastifyReply) => {

  const type = request.params.transactionType;
  const { page = '1', limit = '50' } = request.query;

  // Fetch transactions and return them
  const transactions = await getTransactions(type, parseInt(page), parseInt(limit)); return sendResponse(reply, 200, true, 'All Transactions was fetched successfully', transactions);
};

// Update Transaction
export const updateTransactionHandler = async (request: FastifyRequest<{ Body: UpdateTransactionInput }>, reply: FastifyReply) => {

  const { status, transactionId } = request.body;
  const decodedAdmin = request.user;

  // Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 400, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  // Fetch Transaction and user
  const transaction = await getTransactionById(transactionId);
  if (!transaction) return sendResponse(reply, 400, false, "Transaction doesn't exist, kindly check the credentials");

  const user = await findUserById(transaction.user.toString());
  if (!user) return sendResponse(reply, 400, false, "Something went wrong, kindly try again later.")

  // Update transaction and return
  const { success, reason } = await updateTransaction(transactionId, { status });
  if (!success) return sendResponse(reply, 400, false, reason);

  // Add referral bonus if user was referred
  if (transaction.transactionType === "deposit") {
    const referredBy = await getUserReferrer(transaction.user.toString());
    if (referredBy) {
      const amount = transaction.amount * (REFERRAL_PERCENT / 100);
      const coinAmount = transaction.coinAmount * (REFERRAL_PERCENT / 100);

      const referralData = { referralId: referredBy._id as string, rewardClaimed: amount };
      const bonusData = {
        user: referredBy._id as string,
        coin: transaction.coin,
        transactionType: TransactionType.REFERRAL,
        amount,
        coinAmount,
        status: "successful",
        transactionHash: generateTransactionHash()
      };

      // Create both documents
      await createNewTransaction(bonusData);
      await updateReferral(referralData);

      await emitAndSaveNotification({
        user: referredBy.referrer.toString(),
        type: 'transaction',
        subType: "referral",
        title: `You’ve earned a referral reward!`,
        message: ` Reward: +${amount} ${transaction.coin} — check your referral page and dashboard for more details`,
      });
    }
  }

  // Send Emails
  if (transaction.transactionType === 'deposit') {
    const depositEmail = deposit({
      name: user.userName,
      coin: transaction.coin,
      hash: transaction.transactionHash,
      amount: formatCurrency(transaction.amount),
      coinAmount: transaction.coinAmount,
      date: formatNowUtc(),
      status: request.body.status,
    });
    await sendEmail({
      to: user.email,
      subject: depositEmail.subject,
      html: depositEmail.html,
    });
  }

  if (transaction.transactionType === "withdrawal") {
    const withdrawalEmail = withdrawal({
      name: user.userName,
      coin: transaction.coin,
      amount: transaction.amount,
      coinAmount: transaction.coinAmount,
      walletAddress: formatAddress(transaction.walletAddress),
      date: formatNowUtc(),
      status: request.body.status,
    });

    await sendEmail({
      to: user.email,
      subject: withdrawalEmail.subject,
      html: withdrawalEmail.html,
    });
  }

  return sendResponse(reply, 200, true, reason);
};

// Get User Transaction
export const fetchUserTransactionHandler = async (request: FastifyRequest<{ Body: GetUserTransactionInput; Querystring: PaginationInput; }>, reply: FastifyReply) => {

  const { userId, transactionType } = request.body;
  const { page = '1', limit = '50' } = request.query;

  // Check if user exists
  const user = await findUserById(userId);
  if (!user) return sendResponse(reply, 400, false, 'The specified user details do not exist in our records.');

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  // Fetch Transactions
  const result = await getUserTransactions(userId, pageNumber, limitNumber, transactionType);

  return sendResponse(reply, 200, true, 'User transactions fetched successfully.', result);
};

// Get User Balance
export const getUserBalanceHandler = async (request: FastifyRequest<{ Params: FetchUserBalanceInput }>, reply: FastifyReply) => {

  const { userId } = request.params;

  // Check if user exists
  const user = await findUserById(userId);
  if (!user) return sendResponse(reply, 400, false, 'The specified user details do not exist in our records.');

  const userBalance = await getUserBalanceByCoin(userId);
  return sendResponse(reply, 200, true, 'Your balance was fetched successfully', userBalance);
};

// Delete a Transaction
export const deleteUserTransactionHandler = async (request: FastifyRequest<{ Params: FetchTransactionInput }>, reply: FastifyReply) => {

  const decodedAdmin = request.user;
  const transactionId = request.params.transactionId;

  // Fetch admin and make sure he is a super admin
  const admin = await findAdminById(decodedAdmin.userId);
  if (!admin) return sendResponse(reply, 400, false, 'Sorry, but you are not authorized to perform this action');
  if (admin.role !== 'super_admin') return sendResponse(reply, 403, false, 'Sorry, you are not authorized enough to perform this action');

  const deleted = await deleteTransaction(transactionId);
  return sendResponse(reply, 200, true, 'Transaction was deleted successfully', deleted);
};
