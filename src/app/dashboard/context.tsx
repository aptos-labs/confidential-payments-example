'use client'

import { config } from '@config'
import type {
  CommittedTransactionResponse,
  ConfidentialAmount,
  Ed25519Account,
} from '@lukachi/aptos-labs-ts-sdk'
import { TwistedEd25519PrivateKey } from '@lukachi/aptos-labs-ts-sdk'
import type { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { createContext, useContext, useMemo } from 'react'

import {
  accountFromPrivateKey,
  depositConfidentialBalance,
  getAptBalance,
  getConfidentialBalances,
  getIsAccountRegisteredWithToken,
  getIsBalanceFrozen,
  getIsBalanceNormalized,
  mintTokens,
  normalizeConfidentialBalance,
  registerConfidentialBalance,
  safelyRolloverConfidentialBalance,
  transferConfidentialCoin,
  withdrawConfidentialBalance,
} from '@/api/modules/aptos'
import { useLoading } from '@/hooks'
import {
  type TokenBaseInfo,
  type TxHistoryItem,
  walletStore,
} from '@/store/wallet'

type AccountDecryptionKeyStatus = {
  isFrozen: boolean
  isNormalized: boolean
  isRegistered: boolean

  pendingAmount: string
  actualAmount: string
}

const AccountDecryptionKeyStatusRawDefault: Omit<
  AccountDecryptionKeyStatus,
  'pendingAmount' | 'actualAmount'
> & {
  pending: ConfidentialAmount | undefined
  actual: ConfidentialAmount | undefined
} = {
  isFrozen: false,
  isNormalized: false,
  isRegistered: false,

  pending: undefined,
  actual: undefined,
}

const AccountDecryptionKeyStatusDefault: AccountDecryptionKeyStatus = {
  isFrozen: false,
  isNormalized: false,
  isRegistered: false,

  pendingAmount: '0',
  actualAmount: '0',
}

type DecryptionKeyStatusLoadingState = 'idle' | 'loading' | 'success' | 'error'

type ConfidentialCoinContextType = {
  accountsList: Ed25519Account[]

  selectedAccount: Ed25519Account

  addNewAccount: (privateKeyHex?: string) => void
  removeAccount: (accountAddress: string) => void
  setSelectedAccount: (accountAddressHex: string) => void

  aptBalance: number
  reloadAptBalance: () => Promise<void>

  tokens: TokenBaseInfo[]
  perTokenStatuses: Record<string, AccountDecryptionKeyStatus>

  selectedToken: TokenBaseInfo

  addToken: (token: TokenBaseInfo) => void
  removeToken: (address: string) => void
  txHistory: TxHistoryItem[]
  addTxHistoryItem: (details: TxHistoryItem) => void
  setSelectedTokenAddress: (tokenAddress: string) => void

  selectedAccountDecryptionKey: TwistedEd25519PrivateKey
  selectedAccountDecryptionKeyStatus: AccountDecryptionKeyStatus

  registerAccountEncryptionKey: (
    tokenAddress: string,
  ) => Promise<CommittedTransactionResponse>
  normalizeAccount: () => Promise<CommittedTransactionResponse>
  unfreezeAccount: () => Promise<CommittedTransactionResponse>
  rolloverAccount: () => Promise<CommittedTransactionResponse[]>
  transfer: (
    receiverEncryptionKeyHex: string,
    amount: string,
    auditorsEncryptionKeyHexList?: string[],
  ) => Promise<CommittedTransactionResponse>
  withdraw: (amount: string) => Promise<CommittedTransactionResponse>
  deposit: (amount: number) => Promise<CommittedTransactionResponse>
  // TODO: rotate keys

  decryptionKeyStatusLoadingState: DecryptionKeyStatusLoadingState
  loadSelectedDecryptionKeyState: () => Promise<void>

  testMintTokens: () => Promise<CommittedTransactionResponse[]>
}

const confidentialCoinContext = createContext<ConfidentialCoinContextType>({
  accountsList: [],
  selectedAccount: {} as Ed25519Account,

  addNewAccount: () => {},
  removeAccount: () => {},
  setSelectedAccount: () => {},

  aptBalance: 0,
  reloadAptBalance: async () => {},

  tokens: [],
  perTokenStatuses: {},
  selectedToken: config.DEFAULT_TOKEN as TokenBaseInfo,
  txHistory: [],
  addTxHistoryItem: () => {},

  addToken: () => {},
  removeToken: () => {},
  setSelectedTokenAddress: () => {},

  selectedAccountDecryptionKey: TwistedEd25519PrivateKey.generate(),
  selectedAccountDecryptionKeyStatus: {
    isFrozen: false,
    isNormalized: true,
    isRegistered: true,
    pendingAmount: '0',
    actualAmount: '0',
  },

  registerAccountEncryptionKey: async () =>
    ({}) as CommittedTransactionResponse,
  normalizeAccount: async () => ({}) as CommittedTransactionResponse,
  unfreezeAccount: async () => ({}) as CommittedTransactionResponse,
  rolloverAccount: async () => [] as CommittedTransactionResponse[],
  transfer: async () => ({}) as CommittedTransactionResponse,
  withdraw: async () => ({}) as CommittedTransactionResponse,
  deposit: async () => ({}) as CommittedTransactionResponse,

  decryptionKeyStatusLoadingState: 'idle',
  loadSelectedDecryptionKeyState: async () => {},

  testMintTokens: async () => [] as CommittedTransactionResponse[],
})

export const useConfidentialCoinContext = () => {
  return useContext(confidentialCoinContext)
}

const useAccounts = () => {
  const privateKeyHexList = walletStore.useWalletStore(
    state => state.privateKeyHexList,
  )
  const addAndSetPrivateKey = walletStore.useWalletStore(
    state => state.addAndSetPrivateKey,
  )
  const removePrivateKey = walletStore.useWalletStore(
    state => state.removePrivateKey,
  )
  const setSelectedPrivateKeyHex = walletStore.useWalletStore(
    state => state.setSelectedPrivateKeyHex,
  )

  const selectedPrivateKeyHex = walletStore.useSelectedPrivateKeyHex()

  const { data: aptBalance, reload } = useLoading(
    0,
    () => {
      return getAptBalance(selectedPrivateKeyHex)
    },
    { loadArgs: [selectedPrivateKeyHex] },
  )

  const accountsList = useMemo(
    () =>
      privateKeyHexList.map(hex => {
        return accountFromPrivateKey(hex)
      }),
    [privateKeyHexList],
  )

  const selectedAccount = useMemo(
    () => accountFromPrivateKey(selectedPrivateKeyHex),
    [selectedPrivateKeyHex],
  )

  const addNewAccount = useCallback(
    (privateKeyHex?: string) => {
      const newPrivateKeyHex =
        privateKeyHex ?? walletStore.generatePrivateKeyHex()

      addAndSetPrivateKey(newPrivateKeyHex)
    },
    [addAndSetPrivateKey],
  )

  const setSelectedAccount = useCallback(
    (accountAddressHex: string) => {
      const accountToSet = accountsList.find(
        el =>
          el.accountAddress.toString().toLowerCase() ===
          accountAddressHex.toLowerCase(),
      )

      if (accountToSet?.privateKey) {
        setSelectedPrivateKeyHex(accountToSet?.privateKey.toString())
      }
    },
    [accountsList, setSelectedPrivateKeyHex],
  )

  const removeAccount = useCallback(
    (accountAddressHex: string) => {
      const currentAccountsListLength = accountsList.length

      const filteredAccountsList = accountsList.filter(
        el =>
          el.accountAddress.toString().toLowerCase() !==
          accountAddressHex.toLowerCase(),
      )

      if (
        currentAccountsListLength !== filteredAccountsList.length &&
        filteredAccountsList.length > 0
      ) {
        const accountToRemove = accountsList.find(
          el =>
            el.accountAddress.toString().toLowerCase() ===
            accountAddressHex.toLowerCase(),
        )

        if (accountToRemove?.privateKey) {
          removePrivateKey(accountToRemove.privateKey.toString())
          setSelectedPrivateKeyHex(
            filteredAccountsList[0].privateKey.toString(),
          )
        }
      }
    },
    [accountsList, removePrivateKey, setSelectedPrivateKeyHex],
  )

  return {
    accountsList,

    selectedPrivateKeyHex,
    selectedAccount,

    setSelectedAccount,
    addNewAccount,
    removeAccount,

    aptBalance,
    reloadAptBalance: reload,
  }
}

const useSelectedAccountDecryptionKey = () => {
  const selectedPrivateKeyHex = walletStore.useSelectedPrivateKeyHex()

  const selectedAccountDecryptionKey = useMemo(() => {
    return walletStore.decryptionKeyFromPrivateKey(selectedPrivateKeyHex)
  }, [selectedPrivateKeyHex])

  const registerAccountEncryptionKey = async (tokenAddress: string) => {
    return registerConfidentialBalance(
      selectedPrivateKeyHex,
      selectedAccountDecryptionKey.publicKey().toString(),
      tokenAddress,
    )
  }

  return {
    selectedAccountDecryptionKey,

    registerAccountEncryptionKey,
  }
}

const useTokens = (decryptionKeyHex: string | undefined) => {
  const tokensListToDecryptionKeyHexMap = walletStore.useWalletStore(
    state => state.tokensListToDecryptionKeyHexMap,
  )
  const decryptionKeyPerTokenTxHistory = walletStore.useWalletStore(
    state => state.decryptionKeyPerTokenTxHistory,
  )
  const setSelectedTokenAddress = walletStore.useWalletStore(
    state => state.setSelectedTokenAddress,
  )
  const _addToken = walletStore.useWalletStore(state => state.addToken)
  const _removeToken = walletStore.useWalletStore(state => state.removeToken)
  const _addTxHistoryItem = walletStore.useWalletStore(
    state => state.addTxHistoryItem,
  )

  const selectedTokenAddress = walletStore.useSelectedTokenAddress()

  const savedTokensPerDK = useMemo(
    () =>
      decryptionKeyHex ? tokensListToDecryptionKeyHexMap[decryptionKeyHex] : [],
    [decryptionKeyHex, tokensListToDecryptionKeyHexMap],
  )

  const tokens = useMemo(() => {
    if (!savedTokensPerDK?.length) {
      return [config.DEFAULT_TOKEN]
    }

    return [config.DEFAULT_TOKEN, ...savedTokensPerDK]
  }, [savedTokensPerDK])

  const selectedToken = useMemo(() => {
    if (!decryptionKeyHex || !tokens.length) return config.DEFAULT_TOKEN

    return (
      tokens.find(token => token.address === selectedTokenAddress) ||
      config.DEFAULT_TOKEN
    )
  }, [decryptionKeyHex, tokens, selectedTokenAddress])

  const txHistory = useMemo(() => {
    if (!decryptionKeyHex) return []

    if (!selectedToken) return []

    const mappedTxHistory =
      decryptionKeyPerTokenTxHistory[decryptionKeyHex]?.[selectedToken.address]

    return mappedTxHistory ?? []
  }, [decryptionKeyHex, selectedToken, decryptionKeyPerTokenTxHistory])

  const addToken = useCallback(
    (token: TokenBaseInfo) => {
      if (!decryptionKeyHex) throw new TypeError('Decryption key is not set')

      _addToken(decryptionKeyHex, token)
    },
    [_addToken, decryptionKeyHex],
  )

  const removeToken = useCallback(
    (address: string) => {
      if (!decryptionKeyHex) throw new TypeError('Decryption key is not set')

      _removeToken(decryptionKeyHex, address)
    },
    [decryptionKeyHex, _removeToken],
  )

  const addTxHistoryItem = useCallback(
    (details: TxHistoryItem) => {
      if (!decryptionKeyHex) throw new TypeError('decryptionKeyHex is not set')

      _addTxHistoryItem(decryptionKeyHex, selectedToken.address, details)
    },
    [decryptionKeyHex, selectedToken.address, _addTxHistoryItem],
  )

  return {
    tokens,
    selectedToken,
    txHistory,
    setSelectedTokenAddress: setSelectedTokenAddress,
    addToken,
    removeToken,
    addTxHistoryItem: addTxHistoryItem,
  }
}

const useSelectedAccountDecryptionKeyStatus = (
  decryptionKeyHex: string | undefined,
  tokenAddress: string | undefined,
) => {
  const selectedPrivateKeyHex = walletStore.useSelectedPrivateKeyHex()
  const tokensListToDecryptionKeyHexMap = walletStore.useWalletStore(
    state => state.tokensListToDecryptionKeyHexMap,
  )

  const currentTokensList = useMemo(() => {
    if (!decryptionKeyHex) return []

    const savedTokensPerDK = tokensListToDecryptionKeyHexMap?.[decryptionKeyHex]

    if (!savedTokensPerDK?.length) {
      return [config.DEFAULT_TOKEN]
    }

    return [config.DEFAULT_TOKEN, ...savedTokensPerDK]
  }, [decryptionKeyHex, tokensListToDecryptionKeyHexMap])

  const { data, isLoading, isLoadingError, isEmpty, reload } = useLoading<
    {
      tokenAddress: string
      pending: ConfidentialAmount | undefined
      actual: ConfidentialAmount | undefined
      isRegistered: boolean
      isNormalized: boolean
      isFrozen: boolean
    }[]
  >(
    [
      {
        tokenAddress: config.DEFAULT_TOKEN.address,
        ...AccountDecryptionKeyStatusRawDefault,
      },
    ],
    async () => {
      if (!decryptionKeyHex || !currentTokensList.length)
        return [
          {
            tokenAddress: config.DEFAULT_TOKEN.address,
            ...AccountDecryptionKeyStatusRawDefault,
          },
        ]

      const perTokenDetails: {
        tokenAddress: string
        pending: ConfidentialAmount | undefined
        actual: ConfidentialAmount | undefined
        isRegistered: boolean
        isNormalized: boolean
        isFrozen: boolean
      }[] = await Promise.all(
        currentTokensList.map(async el => {
          try {
            const isRegistered = await getIsAccountRegisteredWithToken(
              selectedPrivateKeyHex,
              el.address,
            )

            if (isRegistered) {
              const [{ pending, actual }, isNormalized, isFrozen] =
                await Promise.all([
                  getConfidentialBalances(
                    selectedPrivateKeyHex,
                    decryptionKeyHex,
                    el.address,
                  ),
                  getIsBalanceNormalized(selectedPrivateKeyHex, el.address),
                  getIsBalanceFrozen(selectedPrivateKeyHex, el.address),
                ])

              return {
                tokenAddress: el.address,
                pending,
                actual,
                isRegistered,
                isNormalized,
                isFrozen,
              }
            }

            return {
              tokenAddress: el.address,
              pending: undefined,
              actual: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
            }
          } catch (error) {
            return {
              tokenAddress: el.address,
              pending: undefined,
              actual: undefined,
              isRegistered: false,
              isNormalized: false,
              isFrozen: false,
            }
          }
        }),
      )

      return perTokenDetails
    },
    {
      loadArgs: [selectedPrivateKeyHex, currentTokensList],
    },
  )

  const perTokenStatusesRaw = useMemo(() => {
    return data.reduce(
      (acc, { tokenAddress: tokenAddr, ...rest }) => {
        acc[tokenAddr] = rest

        return acc
      },
      {} as Record<
        string,
        {
          pending: ConfidentialAmount | undefined
          actual: ConfidentialAmount | undefined
        } & Omit<AccountDecryptionKeyStatus, 'pendingAmount' | 'actualAmount'>
      >,
    )
  }, [data])

  const perTokenStatuses = useMemo(() => {
    return Object.entries(perTokenStatusesRaw)
      .map<[string, AccountDecryptionKeyStatus]>(([key, value]) => {
        const { pending, actual, ...rest } = value

        return [
          key,
          {
            ...rest,
            pendingAmount: pending?.amount?.toString(),
            actualAmount: actual?.amount?.toString(),
          } as AccountDecryptionKeyStatus,
        ]
      })
      .reduce(
        (acc, [key, value]) => {
          acc[key] = value

          return acc
        },
        {} as Record<string, AccountDecryptionKeyStatus>,
      )
  }, [perTokenStatusesRaw])

  const selectedAccountDecryptionKeyStatusRaw = useMemo(() => {
    if (!perTokenStatusesRaw) return AccountDecryptionKeyStatusRawDefault

    if (!tokenAddress) {
      return perTokenStatusesRaw[config.DEFAULT_TOKEN.address]
    }

    return perTokenStatusesRaw[tokenAddress]
  }, [perTokenStatusesRaw, tokenAddress])

  const selectedAccountDecryptionKeyStatus = useMemo(() => {
    if (!perTokenStatuses) return AccountDecryptionKeyStatusDefault

    if (!tokenAddress) return perTokenStatuses[config.DEFAULT_TOKEN.address]

    return perTokenStatuses[tokenAddress]
  }, [perTokenStatuses, tokenAddress])

  const decryptionKeyStatusLoadingState =
    useMemo((): DecryptionKeyStatusLoadingState => {
      if (isLoading) return 'loading'

      if (isLoadingError) return 'error'

      if (isEmpty) return 'idle'

      return 'success'
    }, [isEmpty, isLoading, isLoadingError])

  const normalizeAccount = useCallback(async () => {
    if (!decryptionKeyHex || !tokenAddress)
      throw new TypeError('Decryption key is not set')

    const actualBalance = perTokenStatusesRaw[tokenAddress]?.actual

    if (!actualBalance) throw new TypeError('actual balance not loaded')

    if (!actualBalance?.amountEncrypted || !actualBalance?.amount)
      throw new TypeError('Pending amount is not loaded')

    return normalizeConfidentialBalance(
      selectedPrivateKeyHex,
      decryptionKeyHex,
      actualBalance.amountEncrypted,
      actualBalance.amount,
      tokenAddress,
    )
  }, [
    decryptionKeyHex,
    perTokenStatusesRaw,
    selectedPrivateKeyHex,
    tokenAddress,
  ])

  // FIXME: implement Promise<CommittedTransactionResponse>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const unfreezeAccount = useCallback(async () => {
    if (!decryptionKeyHex) throw new TypeError('Decryption key is not set')

    // TODO: implement me
    // mb: rotate keys with unfreeze
  }, [decryptionKeyHex])

  const rolloverAccount = useCallback(async () => {
    if (!decryptionKeyHex) throw new TypeError('Decryption key is not set')

    return safelyRolloverConfidentialBalance(
      selectedPrivateKeyHex,
      decryptionKeyHex,
      tokenAddress,
    )
  }, [decryptionKeyHex, selectedPrivateKeyHex, tokenAddress])

  return {
    perTokenStatusesRaw,
    perTokenStatuses,
    selectedAccountDecryptionKeyStatusRaw,
    selectedAccountDecryptionKeyStatus,

    decryptionKeyStatusLoadingState,
    loadSelectedDecryptionKeyState: reload,

    normalizeAccount,
    unfreezeAccount,
    rolloverAccount,
  }
}

export const ConfidentialCoinContextProvider = ({
  children,
}: PropsWithChildren) => {
  const {
    accountsList,
    selectedAccount,
    setSelectedAccount,
    addNewAccount,
    removeAccount,
    aptBalance,
    reloadAptBalance,
  } = useAccounts()

  const { selectedAccountDecryptionKey, registerAccountEncryptionKey } =
    useSelectedAccountDecryptionKey()

  const {
    tokens,
    selectedToken,
    txHistory,
    addToken,
    removeToken,
    addTxHistoryItem,
    setSelectedTokenAddress,
  } = useTokens(selectedAccountDecryptionKey.toString())

  const {
    perTokenStatuses,
    decryptionKeyStatusLoadingState,
    selectedAccountDecryptionKeyStatusRaw,
    selectedAccountDecryptionKeyStatus,
    loadSelectedDecryptionKeyState,
    normalizeAccount,
    unfreezeAccount,
    rolloverAccount,
  } = useSelectedAccountDecryptionKeyStatus(
    selectedAccountDecryptionKey.toString(),
    selectedToken.address,
  )

  const transfer = useCallback(
    async (
      receiverAddressHex: string,
      amount: string,
      auditorsEncryptionKeyHexList?: string[],
    ) => {
      if (!selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted)
        throw new TypeError('actual amount not loaded')

      return transferConfidentialCoin(
        selectedAccount.privateKey.toString(),
        selectedAccountDecryptionKey.toString(),
        selectedAccountDecryptionKeyStatusRaw.actual.amountEncrypted,
        BigInt(amount),
        receiverAddressHex,
        auditorsEncryptionKeyHexList ?? [], // TODO: add auditors
        selectedToken.address,
      )
    },
    [
      selectedAccount.privateKey,
      selectedAccountDecryptionKey,
      selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted,
      selectedToken.address,
    ],
  )

  const withdraw = useCallback(
    async (amount: string) => {
      if (!selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted)
        throw new TypeError('actual amount not loaded')

      return withdrawConfidentialBalance(
        selectedAccount.privateKey.toString(),
        selectedAccountDecryptionKey.toString(),
        BigInt(amount),
        selectedAccountDecryptionKeyStatusRaw.actual.amountEncrypted,
        selectedToken.address,
      )
    },
    [
      selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted,
      selectedAccount.privateKey,
      selectedAccountDecryptionKey,
      selectedToken.address,
    ],
  )

  const deposit = useCallback(
    async (amount: number) => {
      return depositConfidentialBalance(
        selectedAccount.privateKey.toString(),
        amount,
        selectedToken.address,
      )
    },
    [selectedAccount.privateKey, selectedToken.address],
  )

  const testMintTokens = useCallback(async (): Promise<
    CommittedTransactionResponse[]
  > => {
    const mintTxReceipt = await mintTokens(
      selectedAccount.privateKey.toString(),
    )
    const depositTxReceipt = await deposit(10)

    const rolloverTxReceipt = await rolloverAccount()

    return [mintTxReceipt, depositTxReceipt, ...rolloverTxReceipt]
  }, [deposit, rolloverAccount, selectedAccount.privateKey])

  return (
    <confidentialCoinContext.Provider
      value={{
        accountsList,

        selectedAccount,

        setSelectedAccount,
        addNewAccount,
        removeAccount,

        aptBalance,
        reloadAptBalance,

        tokens,
        perTokenStatuses,
        selectedToken,
        txHistory,
        addToken,
        removeToken,
        addTxHistoryItem,
        setSelectedTokenAddress,

        selectedAccountDecryptionKey,
        registerAccountEncryptionKey,
        normalizeAccount,

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        unfreezeAccount,

        rolloverAccount,
        transfer,
        withdraw,
        deposit,

        selectedAccountDecryptionKeyStatus,
        decryptionKeyStatusLoadingState,
        loadSelectedDecryptionKeyState,

        testMintTokens,
      }}
    >
      {children}
    </confidentialCoinContext.Provider>
  )
}
