import mongoose, { Document, model, Schema } from 'mongoose';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BONUS = "bonus",
  PENALTY = "penalty",
  REFERRAL = "referral",
  ROI = "roi"
}

export enum TransactionStatus {
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  PENDING = 'pending',
}

export enum TransactionCoin {
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
  USDT_TRC = 'tether trc20',
  USDT_ERC = 'tether erc20',
  SOLANA = 'solana',
  USD_COIN = 'usd coin',
  DOGE = 'dogecoin',
  RIPPLE = 'ripple',
  SHIBU_INU = 'shiba inu',
}

export type TransactionDocument = Document & {
  user: mongoose.Types.ObjectId;
  coin: TransactionCoin;
  transactionType: TransactionType;
  amount: number;
  coinAmount: number;
  network: string | null;
  walletAddress: string;
  transactionHash: string;
  status: TransactionStatus;
  details: Record<string, string | number>,
  createdAt: Date;
  updatedAt: Date;
};

const transactionSchema: Schema = new Schema<TransactionDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coin: { type: String, enum: Object.values(TransactionCoin), required: true },
    transactionType: { type: String, enum: Object.values(TransactionType), required: true },
    amount: { type: Number, required: true },
    coinAmount: { type: Number, required: true },
    network: { type: String, default: null },
    walletAddress: { type: String },
    transactionHash: { type: String },
    status: { type: String, enum: Object.values(TransactionStatus), required: true, default: TransactionStatus.PENDING },
    details: { type: Map, of: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
  }
);

const TransactionModel = model<TransactionDocument>('Transaction', transactionSchema);
export default TransactionModel;
