import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

//General Schema
import { responseCore } from '../general/general.schema';

// List of allowed email endings
const allowedEmailEndings = [
  '@gmail.com',
  '@outlook.com',
  '@hotmail.com',
  '@live.com',
  '@msn.com',
  '@yahoo.com',
  '@ymail.com',
  '@rocketmail.com',
  '@icloud.com',
  '@protonmail.com',
  '@zoho.com',
  '@aol.com',
  '@fastmail.com',
];

const emailDomainPattern = new RegExp(
  `(${allowedEmailEndings.map((domain) => domain.replace('.', '\\.')).join('|')})$`
);

export const emailValidationSchema = z
  .string()
  .email()
  .regex(emailDomainPattern, 'Invalid email domain');

const userCore = {
  _id: z.string(),
  email: z.string().email(),
  userName: z.string(),
  country: z.string(),
  address: z.string().optional(),
  phoneNumber: z.string(),
  encryptedPassword: z.string(),
  accountId: z.string(),
  gender: z.enum(['male', 'female', 'prefer not to say']).optional(),
  kyc: z
    .object({
      images: z.array(z.string()).optional(),
      idType: z.string().optional(),
      isApproved: z.boolean().optional(),
      lastSubmissionDate: z.string().datetime().optional(),
      status: z.enum(['pending', 'accepted', 'rejected']).optional(),
    })
    .optional(),
  profilePicture: z.string().optional(),
  byPass: z.boolean(),
  isVerified: z.boolean(),
  isSuspended: z.boolean(),
  suspendedDate: z.string().datetime().nullable(),
  lastSession: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
};

const createUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a valid email',
    })
    .email(),
  userName: z
    .string({
      required_error: 'Username is required',
    })
    .min(4, 'Username too short - should be 4 Chars minimum'),
  country: z.string({
    required_error: 'Country is required',
  }),
  phoneNumber: z.string({
    required_error: 'Phone number is required',
  }),
  password: z
    .string({
      required_error: 'Password is required',
      invalid_type_error: 'Password must be a string',
    })
    .min(6, 'Password too short - should be 6 Chars minimum'),

  ip: z.string(),

  device: z.object({
    ua: z.string().optional(),
    type: z.enum(["desktop", "mobile", "tablet", "console", "embedded", "smarttv", "wearable", "xr"]).optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
  }),

  referral: z.string().max(12).optional(),
});

const verifyUserSchema = z.object({
  verificationCode: z
    .string({
      required_error: 'Verification code is required',
    })
    .min(6, 'Verification code must be six (6) characters minimum'),
});

const updateLocationSchema = z.object({
  longitude: z.number({
    required_error: 'Longitude is required',
  }),
  latitude: z.number({
    required_error: 'Latitude is required',
  }),
});

const editUserSchema = z.object({
  email: z.string().email().optional(),
  userName: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  profilePicture: z.string().optional(),
  gender: z.enum(['male', 'female', 'prefer not to say']).optional(),
  phoneNumber: z.string().optional(),
  password: z
    .string()
    .min(6, 'Password too short - should be 6 Chars minimum')
    .optional(),
  byPass: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  kyc: z
    .object({
      images: z.array(z.string()).optional(),
      status: z.enum(['pending', 'accepted', 'rejected']).optional(),
      idType: z.string().optional(),
      lastSubmissionDate: z.date().optional(),
    })
    .optional(),
  encryptedPassword: z.string().optional(),
});

const fetchUserSchema = z.object({
  value: z.string({
    required_error: 'An Email, an AccountId or a Username is required',
  }),
});

const createUserResponseSchema = z.object({
  ...responseCore,
  data: z.object({
    newUser: z.object(userCore),
    accessToken: z.string({
      required_error: 'Access Token is Required',
    }),
  }),
});

const generalUserResponseSchema = z.object({
  ...responseCore,
  data: z.object({
    ...userCore,
  }),
});

const fetchUsersResponseSchema = z.object({
  ...responseCore,
  data: z.array(
    z.object({
      ...userCore,
    })
  ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type VerifyUserInput = z.infer<typeof verifyUserSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type EditUserInput = z.infer<typeof editUserSchema>;
export type FetchUserInput = z.infer<typeof fetchUserSchema>;

export const { schemas: userSchemas, $ref: userRef } = buildJsonSchemas(
  {
    createUserSchema,
    verifyUserSchema,
    editUserSchema,
    updateLocationSchema,
    createUserResponseSchema,
    generalUserResponseSchema,
    fetchUsersResponseSchema,
  },
  { $id: 'UserSchema' }
);
