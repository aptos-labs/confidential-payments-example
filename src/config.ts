export type AppConfig = {
  CONFIDENTIAL_ASSET_MODULE_ADDR: string;
  /**
   * This is the asset the user deals with in the app. For the demo they only use a
   * single stablecoin.
   */
  PRIMARY_TOKEN_ADDRESS: string;
  APTOS_NETWORK: string;

  /** This is the address where the subdomain manager contract is deployed */
  SUBDOMAIN_MANAGER_CONTRACT_ADDR: string;
  /** This is the address where the subdomain manager object is deployed */
  SUBDOMAIN_MANAGER_OBJECT_ADDR: string;
  /**
   * This is the domain we're using for the app. We could just derived this from the
   * subdomain manager object but doing it here is safer and faster.
   */
  ANS_DOMAIN: string;

  APTOS_BUILD_API_KEY: string;
  APTOS_BUILD_GAS_STATION_KEY: string;
  APTOS_BUILD_NOCODE_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  APPLE_CLIENT_ID: string;
  APPLE_CLIENT_SECRET: string;

  FORCE_MAINTENANCE_PAGE: boolean;
};

export const APT_FA_ADDR =
  '0x000000000000000000000000000000000000000000000000000000000000000a';

// This is the USDT address on testnet.
export const USDT_TOKEN_ADDR =
  '0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050';

export const appConfig: AppConfig = {
  CONFIDENTIAL_ASSET_MODULE_ADDR:
    process.env.NEXT_PUBLIC_CONFIDENTIAL_ASSET_MODULE_ADDR!,
  PRIMARY_TOKEN_ADDRESS: USDT_TOKEN_ADDR,
  APTOS_NETWORK: 'testnet',

  SUBDOMAIN_MANAGER_CONTRACT_ADDR:
    process.env.NEXT_PUBLIC_SUBDOMAIN_MANAGER_CONTRACT_ADDR!,
  SUBDOMAIN_MANAGER_OBJECT_ADDR: process.env.NEXT_PUBLIC_SUBDOMAIN_MANAGER_OBJECT_ADDR!,
  ANS_DOMAIN: process.env.NEXT_PUBLIC_ANS_DOMAIN!,

  APTOS_BUILD_API_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_API_KEY!,
  APTOS_BUILD_GAS_STATION_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_GAS_STATION_KEY!,
  APTOS_BUILD_NOCODE_API_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_NOCODE_API_KEY!,

  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,

  APPLE_CLIENT_ID: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,
  APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET!,

  FORCE_MAINTENANCE_PAGE: process.env.FORCE_MAINTENANCE_PAGE === 'true',
};

// Iterate through the config and ensure nothing is undefined. This check runs client
// side, so we only check NEXT_PUBLIC_ variables. We check everything in middleware.ts.
for (const key in appConfig) {
  if (
    key.startsWith('NEXT_PUBLIC_') &&
    appConfig[key as keyof AppConfig] === undefined
  ) {
    throw new Error(`Required environment variable ${key} is not set.`);
  }
}
