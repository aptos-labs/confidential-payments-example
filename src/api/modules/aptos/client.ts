import {
  ConfidentialAsset,
  ConfidentialAssetTransactionBuilder,
} from '@aptos-labs/confidential-assets';
import { Aptos, AptosConfig, NetworkToNetworkName } from '@aptos-labs/ts-sdk';
import { GraphQLClient } from 'graphql-request';

import { getSdk } from '@/codegen/indexer/generated/queries';
import { appConfig } from '@/config';

const aptosConfig = new AptosConfig({
  network: NetworkToNetworkName[appConfig.APTOS_NETWORK],
  clientConfig: {
    API_KEY: appConfig.APTOS_BUILD_API_KEY,
  },
});
export const aptos = new Aptos(aptosConfig);
export const confidentialAssetsTxnBuilder = new ConfidentialAssetTransactionBuilder(
  aptosConfig,
  {
    confidentialAssetModuleAddress: appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR,
  },
);
export const confidentialAssets = new ConfidentialAsset({
  config: aptosConfig,
  confidentialAssetModuleAddress: appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR,
});

/** Do not forget to pass the API key when using this client. */
export const noCodeClient = getSdk(
  new GraphQLClient(
    // TODO: Make this configurable.
    'https://api.testnet.staging.aptoslabs.com/nocode/v1/api/cmacir19c0009s601tnchf781/v1/graphql',
  ),
);
