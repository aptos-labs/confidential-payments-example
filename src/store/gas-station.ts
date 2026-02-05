/**
 * The gas station must be configured to allow all confidential_asset functions,
 * the 0x1::aptos_account::create_account function, and the ANS subdomain manager
 * claim subdomain function. If using USDT as the primary asset, the USDT mint
 * function must also be allowed. See ASSET_CONFIG in config.ts for the function
 * addresses.
 */

import {
  createGasStationClient,
  GasStationClient,
} from '@aptos-labs/gas-station-client';
import { Network } from '@aptos-labs/ts-sdk';
import { useMemo } from 'react';

import { appConfig } from '@/config';

export type GasStationArgs = {
  withGasStation: boolean;
  gasStationClient: GasStationClient;
};

export const useGasStationArgs = () => {
  return useMemo(() => {
    // TODO: At some point let people opt out of using the gas station and let them pay
    // for gas themselves, in case the gas station is down or something.
    const args: GasStationArgs = {
      withGasStation: true,
      gasStationClient: createGasStationClient({
        network: appConfig.APTOS_NETWORK as Network,
        apiKey: appConfig.APTOS_BUILD_GAS_STATION_KEY,
      }),
    };
    return args;
  }, []);
};
