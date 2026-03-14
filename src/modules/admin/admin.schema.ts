import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

//General Schema
import { responseCore } from '../general/general.schema';
import { AdminRole } from './admin.model';

const adminCore = {
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),
  role: z.nativeEnum(AdminRole).optional(),
};

const createAdminSchema = z.object({
  ...adminCore,
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(6, 'Password too short - should be 6 Chars minimum'),
});

const fetchAdminSchema = z.object({
  adminId: z.string({
    required_error: 'Admin ID is required',
  }),
});

const updateAdminSchema = z.object({
  adminId: z.string({
    required_error: 'Admin ID is required',
  }),
  email: z.string().optional(),
  password: z.string().optional(),
  role: z.nativeEnum(AdminRole).optional(),
  encryptedPassword: z.string().optional(),
  isSuspended: z.boolean().optional(),
});

const generalAdminResponseSchema = z.object({
  ...responseCore,
  data: z.object({
    ...adminCore,
    adminId: z.string(),
    _id: z.string(),
    role: z.nativeEnum(AdminRole).optional(),
    lastSession: z.string().date().optional(),
    decryptedPassword: z.string().optional(),
    encryptedPassword: z.string(),
    createdAt: z.string(),
  }),
});

const fetchAdminsResponseSchema = z.object({
  ...responseCore,
  data: z.array(
    z.object({
      ...adminCore,
      _id: z.string(),
      adminId: z.string(),
      isSuspended: z.boolean(),
      role: z.nativeEnum(AdminRole).optional(),
      lastSession: z.string().date().optional(),
      encryptedPassword: z.string(),
      decryptedPassword: z.string().optional(),
      createdAt: z.string(),
    })
  ),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type FetchAdminInput = z.infer<typeof fetchAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

export const { schemas: adminSchemas, $ref: adminRef } = buildJsonSchemas(
  {
    createAdminSchema,
    fetchAdminSchema,
    updateAdminSchema,
    generalAdminResponseSchema,
    fetchAdminsResponseSchema,
  },
  { $id: 'AdminSchema' }
);
