import crypto from 'crypto';

//Generate transaction hash
export const generateTransactionHash = (): string => {
  const randomData = crypto.randomBytes(256);
  const hash = crypto.createHash('sha256').update(randomData).digest('hex');
  return hash;
};

//Get Date
export function getDate(): string {
  const now = new Date();
  const futureDate = new Date(now);

  // Add three years to the date
  futureDate.setFullYear(futureDate.getFullYear() + 3);

  // Get the month (0-indexed, so add 1)
  const month = (futureDate.getMonth() + 1).toString().padStart(2, '0');

  // Get the last two digits of the year
  const year = futureDate.getFullYear().toString().slice(-2);

  return `${month}/${year}`;
}
