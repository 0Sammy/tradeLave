import { Schema, model, Document } from 'mongoose';

export enum PlanType {
  LAND = 'land',
  CRYPTO = 'cryptocurrency',
}

export type PlanDocument = Document & {
  title: string;
  type: PlanType;
  minValue: number;
  maxValue: number;
  roi: number
  durationDays: number;
  maxExecutions: number;
  createdAt: Date;
  updatedAt: Date;
};

const planSchema = new Schema<PlanDocument>(
  {
    title: { type: String, required: true, trim: true, lowercase: true },
    type: { type: String, enum: Object.values(PlanType), required: true },

    minValue: { type: Number, required: true },
    maxValue: { type: Number, required: true },

    roi: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    maxExecutions: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const PlanModel = model<PlanDocument>('Plan', planSchema);
export default PlanModel;
