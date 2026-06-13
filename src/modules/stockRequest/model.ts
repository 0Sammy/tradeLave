import mongoose, { Schema, model, Document } from 'mongoose';

export enum PurchaseStatus {
    SUCCESSFUL = 'successful',
    FAILED = 'failed',
    PENDING = 'pending',
    CLOSED = 'closed'
}

export type PurchaseDetailMessage = {
    message: string | number;
    at: Date;
    file?: string;
};

export type StockRequestDoc = Document & {
    user: mongoose.Types.ObjectId;
    stockSymbol: string;
    shares: number;
    usdAmount: number;
    status: PurchaseStatus;
    hasPaid: boolean;
    details: Map<string, PurchaseDetailMessage[]>;
    createdAt: Date;
    updatedAt: Date;
};

const purchaseDetailMessageSchema = new Schema<PurchaseDetailMessage>(
    {
        message: { type: Schema.Types.Mixed, required: true },
        at: { type: Date, default: Date.now },
        file: { type: String },
    },
    { _id: false }
);

const StockRequestSchema = new Schema<StockRequestDoc>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        stockSymbol: { type: String, required: true },
        shares: { type: Number, required: true },
        usdAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: Object.values(PurchaseStatus),
            default: PurchaseStatus.PENDING
        },
        hasPaid: { type: Boolean, default: false },
        details: {
            type: Map,
            of: [purchaseDetailMessageSchema],
            default: {}
        }
    },
    { timestamps: true }
);

const StockRequest = model<StockRequestDoc>(
    'StockRequest',
    StockRequestSchema
);

export default StockRequest;