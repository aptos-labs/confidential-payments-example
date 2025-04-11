'use client'

import { config } from '@config'
import {
  Account,
  CommittedTransactionResponse,
  ConfidentialAmount,
  InputGenerateTransactionPayloadData,
  KeylessAccount,
  SimpleTransaction,
} from '@lukachi/aptos-labs-ts-sdk'
import { TwistedEd25519PrivateKey } from '@lukachi/aptos-labs-ts-sdk'
import { FixedNumber, parseUnits } from 'ethers'
import { jwtDecode, JwtPayload } from 'jwt-decode'
import { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { createContext, useContext, useMemo } from 'react'

import {
  buildDepositConfidentialBalanceCoinTx,
  buildDepositConfidentialBalanceTx,
  buildSafelyRolloverConfidentialBalanceTx,
  buildTransferConfidentialCoin,
  buildWithdrawConfidentialBalance,
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
  mintTokens,
  normalizeConfidentialBalance,
  parseCoinTypeFromCoinStruct,
  registerConfidentialBalance,
  safelyRolloverConfidentialBalance,
  sendAndWaitTx,
  transferConfidentialCoin,
  withdrawConfidentialBalance,
} from '@/api/modules/aptos'
import { aptos } from '@/api/modules/aptos/client'
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

type KeylessAccountPublic = {
  idToken: string
  name: string
  avatarUrl: string
}

type ConfidentialCoinContextType = {
  feePayerAccount: Account

  accountsList: (Account | KeylessAccountPublic)[]

  selectedAccount: Account | KeylessAccount

  accountsLoadingState: LoadingState

  addNewAccount: (privateKeyHex?: string) => void
  removeAccount: (accountAddress: string) => void
  setSelectedAccount: (
    args:
      | { accountAddressHex: string; pubKeylessAcc?: never }
      | { accountAddressHex?: never; pubKeylessAcc: KeylessAccountPublic },
  ) => Promise<void>

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
  buildTransferTx: (
    receiverEncryptionKeyHex: string,
    amount: string,
    opts?: {
      isSyncFirst?: boolean
      isWithFeePayer?: boolean
      auditorsEncryptionKeyHexList?: string[]
    },
  ) => Promise<SimpleTransaction>
  transfer: (
    receiverEncryptionKeyHex: string,
    amount: string,
    opts?: {
      isSyncFirst?: boolean
      isWithFeePayer?: boolean
      auditorsEncryptionKeyHexList?: string[]
    },
  ) => Promise<CommittedTransactionResponse>
  buildWithdrawToTx: (
    amount: string,
    receiver: string,
    opts?: {
      isSyncFirst?: boolean
      isWithFeePayer?: boolean
    },
  ) => Promise<SimpleTransaction>
  withdrawTo: (
    amount: string,
    receiver: string,
    opts?: {
      isSyncFirst?: boolean
      isWithFeePayer?: boolean
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
    opTx: SimpleTransaction
  }) => Promise<Error | undefined>
}

const confidentialCoinContext = createContext<ConfidentialCoinContextType>({
  feePayerAccount: {} as Account,
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
  buildTransferTx: async () => ({}) as SimpleTransaction,
  transfer: async () => ({}) as CommittedTransactionResponse,
  buildWithdrawToTx: async () => ({}) as SimpleTransaction,
  withdrawTo: async () => ({}) as CommittedTransactionResponse,
  depositTo: async () => ({}) as CommittedTransactionResponse,
  depositCoinTo: async () => ({}) as CommittedTransactionResponse,

  decryptionKeyStatusLoadingState: 'idle',
  loadSelectedDecryptionKeyState: async () => {},

  testMintTokens: async () => [] as CommittedTransactionResponse[],
  ensureConfidentialBalanceReadyBeforeOp: async () => undefined,
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
  const feePayerAccount = authStore.useFeePayerAccount()
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
    data: { accountsList },
    isLoading: isAccountsLoading,
    isLoadingError: isAccountsLoadingError,
  } = useLoading<{
    accountsList: ConfidentialCoinContextType['accountsList']
  }>(
    {
      accountsList: [],
    },
    async () => {
      const keylessAccountsData = await Promise.all(
        rawKeylessAccounts.map(async el => {
          const decodedIdToken = jwtDecode<
            JwtPayload & {
              name: string
              picture: string
            }
          >(el.idToken.raw)

          const keylessAccountPub: KeylessAccountPublic = {
            idToken: el.idToken.raw,
            name: decodedIdToken.name,
            avatarUrl: decodedIdToken.picture,
          }

          return keylessAccountPub
        }),
      )

      return {
        accountsList: [...walletAccounts, ...keylessAccountsData],
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

  const setSelectedAccount = useCallback<
    ConfidentialCoinContextType['setSelectedAccount']
  >(
    async args => {
      if (args.pubKeylessAcc) {
        await switchActiveKeylessAccount(args.pubKeylessAcc.idToken)
        setSelectedAccountAddr('')

        return
      }

      const accountToSet = accountsList
        .filter(el => el instanceof Account)
        .find(el => {
          return (
            el.accountAddress.toString().toLowerCase() ===
            args.accountAddressHex.toLowerCase()
          )
        })

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
    },
    [
      accountsList,
      setSelectedAccountAddr,
      switchActiveKeylessAccount,
      walletAccounts,
    ],
  )

  // TODO: implement removing keyless accounts
  const removeAccount = useCallback(
    (accountAddressHex: string) => {
      const aptAccount = accountsList.filter(el => el instanceof Account)

      const currentAccountsListLength = accountsList.length

      const filteredAccountsList = aptAccount.filter(
        el =>
          el.accountAddress.toString().toLowerCase() !==
          accountAddressHex.toLowerCase(),
      )

      if (
        currentAccountsListLength !== filteredAccountsList.length &&
        filteredAccountsList.length > 0
      ) {
        const accountToRemove = aptAccount.find(
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
    accountsList: accountsList,

    feePayerAccount,
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

  try {
    // eslint-disable-next-line no-console
    console.log({
      hex: selectedAccountDecryptionKey.publicKey().toString(),
      arr: selectedAccountDecryptionKey.publicKey().toUint8Array(),
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log({ error })
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
  const feePayerAccount = authStore.useFeePayerAccount()

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

  const buildRolloverAccountTx = useCallback(
    async (isWithFeePayer = false) => {
      if (!selectedAccountDecryptionKey)
        throw new TypeError('Decryption key is not set')

      return buildSafelyRolloverConfidentialBalanceTx(
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        tokenAddress,
        isWithFeePayer ? feePayerAccount.accountAddress.toString() : undefined,
      )
    },
    [
      feePayerAccount.accountAddress,
      selectedAccount,
      selectedAccountDecryptionKey,
      tokenAddress,
    ],
  )

  const rolloverAccount = useCallback(
    async (isWithFeePayer = false) => {
      if (!selectedAccountDecryptionKey)
        throw new TypeError('Decryption key is not set')

      return safelyRolloverConfidentialBalance(
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        tokenAddress,
        isWithFeePayer ? feePayerAccount.accountAddress.toString() : undefined,
      )
    },
    [
      selectedAccountDecryptionKey,
      selectedAccount,
      tokenAddress,
      feePayerAccount.accountAddress,
    ],
  )

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

    buildRolloverAccountTx,
    rolloverAccount,
  }
}

export const ConfidentialCoinContextProvider = ({
  children,
}: PropsWithChildren) => {
  const {
    feePayerAccount,
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
    buildRolloverAccountTx,
    rolloverAccount,
  } = useSelectedAccountDecryptionKeyStatus(selectedToken.address)

  const buildTransferTx = useCallback(
    async (
      receiverAddressHex: string,
      amount: string,
      opts?: {
        auditorsEncryptionKeyHexList?: string[]
        isWithFeePayer?: boolean
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

      return buildTransferConfidentialCoin(
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        amountEncrypted,
        BigInt(amount),
        receiverAddressHex,
        opts?.auditorsEncryptionKeyHexList ?? [],
        selectedToken.address,
        opts?.isWithFeePayer ? feePayerAccount.accountAddress.toString() : '',
      )
    },
    [
      feePayerAccount.accountAddress,
      selectedAccount,
      selectedAccountDecryptionKey,
      selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted,
      selectedToken.address,
    ],
  )

  const transfer = useCallback(
    async (
      receiverAddressHex: string,
      amount: string,
      opts?: {
        auditorsEncryptionKeyHexList?: string[]
        isWithFeePayer?: boolean
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
        opts?.isWithFeePayer ? feePayerAccount.accountAddress.toString() : '',
      )
    },
    [
      feePayerAccount.accountAddress,
      selectedAccount,
      selectedAccountDecryptionKey,
      selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted,
      selectedToken.address,
    ],
  )

  const buildWithdrawToTx = useCallback(
    async (
      amount: string,
      receiver: string,
      opts?: {
        isSyncFirst?: boolean
        isWithFeePayer?: boolean
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

      return buildWithdrawConfidentialBalance(
        selectedAccount,
        receiver,
        selectedAccountDecryptionKey.toString(),
        BigInt(amount),
        amountEncrypted,
        selectedToken.address,
        opts?.isWithFeePayer ? feePayerAccount.accountAddress.toString() : '',
      )
    },
    [
      feePayerAccount.accountAddress,
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
        isWithFeePayer?: boolean
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
        opts?.isWithFeePayer ? feePayerAccount.accountAddress.toString() : '',
      )
    },
    [
      selectedAccountDecryptionKeyStatusRaw.actual?.amountEncrypted,
      selectedAccount,
      selectedAccountDecryptionKey,
      selectedToken.address,
      feePayerAccount.accountAddress,
    ],
  )

  const buildDepositToTx = useCallback(
    async (amount: bigint, to: string, isWithFeePayer?: boolean) => {
      if (!selectedToken) throw new TypeError('Token is not set')

      return buildDepositConfidentialBalanceTx(
        selectedAccount,
        amount,
        to,
        selectedToken.address,
        isWithFeePayer ? feePayerAccount.accountAddress.toString() : undefined,
      )
    },
    [feePayerAccount.accountAddress, selectedAccount, selectedToken],
  )

  const depositTo = useCallback(
    async (amount: bigint, to: string, isWithFeePayer?: boolean) => {
      if (!selectedToken) throw new TypeError('Token is not set')

      return depositConfidentialBalance(
        selectedAccount,
        amount,
        to,
        selectedToken.address,
        isWithFeePayer ? feePayerAccount.accountAddress.toString() : undefined,
      )
    },
    [feePayerAccount.accountAddress, selectedAccount, selectedToken],
  )

  const buildDepositCoinToTx = useCallback(
    async (amount: bigint, to: string, isWithFeePayer?: boolean) => {
      const coinType = await getCoinByFaAddress(selectedToken.address)

      return buildDepositConfidentialBalanceCoinTx(
        selectedAccount,
        amount,
        parseCoinTypeFromCoinStruct(coinType),
        to,
        isWithFeePayer ? feePayerAccount.accountAddress.toString() : undefined,
      )
    },
    [feePayerAccount.accountAddress, selectedAccount, selectedToken.address],
  )

  const depositCoinTo = useCallback(
    async (amount: bigint, to: string, isWithFeePayer?: boolean) => {
      const coinType = await getCoinByFaAddress(selectedToken.address)

      return depositConfidentialBalanceCoin(
        selectedAccount,
        amount,
        parseCoinTypeFromCoinStruct(coinType),
        to,
        isWithFeePayer ? feePayerAccount.accountAddress.toString() : undefined,
      )
    },
    [feePayerAccount.accountAddress, selectedAccount, selectedToken.address],
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
   * emulating-a-fee-payer-via-devnet-faucet
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
      const txToExecute: SimpleTransaction[] = []
      let depositTransactionToExecute: SimpleTransaction | undefined = undefined
      let rolloverTransactionsToExecute: InputGenerateTransactionPayloadData[] =
        []

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

        const [faOnlyBalanceResponse, getFAError] = await tryCatch(
          getFABalance(selectedAccount, args.token.address),
        )
        if (getFAError) {
          return getFAError
        }
        const [faOnlyBalance] = faOnlyBalanceResponse

        const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
          faOnlyBalance?.amount || '0',
        ).lt(FixedNumber.fromValue(amountToDeposit))

        const [depositTx, buildDepositTxError] = await tryCatch(
          isInsufficientFAOnlyBalance
            ? buildDepositCoinToTx(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
                true,
              )
            : buildDepositToTx(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
                true,
              ),
        )
        if (buildDepositTxError) {
          return buildDepositTxError
        }
        depositTransactionToExecute = depositTx
        txToExecute.push(depositTx)

        // addTxHistoryItem({
        //   txHash: depositTxReceipt.hash,
        //   txType: 'deposit',
        //   createdAt: time().timestamp,
        // })
      }

      if (actualAmountBN < formAmountBN) {
        const [rolloverTxx, buildRolloverTxError] = await tryCatch(
          buildRolloverAccountTx(true),
        )
        if (buildRolloverTxError) {
          return buildRolloverTxError
        }
        rolloverTransactionsToExecute = rolloverTxx
        txToExecute.push(
          ...(await Promise.all(
            rolloverTxx.map(async el => {
              return aptos.transaction.build.simple({
                sender: selectedAccount.accountAddress,
                data: el,
              })
            }),
          )),
        )

        // rolloverTxs.forEach(el => {
        //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //   // @ts-ignore
        //   if (el.payload.function.includes('rollover')) {
        //     addTxHistoryItem({
        //       txHash: el.hash,
        //       txType: 'rollover',
        //       createdAt: time().timestamp,
        //     })

        //     return
        //   }

        //   addTxHistoryItem({
        //     txHash: el.hash,
        //     txType: 'normalize',
        //     createdAt: time().timestamp,
        //   })
        // })
      }

      // const estimatedGas = (
      //   await Promise.all(
      //     [...txToExecute, args.opTx].map(async el => {
      //       const [simRes] = await aptos.transaction.simulate.simple({
      //         signerPublicKey: selectedAccount.publicKey,
      //         transaction: el,
      //       })

      //       const estGasUsed = simRes.gas_used
      //       const estGasPrice = simRes.gas_unit_price

      //       return BigInt(estGasUsed) * BigInt(estGasPrice)
      //     }),
      //   )
      // ).reduce((acc, el) => acc + el, BigInt(0))

      // const [, mintError] = await tryCatch(
      //   mintAptCoin(selectedAccount, estimatedGas * 2n),
      // )
      // if (mintError) {
      //   args.onError(mintError)
      //   return
      // }

      if (depositTransactionToExecute) {
        const [, error] = await tryCatch(
          sendAndWaitTx(
            depositTransactionToExecute,
            selectedAccount,
            feePayerAccount,
          ),
        )
        if (error) {
          return error
        }
      }

      if (rolloverTransactionsToExecute.length) {
        for await (const rolloverTx of rolloverTransactionsToExecute) {
          const simpleRolloverTx = await aptos.transaction.build.simple({
            sender: selectedAccount.accountAddress,
            data: rolloverTx,
            withFeePayer: true,
          })

          const senderAuthenticator =
            selectedAccount.signTransactionWithAuthenticator(simpleRolloverTx)

          const [, error] = await tryCatch(
            aptos.signAndSubmitAsFeePayer({
              senderAuthenticator,
              feePayer: feePayerAccount,
              transaction: simpleRolloverTx,
            }),
          )
          if (error) {
            return error
          }
        }
      }
    },
    [
      buildDepositCoinToTx,
      buildDepositToTx,
      buildRolloverAccountTx,
      feePayerAccount,
      perTokenStatuses,
      selectedAccount,
    ],
  )

  return (
    <confidentialCoinContext.Provider
      value={{
        feePayerAccount,
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
        buildTransferTx,
        transfer,
        buildWithdrawToTx,
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
