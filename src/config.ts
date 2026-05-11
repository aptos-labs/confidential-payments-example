export type AptosNetwork = 'mainnet' | 'testnet';

const NETWORK_STORAGE_KEY = 'aptos_network';

// Default to mainnet when mainnet vars are configured; fall back to testnet for local dev.
const DEFAULT_NETWORK: AptosNetwork = process.env
  .NEXT_PUBLIC_MAINNET_CONFIDENTIAL_ASSET_MODULE_ADDR
  ? 'mainnet'
  : 'testnet';

export function getActiveNetwork(): AptosNetwork {
  if (typeof window === 'undefined') return DEFAULT_NETWORK;
  const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
  return (stored as AptosNetwork) || DEFAULT_NETWORK;
}

export type AppConfig = {
  CONFIDENTIAL_ASSET_MODULE_ADDR: string;
  /**
   * This is the asset the user deals with in the app. Derived from PRIMARY_ASSET config.
   */
  PRIMARY_TOKEN_ADDRESS: string;
  APTOS_NETWORK: AptosNetwork;

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

// Network-specific environment variables — Next.js requires static references to NEXT_PUBLIC_ vars
const NETWORK_ENV_VARS = {
  mainnet: {
    CONFIDENTIAL_ASSET_MODULE_ADDR:
      process.env.NEXT_PUBLIC_MAINNET_CONFIDENTIAL_ASSET_MODULE_ADDR,
    SUBDOMAIN_MANAGER_CONTRACT_ADDR:
      process.env.NEXT_PUBLIC_MAINNET_SUBDOMAIN_MANAGER_CONTRACT_ADDR,
    SUBDOMAIN_MANAGER_OBJECT_ADDR:
      process.env.NEXT_PUBLIC_MAINNET_SUBDOMAIN_MANAGER_OBJECT_ADDR,
    ANS_DOMAIN: process.env.NEXT_PUBLIC_MAINNET_ANS_DOMAIN,
    APTOS_BUILD_API_KEY: process.env.NEXT_PUBLIC_MAINNET_APTOS_BUILD_API_KEY,
    APTOS_BUILD_GAS_STATION_KEY:
      process.env.NEXT_PUBLIC_MAINNET_APTOS_BUILD_GAS_STATION_KEY,
    USDT_TOKEN_ADDR: process.env.NEXT_PUBLIC_MAINNET_USDT_TOKEN_ADDR,
  },
  testnet: {
    CONFIDENTIAL_ASSET_MODULE_ADDR:
      process.env.NEXT_PUBLIC_TESTNET_CONFIDENTIAL_ASSET_MODULE_ADDR,
    SUBDOMAIN_MANAGER_CONTRACT_ADDR:
      process.env.NEXT_PUBLIC_TESTNET_SUBDOMAIN_MANAGER_CONTRACT_ADDR,
    SUBDOMAIN_MANAGER_OBJECT_ADDR:
      process.env.NEXT_PUBLIC_TESTNET_SUBDOMAIN_MANAGER_OBJECT_ADDR,
    ANS_DOMAIN: process.env.NEXT_PUBLIC_TESTNET_ANS_DOMAIN,
    APTOS_BUILD_API_KEY: process.env.NEXT_PUBLIC_TESTNET_APTOS_BUILD_API_KEY,
    APTOS_BUILD_GAS_STATION_KEY:
      process.env.NEXT_PUBLIC_TESTNET_APTOS_BUILD_GAS_STATION_KEY,
    USDT_TOKEN_ADDR: process.env.NEXT_PUBLIC_TESTNET_USDT_TOKEN_ADDR,
  },
};

const activeNetwork = getActiveNetwork();
const networkVars = NETWORK_ENV_VARS[activeNetwork];

// testnet USDT has an on-chain faucet; mainnet USDT does not
const USDT_MINT_FN = {
  mainnet: null,
  testnet:
    '0x24246c14448a5994d9f23e3b978da2a354e64b6dfe54220debb8850586c448cc::usdt::faucet',
} as const;

export const USDT_TOKEN_ADDR = networkVars.USDT_TOKEN_ADDR ?? '';

// The primary asset to use in the app. This controls the token address and minting behavior.
export type PrimaryAsset = 'apt' | 'usdt';

export const PRIMARY_ASSET: PrimaryAsset =
  (process.env.NEXT_PUBLIC_PRIMARY_ASSET as PrimaryAsset) || 'apt';

// Asset-specific configuration.
export const ASSET_CONFIG = {
  apt: {
    address: APT_FA_ADDR,
    // APT uses external faucet - no on-chain mint function.
    mintFunction: null,
    faucetUrl: (address: string) =>
      `https://aptos.dev/en/network/faucet?address=${address}`,
  },
  usdt: {
    address: USDT_TOKEN_ADDR,
    mintFunction: USDT_MINT_FN[activeNetwork],
    faucetUrl: null,
  },
};

export const appConfig: AppConfig = {
  CONFIDENTIAL_ASSET_MODULE_ADDR: networkVars.CONFIDENTIAL_ASSET_MODULE_ADDR!,
  // Derive PRIMARY_TOKEN_ADDRESS from the selected asset.
  PRIMARY_TOKEN_ADDRESS: ASSET_CONFIG[PRIMARY_ASSET].address,
  APTOS_NETWORK: activeNetwork,

  SUBDOMAIN_MANAGER_CONTRACT_ADDR: networkVars.SUBDOMAIN_MANAGER_CONTRACT_ADDR!,
  SUBDOMAIN_MANAGER_OBJECT_ADDR: networkVars.SUBDOMAIN_MANAGER_OBJECT_ADDR!,
  ANS_DOMAIN: networkVars.ANS_DOMAIN!,

  APTOS_BUILD_API_KEY: networkVars.APTOS_BUILD_API_KEY!,
  APTOS_BUILD_GAS_STATION_KEY: networkVars.APTOS_BUILD_GAS_STATION_KEY!,
  APTOS_BUILD_NOCODE_API_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_NOCODE_API_KEY!,

  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,

  APPLE_CLIENT_ID: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,
  APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET!,

  FORCE_MAINTENANCE_PAGE: process.env.FORCE_MAINTENANCE_PAGE === 'true',
};

// Client-side validation: ensure the active network's required vars are set.
if (typeof window !== 'undefined') {
  const requiredNetworkKeys = [
    'CONFIDENTIAL_ASSET_MODULE_ADDR',
    'SUBDOMAIN_MANAGER_CONTRACT_ADDR',
    'SUBDOMAIN_MANAGER_OBJECT_ADDR',
    'ANS_DOMAIN',
    'APTOS_BUILD_API_KEY',
    'APTOS_BUILD_GAS_STATION_KEY',
  ] as const;

  for (const key of requiredNetworkKeys) {
    if (!networkVars[key]) {
      throw new Error(
        `Required env var NEXT_PUBLIC_${activeNetwork.toUpperCase()}_${key} is not set.`,
      );
    }
  }
}
