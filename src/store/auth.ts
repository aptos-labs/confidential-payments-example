'use client'

import { config } from '@config'
import {
  EphemeralKeyPair,
  KeylessAccount,
  ProofFetchStatus,
} from '@lukachi/aptos-labs-ts-sdk'
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  aptos,
  createEphemeralKeyPair,
  decryptionKeyFromPepper,
  deriveEd25519PrivateKey,
  EncryptedScopedIdToken,
  EphemeralKeyPairEncoding,
  getAptBalance,
  getIsAccountRegisteredWithToken,
  isValidEphemeralKeyPair,
  KeylessAccountEncoding,
  mintAptCoin,
  registerConfidentialBalance,
  validateEphemeralKeyPair,
  validateIdToken,
  validateKeylessAccount,
} from '@/api/modules/aptos'
import { sleep, tryCatch } from '@/helpers'
import { authClient } from '@/lib/auth-client'
import { walletStore } from '@/store/wallet'

type StoredAccount = {
  idToken: { decoded: EncryptedScopedIdToken; raw: string }
  pepper: Uint8Array
}

type KeylessAccountsState = {
  accounts: StoredAccount[]
  activeAccount?: KeylessAccount
  ephemeralKeyPair?: EphemeralKeyPair

  _hasHydrated: boolean
}

type KeylessAccountsActions = {
  /**
   * Add an Ephemeral key pair to the store. If the account is invalid, an error is thrown.
   *
   * @param account - The Ephemeral key pair to add to the store.
   */
  commitEphemeralKeyPair: (account: EphemeralKeyPair) => void
  /**
   * Disconnects the active account from the store.
   */
  disconnectKeylessAccount: () => void
  /**
   * Retrieve the Ephemeral key pair from the store.
   *
   * @returns The Ephemeral key pair if found, otherwise undefined.
   */
  getEphemeralKeyPair: () => EphemeralKeyPair | undefined
  /**
   * Switches the active account to the one associated with the provided idToken. If no account is found,
   * undefined is returned. The following conditions must be met for the switch to be successful:
   *
   * 1. The idToken must be valid and contain a nonce.
   * 2. An Ephemeral key pair with the same nonce must exist in the store.
   * 3. The idToken and Ephemeral key pair must both be valid.
   *
   * @param idToken - The idToken of the account to switch to.
   * @returns The active account if the switch was successful, otherwise undefined.
   */
  switchKeylessAccount: (idToken: string) => Promise<KeylessAccount | undefined>

  deriveKeylessAccount: (idToken: string) => Promise<{
    derivedAccount: KeylessAccount
    decodedToken: EncryptedScopedIdToken
    storedAccount?: StoredAccount
  }>

  setHasHydrated: (value: boolean) => void
  clear: () => void
}

const storage = createJSONStorage<KeylessAccountsState>(() => localStorage, {
  replacer: (_, e) => {
    if (typeof e === 'bigint') return { __type: 'bigint', value: e.toString() }
    if (e instanceof Uint8Array)
      return { __type: 'Uint8Array', value: Array.from(e) }
    if (e instanceof EphemeralKeyPair) return EphemeralKeyPairEncoding.encode(e)
    if (e instanceof KeylessAccount) return KeylessAccountEncoding.encode(e)
    return e
  },
  /* eslint-disable-next-line */
  reviver: (_, e: any) => {
    if (e && e.__type === 'bigint') return BigInt(e.value)
    if (e && e.__type === 'Uint8Array') return new Uint8Array(e.value)
    if (e && e.__type === 'EphemeralKeyPair')
      return EphemeralKeyPairEncoding.decode(e)
    if (e && e.__type === 'KeylessAccount') {
      return KeylessAccountEncoding.decode(e)
    }
    return e
  },
})

const useAuthStore = create<KeylessAccountsState & KeylessAccountsActions>()(
  persist(
    (set, get, store) => ({
      ...({
        accounts: [],
        activeAccount: undefined,
        ephemeralKeyPair: undefined,

        _hasHydrated: false,
      } satisfies KeylessAccountsState),

      ...({
        commitEphemeralKeyPair: keyPair => {
          const valid = isValidEphemeralKeyPair(keyPair)
          if (!valid)
            throw new Error(
              'addEphemeralKeyPair: Invalid ephemeral key pair provided',
            )
          set({ ephemeralKeyPair: keyPair })
        },
        disconnectKeylessAccount: () => {
          set({ activeAccount: undefined })
        },
        getEphemeralKeyPair: () => {
          const account = get().ephemeralKeyPair
          return account ? validateEphemeralKeyPair(account) : undefined
        },
        switchKeylessAccount: async (idToken: string) => {
          set({ ...get(), activeAccount: undefined }, true)

          const {
            derivedAccount: activeAccount,
            storedAccount,
            decodedToken,
          } = await get().deriveKeylessAccount(idToken)

          const { pepper } = activeAccount

          if (storedAccount) {
            set({
              accounts: get().accounts.map(a =>
                a.idToken.decoded.sub === decodedToken.sub
                  ? { idToken: { decoded: decodedToken, raw: idToken }, pepper }
                  : a,
              ),
              activeAccount,
            })
          } else {
            set({
              accounts: [
                ...get().accounts,
                { idToken: { decoded: decodedToken, raw: idToken }, pepper },
              ],
              activeAccount,
            })
          }

          await activeAccount.checkKeylessAccountValidity(aptos.config)

          return activeAccount
        },

        deriveKeylessAccount: async (idToken: string) => {
          const decodedToken = validateIdToken(idToken)
          if (!decodedToken) {
            throw new Error(
              'switchKeylessAccount: Invalid idToken provided, could not decode',
            )
          }

          const ephemeralKeyPair = get().getEphemeralKeyPair()
          if (
            !ephemeralKeyPair ||
            ephemeralKeyPair?.nonce !== decodedToken.nonce
          ) {
            throw new Error(
              'switchKeylessAccount: Ephemeral key pair not found',
            )
          }

          const proofFetchCallback = async (res: ProofFetchStatus) => {
            if (String(res.status).toLowerCase() === 'failed') {
              get().disconnectKeylessAccount()
            } else {
              store.persist.rehydrate()
            }
          }

          const storedAccount = get().accounts.find(
            a => a.idToken.decoded.sub === decodedToken.sub,
          )
          let derivedAccount: KeylessAccount | undefined
          try {
            derivedAccount = await aptos.deriveKeylessAccount({
              ephemeralKeyPair,
              jwt: idToken,
              proofFetchCallback,
            })
          } catch (error) {
            // If we cannot derive an account using the pepper service, attempt to derive it using the stored pepper
            if (!storedAccount?.pepper) throw error
            derivedAccount = await aptos.deriveKeylessAccount({
              ephemeralKeyPair,
              jwt: idToken,
              pepper: storedAccount.pepper,
              proofFetchCallback,
            })
          }

          if (!derivedAccount || !decodedToken)
            throw new TypeError(
              'Could not derive account from idToken or stored account',
            )

          return { derivedAccount, decodedToken, storedAccount }
        },

        setHasHydrated: (value: boolean): void => {
          set({
            _hasHydrated: value,
          })
        },
        clear: () => {
          set({
            accounts: [],
            activeAccount: undefined,
            ephemeralKeyPair: undefined,
          })
        },
      } satisfies KeylessAccountsActions),
    }),

    {
      storage: storage,
      name: 'auth-store',
      version: 1,

      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) }
        return {
          ...merged,
          activeAccount:
            merged.activeAccount &&
            validateKeylessAccount(merged.activeAccount),
          ephemeralKeyPair:
            merged.ephemeralKeyPair &&
            validateEphemeralKeyPair(merged.ephemeralKeyPair),
        }
      },

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true)
      },

      partialize: ({ activeAccount, ephemeralKeyPair, ...state }) => ({
        ...state,
        activeAccount: activeAccount && validateKeylessAccount(activeAccount),
        ephemeralKeyPair:
          ephemeralKeyPair && validateEphemeralKeyPair(ephemeralKeyPair),
      }),
    },
  ),
)

const useEphemeralKeyPair = () => {
  const { commitEphemeralKeyPair, getEphemeralKeyPair } = useAuthStore()

  return useMemo(() => {
    let keyPair = getEphemeralKeyPair()

    // If no key pair is found, create a new one and commit it to the store
    if (!keyPair) {
      keyPair = createEphemeralKeyPair()
      commitEphemeralKeyPair(keyPair)
    }

    return keyPair
  }, [commitEphemeralKeyPair, getEphemeralKeyPair])
}

const useEnsureConfidentialRegistered = () => {
  return async (keylessAccount: KeylessAccount) => {
    if (!keylessAccount?.pepper) throw new Error('No pepper found')

    const keylessAccountDK = decryptionKeyFromPepper(keylessAccount.pepper)

    let attempts = 0

    do {
      const isConfidentialAccountRegistered =
        await getIsAccountRegisteredWithToken(keylessAccount)

      if (isConfidentialAccountRegistered) break

      const aptBalance = await getAptBalance(keylessAccount)

      if (!aptBalance) {
        await mintAptCoin(keylessAccount, BigInt(0.3 * 10 ** 8))
      }

      await sleep(500)

      await tryCatch(
        registerConfidentialBalance(
          keylessAccount,
          keylessAccountDK.publicKey().toString(),
        ),
      )

      attempts++
      await sleep(500)
    } while (attempts < 3)
  }
}

const useLogin = (opts?: {
  onRequest?: () => void
  onSuccess?: () => void
  onError?: () => void
}) => {
  const ensureConfidentialRegistered = useEnsureConfidentialRegistered()
  const ephemeralKeyPair = useEphemeralKeyPair()
  const switchKeylessAccount = useAuthStore(state => state.switchKeylessAccount)

  const loginWithEmailPassword = async (args: {
    email: string
    password: string
  }) => {
    return new Promise((resolve, reject) => {
      authClient.signIn.email(
        {
          email: args.email,
          password: args.password,
        },
        {
          onRequest: () => {
            opts?.onRequest?.()
          },
          onSuccess: ctx => {
            const pk = deriveEd25519PrivateKey(
              args.email,
              args.password,
              ctx.data.user.id,
            )
            walletStore.useWalletStore.getState().addAndSetPrivateKey(pk)

            opts?.onSuccess?.()
            resolve(ctx.data)
          },
          onError: ctx => {
            opts?.onError?.()
            reject(ctx.error)
          },
        },
      )
    })
  }

  const getGoogleRequestLoginUrl = useMemo(() => {
    const redirectUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')

    const searchParams = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID,
      /**
       * The redirect_uri must be registered in the Google Developer Console. This callback page
       * parses the id_token from the URL fragment and combines it with the ephemeral key pair to
       * derive the keyless account.
       *
       * window.location.origin == http://localhost:5173
       */
      redirect_uri: `${window.location.origin}`,
      /**
       * This uses the OpenID Connect implicit flow to return an id_token.
       */
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: ephemeralKeyPair.nonce,
    })
    redirectUrl.search = searchParams.toString()

    return redirectUrl.toString()
  }, [ephemeralKeyPair.nonce])

  const loginWithGoogle = async (idToken: string) => {
    const keylessAccount = await switchKeylessAccount(idToken)

    if (!keylessAccount) throw new Error('Keyless account not derived')

    await ensureConfidentialRegistered(keylessAccount)

    opts?.onSuccess?.()
  }

  const getAppleRequestLoginUrl = useMemo(() => {
    const redirectUrl = new URL('https://appleid.apple.com/auth/authorize')
    // const state = Math.random().toString(36).substring(2, 15)

    const searchParams = new URLSearchParams({
      client_id: config.APPLE_CLIENT_ID,
      /**
       * The redirect_uri must be registered in the Google Developer Console. This callback page
       * parses the id_token from the URL fragment and combines it with the ephemeral key pair to
       * derive the keyless account.
       *
       * window.location.origin == http://localhost:5173
       */
      redirect_uri: `${window.location.origin}`,
      /**
       * This uses the OpenID Connect implicit flow to return an id_token.
       */
      response_type: 'code',
      scope: 'openid email profile',
      nonce: ephemeralKeyPair.nonce,
    })
    redirectUrl.search = searchParams.toString()

    return redirectUrl.toString()
  }, [ephemeralKeyPair.nonce])

  const loginWithApple = async (idToken: string) => {
    await switchKeylessAccount(idToken)

    return new Promise((resolve, reject) => {
      try {
        authClient.signIn.social(
          {
            provider: 'apple',
            idToken: {
              token: idToken,
              nonce: ephemeralKeyPair.nonce,
            },
          },
          {
            onSuccess: ctx => {
              opts?.onSuccess?.()
              resolve(ctx.data)
            },
            onError: ctxError => {
              opts?.onError?.()
              reject(ctxError)
            },
            onRequest: () => {
              opts?.onRequest?.()
            },
          },
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  return {
    loginWithEmailPassword,
    getGoogleRequestLoginUrl,
    loginWithGoogle: loginWithGoogle,
    getAppleRequestLoginUrl,
    loginWithApple,
  }
}

const useRegister = (opts?: {
  onRequest?: () => void
  onSuccess?: () => void
  onError?: () => void
}) => {
  return async (args: { email: string; password: string; name: string }) => {
    return new Promise<void>((resolve, reject) => {
      authClient.signUp.email(
        {
          email: args.email,
          password: args.password,
          name: args.name,
        },
        {
          onRequest: () => {
            opts?.onRequest?.()
          },
          onSuccess: ctx => {
            const pk = deriveEd25519PrivateKey(
              args.email,
              args.password,
              ctx.data.user.id,
            )
            walletStore.useWalletStore.getState().addAndSetPrivateKey(pk)

            opts?.onSuccess?.()
            resolve()
          },
          onError: () => {
            opts?.onError?.()
            reject()
          },
        },
      )
    })
  }
}

const useLogout = (opts?: {
  onRequest?: () => void
  onSuccess?: () => void
  onError?: () => void
}) => {
  const clearAuthStore = useAuthStore(state => state.clear)

  const clearWalletStore = walletStore.useWalletStore(
    state => state.clearStoredKeys,
  )

  return async () => {
    clearAuthStore()
    clearWalletStore()
    opts?.onSuccess?.()
  }
}

export const authStore = {
  useAuthStore: useAuthStore,

  useLogin: useLogin,
  useRegister: useRegister,
  useLogout: useLogout,
}
