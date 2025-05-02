import { ConfidentialAsset } from '@aptos-labs/confidential-assets';
import { Aptos, AptosConfig, NetworkToNetworkName } from '@aptos-labs/ts-sdk';

import { appConfig } from '@/config';

const aptosConfig = new AptosConfig({
  network: NetworkToNetworkName[appConfig.APTOS_NETWORK],
  clientConfig: {
    API_KEY: appConfig.APTOS_BUILD_API_KEY,
  },
});
export const aptos = new Aptos(aptosConfig);
export const confidentialAssets = new ConfidentialAsset(aptosConfig, {
  confidentialAssetModuleAddress: appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR,
});
