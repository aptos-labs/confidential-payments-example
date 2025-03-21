'use client'

import { config } from '@config'
import type {
  Account,
  CommittedTransactionResponse,
  ConfidentialAmount,
} from '@lukachi/aptos-labs-ts-sdk'
import { TwistedEd25519PrivateKey } from '@lukachi/aptos-labs-ts-sdk'
import { useQuery } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { createContext, useContext, useMemo } from 'react'

import {
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
import { authStore } from '@/store/auth'
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

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

type ConfidentialCoinContextType = {
  accountsList: Account[]

  selectedAccount: Account

  accountsLoadingState: LoadingState

  addNewAccount: (privateKeyHex?: string) => void
  removeAccount: (accountAddress: string) => void
  setSelectedAccount: (accountAddressHex: string) => Promise<void>

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

  decryptionKeyStatusLoadingState: LoadingState
  loadSelectedDecryptionKeyState: () => Promise<void>

  testMintTokens: () => Promise<CommittedTransactionResponse[]>
}

const confidentialCoinContext = createContext<ConfidentialCoinContextType>({
  accountsList: [],
  selectedAccount: {} as Account,
  accountsLoadingState: 'idle',

  addNewAccount: () => {},
  removeAccount: () => {},
  setSelectedAccount: async () => {},

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

const useSelectedAccount = () => {
  const activeKeylessAccount = authStore.useAuthStore(
    state => state.activeAccount,
  )
  const selectedWalletAccount = walletStore.useSelectedWalletAccount()

  return useMemo(
    () => selectedWalletAccount || activeKeylessAccount!,
    [activeKeylessAccount, selectedWalletAccount],
  )
}

const useAccounts = () => {
  const rawKeylessAccounts = authStore.useAuthStore(state => state.accounts)
  const walletAccounts = walletStore.useWalletAccounts()
  const switchActiveKeylessAccount = authStore.useAuthStore(
    state => state.switchKeylessAccount,
  )

  const addAndSetPrivateKey = walletStore.useWalletStore(
    state => state.addAndSetPrivateKey,
  )
  const removeWalletAccount = walletStore.useWalletStore(
    state => state.removeWalletAccount,
  )
  const setSelectedAccountAddr = walletStore.useWalletStore(
    state => state.setSelectedAccountAddr,
  )

  const selectedAccount = useSelectedAccount()

  const {
    data: { accountsList, keylessAccAddrToIdTokens },
    isLoading: isAccountsLoading,
    isLoadingError: isAccountsLoadingError,
    isEmpty: isAccountsEmpty,
  } = useLoading<{
    accountsList: Account[]
    keylessAccAddrToIdTokens: Record<string, string>
  }>(
    {
      accountsList: [],
      keylessAccAddrToIdTokens: {},
    },
    async () => {
      const keylessAccountsData = await Promise.all(
        rawKeylessAccounts.map(async el => {
          const derivedKeylessAccountData = await authStore.useAuthStore
            .getState()
            .deriveKeylessAccount(el.idToken.raw) // TODO: tokens addresses?

          const derivedAccount = derivedKeylessAccountData.derivedAccount

          return {
            derivedAccount,
            idToken: el.idToken.raw,
          }
        }),
      )

      return {
        accountsList: [
          ...walletAccounts,
          ...keylessAccountsData.map(el => el.derivedAccount),
        ],
        keylessAccAddrToIdTokens: keylessAccountsData.reduce(
          (acc, curr) => {
            acc[curr.derivedAccount.accountAddress.toString()] = curr.idToken

            return acc
          },
          {} as Record<string, string>,
        ),
      }
    },
    { loadArgs: [] },
  )

  const {
    data: aptBalance,
    isLoading: isBalanceLoading,
    isLoadingError: isBalanceLoadingError,
    isEmpty: isBalanceEmpty,
    reload,
  } = useLoading(
    0,
    () => {
      return getAptBalance(selectedAccount)
    },
    { loadArgs: [selectedAccount] },
  )

  const accountsLoadingState = useMemo((): LoadingState => {
    if (isAccountsLoading || isBalanceLoading) return 'loading'

    if (isAccountsLoadingError || isBalanceLoadingError) return 'error'

    if (isAccountsEmpty || isBalanceEmpty) return 'idle'

    return 'success'
  }, [
    isAccountsEmpty,
    isAccountsLoading,
    isAccountsLoadingError,
    isBalanceEmpty,
    isBalanceLoading,
    isBalanceLoadingError,
  ])

  // TODO: implement adding keyless account for new tokens
  const addNewAccount = useCallback(
    (privateKeyHex?: string) => {
      const newPrivateKeyHex =
        privateKeyHex ?? walletStore.generatePrivateKeyHex()

      addAndSetPrivateKey(newPrivateKeyHex)
    },
    [addAndSetPrivateKey],
  )

  const setSelectedAccount = useCallback(
    async (accountAddressHex: string) => {
      const accountToSet = accountsList.find(
        el =>
          el.accountAddress.toString().toLowerCase() ===
          accountAddressHex.toLowerCase(),
      )

      if (!accountToSet?.accountAddress)
        throw new TypeError('Account not found')

      if (
        walletAccounts.find(
          el =>
            el.accountAddress.toString().toLowerCase() ===
            accountToSet.accountAddress.toString().toLowerCase(),
        )
      ) {
        setSelectedAccountAddr(accountToSet?.accountAddress.toString())

        return
      }

      const idToken =
        keylessAccAddrToIdTokens[accountToSet.accountAddress.toString()]

      if (!idToken) throw new TypeError('Account not found')

      await switchActiveKeylessAccount(idToken)
      setSelectedAccountAddr('')
    },
    [
      accountsList,
      keylessAccAddrToIdTokens,
      setSelectedAccountAddr,
      switchActiveKeylessAccount,
      walletAccounts,
    ],
  )

  // TODO: implement removing keyless accounts
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

        if (!accountToRemove?.accountAddress)
          throw new TypeError('Account not found')

        removeWalletAccount(accountToRemove.accountAddress.toString())
        setSelectedAccountAddr(
          filteredAccountsList[0].accountAddress.toString(),
        )
      }
    },
    [accountsList, removeWalletAccount, setSelectedAccountAddr],
  )

  return {
    accountsList,

    selectedAccount,

    setSelectedAccount: setSelectedAccount,
    addNewAccount,
    removeAccount,

    aptBalance,

    accountsLoadingState,
    reloadAptBalance: reload,
  }
}

const useSelectedAccountDecryptionKey = () => {
  const rawKeylessAccounts = authStore.useAuthStore(state => state.accounts)
  const activeKeylessAccount = authStore.useAuthStore(
    state => state.activeAccount,
  )

  const selectedAccount = useSelectedAccount()

  const selectedAccountDecryptionKey = useMemo(() => {
    if (
      selectedAccount.accountAddress.toString().toLowerCase() ===
      activeKeylessAccount?.accountAddress.toString().toLowerCase()
    ) {
      return walletStore.decryptionKeyFromPepper(rawKeylessAccounts[0].pepper)
    }

    return walletStore.decryptionKeyFromPrivateKey(selectedAccount)
  }, [
    activeKeylessAccount?.accountAddress,
    rawKeylessAccounts,
    selectedAccount,
  ])

  const registerAccountEncryptionKey = async (tokenAddress: string) => {
    return registerConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.publicKey().toString(),
      tokenAddress,
    )
  }

  return {
    selectedAccountDecryptionKey,

    registerAccountEncryptionKey,
  }
}

const useTokens = (accountAddressHex: string | undefined) => {
  const accountAddrHexToTokenAddrMap = walletStore.useWalletStore(
    state => state.accountAddrHexToTokenAddrMap,
  )
  const accountAddrHexPerTokenTxHistory = walletStore.useWalletStore(
    state => state.accountAddrHexPerTokenTxHistory,
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

  const savedTokensPerAccAddr = useMemo(
    () =>
      accountAddressHex ? accountAddrHexToTokenAddrMap[accountAddressHex] : [],
    [accountAddressHex, accountAddrHexToTokenAddrMap],
  )

  const tokens = useMemo(() => {
    if (!savedTokensPerAccAddr?.length) {
      return [config.DEFAULT_TOKEN]
    }

    return [config.DEFAULT_TOKEN, ...savedTokensPerAccAddr]
  }, [savedTokensPerAccAddr])

  const selectedToken = useMemo(() => {
    if (!accountAddressHex || !tokens.length) return config.DEFAULT_TOKEN

    return (
      tokens.find(token => token.address === selectedTokenAddress) ||
      config.DEFAULT_TOKEN
    )
  }, [accountAddressHex, tokens, selectedTokenAddress])

  const txHistory = useMemo(() => {
    if (!accountAddressHex) return []

    if (!selectedToken) return []

    const mappedTxHistory =
      accountAddrHexPerTokenTxHistory[accountAddressHex]?.[
        selectedToken.address
      ]

    return mappedTxHistory ?? []
  }, [accountAddressHex, selectedToken, accountAddrHexPerTokenTxHistory])

  const addToken = useCallback(
    (token: TokenBaseInfo) => {
      if (!accountAddressHex)
        throw new TypeError('accountAddressHex is not set')

      _addToken(accountAddressHex, token)
    },
    [_addToken, accountAddressHex],
  )

  const removeToken = useCallback(
    (address: string) => {
      if (!accountAddressHex)
        throw new TypeError('accountAddressHex is not set')

      _removeToken(accountAddressHex, address)
    },
    [accountAddressHex, _removeToken],
  )

  const addTxHistoryItem = useCallback(
    (details: TxHistoryItem) => {
      if (!accountAddressHex)
        throw new TypeError('accountAddressHex is not set')

      _addTxHistoryItem(accountAddressHex, selectedToken.address, details)
    },
    [accountAddressHex, selectedToken.address, _addTxHistoryItem],
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
  tokenAddress: string | undefined,
) => {
  const rawKeylessAccounts = authStore.useAuthStore(state => state.accounts)
  const activeKeylessAccount = authStore.useAuthStore(
    state => state.activeAccount,
  )

  const selectedAccount = useSelectedAccount()

  const selectedAccountDecryptionKey = useMemo(() => {
    if (
      selectedAccount.accountAddress.toString().toLowerCase() ===
      activeKeylessAccount?.accountAddress.toString().toLowerCase()
    ) {
      return walletStore.decryptionKeyFromPepper(rawKeylessAccounts[0].pepper)
    }

    return walletStore.decryptionKeyFromPrivateKey(selectedAccount)
  }, [
    activeKeylessAccount?.accountAddress,
    rawKeylessAccounts,
    selectedAccount,
  ])

  const accountAddrHexToTokenAddrMap = walletStore.useWalletStore(
    state => state.accountAddrHexToTokenAddrMap,
  )

  const currentTokensList = useMemo(() => {
    if (!selectedAccount.accountAddress) return []

    const savedTokensPerDK =
      accountAddrHexToTokenAddrMap?.[selectedAccount.accountAddress.toString()]

    if (!savedTokensPerDK?.length) {
      return [config.DEFAULT_TOKEN]
    }

    return [config.DEFAULT_TOKEN, ...savedTokensPerDK]
  }, [selectedAccount.accountAddress, accountAddrHexToTokenAddrMap])

  const {
    data: loadedTokens,
    isLoading,
    isLoadingError,
    refetch: reload,
  } = useQuery<
    {
      tokenAddress: string
      pending: ConfidentialAmount | undefined
      actual: ConfidentialAmount | undefined
      isRegistered: boolean
      isNormalized: boolean
      isFrozen: boolean
    }[]
  >({
    initialData: [
      {
        tokenAddress: config.DEFAULT_TOKEN.address,
        ...AccountDecryptionKeyStatusRawDefault,
      },
    ],
    queryFn: async () => {
      if (!selectedAccount.accountAddress || !currentTokensList.length) {
        return [
          {
            tokenAddress: config.DEFAULT_TOKEN.address,
            ...AccountDecryptionKeyStatusRawDefault,
          },
        ]
      }

      return Promise.all(
        currentTokensList.map(async el => {
          try {
            const isRegistered = await getIsAccountRegisteredWithToken(
              selectedAccount,
              el.address,
            )

            if (isRegistered) {
              const [{ pending, actual }, isNormalized, isFrozen] =
                await Promise.all([
                  getConfidentialBalances(
                    selectedAccount,
                    selectedAccountDecryptionKey.toString(),
                    el.address,
                  ),
                  getIsBalanceNormalized(selectedAccount, el.address),
                  getIsBalanceFrozen(selectedAccount, el.address),
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
    },
    queryKey: [
      'loadedTokens',
      selectedAccount,
      currentTokensList,
      selectedAccountDecryptionKey,
    ],
  })

  const perTokenStatusesRaw = useMemo(() => {
    const tokens =
      loadedTokens.length !== currentTokensList.length
        ? currentTokensList.map(el => ({
            ...AccountDecryptionKeyStatusRawDefault,
            tokenAddress: el.address,
          }))
        : loadedTokens

    return tokens.reduce(
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
  }, [currentTokensList, loadedTokens])

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

  const decryptionKeyStatusLoadingState = useMemo((): LoadingState => {
    if (isLoading) return 'loading'

    if (isLoadingError) return 'error'

    return 'success'
  }, [isLoading, isLoadingError])

  const normalizeAccount = useCallback(async () => {
    if (!selectedAccountDecryptionKey || !tokenAddress)
      throw new TypeError('Decryption key is not set')

    const actualBalance = perTokenStatusesRaw[tokenAddress]?.actual

    if (!actualBalance) throw new TypeError('actual balance not loaded')

    if (!actualBalance?.amountEncrypted || !actualBalance?.amount)
      throw new TypeError('Pending amount is not loaded')

    return normalizeConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      actualBalance.amountEncrypted,
      actualBalance.amount,
      tokenAddress,
    )
  }, [
    perTokenStatusesRaw,
    selectedAccount,
    selectedAccountDecryptionKey,
    tokenAddress,
  ])

  // FIXME: implement Promise<CommittedTransactionResponse>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const unfreezeAccount = useCallback(async () => {
    if (!selectedAccountDecryptionKey)
      throw new TypeError('Decryption key is not set')

    // TODO: implement me
    // mb: rotate keys with unfreeze
  }, [selectedAccountDecryptionKey])

  const rolloverAccount = useCallback(async () => {
    if (!selectedAccountDecryptionKey)
      throw new TypeError('Decryption key is not set')

    return safelyRolloverConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      tokenAddress,
    )
  }, [selectedAccountDecryptionKey, selectedAccount, tokenAddress])

  return {
    perTokenStatusesRaw,
    perTokenStatuses,
    selectedAccountDecryptionKeyStatusRaw,
    selectedAccountDecryptionKeyStatus,

    decryptionKeyStatusLoadingState,
    loadSelectedDecryptionKeyState: async () => {
      await reload()
    },

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
    accountsLoadingState,
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
  } = useTokens(selectedAccount?.accountAddress.toString())

  const {
    perTokenStatuses,
    decryptionKeyStatusLoadingState,
    selectedAccountDecryptionKeyStatusRaw,
    selectedAccountDecryptionKeyStatus,
    loadSelectedDecryptionKeyState,
    normalizeAccount,
    unfreezeAccount,
    rolloverAccount,
  } = useSelectedAccountDecryptionKeyStatus(selectedToken.address)

  const transfer = useCallback(
    async (
      receiverAddressHex: string,
      amount: string,
      auditorsEncryptionKeyHexList?: string[],
    ) => {
      if (!selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted)
        throw new TypeError('actual amount not loaded')

      return transferConfidentialCoin(
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        selectedAccountDecryptionKeyStatusRaw.actual.amountEncrypted,
        BigInt(amount),
        receiverAddressHex,
        auditorsEncryptionKeyHexList ?? [], // TODO: add auditors
        selectedToken.address,
      )
    },
    [
      selectedAccount,
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
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        BigInt(amount),
        selectedAccountDecryptionKeyStatusRaw.actual.amountEncrypted,
        selectedToken.address,
      )
    },
    [
      selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted,
      selectedAccount,
      selectedAccountDecryptionKey,
      selectedToken.address,
    ],
  )

  const deposit = useCallback(
    async (amount: number) => {
      return depositConfidentialBalance(
        selectedAccount,
        amount,
        selectedToken.address,
      )
    },
    [selectedAccount, selectedToken.address],
  )

  const testMintTokens = useCallback(async (): Promise<
    CommittedTransactionResponse[]
  > => {
    const mintTxReceipt = await mintTokens(selectedAccount)
    const depositTxReceipt = await deposit(10)

    const rolloverTxReceipt = await rolloverAccount()

    const normalizeTxReceipt = await normalizeAccount()

    return [
      mintTxReceipt,
      depositTxReceipt,
      ...rolloverTxReceipt,
      normalizeTxReceipt,
    ]
  }, [deposit, normalizeAccount, rolloverAccount, selectedAccount])

  return (
    <confidentialCoinContext.Provider
      value={{
        accountsList,

        selectedAccount,

        setSelectedAccount,
        addNewAccount,
        removeAccount,
        accountsLoadingState,

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
