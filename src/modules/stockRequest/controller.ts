import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import { randomUUID } from 'crypto';

// Services
import {
    createPurchaseRequest,
    updatePurchaseRequest,
    deletePurchaseRequest,
    fetchPurchaseRequest,
    getAllRequests,

} from './service';
import { getStockPrice } from '../stock/service';
import { findUserById } from '../user/user.service';
import { getSettings } from '../settings/service';

// Schemas
import { IdInput, PaginationInput } from '../general/general.schema';
import { CreateRequestInput } from './schema';

// Utils, Configs and Templates
import { sendResponse } from '../../utils/response.utils';
import { uploadFileToS3 } from './../../libs/upload';
import { emitAndSaveNotification } from '../../utils/socket';
import generalTemplate from '../../emails/AdminMails/general';
import { sendAdminEmail } from '../../libs/mailer';

// Constants
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../user/user.controller';


// User Creates Request
export const createStockPurchaseHandler = async (request: FastifyRequest<{ Body: CreateRequestInput }>, reply: FastifyReply) => {

    const { userId } = request.user as any;
    const { stockSymbol, shares } = request.body;
    let livePrice: number;

    const user = await findUserById(userId);
    if (!user) return sendResponse(reply, 404, false, "User not found");

    // Fetch Settings
    const settings = await getSettings();

    if (stockSymbol === "SPCX") {
        livePrice = settings.sharePrice
    } else {
        livePrice = await getStockPrice(stockSymbol);
    }

    // Create Request
    const newRequest = await createPurchaseRequest(userId, stockSymbol, shares, livePrice);

    // Notification
    await emitAndSaveNotification({
        user: userId,
        type: 'transaction',
        subType: "stock_request",
        title: `Buy Request Submitted`,
        message: `Your buy request for the purchase of ${newRequest.shares} ${newRequest.stockSymbol} shares has been submitted successfully.`,
    });

    // Admin Email Notification
    const template = generalTemplate({
        action: "New Buy Request",
        message: `The user, with username: ${user.userName} just submitted a buy request for the purchase of ${newRequest.shares} ${newRequest.stockSymbol} shares`,
    })
    await sendAdminEmail(template.html);


    return sendResponse(reply, 201, true, "Stock purchase request initiated", newRequest);
};

// User/Admin Updates Request (Chat & Receipt Upload)
export const updateStockPurchaseHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const parts = request.parts();

    let purchaseId: string | undefined;
    let message: string | undefined;
    let role: string = "user";
    let hasPaid = false;
    let fileUrl: string | undefined;
    let status: string | undefined;

    for await (const part of parts) {
        if (part.type === "file") {
            if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) throw new Error("Unsupported media type");

            const buffer = await part.toBuffer();
            if (buffer.length > MAX_FILE_SIZE_BYTES) return sendResponse(reply, 413, false, "File too large");

            const ext = path.extname(part.filename || "");
            const filename = `stock-purchases/${randomUUID()}${ext}`;

            fileUrl = await uploadFileToS3(filename, buffer, part.mimetype);
        }

        if (part.type === "field") {
            if (part.fieldname === "purchaseId") purchaseId = part.value as string;
            if (part.fieldname === "message") message = part.value as string;
            if (part.fieldname === "role") role = part.value as string;
            if (part.fieldname === "hasPaid") hasPaid = part.value === "true";
            if (part.fieldname === "status") status = part.value as string;
        }
    }

    if (!purchaseId) return sendResponse(reply, 400, false, "Missing required fields");

    const updatedRequest = await updatePurchaseRequest(purchaseId, role, hasPaid, message, fileUrl, status);
    return sendResponse(reply, 200, true, "Request was updated successfully", updatedRequest);
};

// Fetch Users Requests
export const getRequestsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.userId;

    // Fetch Requests and return
    const requests = await fetchPurchaseRequest(userId);
    return sendResponse(reply, 200, true, "Requests Fetched Successfully", requests);
}

// Admin

// Get All Requests
export const getAllRequestsHandler = async (request: FastifyRequest<{ Querystring: PaginationInput }>, reply: FastifyReply) => {

    const { page = '1', limit = '50' } = request.query;

    // Fetch Requests and return
    const requests = await getAllRequests(parseInt(page, 10), parseInt(limit, 10));
    return sendResponse(reply, 200, true, "Requests were fetched successfully", requests);
}


// Admin Deletes Request
export const deleteStockPurchaseHandler = async (request: FastifyRequest<{ Params: IdInput }>, reply: FastifyReply) => {
    const { id } = request.params;

    await deletePurchaseRequest(id);
    return sendResponse(reply, 200, true, "Request and associated files deleted successfully");
};