import { ConfidentialAsset } from '@aptos-labs/confidential-assets';
import { createGasStationClient } from '@aptos-labs/gas-station-client';
import { Aptos, AptosConfig, Network, NetworkToNetworkName } from '@aptos-labs/ts-sdk';
import { GraphQLClient } from 'graphql-request';

import { getSdk } from '@/codegen/indexer/generated/queries';
import { appConfig } from '@/config';

const aptosConfig = new AptosConfig({
  network: NetworkToNetworkName[appConfig.APTOS_NETWORK],
  clientConfig: {
    API_KEY: appConfig.APTOS_BUILD_API_KEY,
  },
  pluginSettings: {
    TRANSACTION_SUBMITTER: createGasStationClient({
      network: appConfig.APTOS_NETWORK as Network,
      apiKey: appConfig.APTOS_BUILD_GAS_STATION_KEY,
    }),
  },
});
export const aptos = new Aptos(aptosConfig);
export const confidentialAssets = new ConfidentialAsset({
  config: aptosConfig,
  confidentialAssetModuleAddress: appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR,
  withFeePayer: true,
});

/** Do not forget to pass the API key when using this client. */
export const noCodeClient = getSdk(
  new GraphQLClient(
    // TODO: Make this configurable.
    'https://api.testnet.staging.aptoslabs.com/nocode/v1/api/cmacir19c0009s601tnchf781/v1/graphql',
  ),
);
