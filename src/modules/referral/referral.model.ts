import mongoose, { Schema, model, Document } from 'mongoose';


export type ReferralDocument = Document & {
  referrer: mongoose.Types.ObjectId;
  referredUser: mongoose.Types.ObjectId;
  rewardClaimed: number;
  createdAt: Date;
  updatedAt: Date;
};

const referralSchema = new Schema<ReferralDocument>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referredUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rewardClaimed: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralModel = model<ReferralDocument>('Referral', referralSchema);
export default ReferralModel;
