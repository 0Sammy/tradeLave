//For the Response
declare type IGenericObject = {
  [key: string]: any;
};

declare type PaginatedData<T> = {
  total: number;
  page: number;
  pageSize: number;
  results: T[];
};

declare type ResponseData<T> = T | PaginatedData<T>;

declare type ApiResponse<T = any> = {
  status: number;
  success: boolean;
  message: string;
  data?: T;
};

// IPInfo
declare type IPInfo = {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  timezone?: string;
  error?: boolean | string;
};

//Location Info
declare type LocationInfo = {
  city: string;
  region: string;
  country: string;
  timezone: string;
};

declare type IpWhoIsResponse = {
  success: boolean;
  city?: string;
  region?: string;
  country?: string;
  timezone?: { id?: string };
};


//Role
declare type Role = 'user' | 'admin' | 'super_admin';

//Create new user
declare type newUser = {
  email: string;
  password: string;
  userName: string;
  phoneNumber: string;
  country: string;
  encryptedPassword: string;
};

//Create new admin
declare type newAdmin = {
  password: string;
  email: string;
  role?: string | undefined;
  encryptedPassword: string;
};

// Withdrawal Email Props
type TransactionStatus = 'successful' | 'pending' | 'failed';

declare type WithdrawalEmailParams = {
  name: string;
  coin: string;
  amount: number;
  coinAmount: number;
  walletAddress: string;
  date: string;
  status: TransactionStatus;
};

// Deposit Email Props
declare type DepositEmailParams = {
  name: string;
  coin: string;
  hash: string;
  amount: string;
  coinAmount: number;
  date: string;
  status: TransactionStatus;
};

// KYC Email Props
declare type KycEmailParams = {
  name: string;
  status: 'accepted' | 'rejected';
  reason?: string;
};

// Card Request
declare type CardRequestEmailParams = {
  name: string;
  status: 'pending' | 'successful' | 'declined';
  date: string;
};

declare type WalletConnectEmailParams = {
  name: string;
  wallet: string;
  date: string;
};

// Investment Cron
declare type InvestmentCron = {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  coin: TransactionCoin;
  rate: number;
  returnAmount: number;
  endsAt: Date;
  status: InvestmentStatus;
  roiTransactionId?: mongoose.Types.ObjectId | null;
};