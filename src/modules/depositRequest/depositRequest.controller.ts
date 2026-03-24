import { FastifyRequest, FastifyReply } from 'fastify';

// Services
import { findUserById } from '../user/user.service';
import { adminCreateDepositRequest, createDepositRequest, deleteDepositRequest, getAllDepositRequests, getDepositRequestById, getPendingRequests, getUserDepositRequests, updateAllDepositRequestCoinAmounts, updateDepositRequest } from './depositRequest.services';
import { findAdminById } from '../admin/admin.service';
import { createNewTransaction } from '../transaction/transaction.service';

// Schemas
import { CreateDepositRequestInput, CreateUserDepositRequestInput, DeleteDepositRequestInput, EditDepositRequestInput, EditUserDepositRequestInput, FetchUserDepositRequestInput } from './depositRequest.schema';
import { PaginationInput } from '../general/general.schema';
import { TransactionType } from '../transaction/transaction.model';

// Utils, Libs and Templates
import { sendResponse } from '../../utils/response.utils';
import { formatNowUtc } from '../../utils/format';
import { emitAndSaveNotification } from '../../utils/socket';
import { generateTransactionHash } from '../../utils/generate';
import generalTemplate from '../../emails/AdminMails/general';
import { sendAdminEmail } from '../../libs/mailer';

// Create deposit request
export const createDepositRequestHandler = async (request: FastifyRequest<{ Body: CreateDepositRequestInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const user = await findUserById(userId);

    //Return an error if user not found
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    //Check if the user has a pending deposit request
    const hasPending = await getPendingRequests(userId);
    if (hasPending.length > 0) return sendResponse(reply, 400, false, "You have a pending request, kindly wait.");

    // Create Deposit Request, send notification and return
    const newRequest = await createDepositRequest(userId, request.body);

    // Admin Email Notification
    const template = generalTemplate({
        action: "User New Bank Deposit Request",
        message: `The user with the email ${user.email} and username ${user.userName} just initiated a Bank Deposit Request of ${newRequest.amount} ${newRequest.coin} kindly login and continue`,
        name: user.userName,
        email: user.email,
    })
    await sendAdminEmail(template.html);

    await emitAndSaveNotification({
        user: newRequest.user.toString(),
        type: 'transaction',
        subType: "deposit_request",
        title: `Deposit request submitted`,
        message: `Your deposit request of ${newRequest.amount} ${newRequest.coin} has been submitted and is now pending. (Submitted on ${formatNowUtc()} — tap to view status.)`,
    });

    return sendResponse(reply, 201, true, "Deposit Request was created successfully");
}

// Edit a deposit request
export const updateDepositRequestHandler = async (request: FastifyRequest<{ Body: EditDepositRequestInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const data = request.body;

    // Fetch user and make sure the user is a super admin
    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    //Fetch the deposit request and make sure it belongs to the user
    const depositRequest = await getDepositRequestById(data.depositId);
    if (!depositRequest) return sendResponse(reply, 404, false, "Deposit Request not found kindly try again later");
    if (depositRequest.user.toString() !== userId) return sendResponse(reply, 401, false, "Sorry but you are not authorized to perform this action");

    // Update deposit request, send notification and return
    const updatedRequest = await updateDepositRequest(data);
    if (!updatedRequest) return sendResponse(reply, 400, false, "Something went wrong, please try again later.");

    // Admin Email Notification
    const template = generalTemplate({
        action: "User Updated Their Bank Deposit Request",
        message: `The user with the email ${user.email} and username ${user.userName} just updated their Bank Deposit Request of ${updatedRequest.amount} ${updatedRequest.coin} kindly login and continue`,
        name: user.userName,
        email: user.email,
    })
    await sendAdminEmail(template.html);

    await emitAndSaveNotification({
        user: updatedRequest.user.toString(),
        type: 'transaction',
        subType: "deposit_request",
        title: `Deposit Request Update`,
        message: `You successfully updated the payment status of your deposit request: ${updatedRequest.amount} ${updatedRequest.coin} on ${formatNowUtc()}.`,
    });

    return sendResponse(reply, 200, true, "User deposit details was updated successfully.");
}

// Fetch a users deposit request
export const fetchUserDepositRequestHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const user = await findUserById(userId);

    const { page = '1', limit = '50' } = request.query;

    //Return an error if user not found
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    //Fetch user deposit requests and return
    const depositRequests = await getUserDepositRequests(userId, { page: Number(page), limit: Number(limit) });
    return sendResponse(reply, 200, true, "User deposit request was fetched successfully", depositRequests);
}

// Delete Deposit Request
export const deleteDepositRequestHandler = async (request: FastifyRequest<{ Params: DeleteDepositRequestInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const userId = decodedUser.userId;
    const user = await findUserById(userId);

    const depositId = request.params.depositId;

    //Return an error if user not found
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    //Fetch the deposit request and make sure it belongs to the user
    const depositRequest = await getDepositRequestById(depositId);
    if (!depositRequest) return sendResponse(reply, 404, false, "Deposit Request not found kindly try again later");
    if (depositRequest.status === "pending") return sendResponse(reply, 403, false, "You can't delete an active deposit request");
    if (depositRequest.user.toString() !== userId) return sendResponse(reply, 401, false, "Sorry but you are not authorized to perform this action");

    // Delete Request, Update Admin and return
    await deleteDepositRequest(depositId);

    // Admin Email Notification
    const template = generalTemplate({
        action: "User Deleted Their Bank Deposit Request",
        message: `The user with the email ${user.email} and username ${user.userName} just deleted their Bank Deposit Request of ${depositRequest.amount} ${depositRequest.coin} kindly login and continue`,
        name: user.userName,
        email: user.email,
    })
    await sendAdminEmail(template.html);

    return sendResponse(reply, 204, true, "The Deposit request was deleted successfully.");
}

// Update the coin amount
export const updateCoinAmountsHandler = async (_: FastifyRequest, reply: FastifyReply) => {

  const result = await updateAllDepositRequestCoinAmounts();
  return sendResponse(reply, 200, true, "All deposit requests coin amount was updated successfully", result)
};


// Administrative Handlers

// Create deposit request
export const createUserDepositRequestHandler = async (request: FastifyRequest<{ Body: CreateUserDepositRequestInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const data = request.body;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Make sure the user exists
    const user = await findUserById(data.user);
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    //Create Deposit Request and return
    await adminCreateDepositRequest(data);
    return sendResponse(reply, 201, true, "Deposit Request was created successfully");
}

// Fetch a user deposit request
export const getUserDepositRequestHandler = async (request: FastifyRequest<{ Params: FetchUserDepositRequestInput, Querystring: PaginationInput }>, reply: FastifyReply) => {

    const userId = request.params.userId;

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const { page = '1', limit = '50' } = request.query;

    // Fetch admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");

    // Make sure the user exists
    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not Found");

    //Fetch user deposit requests and return
    const depositRequests = await getUserDepositRequests(userId, { page: Number(page), limit: Number(limit) });
    return sendResponse(reply, 200, true, "User deposit request was fetched successfully", depositRequests);
}

// Fetch all deposit requests
export const fetchAllUserDepositsRequestHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const { page = '1', limit = '50' } = request.query;

    // Fetch admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");

    // Fetch all deposit request and return
    const depositRequests = await getAllDepositRequests({ page: Number(page), limit: Number(limit) });
    return sendResponse(reply, 200, true, "User deposit requests was fetched successfully", depositRequests);
}

// Update a deposit requests
export const updateUserDepositRequestHandler = async (request: FastifyRequest<{ Body: EditUserDepositRequestInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;
    const { status, ...data } = request.body;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    // Fetch deposit request, make sure it exists
    const depositRequest = await getDepositRequestById(data.depositId);
    if (!depositRequest) return sendResponse(reply, 404, false, "Deposit Request not Found.");

    // Update deposit request, send notification and return
    const updatedRequest = await updateDepositRequest(request.body);
    if (!updatedRequest) return sendResponse(reply, 400, false, "Something went wrong, please try again later.");

    // If Status is successful create a new deposit
    if (status === "successful" && depositRequest.status !== "successful") {
        const data = {
            user: depositRequest.user.toString(),
            coin: depositRequest.coin,
            transactionType: TransactionType.DEPOSIT,
            amount: depositRequest.amount,
            coinAmount: depositRequest.coinAmount,
            status: "successful",
            transactionHash: generateTransactionHash()
        }
        await createNewTransaction(data);

        await emitAndSaveNotification({
            user: updatedRequest.user.toString(),
            type: 'transaction',
            subType: "deposit",
            title: `New Deposit`,
            message: `Your deposit of ${updatedRequest.amount} ${updatedRequest.coin} was successful. (Deposited on ${formatNowUtc()})`,
        });
    }

    await emitAndSaveNotification({
        user: updatedRequest.user.toString(),
        type: 'transaction',
        subType: "deposit_request",
        title: `Deposit Request Update`,
        message: `Your deposit request of ${updatedRequest.amount} ${updatedRequest.coin} is now ${updatedRequest.status}. (Updated on ${formatNowUtc()})`,
    });

    return sendResponse(reply, 200, true, "User deposit details was updated successfully.");
}

// Delete a deposit requests
export const deleteUserDepositRequestHandler = async (request: FastifyRequest<{ Params: DeleteDepositRequestInput }>, reply: FastifyReply) => {

    const decodedUser = request.user;
    const adminId = decodedUser.userId;

    // Fetch admin and make sure the user is a super admin
    const admin = await findAdminById(adminId);
    if (!admin) return sendResponse(reply, 404, false, "Admin not Found");
    if (admin.role !== "super_admin") return sendResponse(reply, 401, false, "Unauthorized");

    const depositId = request.params.depositId;


    //Fetch the deposit request and make sure it belongs to the user
    const depositRequest = await getDepositRequestById(depositId);
    if (!depositRequest) return sendResponse(reply, 404, false, "Deposit Request not found kindly try again later");

    // Delete Request and return
    await deleteDepositRequest(depositId);
    return sendResponse(reply, 204, true, "The Deposit request was deleted successfully.");
}