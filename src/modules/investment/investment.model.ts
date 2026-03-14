import mongoose, { Schema, model, Document } from 'mongoose';

// Types and Enums
import { TransactionCoin } from '../transaction/transaction.model';

export enum InvestmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export type InvestmentDocument = Document & {
  user: mongoose.Types.ObjectId;
  coin: TransactionCoin;
  plan: string
  capital: number;
  returnAmount: number;
  roi: number;       
  durationInDays: number;
  status: InvestmentStatus;
  startedAt: Date;
  endsAt: Date;
  roiTransactionId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const investmentSchema = new Schema<InvestmentDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coin: { type: String, enum: Object.values(TransactionCoin), required: true },
    plan: { type: String, required: true },

    capital: { type: Number, required: true },
    returnAmount: { type: Number, required: true },
    roi: { type: Number, required: true },             
    durationInDays: { type: Number, required: true },      

    status: {
      type: String,
      enum: Object.values(InvestmentStatus),
      default: InvestmentStatus.ACTIVE,
    },

    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    roiTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', default: null }
  },
  {
    timestamps: true,
  }
);

const InvestmentModel = model<InvestmentDocument>('Investment', investmentSchema);
export default InvestmentModel;
