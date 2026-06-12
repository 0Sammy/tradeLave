import mongoose, { type Document, Schema } from "mongoose";


export interface SettingsDoc extends Document {
    sharePrice: number;
    minShares: number;
    noWithdrawal: boolean;
    createdAt: Date;
    updatedAt: Date;
}


// Main Settings Schema
const settingsSchema = new Schema<SettingsDoc>(
    {
        sharePrice: { type: Number, default: 0 },
        minShares: { type: Number, default: 0 },
        noWithdrawal: { type: Boolean, default: false },
    },
    { timestamps: true },
);

const SettingsModel = mongoose.model<SettingsDoc>("Settings", settingsSchema);
export default SettingsModel;
