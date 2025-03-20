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
}

type StoreState = {
  privateKeyHexList: string[]
  selectedAccountAddr: string

  tokensListToDecryptionKeyHexMap: Record<string, TokenBaseInfo[]>
  _selectedTokenAddress: string

  decryptionKeyPerTokenTxHistory: Record<
    string, // decryptionKeyHex - owner
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

        tokensListToDecryptionKeyHexMap: {},
        _selectedTokenAddress: '',

        decryptionKeyPerTokenTxHistory: {},

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
        addToken: (decryptionKeyHex: string, token: TokenBaseInfo): void => {
          set(state => ({
            tokensListToDecryptionKeyHexMap: {
              ...state.tokensListToDecryptionKeyHexMap,
              [decryptionKeyHex]: [
                ...(state.tokensListToDecryptionKeyHexMap[decryptionKeyHex] ||
                  []),
                token,
              ],
            },
          }))
        },
        removeToken: (decryptionKeyHex: string, tokenAddress: string): void => {
          set(state => ({
            tokensListToDecryptionKeyHexMap: {
              ...state.tokensListToDecryptionKeyHexMap,
              [decryptionKeyHex]: (
                state.tokensListToDecryptionKeyHexMap[decryptionKeyHex] || []
              ).filter(token => token.address !== tokenAddress),
            },
          }))
        },
        addTxHistoryItem: (
          decryptionKeyHex: string,
          tokenAddress: string,
          details: TxHistoryItem,
        ): void => {
          set(state => ({
            decryptionKeyPerTokenTxHistory: {
              ...state.decryptionKeyPerTokenTxHistory,
              [decryptionKeyHex]: {
                ...state.decryptionKeyPerTokenTxHistory[decryptionKeyHex],
                [tokenAddress]: [
                  ...(state.decryptionKeyPerTokenTxHistory[decryptionKeyHex]?.[
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

            tokensListToDecryptionKeyHexMap: {},
            _selectedTokenAddress: '',

            decryptionKeyPerTokenTxHistory: {},
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
        tokensListToDecryptionKeyHexMap: state.tokensListToDecryptionKeyHexMap,
        selectedTokenAddress: state._selectedTokenAddress,
        decryptionKeyPerTokenTxHistory: state.decryptionKeyPerTokenTxHistory,
      }),
    },
  ),
)

const useSelectedTokenAddress = () => {
  return useWalletStore(
    state => state._selectedTokenAddress || config.DEFAULT_TOKEN.address,
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
    return (
      walletAccounts.find(
        el =>
          el.accountAddress.toString().toLowerCase() ===
          selectedAccountAddr.toLowerCase(),
      ) || walletAccounts[0]
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
