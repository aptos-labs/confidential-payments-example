import {
  Aptos,
  AptosConfig,
  Network,
  NetworkToNetworkName,
} from '@lukachi/aptos-labs-ts-sdk'

const config = new AptosConfig({
  network: NetworkToNetworkName[Network.DEVNET],
})
export const aptos = new Aptos(config)
