export type AptosNetworkName = 'testnet' | 'mainnet';

export type AppConfig = {
  CONFIDENTIAL_ASSET_MODULE_ADDR: string;
  /**
   * This is the asset the user deals with in the app. Derived from PRIMARY_ASSET config.
   */
  PRIMARY_TOKEN_ADDRESS: string;
  APTOS_NETWORK: AptosNetworkName;

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
  INDEXER_GRAPHQL_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  APPLE_CLIENT_ID: string;
  APPLE_CLIENT_SECRET: string;

  FORCE_MAINTENANCE_PAGE: boolean;
};

const rawNetwork = (process.env.NEXT_PUBLIC_APTOS_NETWORK ?? 'testnet').toLowerCase();
if (rawNetwork !== 'testnet' && rawNetwork !== 'mainnet') {
  throw new Error(
    `Unsupported NEXT_PUBLIC_APTOS_NETWORK: "${rawNetwork}". Supported values: "testnet", "mainnet".`,
  );
}
const APTOS_NETWORK = rawNetwork as AptosNetworkName;

export const isMainnet = APTOS_NETWORK === 'mainnet';
export const isTestnet = APTOS_NETWORK === 'testnet';

export const APT_FA_ADDR =
  '0x000000000000000000000000000000000000000000000000000000000000000a';

// USDT token address per network. The testnet address points at the fake USDT
// deployed alongside the testnet faucet. On mainnet it must be the real Tether
// USD FA address, which we read from an env var so operators pick it explicitly.
const USDT_TOKEN_ADDR_BY_NETWORK: Record<AptosNetworkName, string> = {
  testnet: '0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050',
  mainnet: process.env.NEXT_PUBLIC_USDT_MAINNET_ADDR ?? '',
};
export const USDT_TOKEN_ADDR = USDT_TOKEN_ADDR_BY_NETWORK[APTOS_NETWORK];

// The primary asset to use in the app. This controls the token address and minting behavior.
export type PrimaryAsset = 'apt' | 'usdt';

export const PRIMARY_ASSET: PrimaryAsset =
  (process.env.NEXT_PUBLIC_PRIMARY_ASSET as PrimaryAsset) || 'apt';

if (PRIMARY_ASSET === 'usdt' && !USDT_TOKEN_ADDR) {
  throw new Error(
    `NEXT_PUBLIC_PRIMARY_ASSET is "usdt" but no USDT token address is configured for network "${APTOS_NETWORK}". Set NEXT_PUBLIC_USDT_MAINNET_ADDR.`,
  );
}

// Asset-specific configuration. Faucet/mint entries are only populated on
// testnet — on mainnet users must fund their own accounts from an exchange or
// existing wallet.
export const ASSET_CONFIG = {
  apt: {
    address: APT_FA_ADDR,
    // APT uses an external faucet, and only testnet has one.
    mintFunction: null,
    faucetUrl: isTestnet
      ? (address: string) => `https://aptos.dev/en/network/faucet?address=${address}`
      : null,
  },
  usdt: {
    address: USDT_TOKEN_ADDR,
    // Only the testnet USDT deployment exposes an on-chain faucet function.
    mintFunction: isTestnet
      ? ('0x24246c14448a5994d9f23e3b978da2a354e64b6dfe54220debb8850586c448cc::usdt::faucet' as const)
      : null,
    faucetUrl: null,
  },
} as const;

// Base URL for the Aptos node REST API for the active network.
export const APTOS_NODE_API_URL = `https://api.${APTOS_NETWORK}.aptoslabs.com/v1`;

// GraphQL indexer endpoint. The app currently ships with a nocode-indexer
// endpoint that is only deployed on testnet staging; on mainnet (or any other
// setup) operators must provide their own via NEXT_PUBLIC_INDEXER_GRAPHQL_URL.
const DEFAULT_INDEXER_GRAPHQL_URL_BY_NETWORK: Record<AptosNetworkName, string> = {
  testnet:
    'https://api.testnet.staging.aptoslabs.com/nocode/v1/api/cmacir19c0009s601tnchf781/v1/graphql',
  mainnet: '',
};

export const appConfig: AppConfig = {
  CONFIDENTIAL_ASSET_MODULE_ADDR:
    process.env.NEXT_PUBLIC_CONFIDENTIAL_ASSET_MODULE_ADDR!,
  // Derive PRIMARY_TOKEN_ADDRESS from the selected asset.
  PRIMARY_TOKEN_ADDRESS: ASSET_CONFIG[PRIMARY_ASSET].address,
  APTOS_NETWORK,

  SUBDOMAIN_MANAGER_CONTRACT_ADDR:
    process.env.NEXT_PUBLIC_SUBDOMAIN_MANAGER_CONTRACT_ADDR!,
  SUBDOMAIN_MANAGER_OBJECT_ADDR: process.env.NEXT_PUBLIC_SUBDOMAIN_MANAGER_OBJECT_ADDR!,
  ANS_DOMAIN: process.env.NEXT_PUBLIC_ANS_DOMAIN!,

  APTOS_BUILD_API_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_API_KEY!,
  APTOS_BUILD_GAS_STATION_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_GAS_STATION_KEY!,
  APTOS_BUILD_NOCODE_API_KEY: process.env.NEXT_PUBLIC_APTOS_BUILD_NOCODE_API_KEY!,
  INDEXER_GRAPHQL_URL:
    process.env.NEXT_PUBLIC_INDEXER_GRAPHQL_URL ??
    DEFAULT_INDEXER_GRAPHQL_URL_BY_NETWORK[APTOS_NETWORK],

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
