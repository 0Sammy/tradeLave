import { FastifyInstance } from 'fastify';

// Handlers
import { deleteUserReferral, getAllReferrersHandler, getUserReferralHandler } from './referral.controller';

// Middlewares
import { hasPermission } from '../../middlewares/auth';

// Schemas
import { generalRef, PaginationInput } from '../general/general.schema';
import { DeleteReferralInput, referralRef } from './referral.schema';


// Referral routes
export default async function referralRoutes(app: FastifyInstance) {

    // Get users referrals
    app.get("/get", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Referrals', "Users"],
            security: [{ bearerAuth: [] }],
            response: {
                404: generalRef('unavailableSchema'),
            },
        },
    }, getUserReferralHandler
    )

    // Admin Endpoints

    // Get all Referrals
    app.get<{ Querystring: PaginationInput }>("/getAll", {
        preHandler: app.authenticate,
        schema: {
            tags: ['Referrals', "Admins"],
            security: [{ bearerAuth: [] }],
            querystring: generalRef('paginationSchema'),
            response: {
                404: generalRef('unavailableSchema'),
            },
        },
    }, getAllReferrersHandler
    )


    // Delete Referrals
    app.delete<{ Params: DeleteReferralInput }>('/delete/:referralId', {
        preHandler: [
            app.authenticate,
            hasPermission(["super_admin"])
        ],
        schema: {
            tags: ['Referrals', "Admins"],
            security: [{ bearerAuth: [] }],
            params: referralRef('deleteReferralSchema'),
            response: {
                404: generalRef('unavailableSchema'),
                401: generalRef('unauthorizedSchema'),
                204: generalRef('responseSchema')
            },
        },
    }, deleteUserReferral
    )
}