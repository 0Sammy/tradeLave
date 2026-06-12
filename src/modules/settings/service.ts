import SettingsModel, { SettingsDoc } from './model';

// Fetches the global application settings.
export const getSettings = async (): Promise<SettingsDoc> => {
    let settings = await SettingsModel.findOne();

    if (!settings) {
        settings = await SettingsModel.create({
            sharePrice: 135,
            minShares: 5,
            noWithdrawal: false
        });
    }

    return settings;
};


// Admin


// Updates the global settings. Uses an Upsert pattern.
export const updateSettings = async (updateData: Partial<SettingsDoc>): Promise<SettingsDoc> => {
    const settings = await SettingsModel.findOneAndUpdate(
        {},
        { $set: updateData },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return settings;
};