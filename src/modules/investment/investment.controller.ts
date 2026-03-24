import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import { findAdminById } from '../admin/admin.service';
import { findUserById } from './../user/user.service';
import { getPlanById } from '../plans/plans.service';
import { createInvestment, findInvestments, getAllInvestments, getInvestmentById, getUserInvestments, updateInvestmentStatus } from './investment.services';
import { getUserBalanceByCoin } from '../transaction/transaction.service';

// Schemas
import { CreateInvestmentInput, FetchUserInvestmentsInput, UpdateInvestmentStatusInput } from './investment.schema';
import { PaginationInput } from '../general/general.schema';
import { TransactionCoin } from '../transaction/transaction.model';

// Utils
import { sendResponse } from '../../utils/response.utils';
import { sendAdminEmail, sendEmail } from '../../libs/mailer';
import { formatCurrency } from '../../utils/format';
import { emitAndSaveNotification } from '../../utils/socket';

// Templates
import generalTemplate from '../../emails/AdminMails/general';
import investment from '../../emails/UserMails/investment';


// Create new investment
export const createInvestmentHandler = async (request: FastifyRequest<{ Body: CreateInvestmentInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const data = request.body;

    // Fetch user and make sure it exists
    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    // Fetch plan and make sure it still exists
    const plan = await getPlanById(data.plan);
    if (!plan) return sendResponse(reply, 404, false, "Plan not found");

    // Make sure the user doesn't pass the minimum or maximum
    if (data.amount < plan.minValue) return sendResponse(reply, 409, false, "The entered amount is less than the minimum value");
    if (data.amount > plan.maxValue) return sendResponse(reply, 409, false, "The entered amount is greater than the maximum value");

    // Make sure the user has the money
    const userBalance = await getUserBalanceByCoin(userId);
    const coinAmount = userBalance[data.coin];
    const coinBalance = coinAmount * data.rate;
    if (coinBalance < data.amount) return sendResponse(reply, 409, false, "Staked amount is greater than available balance");

    // Check how many times a user has invested in that plan
    const investments = await findInvestments(userId, plan.title);
    if (investments.length >= plan.maxExecutions && !user.byPass) {
        return sendResponse(reply, 403, false, "Sorry, you have reached the maximum time you can invest in this plan");
    }

    // Create new investment, send notification and return
    const newInv = await createInvestment({ user: userId, coin: data.coin as TransactionCoin, rate: data.rate, plan: data.plan, capital: data.amount });

    // User Socket and Email Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: 'stake',
        title: `New Stake`,
        message: `${formatCurrency(newInv.capital)} (${newInv.coin.toUpperCase()}) staked — expected return ${formatCurrency(newInv.returnAmount)} in ${newInv.durationInDays} days. Stake in progress`,
    });

    const invEmail = investment({
        name: user.userName,
        coin: newInv.coin,
        plan: newInv.plan,
        capital: formatCurrency(newInv.capital),
        roi: newInv.roi,
        returnAmount: formatCurrency(newInv.returnAmount),
        durationInDays: newInv.durationInDays,
    })
    await sendEmail({
        to: user.email,
        subject: invEmail.subject,
        html: invEmail.html,
    })

    // Admin Email Notification
    const template = generalTemplate({
        action: "A User Started A New Investment",
        message: `The user with the email ${user.email} and username ${user.userName} just created a new investment of Plan: ${newInv.plan}, Capital: ${formatCurrency(newInv.capital)}, Coin: ${newInv.coin}. Kindly login and continue`,
        name: user.userName,
        email: user.email,
    })
    await sendAdminEmail(template.html);

    return sendResponse(reply, 201, true, "Stake was initiated successfully");
}

// Fetch a user investments
export const getUserInvestmentsHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const { page = '1', limit = '50' } = request.query;

    // Fetch user and make sure it exists
    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    // Fetch user investments and return
    const investments = await getUserInvestments(userId, Number(page), Number(limit));
    return sendResponse(reply, 200, true, "User investments was fetched successfully", investments);
}

// Administrative Endpoint

// Fetch a user Investments
export const getUserInvestmentHandler = async (request: FastifyRequest<{ Params: FetchUserInvestmentsInput, Querystring: PaginationInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const { page = '1', limit = '50' } = request.query;
    const userId = request.params.userId;

    // Fetch admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");

    // Fetch user investments and return
    const investments = await getUserInvestments(userId, Number(page), Number(limit));
    return sendResponse(reply, 200, true, "All user Investments was fetched successfully", investments);
}

// Fetch all user investments
export const getAllInvestmentsHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const { page = '1', limit = '50' } = request.query;

    // Fetch admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");

    // Fetch all investments and return
    const investments = await getAllInvestments({ page: Number(page), limit: Number(limit) });
    return sendResponse(reply, 200, true, "All Investments was fetched successfully", investments);
}

// Update an investment
export const updateInvestmentHandler = async (request: FastifyRequest<{ Body: UpdateInvestmentStatusInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const data = request.body;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Fetch investment and make sure it exists
    const investment = await getInvestmentById(data.investmentId);
    if (!investment) return sendResponse(reply, 404, false, "Investment not Found");

    // Update investment and return
    await updateInvestmentStatus(data.investmentId, data.status);
    return sendResponse(reply, 200, true, "Investment was updated successfully.")
}