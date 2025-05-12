import { AccountAddress } from '@aptos-labs/ts-sdk';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSignIcon,
  FolderOpenIcon,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { HTMLAttributes, useCallback, useEffect, useRef } from 'react';

import { getTxExplorerUrl } from '@/api/modules/aptos';
import { noCodeClient } from '@/api/modules/aptos/client';
import { appConfig } from '@/config';
import { useGetAnsPrimaryName } from '@/hooks/ans';
import { cn } from '@/theme/utils';
import { UiIcon } from '@/ui';

import { useConfidentialCoinContext } from '../context';

type BaseActivity = {
  timestamp: Date;
  txnVersion: number;
  fromAddress: AccountAddress;
  toAddress: AccountAddress;
};

type DepositActivity = BaseActivity & {
  activityType: 'deposit';
  amount: number;
};

type WithdrawActivity = BaseActivity & {
  activityType: 'withdraw';
  amount: number;
};

type TransferActivity = BaseActivity & {
  activityType: 'transfer';
  amountCiphertext: string;
};

type Activity = DepositActivity | WithdrawActivity | TransferActivity;

const PAGE_SIZE = 10;

const fetchActivities = async (
  userAddress: string,
  pageParam = 0,
): Promise<{
  activities: Activity[];
  nextCursor: number | undefined;
}> => {
  // Fetch the raw activities from the no code indexing API.
  const rawActivities = await noCodeClient.GetActivities(
    {
      userAddress,
      offset: pageParam,
      limit: PAGE_SIZE,
    },
    {
      authorization: `Bearer ${appConfig.APTOS_BUILD_NOCODE_API_KEY}`,
    },
  );

  const nextCursor =
    rawActivities.activities_public.length === PAGE_SIZE ||
    rawActivities.transfers_confidential.length === PAGE_SIZE
      ? pageParam + PAGE_SIZE
      : undefined;

  const activities: Activity[] = [];

  // Map the raw public activities.
  for (const activity of rawActivities.activities_public) {
    let activityType: Activity['activityType'];
    if (activity.activity_type.toLowerCase().includes('deposit')) {
      activityType = 'deposit';
    } else if (activity.activity_type.includes('withdraw')) {
      activityType = 'withdraw';
    } else {
      console.warn('Unknown activity type: ', activity.activity_type);
      continue;
    }
    activities.push({
      activityType,
      timestamp: new Date(activity.txn_timestamp + 'Z'), // Ensure UTC timezone is used
      txnVersion: activity.txn_version,
      fromAddress: AccountAddress.from(activity.from_address),
      toAddress: AccountAddress.from(activity.to_address),
      amount: Number(activity.amount),
    });
  }

  // Convert the confidential activities.
  for (const activity of rawActivities.transfers_confidential) {
    activities.push({
      activityType: 'transfer',
      timestamp: new Date(activity.txn_timestamp + 'Z'), // Ensure UTC timezone is used
      txnVersion: activity.txn_version,
      fromAddress: AccountAddress.from(activity.from_address),
      toAddress: AccountAddress.from(activity.to_address),
      amountCiphertext: activity.amount_ciphertext,
    });
  }

  return {
    activities,
    nextCursor,
  };
};

export default function ActivitiesFeed() {
  // TODO: Instead of using selected token here we should use the token from the
  // activity, if we support multiple assets down the line.
  const { selectedAccount, selectedToken } = useConfidentialCoinContext();

  // Reference to the load more trigger element
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['activities', selectedAccount.accountAddress.toString()],
    queryFn: ({ pageParam = 0 }) =>
      fetchActivities(selectedAccount.accountAddress.toString(), pageParam),
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialPageParam: 0,
    refetchInterval: 5000,
    staleTime: 5000,
  });

  // Flatten the activities from all pages
  const allActivities = data?.pages.flatMap(page => page.activities) || [];

  // Implement intersection observer for infinite scrolling
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  return (
    <div
      className={cn(
        'mt-8 flex w-full flex-1 flex-col p-4',
        'md:mx-auto md:max-w-[500px]',
      )}
    >
      <div className='mb-3 flex items-center justify-between'>
        <h2 className='typography-h5 text-textPrimary'>Activity</h2>
        <button
          onClick={() => refetch()}
          className={cn(
            'hover:bg-componentHover flex items-center justify-center gap-2 rounded-md py-1.5',
            isRefetching && 'opacity-60',
          )}
          disabled={isRefetching}
          aria-label='Refresh activities'
        >
          <RefreshCw
            size={16}
            className={cn('text-textSecondary', isRefetching && 'animate-spin')}
          />
          {isRefetching ? (
            <span className='typography-body3 text-textSecondary'>Loading...</span>
          ) : (
            <span className='typography-body3 text-textSecondary'>Refresh</span>
          )}
        </button>
      </div>

      {isError && (
        <div className='mb-3 rounded-md bg-red-100 p-3 text-red-800'>
          <p>
            Failed to load activities.{' '}
            {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {isLoading && allActivities.length === 0 ? (
        <div className='my-6 flex justify-center'>
          <div className='animate-spin'>
            <RefreshCw size={32} className='text-textSecondary' />
          </div>
        </div>
      ) : allActivities.length ? (
        <div className='relative flex flex-col gap-6'>
          {allActivities
            .sort((a, b) => {
              return b.timestamp.getTime() - a.timestamp.getTime();
            })
            .map((activity, idx) => (
              <TxItem
                key={idx}
                {...activity}
                currentAddress={selectedAccount.accountAddress}
                tokenSymbol={selectedToken.symbol}
                tokenDecimals={selectedToken.decimals}
              />
            ))}

          {/* Load more trigger element */}
          <div ref={observerTarget} className='flex justify-center py-2'>
            {isFetchingNextPage ? (
              <div className='animate-spin'>
                <RefreshCw size={18} className='text-textSecondary' />
              </div>
            ) : hasNextPage ? (
              <span className='typography-body4 text-textSecondary'>
                Scroll to load more
              </span>
            ) : (
              <span className='typography-body4 text-textSecondary'>
                No more activities
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className='flex w-full flex-col items-center gap-4 self-center'>
          <TxEmptyComponent />
        </div>
      )}
    </div>
  );
}

function TxItem({
  activityType,
  timestamp,
  txnVersion,
  fromAddress,
  toAddress,
  currentAddress,
  tokenSymbol,
  tokenDecimals,
  ...rest
}: HTMLAttributes<HTMLDivElement> &
  Activity & {
    currentAddress: AccountAddress;
    tokenSymbol: string;
    tokenDecimals: number;
  }) {
  const isOutgoing = fromAddress.toString() === currentAddress.toString();

  // This case can only happen on testnet, courtesy of minting.
  const isSelfDeposit =
    activityType === 'deposit' && fromAddress.toString() === currentAddress.toString();

  let title = '';
  let icon;
  let amountDisplay = '';

  if (activityType === 'transfer') {
    title = isOutgoing ? 'Sent' : 'Received';
    icon = isOutgoing ? (
      <ArrowUpIcon size={18} className={cn('text-textPrimary')} />
    ) : (
      <ArrowDownIcon size={18} className={cn('text-textPrimary')} />
    );
    // TODO: Show the real amount.
    amountDisplay = 'Confidential';
  } else if (activityType === 'deposit') {
    title = isSelfDeposit ? 'Mint' : 'Deposit';
    icon = isSelfDeposit ? (
      <DollarSignIcon size={18} className={cn('text-textPrimary')} />
    ) : (
      <ArrowDownIcon size={18} className={cn('text-textPrimary')} />
    );
    // Cast rest to DepositActivity to access amount
    const { amount } = rest as unknown as DepositActivity;
    amountDisplay = formatAmount(amount, tokenSymbol, tokenDecimals);
  } else if (activityType === 'withdraw') {
    title = 'Withdraw';
    icon = <ArrowUpIcon size={18} className={cn('text-textPrimary')} />;
    // Cast rest to WithdrawActivity to access amount
    const { amount } = rest as unknown as WithdrawActivity;
    amountDisplay = formatAmount(amount, tokenSymbol, tokenDecimals);
  }

  return (
    <div className='flex flex-col'>
      <div
        {...rest}
        className={cn('flex flex-row items-center gap-3 py-3', rest.className)}
      >
        <div className='flex size-[36px] flex-col items-center justify-center rounded-full bg-componentSelected'>
          {icon}
        </div>

        <div className='flex flex-1 flex-col gap-1.5'>
          <div className='flex items-center justify-between'>
            <span className='typography-subtitle3 text-textPrimary'>{title}</span>
            <span className='typography-body3 text-textPrimary'>{amountDisplay}</span>
          </div>

          {/* To/From information */}
          <div className='flex items-center gap-1'>
            <span className='typography-caption1 text-textSecondary'>
              {activityType === 'transfer' && (isOutgoing ? 'To: ' : 'From: ')}
              {activityType === 'deposit' && 'From: '}
              {activityType === 'withdraw' && 'To: '}
            </span>
            <>
              <AddressDisplay
                address={
                  activityType === 'transfer'
                    ? isOutgoing
                      ? toAddress
                      : fromAddress
                    : activityType === 'deposit'
                      ? fromAddress
                      : toAddress
                }
              />
              <div className='ml-2' />
            </>

            <Link
              href={getTxExplorerUrl(txnVersion.toString())}
              target='_blank'
              className='ml-auto'
              aria-label='View transaction details'
            >
              <div className='flex items-center gap-1'>
                <UiIcon name='CalendarIcon' size={12} className='text-textSecondary' />
                {timestamp && (
                  <span className='typography-caption2 text-textSecondary'>
                    {timestamp.toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TxEmptyComponent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('relative isolate flex w-full flex-col gap-4', className)}
    >
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-row items-center gap-4 py-3 opacity-20',
              className,
            )}
          >
            <div className='size-[48px] rounded-full bg-muted' />
            <div className='flex flex-1 flex-col gap-2'>
              <div className='h-4 w-[120px] bg-muted' />
              <div className='h-4 w-[80px] bg-muted' />
            </div>
            <div className='size-6 rounded-full bg-muted' />
          </div>
        ))}

      <div className='absolute-center flex flex-col items-center'>
        <FolderOpenIcon size={128} className='text-componentDisabled' />

        <span className='typography-subtitle2 text-textSecondary'>
          No transactions yet.
        </span>
      </div>
    </div>
  );
}

// Formats addresses for display - either showing ANS name or shortened address
const AddressDisplay = ({ address }: { address: AccountAddress }) => {
  const { data: name, isLoading } = useGetAnsPrimaryName({
    accountAddress: address,
  });

  if (isLoading) {
    return <span className='typography-caption1 text-textSecondary'>Loading...</span>;
  }

  if (name && name.includes(appConfig.ANS_DOMAIN)) {
    // Extract the part before the first dot if it's a valid name
    const formattedName = name.split('.')[0];
    return (
      <span className='typography-caption1 text-textPrimary'>@{formattedName}</span>
    );
  }

  // Shorten address for display (0x123...789)
  const addressStr = address.toString();
  const shortAddress = `${addressStr.slice(0, 4)}...${addressStr.slice(-3)}`;

  return <span className='typography-caption1 text-textSecondary'>{shortAddress}</span>;
};

// Format amount with token symbol
const formatAmount = (amount: number, symbol: string, decimals: number) => {
  const properAmount = amount / 10 ** decimals;
  return `${properAmount.toLocaleString()} ${symbol}`;
};
