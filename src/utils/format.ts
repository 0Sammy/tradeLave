//Omit
export function omit<T extends object, K extends keyof T>(obj: T, keysToOmit: K[]): Omit<T, K> {
  const newObj: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const currentKey = key as keyof T;
      if (!keysToOmit.includes(currentKey as K)) {
        newObj[currentKey] = obj[currentKey];
      }
    }
  }
  return newObj as Omit<T, K>;
}

// User public details
export const USER_PUBLIC_FIELDS = '_id userName email accountId profilePicture';

//Format Address
export function formatAddress(str: string) {
  if (str.length < 8) {
    return str;
  }
  const firstFour = str.substring(0, 4);
  const lastFour = str.substring(str.length - 4);

  return `${firstFour}...${lastFour}`;
}

// Format date with timezone
export const formatWithTimezone = (tz: string): string => {
  const timezone = tz || 'UTC';
  const now = new Date();

  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  };
  const dateOpts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    timeZone: timezone,
  };

  const formattedTime = new Intl.DateTimeFormat('en-GB', timeOpts).format(now).toLowerCase();
  const formattedDate = new Intl.DateTimeFormat('en-GB', dateOpts).format(now);

  // Extract short TZ label from IANA (use last segment or "UTC" if given)
  const tzLabel = timezone === 'UTC' ? 'UTC' : timezone.split('/').pop()?.replace('_', ' ') ?? timezone;

  return `${formattedTime} ${formattedDate} ${tzLabel}`;
};

// UTC Timezone
export function formatNowUtc(): string {
  const d = new Date();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const year = d.getUTCFullYear();
  const monthName = months[d.getUTCMonth()];
  const day = d.getUTCDate();

  let hours = d.getUTCHours(); // 0-23
  const minutes = d.getUTCMinutes();

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const minutesPadded = minutes.toString().padStart(2, "0");

  return `${monthName} ${day} ${year}, ${hours}:${minutesPadded}${ampm} UTC`;
}

type AnyObject = Record<string, any>;

function isPlainObject(value: any): value is AnyObject {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (isPlainObject(value) && Object.keys(value).length === 0) return true;
  return false;
}

// Sanitize Data
export function sanitize<T extends AnyObject>(input: T): Partial<T> {
  if (!isPlainObject(input)) return {} as Partial<T>;

  const result: AnyObject = {};

  for (const [key, value] of Object.entries(input)) {
    if (isPlainObject(value)) {
      const nested = sanitize(value);
      if (!isEmptyValue(nested) && Object.keys(nested).length > 0) {
        result[key] = nested;
      }
      continue;
    }

    if (Array.isArray(value)) {
      // Optionally sanitize array elements that are plain objects
      const cleanedArray = value
        .map((el) => (isPlainObject(el) ? sanitize(el) : el))
        .filter((el) => !isEmptyValue(el));
      if (cleanedArray.length > 0) result[key] = cleanedArray;
      continue;
    }

    if (!isEmptyValue(value)) {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

//Format currency
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(value)
}