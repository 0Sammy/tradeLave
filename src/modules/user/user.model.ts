import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// Utils and configs
import { decrypt } from '../../utils/encrypt';
import { customAlphabet } from 'nanoid';

// Generate a verification code, and unique accountId with nanoid
const generateVerificationCode = customAlphabet('0123456789', 6);
const generateAccountId = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  10
);

export type UserDocument = Document & {
  email: string;
  password: string;
  userName: string;
  accountId: string;
  phoneNumber: string;
  country: string;
  address: string;
  kyc: {
    images: string[];
    idType: string;
    status: 'pending' | 'accepted' | 'rejected';
    lastSubmissionDate: Date;
  };
  profilePicture: string;
  gender: 'male' | 'female' | 'prefer not to say';
  verificationCode: string;
  verificationCodeExpiry: Date;
  passwordResetCode: string | undefined;
  byPass: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  suspendedDate: Date | undefined;
  encryptedPassword: string;
  decryptedPassword?: string;
  minimumTransfer: number;
  transactionPin: string | undefined;
  lastSession: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isStillSuspended(): boolean;
  generateNewVerificationCode(): Promise<string>;
};

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    accountId: { type: String, unique: true },
    phoneNumber: { type: String, required: true },
    country: { type: String, required: true },
    address: { type: String },
    kyc: {
      type: new Schema({
        images: { type: [String], default: [] },
        idType: { type: String },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending',
        },
        lastSubmissionDate: { type: Date },
      }),
      default: () => ({}),
    },
    profilePicture: { type: String },
    gender: { type: String },
    verificationCode: {
      type: String,
      required: false,
      default: () => generateVerificationCode(),
    },
    verificationCodeExpiry: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000),
    },
    passwordResetCode: { type: String },
    byPass: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspendedDate: { type: Date, default: null },
    encryptedPassword: { type: String, required: true },
    minimumTransfer: { type: Number, default: null },
    transactionPin: { type: String, default: null },
    lastSession: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hooks, virtual, methods and validation functions

userSchema.virtual('decryptedPassword').get(function () {
  if (!this.encryptedPassword) return undefined;
  return decrypt(this.encryptedPassword);
});


// Generate unique accountId before creation
userSchema.pre('save', async function (next) {
  if (!this.isNew || this.accountId) {
    return next();
  }

  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const newAccountId = 'TL' + generateAccountId();

    const exists = await UserModel.exists({ accountId: newAccountId });

    if (!exists) {
      this.accountId = newAccountId;
      return next();
    }
  }

  return next(
    new Error('Failed to generate a unique accountId after multiple attempts')
  );
});


// Hashing of Password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});



// Methods


// Comparing passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password).catch(() => false);
};

// Generating new verification code
userSchema.methods.generateNewVerificationCode = async function (): Promise<string> {
  const code = generateVerificationCode();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  await this.updateOne({
    verificationCode: code,
    verificationCodeExpiry: expiry,
  });

  return code;
};

const UserModel = model<UserDocument>('User', userSchema);
export default UserModel;
