import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// Utils and configs
import { customAlphabet } from 'nanoid';
import { decrypt } from '../../utils/encrypt';

//Generate AdminId
const generateAdminId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  6
);

export enum AdminRole {
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export type AdminDocument = Document & {
  email: string;
  password: string;
  role: AdminRole;
  adminId: string;
  isSuspended: boolean;
  lastSession: Date;
  encryptedPassword: string;
  decryptedPassword?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
};

const adminSchema = new Schema<AdminDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    adminId: { type: String, unique: true },
    isSuspended: { type: Boolean, default: false },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.ADMIN,
      lowercase: true,
    },
    lastSession: { type: Date },
    encryptedPassword: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

adminSchema.virtual('decryptedPassword').get(function () {
  if (!this.encryptedPassword) return undefined;
  return decrypt(this.encryptedPassword);
});

// Hashing of Password
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = bcrypt.hashSync(this.password, salt);
  next();
});

// Generate unique adminId before creation
adminSchema.pre('save', async function (next) {
  if (this.isNew && !this.adminId) {
    let isUnique = false;
    while (!isUnique) {
      const newAdminId = 'ADTX' + generateAdminId();
      const existingUser = await AdminModel.findOne({ adminId: newAdminId });
      if (!existingUser) {
        this.adminId = newAdminId;
        isUnique = true;
      }
    }
  }
  next();
});

// Methods
// Comparing passwords
adminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password).catch(() => false);
};

const AdminModel = model<AdminDocument>('Admin', adminSchema);
export default AdminModel;
