import {
  BrowserProvider,
  FallbackProvider,
  JsonRpcProvider,
  JsonRpcSigner,
} from 'ethers'
import type { Account, Chain, Client, Transport } from 'viem'

export function clientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  if (transport.type === 'fallback') {
    const providers = (transport.transports as ReturnType<Transport>[]).map(
      ({ value }) => new JsonRpcProvider(value?.url, network),
    )
    if (providers.length === 1) return providers[0]
    return new FallbackProvider(providers)
  }
  return new JsonRpcProvider(transport.url, network)
}

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new BrowserProvider(transport, network)
  const signer = new JsonRpcSigner(provider, account.address)
  return signer
}

export function getSignerOrProvider<
  A extends Account | undefined = Account | undefined,
>(
  client: Client<Transport, Chain, A>,
): A extends Account ? JsonRpcSigner : JsonRpcProvider {
  if (client.account) {
    return clientToSigner(
      client as Client<Transport, Chain, Account>,
    ) as A extends Account ? JsonRpcSigner : JsonRpcProvider
  }

  return clientToProvider(client) as A extends Account
    ? JsonRpcSigner
    : JsonRpcProvider
}
