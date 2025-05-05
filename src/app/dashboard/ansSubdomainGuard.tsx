'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import DashboardClient from '@/app/dashboard/client';
import { useGetAnsSubdomains } from '@/hooks/ans';
import { authStore } from '@/store/auth';
import { UiSpinner } from '@/ui';

export default function AnsSubdomainGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noRedirect = searchParams.get('noRedirect') === 'true';
  const activeKeylessAccount = authStore.useAuthStore(state => state.activeAccount);
  const activeKeylessAccountAddress = activeKeylessAccount?.accountAddress;

  const { data: ansNameData, isLoading: isCheckingUsername } = useGetAnsSubdomains({
    accountAddress: activeKeylessAccountAddress ?? '',
    enabled: !!activeKeylessAccountAddress,
  });

  const hasUsername = !!ansNameData?.subdomain;

  // Handle redirection using useEffect instead of during render
  useEffect(() => {
    if (!isCheckingUsername && !hasUsername && !noRedirect) {
      router.push('/dashboard/username');
    }
  }, [hasUsername, isCheckingUsername, router, noRedirect]);

  if (isCheckingUsername) {
    return (
      <div className='flex h-full flex-col items-center justify-center'>
        <UiSpinner />
        <p className='mt-4 text-textSecondary'>Checking your account details...</p>
      </div>
    );
  }

  // If the user doesn't have a username and we're not skipping redirect, show loading until the redirect happens
  if (!hasUsername && !noRedirect) {
    return (
      <div className='flex h-full flex-col items-center justify-center'>
        <UiSpinner />
        <p className='mt-4 text-textSecondary'>
          Redirecting you to set up your username...
        </p>
      </div>
    );
  }

  // User has a username or noRedirect is true, render the dashboard client
  return <DashboardClient />;
}
