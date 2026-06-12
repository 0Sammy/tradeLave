import mongoose, { Schema, Document } from 'mongoose';

export enum CryptoCoin {
    BITCOIN = 'bitcoin',
    ETHEREUM = 'ethereum',
    USDT_TRC = 'tether trc20',
    USDT_ERC = 'tether erc20',
}

export interface IStockTransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL' | 'TRADE_SETTLEMENT';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    usdAmount: number;

    cryptoSymbol?: CryptoCoin;
    cryptoAmount?: number;
    walletAddress?: string;
    hash?: string;

    stockSymbol?: string;
    shares?: number;
    pricePerShare?: number;

    createdAt: Date;
    updatedAt: Date;
}

const StockTransactionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'TRADE_SETTLEMENT'], required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING' },
    usdAmount: { type: Number, required: true },

    cryptoSymbol: { type: String, enum: Object.values(CryptoCoin) },
    cryptoAmount: { type: Number },

    stockSymbol: { type: String },
    shares: { type: Number },
    pricePerShare: { type: Number },

    hash: { type: String },
    walletAddress: { type: String }
}, { timestamps: true });

export const StockTransaction = mongoose.model<IStockTransaction>('StockTransaction', StockTransactionSchema);