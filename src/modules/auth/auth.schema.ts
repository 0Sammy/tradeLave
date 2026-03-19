import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

//Schemas
import { responseCore } from '../general/general.schema';

const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),

  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  }),

  device: z.object({
    ua: z.string().optional(),
    type: z.enum(["desktop", "mobile", "tablet", "console", "embedded", "smarttv", "wearable", "xr"]).optional(),
    os: z.string().optional(),
    browser: z.string().optional()
  }),
});

const adminLoginSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),

  password: z.string({
    required_error: 'Password is required',
    invalid_type_error: 'Password must be a string',
  }),
})

const passwordResetEmailSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),
});

const verifyPasswordResetSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),

  otp: z
    .string({
      required_error: 'OTP is required',
    })
    .min(6, 'Password cannot be less than size(6) numbers')
    .max(6, 'Password cannot be more than six(6) numbers'),
});

const passwordResetSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),

  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(6, 'Password too short - should be 6 Chars minimum'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: 'Your current password is required',
    })
    .min(6, 'Password too short - should be 6 Chars minimum'),

  newPassword: z
    .string({
      required_error: 'Your new password is required',
    })
    .min(6, 'Password too short - should be 6 Chars minimum'),
});

const loginResponseSchema = z.object({
  ...responseCore,
  data: z.object({
    accessToken: z.string({
      required_error: 'Returning access token is required',
    }),
    id: z.string({
      required_error: "ID is required"
    })
  }),
});

export type LoginUserInput = z.infer<typeof loginSchema>;
export type LoginAdminInput = z.infer<typeof adminLoginSchema>;
export type PasswordResetEmailInput = z.infer<typeof passwordResetEmailSchema>;
export type VerifyPasswordResetInput = z.infer<typeof verifyPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof passwordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const { schemas: authSchemas, $ref: authRef } = buildJsonSchemas(
  {
    loginSchema,
    adminLoginSchema,
    passwordResetEmailSchema,
    verifyPasswordResetSchema,
    passwordResetSchema,
    changePasswordSchema,
    loginResponseSchema,
  },
  { $id: 'AuthSchema' }
);
