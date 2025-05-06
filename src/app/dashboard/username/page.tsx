'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, tryCatch } from '@/helpers';
import {
  useCheckIsSubdomainAvailable,
  useClaimAnsSubdomain,
  useGetAnsSubdomains,
} from '@/hooks/ans';
import { authStore } from '@/store/auth';
import { useGasStationArgs } from '@/store/gas-station';
import { UiSpinner } from '@/ui';
import { UiButton } from '@/ui/UiButton';
import { UiInput } from '@/ui/UiInput';
import { UiSeparator } from '@/ui/UiSeparator';

export default function UsernamePage() {
  const gasStationArgs = useGasStationArgs();
  const { selectedAccount } = useConfidentialCoinContext();
  const router = useRouter();

  // Form state
  const [username, setUsername] = useState('');
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [error, setError] = useState('');

  // Account state
  const activeKeylessAccount = authStore.useAuthStore(state => state.activeAccount);
  const activeKeylessAccountAddress = activeKeylessAccount?.accountAddress;
  const activeKeylessAccountPublicKey = activeKeylessAccount?.publicKey;

  const {
    mutateAsync: claimName,
    isPending: isClaiming,
    isSuccess: isClaimSuccess,
    error: claimError,
  } = useClaimAnsSubdomain();

  const { data: ansNameData, isLoading } = useGetAnsSubdomains({
    accountAddress: activeKeylessAccountAddress ?? '',
    enabled: !!activeKeylessAccountAddress,
  });

  // Debounce the username updates.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  // Check username availability using the debounced value
  const { data: isAvailable, isLoading: isChecking } = useCheckIsSubdomainAvailable({
    subdomain: debouncedUsername,
    enabled: debouncedUsername.length >= 3,
  });

  // Validate username when typing
  useEffect(() => {
    if (username.length === 0) {
      setError('');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (username.length > 12) {
      setError('Username must be at most 12 characters');
      return;
    }

    if (!/^[a-z][a-z0-9-]+[a-z0-9]*$/.test(username)) {
      setError(
        'Username can only contain lowercase letters, numbers, and hyphens. It must start with a letter. It cannot end with a hyphen.',
      );
      return;
    }

    if (debouncedUsername !== username) {
      // We're waiting for the debounce
      return;
    }

    if (isChecking) {
      setError('Checking availability...');
      return;
    }

    if (isAvailable === false) {
      setError('Username is already taken');
      return;
    }

    setError('');
  }, [username, debouncedUsername, isChecking, isAvailable]);

  const ansSubdomain = ansNameData?.subdomain ?? null;

  if (
    ansNameData?.additionalSubdomains.length &&
    ansNameData.additionalSubdomains.length >= 1
  ) {
    console.error(
      `Multiple ANS subdomains found for account ${activeKeylessAccountAddress}: {ansNameData}`,
    );
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    if (!username || username.length < 3 || error) {
      return;
    }

    // Make sure we have all required fields
    if (!selectedAccount || !activeKeylessAccountPublicKey) {
      ErrorHandler.process(new Error('Missing account information'));
      return;
    }

    const [_, submitError] = await tryCatch(
      claimName({
        account: selectedAccount,
        keylessPublicKey: activeKeylessAccountPublicKey,
        subdomain: username,
        gasStationArgs,
      }),
    );

    if (submitError) {
      ErrorHandler.process(submitError);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!activeKeylessAccount || !activeKeylessAccountPublicKey) {
    return (
      <div className='flex h-full items-center justify-center'>
        No active account found, this is a bug, you should have signed in by now.
      </div>
    );
  }

  if (ansSubdomain) {
    return (
      <Container>
        <h1 className='mb-4 text-2xl font-bold'>Your Username</h1>
        <p className='bg-componentSecondary rounded-md p-4 text-center text-xl'>
          {ansSubdomain}
        </p>
        <UiSeparator className='my-6' />
        <UiButton
          className='w-full'
          onClick={() => router.push('/dashboard?noRedirect=true')}
        >
          Go to Dashboard
        </UiButton>
      </Container>
    );
  }

  // If user has just successfully claimed a name
  if (isClaimSuccess) {
    return (
      <Container>
        <div className='mb-2 flex flex-col items-center'>
          <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-8 w-8 text-green-500'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
          <h1 className='text-center text-2xl font-bold'>Username Claimed!</h1>
        </div>

        <div className='bg-componentSecondary mb-6 rounded-lg p-6'>
          <p className='mb-2 text-center text-textSecondary'>Your new username:</p>
          <p className='p-2 pb-0 text-center text-xl font-bold'>{username}</p>
        </div>

        <p className='mb-6 text-center text-sm text-textSecondary'>
          Your username has been successfully registered and associated with your
          account.
        </p>

        <UiSeparator className='mb-6' />

        <UiButton
          className='w-full'
          onClick={() => router.push('/dashboard?noRedirect=true')}
        >
          Continue to dashboard
        </UiButton>
      </Container>
    );
  }

  // Otherwise, show the form to claim a name
  return (
    <Container>
      <h1 className='mb-4 text-2xl'>Claim Your Username</h1>
      <p className='mb-6 text-textSecondary'>
        Choose a unique username for your account.
      </p>

      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label
            htmlFor='username'
            className='mb-2 block text-sm font-medium text-textPrimary'
          >
            Username
          </label>
          <UiInput
            id='username'
            type='text'
            className='border-inputBorder w-full rounded-md border bg-componentPrimary p-2 text-textPrimary focus:border-primary focus:outline-none'
            placeholder='Enter desired username'
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={isClaiming}
            autoComplete='off'
            autoFocus
          />
          {error && username === debouncedUsername && (
            <p
              className={`mt-2 text-sm ${error === 'Checking availability...' ? 'text-yellow-500' : 'text-red-500'}`}
            >
              {error}
            </p>
          )}
        </div>

        <div className='bg-componentSecondary mb-4 rounded-md p-2'>
          <h4 className='text-textPrimary'>Username Requirements</h4>
          <ul className='mt-2 list-disc pl-5 text-sm text-textSecondary'>
            <li>3-15 characters long</li>
            <li>Only letters, numbers, underscores, and hyphens</li>
            <li>Cannot be changed once set</li>
          </ul>
        </div>

        <UiButton
          type='submit'
          className='w-full'
          disabled={!username || !!error || isClaiming || isChecking}
        >
          {isClaiming ? 'Claiming...' : 'Claim Username'}
        </UiButton>
        {claimError && (
          <p className='mt-2 text-sm text-red-500'>
            Failed to claim username: {claimError.message}
          </p>
        )}
      </form>
    </Container>
  );
}

const Container = ({ children }: { children: React.ReactNode }) => (
  <div className='flex h-full items-center justify-center'>
    <div className='mx-auto max-w-md rounded-lg bg-componentPrimary p-6 shadow-md'>
      {children}
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className='flex h-full items-center justify-center'>
    <UiSpinner />
  </div>
);
