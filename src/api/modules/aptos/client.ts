import { ConfidentialAsset } from '@aptos-labs/confidential-assets'
import {
  Aptos,
  AptosConfig,
  Network,
  NetworkToNetworkName,
} from '@aptos-labs/ts-sdk'

const config = new AptosConfig({
  network: NetworkToNetworkName[Network.DEVNET],
})
export const aptos = new Aptos(config)
export const confidentialAssets = new ConfidentialAsset(config)
