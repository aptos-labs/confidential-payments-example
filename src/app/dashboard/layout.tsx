'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { useRouter } from 'next/navigation';
import { PropsWithChildren } from 'react';
import { useAsync, useTimeoutFn } from 'react-use';

import { queryClient } from '@/api/client';
import Loading from '@/app/dashboard/loading';
import { ErrorHandler } from '@/helpers';
import { authStore } from '@/store/auth';
import { walletStore } from '@/store/wallet';

import { ConfidentialCoinContextProvider } from './context';

export default function DashboardLayout({ children }: PropsWithChildren) {
  const walletAccounts = walletStore.useWalletAccounts();

  const keylessAccounts = authStore.useAuthStore(state => state.accounts);
  const activeKeylessAccount = authStore.useAuthStore(state => state.activeAccount);
  const switchKeylessAccount = authStore.useAuthStore(
    state => state.switchKeylessAccount,
  );

  const state = useAsync(async () => {
    try {
      if (!activeKeylessAccount && keylessAccounts.length) {
        // console.log('[layout] Switching to keyless account...');
        await switchKeylessAccount(keylessAccounts[0].idToken.raw);
        // console.log('[layout] Keyless account switched');
      }
    } catch (error) {
      console.error('[layout] Failed to initialize:', error);
      ErrorHandler.processWithoutFeedback(error);
      throw error;
    }
  }, []);

  if (state.loading) return <Loading />;

  if (state.error) {
    return <div>Error initializing: {state.error.message}</div>;
  }

  if (
    (!walletAccounts.length && !activeKeylessAccount) ||
    (!keylessAccounts.length && !walletAccounts.length)
  ) {
    return <LogoutFallback />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfidentialCoinContextProvider>
        <ErrorBoundary errorComponent={() => <Loading />}>{children}</ErrorBoundary>
      </ConfidentialCoinContextProvider>
    </QueryClientProvider>
  );
}

function LogoutFallback() {
  const router = useRouter();
  const logout = authStore.useLogout({
    onSuccess: () => router.push('/'),
  });

  useTimeoutFn(async () => {
    await logout();
  }, 10);

  return null;
}
