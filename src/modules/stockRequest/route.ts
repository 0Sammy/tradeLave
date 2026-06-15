import { FastifyInstance } from 'fastify';

// Handlers
import * as StockRequestHandlers from './controller';

// Schemas
import { CreateRequestInput, requestRef } from './schema';
import { generalRef, IdInput, PaginationInput } from '../general/general.schema';
import { isAdmin, isSuperAdmin } from '../../middlewares/role';

// Stock Request Route
export default async function requestRoutes(app: FastifyInstance) {

    // New Stock Request
    app.post<{ Body: CreateRequestInput }>("/new", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stock Requests', "Users"],
            security: [{ bearerAuth: [] }],
            body: requestRef('createRequestSchema')
        },
    }, StockRequestHandlers.createStockPurchaseHandler
    )

    // Edit Request
    app.patch("/update", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stock Requests', "Users"],
            security: [{ bearerAuth: [] }],
        },
    }, StockRequestHandlers.updateStockPurchaseHandler
    )

    // Get Requests
    app.get("/get", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Stock Requests', "Users"],
            security: [{ bearerAuth: [] }],
        },
    }, StockRequestHandlers.getRequestsHandler
    )

    // Admin

    // Get All Requests
    app.get<{ Querystring: PaginationInput }>("/getAll", {
        preHandler: [app.authenticate, isAdmin],
        schema: {
            tags: ['Stock Requests', "Admins"],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema')
        },
    }, StockRequestHandlers.getAllRequestsHandler
    )

    // Delete Request
    app.delete<{ Params: IdInput }>("/delete/:id", {
        preHandler: [app.authenticate, isSuperAdmin],
        schema: {
            tags: ['Stock Requests', "Users"],
            security: [{ bearerAuth: [] }],
        },
    }, StockRequestHandlers.deleteStockPurchaseHandler
    )
}