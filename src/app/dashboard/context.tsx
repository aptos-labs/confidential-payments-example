'use client'

import { config } from '@config'
import { time } from '@distributedlab/tools'
import {
  Account,
  CommittedTransactionResponse,
  ConfidentialAmount,
} from '@lukachi/aptos-labs-ts-sdk'
import { TwistedEd25519PrivateKey } from '@lukachi/aptos-labs-ts-sdk'
import { FixedNumber, parseUnits } from 'ethers'
import { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { createContext, useContext, useMemo } from 'react'

import {
  depositConfidentialBalance,
  depositConfidentialBalanceCoin,
  getAptBalance,
  getCoinByFaAddress,
  getConfidentialBalances,
  getFABalance,
  getFungibleAssetMetadata,
  getIsAccountRegisteredWithToken,
  getIsBalanceFrozen,
  getIsBalanceNormalized,
  mintAptCoin,
  mintTokens,
  normalizeConfidentialBalance,
  parseCoinTypeFromCoinStruct,
  registerConfidentialBalance,
  safelyRolloverConfidentialBalance,
  transferConfidentialCoin,
  withdrawConfidentialBalance,
} from '@/api/modules/aptos'
import { ErrorHandler, tryCatch } from '@/helpers'
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
  fungibleAssetBalance: string
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
  fungibleAssetBalance: '',
}

const AccountDecryptionKeyStatusDefault: AccountDecryptionKeyStatus = {
  isFrozen: false,
  isNormalized: false,
  isRegistered: false,

  pendingAmount: '0',
  actualAmount: '0',
  fungibleAssetBalance: '0',
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
  tokensLoadingState: LoadingState
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
    opts?: {
      isSyncFirst?: boolean
      auditorsEncryptionKeyHexList?: string[]
    },
  ) => Promise<CommittedTransactionResponse>
  withdrawTo: (
    amount: string,
    receiver: string,
    opts?: {
      isSyncFirst?: boolean
    },
  ) => Promise<CommittedTransactionResponse>
  depositTo: (
    amount: bigint,
    to: string,
  ) => Promise<CommittedTransactionResponse>
  depositCoinTo: (
    amount: bigint,
    to: string,
  ) => Promise<CommittedTransactionResponse>
  // TODO: rotate keys

  decryptionKeyStatusLoadingState: LoadingState
  loadSelectedDecryptionKeyState: () => Promise<void>

  testMintTokens: (amount: string) => Promise<CommittedTransactionResponse[]>
  ensureConfidentialBalanceReadyBeforeOp: (args: {
    amountToEnsure: string
    token: TokenBaseInfo
    currentTokenStatus: AccountDecryptionKeyStatus
    onError: (error: Error) => void
  }) => Promise<void>
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
  tokensLoadingState: 'idle',
  perTokenStatuses: {},
  selectedToken: {} as TokenBaseInfo,
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
    fungibleAssetBalance: '0',
  },

  registerAccountEncryptionKey: async () =>
    ({}) as CommittedTransactionResponse,
  normalizeAccount: async () => ({}) as CommittedTransactionResponse,
  unfreezeAccount: async () => ({}) as CommittedTransactionResponse,
  rolloverAccount: async () => [] as CommittedTransactionResponse[],
  transfer: async () => ({}) as CommittedTransactionResponse,
  withdrawTo: async () => ({}) as CommittedTransactionResponse,
  depositTo: async () => ({}) as CommittedTransactionResponse,
  depositCoinTo: async () => ({}) as CommittedTransactionResponse,

  decryptionKeyStatusLoadingState: 'idle',
  loadSelectedDecryptionKeyState: async () => {},

  testMintTokens: async () => [] as CommittedTransactionResponse[],
  ensureConfidentialBalanceReadyBeforeOp: async () => {},
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
            .deriveKeylessAccount(el.idToken.raw) // TODO: tokens addresses? persist this

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
    update,
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

    return 'success'
  }, [
    isAccountsLoading,
    isAccountsLoadingError,
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
    reloadAptBalance: update,
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
      accountAddressHex
        ? accountAddrHexToTokenAddrMap[accountAddressHex] || []
        : [],
    [accountAddressHex, accountAddrHexToTokenAddrMap],
  )

  const {
    data: tokens,
    isLoading: isTokensLoading,
    isLoadingError: isTokensLoadingError,
  } = useLoading(
    [],
    async () => {
      const filteredSavedTokens = savedTokensPerAccAddr.filter(el => {
        return !config.DEFAULT_TOKEN_ADRESSES.map(i =>
          i.toLowerCase(),
        ).includes(el.toLowerCase())
      })

      return Promise.all(
        [...config.DEFAULT_TOKEN_ADRESSES, ...filteredSavedTokens].map(
          async addr => {
            const [metadatas, error] = await tryCatch(
              getFungibleAssetMetadata(addr),
            )
            if (error || !metadatas?.length) {
              return {
                address: addr,
                name: '',
                symbol: '',
                decimals: 0,
                iconUri: '',
              }
            }

            const [metadata] = metadatas

            return {
              address: addr,
              name: metadata.name,
              symbol: metadata.symbol,
              decimals: metadata.decimals,
              iconUri: metadata.iconUri,
            }
          },
        ),
      )
    },
    {
      loadArgs: [accountAddressHex, savedTokensPerAccAddr],
    },
  )

  const tokensLoadingState = useMemo<LoadingState>(() => {
    if (isTokensLoading) return 'loading'

    if (isTokensLoadingError) return 'error'

    return 'success'
  }, [isTokensLoading, isTokensLoadingError])

  const selectedToken = useMemo<TokenBaseInfo>(() => {
    const defaultToken = {
      address: config.DEFAULT_TOKEN_ADRESSES[0],
      name: '',
      symbol: '',
      decimals: 0,
      iconUri: '',
    }

    if (!accountAddressHex || !tokens.length) return defaultToken

    return (
      tokens.find(token => token.address === selectedTokenAddress) ||
      defaultToken
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
    tokensLoadingState,
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
  const { selectedAccountDecryptionKey } = useSelectedAccountDecryptionKey()

  const selectedTokenAddress = walletStore.useSelectedTokenAddress()

  const selectedAccount = useSelectedAccount()

  const accountAddrHexToTokenAddrMap = walletStore.useWalletStore(
    state => state.accountAddrHexToTokenAddrMap,
  )

  const currentTokensList = useMemo(() => {
    if (!selectedAccount.accountAddress) return []

    const savedTokensPerDK =
      accountAddrHexToTokenAddrMap?.[selectedAccount.accountAddress.toString()]

    if (!savedTokensPerDK?.length) {
      return config.DEFAULT_TOKEN_ADRESSES
    }

    return [...config.DEFAULT_TOKEN_ADRESSES, ...savedTokensPerDK]
  }, [selectedAccount.accountAddress, accountAddrHexToTokenAddrMap])

  const {
    data: loadedTokens,
    isLoading,
    isLoadingError,
    reload,
  } = useLoading(
    [
      {
        tokenAddress: config.DEFAULT_TOKEN_ADRESSES[0],
        ...AccountDecryptionKeyStatusRawDefault,
      },
    ],
    async () => {
      if (!selectedAccount.accountAddress || !currentTokensList.length) {
        return [
          {
            tokenAddress: config.DEFAULT_TOKEN_ADRESSES[0],
            ...AccountDecryptionKeyStatusRawDefault,
          },
        ]
      }

      return Promise.all(
        currentTokensList.map(async el => {
          const [isRegistered, checkRegisterError] = await tryCatch(
            getIsAccountRegisteredWithToken(selectedAccount, el),
          )
          if (checkRegisterError) {
            return {
              tokenAddress: el,
              pending: undefined,
              actual: undefined,
              isRegistered: false,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: '',
            }
          }

          const [coin] = await tryCatch(getCoinByFaAddress(el))

          const assetType = coin ? parseCoinTypeFromCoinStruct(coin) : el

          const [fungibleAssetBalance, getFABalanceError] = await tryCatch(
            getFABalance(selectedAccount, assetType),
          )
          if (getFABalanceError) {
            return {
              tokenAddress: el,
              pending: undefined,
              actual: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: '',
            }
          }

          if (!isRegistered) {
            return {
              tokenAddress: el,
              pending: undefined,
              actual: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: fungibleAssetBalance?.[0]?.amount,
            }
          }

          const [registeredDetails, getRegisteredDetailsError] = await tryCatch(
            Promise.all([
              getConfidentialBalances(
                selectedAccount,
                selectedAccountDecryptionKey.toString(),
                el,
              ),
              getIsBalanceNormalized(selectedAccount, el),
              getIsBalanceFrozen(selectedAccount, el),
            ]),
          )
          if (getRegisteredDetailsError) {
            return {
              tokenAddress: el,
              pending: undefined,
              actual: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: fungibleAssetBalance?.[0]?.amount,
            }
          }

          const [{ pending, actual }, isNormalized, isFrozen] =
            registeredDetails

          return {
            tokenAddress: el,
            pending,
            actual,
            isRegistered,
            isNormalized,
            isFrozen,
            fungibleAssetBalance: fungibleAssetBalance?.[0]?.amount,
          }
        }),
      )
    },
    {
      loadArgs: [
        selectedTokenAddress,
        selectedAccount,
        currentTokensList,
        selectedAccountDecryptionKey,
      ],
    },
  )

  const perTokenStatusesRaw = useMemo(() => {
    const tokens =
      loadedTokens.length !== currentTokensList.length
        ? currentTokensList.map(el => ({
            ...AccountDecryptionKeyStatusRawDefault,
            tokenAddress: el,
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
      return perTokenStatusesRaw[config.DEFAULT_TOKEN_ADRESSES[0]]
    }

    return perTokenStatusesRaw[tokenAddress]
  }, [perTokenStatusesRaw, tokenAddress])

  const selectedAccountDecryptionKeyStatus = useMemo(() => {
    if (!perTokenStatuses) return AccountDecryptionKeyStatusDefault

    if (!tokenAddress) return perTokenStatuses[config.DEFAULT_TOKEN_ADRESSES[0]]

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

    const currBalanceState = await getConfidentialBalances(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      tokenAddress,
    )

    const actualBalance = currBalanceState.actual

    if (!actualBalance) throw new TypeError('actual balance not loaded')

    if (!actualBalance?.amountEncrypted)
      throw new TypeError('actualBalance?.amountEncrypted is not defined')

    if (!actualBalance?.amount)
      throw new TypeError('actualBalance?.amount is not defined')

    return normalizeConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      actualBalance.amountEncrypted,
      actualBalance.amount,
      tokenAddress,
    )
  }, [selectedAccount, selectedAccountDecryptionKey, tokenAddress])

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
    tokensLoadingState,
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
      opts?: {
        auditorsEncryptionKeyHexList?: string[]
        isSyncFirst?: boolean
      },
    ) => {
      if (!selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted)
        throw new TypeError('actual amount not loaded')

      const amountEncrypted = opts?.isSyncFirst
        ? await (async () => {
            const { actual } = await getConfidentialBalances(
              selectedAccount,
              selectedAccountDecryptionKey.toString(),
              selectedToken.address,
            )

            return actual?.amountEncrypted
          })()
        : selectedAccountDecryptionKeyStatusRaw.actual.amountEncrypted

      if (!amountEncrypted) throw new TypeError('amountEncrypted is not loaded')

      return transferConfidentialCoin(
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        amountEncrypted,
        BigInt(amount),
        receiverAddressHex,
        opts?.auditorsEncryptionKeyHexList ?? [],
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

  const withdrawTo = useCallback(
    async (
      amount: string,
      receiver: string,
      opts?: {
        isSyncFirst?: boolean
      },
    ) => {
      if (!selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted)
        throw new TypeError('actual amount not loaded')

      const amountEncrypted = opts?.isSyncFirst
        ? await (async () => {
            const { actual } = await getConfidentialBalances(
              selectedAccount,
              selectedAccountDecryptionKey.toString(),
              selectedToken.address,
            )

            return actual?.amountEncrypted
          })()
        : selectedAccountDecryptionKeyStatusRaw.actual.amountEncrypted

      if (!amountEncrypted) throw new TypeError('amountEncrypted is not loaded')

      return withdrawConfidentialBalance(
        selectedAccount,
        receiver,
        selectedAccountDecryptionKey.toString(),
        BigInt(amount),
        amountEncrypted,
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

  const depositTo = useCallback(
    async (amount: bigint, to: string) => {
      if (!selectedToken) throw new TypeError('Token is not set')

      return depositConfidentialBalance(
        selectedAccount,
        amount,
        to,
        selectedToken.address,
      )
    },
    [selectedAccount, selectedToken],
  )

  const depositCoinTo = useCallback(
    async (amount: bigint, to: string) => {
      const coinType = await getCoinByFaAddress(selectedToken.address)

      return depositConfidentialBalanceCoin(
        selectedAccount,
        amount,
        parseCoinTypeFromCoinStruct(coinType),
        to,
      )
    },
    [selectedAccount, selectedToken.address],
  )

  const testMintTokens = useCallback(
    async (mintAmount = '10'): Promise<CommittedTransactionResponse[]> => {
      const amountToDeposit = parseUnits(mintAmount, selectedToken.decimals)

      const mintTxReceipt = await mintTokens(selectedAccount, amountToDeposit)
      const [depositTxReceipt, depositError] = await tryCatch(
        depositTo(amountToDeposit, selectedAccount.accountAddress.toString()),
      )
      if (depositError) {
        ErrorHandler.processWithoutFeedback(depositError)
        return [mintTxReceipt]
      }

      return [mintTxReceipt, depositTxReceipt]
    },
    [depositTo, selectedAccount, selectedToken.decimals],
  )

  /**
   * Ensures that the confidential balance is ready before performing an operation.
   *
   * 1. Checks if the confidential balance is enough for the operation
   * 2. Implement "emulating-a-fee-payer-via-devnet-faucet" logic
   * 3. Deposit whole public balance except the fee, that was emulated
   * 4. Rollover the account if there is not enough "actual" amount in user's balance
   */
  const ensureConfidentialBalanceReadyBeforeOp = useCallback<
    ConfidentialCoinContextType['ensureConfidentialBalanceReadyBeforeOp']
  >(
    async args => {
      const publicBalanceBN = BigInt(
        perTokenStatuses[args.token.address].fungibleAssetBalance || 0,
      )

      const pendingAmountBN = BigInt(args.currentTokenStatus.pendingAmount || 0)

      const actualAmountBN = BigInt(args.currentTokenStatus?.actualAmount || 0)

      const confidentialAmountsSumBN = pendingAmountBN + actualAmountBN

      const formAmountBN = parseUnits(args.amountToEnsure, args.token.decimals)

      const isConfidentialBalanceEnough =
        confidentialAmountsSumBN - formAmountBN >= 0

      if (!isConfidentialBalanceEnough) {
        // const amountToDeposit = formAmountBN - confidentialAmountsSumBN
        const amountToDeposit = publicBalanceBN

        /* emulating-a-fee-payer-via-devnet-faucet */
        const [, mintError] = await tryCatch(
          mintAptCoin(selectedAccount, parseUnits('0.3', args.token.decimals)),
        )
        if (mintError) {
          args.onError(mintError)
          return
        }

        const [faOnlyBalanceResponse, getFAError] = await tryCatch(
          getFABalance(selectedAccount, args.token.address),
        )
        if (getFAError) {
          args.onError(getFAError)
          return
        }
        const [faOnlyBalance] = faOnlyBalanceResponse

        const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
          faOnlyBalance?.amount || '0',
        ).lt(FixedNumber.fromValue(amountToDeposit))

        const [depositTxReceipt, depositError] = await tryCatch(
          isInsufficientFAOnlyBalance
            ? depositCoinTo(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              )
            : depositTo(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              ),
        )
        if (depositError) {
          args.onError(depositError)
          return
        }

        addTxHistoryItem({
          txHash: depositTxReceipt.hash,
          txType: 'deposit',
          createdAt: time().timestamp,
        })
      }

      if (actualAmountBN < formAmountBN) {
        const [rolloverTxs, rolloverError] = await tryCatch(rolloverAccount())
        if (rolloverError) {
          args.onError(rolloverError)
          return
        }

        rolloverTxs.forEach(el => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (el.payload.function.includes('rollover')) {
            addTxHistoryItem({
              txHash: el.hash,
              txType: 'rollover',
              createdAt: time().timestamp,
            })

            return
          }

          addTxHistoryItem({
            txHash: el.hash,
            txType: 'normalize',
            createdAt: time().timestamp,
          })
        })
      }
    },
    [
      addTxHistoryItem,
      depositCoinTo,
      depositTo,
      perTokenStatuses,
      rolloverAccount,
      selectedAccount,
    ],
  )

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
        tokensLoadingState,
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
        withdrawTo,
        depositTo,
        depositCoinTo,

        selectedAccountDecryptionKeyStatus,
        decryptionKeyStatusLoadingState,
        loadSelectedDecryptionKeyState,

        testMintTokens,
        ensureConfidentialBalanceReadyBeforeOp,
      }}
    >
      {children}
    </confidentialCoinContext.Provider>
  )
}
