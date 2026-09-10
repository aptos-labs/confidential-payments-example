import { ConfidentialAsset } from '@aptos-labs/confidential-asset';
import { createGasStationClient } from '@aptos-labs/gas-station-client';
import { Aptos, AptosConfig, Network, NetworkToNetworkName } from '@aptos-labs/ts-sdk';

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

// Client without gas-station submitter for sender-paid transactions.
const aptosSelfPaidConfig = new AptosConfig({
  network: NetworkToNetworkName[appConfig.APTOS_NETWORK],
  clientConfig: {
    API_KEY: appConfig.APTOS_BUILD_API_KEY,
  },
});
export const aptosSelfPaid = new Aptos(aptosSelfPaidConfig);

export const confidentialAsset = new ConfidentialAsset({
  config: aptosConfig,
  withFeePayer: true,
});
