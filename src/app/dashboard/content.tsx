'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { parseUnits } from 'ethers';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTimeoutFn } from 'react-use';

import { queryClient } from '@/api/client';
import { getAptBalance, mintAptCoin } from '@/api/modules/aptos';
import { preloadTables } from '@/api/modules/aptos/wasmPollardKangaroo';
import DashboardClient from '@/app/dashboard/client';
import { ConfidentialCoinContextProvider } from '@/app/dashboard/context';
import Loading from '@/app/dashboard/loading';
import { ErrorHandler } from '@/helpers';
import { authStore } from '@/store/auth';
import { walletStore } from '@/store/wallet';

export default function DashboardPageContent() {
  'use client';

  const walletAccounts = walletStore.useWalletAccounts();

  const [isInitialized, setIsInitialized] = useState(false);

  const feePayerAccount = authStore.useFeePayerAccount();

  const keylessAccounts = authStore.useAuthStore(state => state.accounts);
  const activeKeylessAccount = authStore.useAuthStore(state => state.activeAccount);
  const switchKeylessAccount = authStore.useAuthStore(
    state => state.switchKeylessAccount,
  );

  useTimeoutFn(async () => {
    setIsInitialized(false);
    try {
      // await preloadTablesForBalances()
      await preloadTables();

      if (!activeKeylessAccount && keylessAccounts.length) {
        await switchKeylessAccount(keylessAccounts[0].idToken.raw);
      }

      const feePayerBalance = await getAptBalance(feePayerAccount);

      if (feePayerBalance < 0.2 * 10 ** 8) {
        await mintAptCoin(feePayerAccount, parseUnits('0.8', 8));
      }
    } catch (error) {
      ErrorHandler.processWithoutFeedback(error);
    }
    setIsInitialized(true);
  }, 10);

  if (!isInitialized) return <Loading />;

  if (
    (!walletAccounts.length && !activeKeylessAccount) ||
    (!keylessAccounts.length && !walletAccounts.length)
  ) {
    return <LogoutFallback />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfidentialCoinContextProvider>
        <ErrorBoundary errorComponent={() => <Loading />}>
          <DashboardClient />
        </ErrorBoundary>
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
