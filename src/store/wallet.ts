import { config } from '@config'
import type { TimeDate } from '@distributedlab/tools'
import { useMemo } from 'react'
import { create } from 'zustand'
import { combine, persist } from 'zustand/middleware'

import {
  accountFromPrivateKey,
  decryptionKeyFromPepper,
  decryptionKeyFromPrivateKey,
  generatePrivateKeyHex,
} from '@/api/modules/aptos'

export type TokenBaseInfo = {
  address: string
  name: string
  symbol: string
  decimals: number
  iconUri: string
}

export type TxHistoryItem = {
  txHash: string
  createdAt: TimeDate
  txType:
    | 'transfer'
    | 'transfer-native'
    | 'deposit'
    | 'withdraw'
    | 'rollover'
    | 'key-rotation'
    | 'freeze'
    | 'unfreeze'
    | 'register'
    | 'normalize'
    | 'mint'
  message?: string
}

type StoreState = {
  privateKeyHexList: string[]
  selectedAccountAddr: string

  accountAddrHexToTokenAddrMap: Record<string, string[]>
  _selectedTokenAddress: string

  accountAddrHexPerTokenTxHistory: Record<
    string,
    Record<
      string, // token
      TxHistoryItem[] // tx history
    >
  >

  _hasHydrated: boolean
}

const useWalletStore = create(
  persist(
    combine(
      {
        privateKeyHexList: [],
        selectedAccountAddr: '',

        accountAddrHexToTokenAddrMap: {},
        _selectedTokenAddress: '',

        accountAddrHexPerTokenTxHistory: {},

        _hasHydrated: false,
      } as StoreState,
      set => ({
        setHasHydrated: (value: boolean) => {
          set({
            _hasHydrated: value,
          })
        },

        addAndSetPrivateKey: (privateKeyHex: string): void => {
          const account = accountFromPrivateKey(privateKeyHex)

          set(state => ({
            privateKeyHexList: [...state.privateKeyHexList, privateKeyHex],
            selectedAccountAddr: account.accountAddress.toString(),
          }))
        },
        setSelectedAccountAddr: (accountAddr: string): void => {
          set({
            selectedAccountAddr: accountAddr,
          })
        },
        removeWalletAccount: (accountAddr: string): void => {
          set(state => ({
            privateKeyHexList: state.privateKeyHexList.filter(hex => {
              const account = accountFromPrivateKey(hex)

              return (
                account.accountAddress.toString().toLowerCase() !==
                accountAddr.toLowerCase()
              )
            }),
          }))
        },

        setSelectedTokenAddress: (tokenAddress: string): void => {
          set({
            _selectedTokenAddress: tokenAddress,
          })
        },
        addToken: (accAddr: string, token: TokenBaseInfo): void => {
          set(state => ({
            accountAddrHexToTokenAddrMap: {
              ...state.accountAddrHexToTokenAddrMap,
              [accAddr]: [
                ...(state.accountAddrHexToTokenAddrMap[accAddr] || []),
                token.address,
              ],
            },
          }))
        },
        removeToken: (accAddr: string, tokenAddress: string): void => {
          set(state => ({
            accountAddrHexToTokenAddrMap: {
              ...state.accountAddrHexToTokenAddrMap,
              [accAddr]: (
                state.accountAddrHexToTokenAddrMap[accAddr] || []
              ).filter(addr => addr !== tokenAddress),
            },
          }))
        },
        addTxHistoryItem: (
          accAddr: string,
          tokenAddress: string,
          details: TxHistoryItem,
        ): void => {
          set(state => ({
            accountAddrHexPerTokenTxHistory: {
              ...state.accountAddrHexPerTokenTxHistory,
              [accAddr]: {
                ...state.accountAddrHexPerTokenTxHistory[accAddr],
                [tokenAddress]: [
                  ...(state.accountAddrHexPerTokenTxHistory[accAddr]?.[
                    tokenAddress
                  ] || []),
                  details,
                ],
              },
            },
          }))
        },

        clearStoredKeys: (): void => {
          set({
            privateKeyHexList: [],
            selectedAccountAddr: '',

            accountAddrHexToTokenAddrMap: {},
            _selectedTokenAddress: '',

            // accountAddrHexPerTokenTxHistory: {},
          })
        },
      }),
    ),
    {
      name: 'wallet',
      version: 1,

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true)
      },

      partialize: state => ({
        privateKeyHexList: state.privateKeyHexList,
        selectedAccountAddr: state.selectedAccountAddr,
        accountAddrHexToTokenAddrMap: state.accountAddrHexToTokenAddrMap,
        _selectedTokenAddress: state._selectedTokenAddress,
        accountAddrHexPerTokenTxHistory: state.accountAddrHexPerTokenTxHistory,
      }),
    },
  ),
)

const useSelectedTokenAddress = () => {
  return useWalletStore(
    state => state._selectedTokenAddress || config.DEFAULT_TOKEN_ADRESSES[0],
  )
}

const useWalletAccounts = () => {
  const privateKeyHexList = useWalletStore(state => state.privateKeyHexList)

  return useMemo(
    () => privateKeyHexList.map(el => accountFromPrivateKey(el)),
    [privateKeyHexList],
  )
}

const useSelectedWalletAccount = () => {
  const walletAccounts = useWalletAccounts()
  const selectedAccountAddr = useWalletStore(state => state.selectedAccountAddr)

  return useMemo(() => {
    return walletAccounts.find(
      el =>
        el.accountAddress.toString().toLowerCase() ===
        selectedAccountAddr.toLowerCase(),
    )
  }, [selectedAccountAddr, walletAccounts])
}

export const walletStore = {
  useWalletStore,

  useWalletAccounts: useWalletAccounts,
  generatePrivateKeyHex: generatePrivateKeyHex,
  useSelectedWalletAccount: useSelectedWalletAccount,
  useSelectedTokenAddress: useSelectedTokenAddress,
  decryptionKeyFromPrivateKey: decryptionKeyFromPrivateKey,
  decryptionKeyFromPepper: decryptionKeyFromPepper,
}
