import mongoose, { Schema, model, Document } from 'mongoose';
import { TransactionCoin } from '../transaction/transaction.model';

export enum DepositStatus {
    SUCCESSFUL = 'successful',
    FAILED = 'failed',
    PENDING = 'pending',
    CLOSED = 'closed'
}

export type DepositDetailMessage = {
    message: string | number;
    at: Date;
};

export type DepositRequestDocument = Document & {
    user: mongoose.Types.ObjectId;
    coin: TransactionCoin;
    amount: number;
    coinAmount: number;
    status: DepositStatus;
    hasPaid: boolean;
    details: Map<string, DepositDetailMessage[]>;
    createdAt: Date;
    updatedAt: Date;
};

const depositDetailMessageSchema = new Schema<DepositDetailMessage>(
    {
        message: { type: Schema.Types.Mixed, required: true },
        at: { type: Date, default: Date.now }
    },
    { _id: false }
);

const depositRequestSchema = new Schema<DepositRequestDocument>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        coin: { type: String, enum: Object.values(TransactionCoin), required: true },
        amount: { type: Number, required: true },
        coinAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: Object.values(DepositStatus),
            default: DepositStatus.PENDING
        },
        hasPaid: { type: Boolean, default: false },
        details: {
            type: Map,
            of: [depositDetailMessageSchema],
            default: {}
        }
    },
    { timestamps: true }
);

const DepositRequestModel = model<DepositRequestDocument>(
    'DepositRequest',
    depositRequestSchema
);

export default DepositRequestModel;