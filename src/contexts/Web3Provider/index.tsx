import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { switchChain } from '@wagmi/core'
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import {
  type Account,
  type Chain,
  type Client,
  createPublicClient,
  type Transport,
} from 'viem'
import { base, mainnet, sepolia } from 'viem/chains'
import {
  Connector,
  createConfig,
  http,
  useAccount,
  useClient,
  useConnect,
  useConnectorClient,
  UseConnectReturnType,
  useDisconnect,
  WagmiProvider,
} from 'wagmi'
// import { walletConnect } from 'wagmi/connectors'

const queryClient = new QueryClient()

export const config = createConfig({
  chains: [base, sepolia, mainnet],
  // connectors: [
  //   walletConnect({
  //     projectId: '',
  //     relayUrl: 'wss://relay.walletconnect.com',
  //     metadata: {
  //       name: 'React App',
  //       description: 'React App for WalletConnect',
  //       url: 'https://walletconnect.com/',
  //       icons: ['https://avatars.githubusercontent.com/u/37784886'],
  //     },
  //     isNewChainsStale: true,
  //   }),
  // ],
  transports: {
    [base.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
})

const fallbackClient = createPublicClient({
  chain: base,
  transport: http(),
})

export type Web3ProviderContext<
  A extends Account | undefined = Account | undefined,
> = {
  connectManager: UseConnectReturnType

  client: Client<Transport, Chain, A>

  address: `0x${string}` | ''
  chain: Chain | undefined
  isConnected: boolean

  isRightNetwork: boolean

  connect: (connector: Connector) => void
  disconnect: () => void

  safeSwitchChain: (
    id: (typeof config)['chains'][number]['id'],
  ) => Promise<void>
}

const web3ProviderContext = createContext<Web3ProviderContext>({
  connectManager: {} as UseConnectReturnType,
  client: fallbackClient,

  address: '',
  chain: fallbackClient.chain,
  isConnected: false,

  isRightNetwork: false,

  connect: () => {},
  disconnect: () => {},

  safeSwitchChain: async () => {},
})

export const useWeb3Context = () => {
  return useContext(web3ProviderContext)
}

export const Web3ContextProvider = (props: PropsWithChildren) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Web3ContextProviderContent>
          {props.children}
        </Web3ContextProviderContent>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

const Web3ContextProviderContent = (props: PropsWithChildren) => {
  const connectManager = useConnect()

  const account = useAccount()
  const { disconnect } = useDisconnect()

  const connect = useCallback(
    async (connector: Connector) => {
      connectManager.connect({ connector })
    },
    [connectManager],
  )

  const publicClient = useClient({ config })

  const { data: walletClient } = useConnectorClient({ config })

  const client = useMemo(() => {
    if (!account.chain) {
      return publicClient as Client<Transport, Chain>
    }

    return walletClient as Client<Transport, Chain, Account>
  }, [account.chain, publicClient, walletClient])

  const isRightNetwork = useMemo((): boolean => {
    return Boolean(client?.chain?.id)
  }, [client?.chain?.id])

  const safeSwitchChain = useCallback(
    async (id: (typeof config)['chains'][number]['id']) => {
      await switchChain(config, { chainId: id })
    },
    [],
  )

  return (
    <web3ProviderContext.Provider
      value={{
        connectManager,

        client: client,

        address: account.address ?? '',
        chain: client?.chain,
        isConnected: account.isConnected,

        isRightNetwork,

        connect,
        disconnect,

        safeSwitchChain,
      }}
    >
      {props.children}
    </web3ProviderContext.Provider>
  )
}
