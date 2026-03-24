import { FastifyInstance } from 'fastify';

// Handlers
import { createInvestmentHandler, getAllInvestmentsHandler, getUserInvestmentsHandler, updateInvestmentHandler } from './investment.controller';

// Middlewares
import { hasPermission } from '../../middlewares/auth';

// Schemas
import { CreateInvestmentInput, FetchUserInvestmentsInput, investmentRef, UpdateInvestmentStatusInput } from './investment.schema';
import { generalRef, PaginationInput } from '../general/general.schema';



// Investment routes
export default async function investmentRoutes(app: FastifyInstance) {

    // Create new Investment
    app.post<{ Body: CreateInvestmentInput }>("/create", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Investments', "Users"],
            security: [{ bearerAuth: [] }],
            body: investmentRef('createInvestmentSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                403: generalRef('forbiddenSchema'),
                201: generalRef('responseSchema')
            },
        },
    }, createInvestmentHandler
    )

    // Fetch user investments
    app.get<{ Querystring: PaginationInput }>("/get", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Investments', 'Users'],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema'),
            response: {
                404: generalRef('unavailableSchema'),
            },
        },
    }, getUserInvestmentsHandler
    )

    // Admin Endpoints

    // Get a user investments
    app.get<{ Params: FetchUserInvestmentsInput, Querystring: PaginationInput }>("/getUser/:userId", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Investments', 'Admins'],
            security: [{ bearerAuth: [] }],
            params: investmentRef('fetchUserInvestmentsSchema'),
            querystring: generalRef('paginationSchema'),
            response: {
                404: generalRef('unavailableSchema'),
            },
        },
    }, getUserInvestmentsHandler
    )

    // Get all users investments
    app.get<{ Querystring: PaginationInput }>("/getAll", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Investments', 'Admins'],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema'),
            response: {
                404: generalRef('unavailableSchema'),
            },
        },
    }, getAllInvestmentsHandler
    )

    // Update Investment
    app.patch<{ Body: UpdateInvestmentStatusInput }>("/update", {
        preHandler: [
            app.authenticate,
            hasPermission(["super_admin"]),
        ],
        schema: {
            tags: ['Investments', 'Admins'],
            security: [{ bearerAuth: [] }],
            body: investmentRef('updateInvestmentStatusSchema'),
            response: {
                401: generalRef('unauthorizedSchema'),
                404: generalRef('unavailableSchema'),
                200: generalRef('responseSchema')
            },
        },
    }, updateInvestmentHandler
    )
}
