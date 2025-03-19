import { create } from 'zustand'
import { combine, persist } from 'zustand/middleware'

import { authClient } from '@/lib/auth-client'
import { walletStore } from '@/store/wallet'

const useAuthStore = create(
  persist(
    combine(
      {
        accessToken: '',
        refreshToken: '',

        _hasHydrated: false,
      },
      set => ({
        setHasHydrated: (value: boolean): void => {
          set({
            _hasHydrated: value,
          })
        },

        setTokens: async (
          accessToken: string,
          refreshToken: string,
        ): Promise<void> => {
          set({ accessToken: accessToken, refreshToken: refreshToken })
        },
        clear: () => {
          set({ accessToken: '', refreshToken: '' })
        },
      }),
    ),
    {
      name: 'auth-store',
      version: 1,

      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true)
      },

      partialize: state => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)

const useTestGenAndSetPK = () => {
  const addAndSetPrivateKey = walletStore.useWalletStore(
    state => state.addAndSetPrivateKey,
  )

  return () => {
    const privateKey = walletStore.generatePrivateKeyHex()

    addAndSetPrivateKey(privateKey)
  }
}

const useLogin = (opts?: {
  onRequest?: () => void
  onSuccess?: () => void
  onError?: () => void
}) => {
  const testGenAndSetPK = useTestGenAndSetPK()

  return async (args: { email: string; password: string }) => {
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
            opts?.onSuccess?.()
            testGenAndSetPK()
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
}

const useRegister = (opts?: {
  onRequest?: () => void
  onSuccess?: () => void
  onError?: () => void
}) => {
  const testGenAndSetPK = useTestGenAndSetPK()

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
          onSuccess: () => {
            opts?.onSuccess?.()
            testGenAndSetPK()
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
  const clear = useAuthStore(state => state.clear)

  const clearStoredKeys = walletStore.useWalletStore(
    state => state.clearStoredKeys,
  )

  return async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          opts?.onSuccess?.()
        },
        onError: () => {
          opts?.onError?.()
        },
        onRequest: () => {
          opts?.onRequest?.()
        },
      },
    })
    clear()
    await Promise.all([clearStoredKeys()])
  }
}

export const authStore = {
  useAuthStore: useAuthStore,

  useLogin: useLogin,
  useRegister: useRegister,
  useLogout: useLogout,
}
