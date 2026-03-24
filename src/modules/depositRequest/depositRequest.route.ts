import { FastifyInstance } from 'fastify';

// Handlers
import { createDepositRequestHandler, createUserDepositRequestHandler, deleteDepositRequestHandler, deleteUserDepositRequestHandler, fetchAllUserDepositsRequestHandler, fetchUserDepositRequestHandler, getUserDepositRequestHandler, updateCoinAmountsHandler, updateDepositRequestHandler, updateUserDepositRequestHandler } from './depositRequest.controller';

// Middlewares
import { hasPermission } from '../../middlewares/auth';

// Schemas
import { CreateDepositRequestInput, DeleteDepositRequestInput, depositRequestRef, CreateUserDepositRequestInput, FetchUserDepositRequestInput, EditUserDepositRequestInput, EditDepositRequestInput } from './depositRequest.schema';
import { generalRef, PaginationInput } from '../general/general.schema';


// Deposit Request Routes
export default async function depositRequestRoutes(app: FastifyInstance) {

    // Create new deposit request
    app.post<{ Body: CreateDepositRequestInput }>('/create',
        {
            preHandler: app.authenticate,
            schema: {
                tags: ['DepositRequest', 'Users'],
                security: [{ bearerAuth: [] }],
                body: depositRequestRef('createDepositRequestSchema'),
                response: {
                    404: generalRef('unavailableSchema'),
                    400: generalRef('badRequestSchema'),
                },
            },
        },
        createDepositRequestHandler
    );

    // Update user deposit request
    app.patch<{ Body: EditDepositRequestInput }>("/update", {
        preHandler: app.authenticate,
        schema: {
            tags: ['DepositRequest', 'Users'],
            security: [{ bearerAuth: [] }],
            body: depositRequestRef('editDepositRequestSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                400: generalRef('badRequestSchema'),
                401: generalRef('unauthorizedSchema')
            }
        }
    }, updateDepositRequestHandler
    )

    // Fetch user deposit request
    app.get<{ Querystring: PaginationInput }>('/get',
        {
            preHandler: app.authenticate,
            schema: {
                tags: ['DepositRequest', 'Users'],
                security: [{ bearerAuth: [] }],
                querystring: generalRef('paginationSchema'),
                response: {
                    404: generalRef('unavailableSchema'),
                },
            },
        },
        fetchUserDepositRequestHandler
    )

    // Delete deposit request
    app.delete<{ Params: DeleteDepositRequestInput }>('/delete/:depositId',
        {
            preHandler: app.authenticate,
            schema: {
                tags: ['DepositRequest', 'Users'],
                security: [{ bearerAuth: [] }],
                params: depositRequestRef('deleteDepositRequestSchema'),
                response: {
                    404: generalRef('unavailableSchema'),
                    401: generalRef('unauthorizedSchema')
                },
            },
        },
        deleteDepositRequestHandler
    );

    // Update coinAmount
    app.patch("/updateCoinAmount", {
        schema: {
            tags: ['DepositRequest', 'Users'],
        },
    }, updateCoinAmountsHandler
    )

    // Administrative Routes

    // Create deposit request for users
    app.post<{ Body: CreateUserDepositRequestInput }>("/createRequest", {
        preHandler: [
            app.authenticate,
            hasPermission(["super_admin"])
        ],
        schema: {
            tags: ['DepositRequest', 'Admins'],
            security: [{ bearerAuth: [] }],
            body: depositRequestRef('createUserDepositRequestSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                401: generalRef('unauthorizedSchema')
            }
        }
    }, createUserDepositRequestHandler
    )

    // Fetch a users deposit request
    app.get<{ Params: FetchUserDepositRequestInput, Querystring: PaginationInput }>("/getUser/:userId", {
        preHandler: app.authenticate,
        schema: {
            tags: ['DepositRequest', 'Admins'],
            security: [{ bearerAuth: [] }],
            params: depositRequestRef('fetchUserDepositRequestSchema'),
            querystring: generalRef('paginationSchema'),
            response: {
                404: generalRef('unavailableSchema'),
            }
        }
    }, getUserDepositRequestHandler
    )

    // Fetch all users deposit request
    app.get<{ Querystring: PaginationInput }>("/getAll", {
        preHandler: app.authenticate,
        schema: {
            tags: ['DepositRequest', 'Admins'],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema'),
            response: {
                404: generalRef('unavailableSchema'),
            }
        }
    }, fetchAllUserDepositsRequestHandler
    )

    // Update user deposit request
    app.patch<{ Body: EditUserDepositRequestInput }>("/updateRequest", {
        preHandler: [
            app.authenticate,
            hasPermission(["super_admin"])
        ],
        schema: {
            tags: ['DepositRequest', 'Admins'],
            security: [{ bearerAuth: [] }],
            body: depositRequestRef('editUserDepositRequestSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                400: generalRef('badRequestSchema')
            }
        }
    }, updateUserDepositRequestHandler
    )

    // Delete user deposit request
    app.delete<{ Params: DeleteDepositRequestInput }>('/deleteRequest/:depositId',
        {
            preHandler: [
                app.authenticate,
                hasPermission(["super_admin"])
            ],
            schema: {
                tags: ['DepositRequest', 'Admins'],
                security: [{ bearerAuth: [] }],
                params: depositRequestRef('deleteDepositRequestSchema'),
                response: {
                    404: generalRef('unavailableSchema'),
                    401: generalRef('unauthorizedSchema')
                },
            },
        },
        deleteUserDepositRequestHandler
    );

}