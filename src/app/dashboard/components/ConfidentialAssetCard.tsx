'use client';

import Avatar from 'boring-avatars';
import { HTMLAttributes, useMemo, useState } from 'react';

import { createAccount } from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, formatBalance, tryCatch } from '@/helpers';
import { useGasStationArgs } from '@/store/gas-station';
import { TokenBaseInfo } from '@/store/wallet';
import { cn } from '@/theme/utils';
import { UiIcon } from '@/ui';
import { UiButton } from '@/ui/UiButton';
import {
  UiTooltip,
  UiTooltipContent,
  UiTooltipProvider,
  UiTooltipTrigger,
} from '@/ui/UiTooltip';

export default function ConfidentialAssetCard({
  token,
  // encryptionKey,
  pendingAmount,
  availableAmount,

  /* eslint-disable unused-imports/no-unused-vars */
  isNormalized,
  isFrozen,
  isRegistered,

  className,

  ...rest
}: {
  token: TokenBaseInfo;

  pendingAmount: string;
  availableAmount: string;

  isNormalized: boolean;
  isFrozen: boolean;
  isRegistered: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const {
    selectedAccount,
    registerAccountEncryptionKey,
    reloadBalances,
    perTokenStatuses,
  } = useConfidentialCoinContext();
  const gasStationArgs = useGasStationArgs();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountsSumBN = useMemo(() => {
    return (
      BigInt(pendingAmount || 0) +
      BigInt(availableAmount || 0) +
      BigInt(perTokenStatuses[token.address].fungibleAssetBalance || 0)
    );
  }, [availableAmount, pendingAmount, perTokenStatuses, token.address]);

  const tryRegister = async () => {
    setIsSubmitting(true);

    // Try to use the gas station to create the account.
    const [_response, createAccountError] = await tryCatch(
      createAccount(selectedAccount, gasStationArgs),
    );

    if (createAccountError) {
      // If it fails because the account already exists, keep moving.
      if (!createAccountError.message.includes('EACCOUNT_ALREADY_EXISTS')) {
        ErrorHandler.process(createAccountError);
        setIsSubmitting(false);
        return;
      }
    }

    const currTokenStatus = perTokenStatuses[token.address];

    try {
      await registerAccountEncryptionKey(token.address);
      await reloadBalances();
    } catch (error) {
      if (+currTokenStatus.fungibleAssetBalance >= 0) {
        ErrorHandler.process(
          error,
          `Insufficient ${token.symbol} balance, try funding your account`,
        );
      } else {
        ErrorHandler.process(error);
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div {...rest} className={cn('relative overflow-hidden', className)}>
      <div className={cn('relative isolate')}>
        <div className='flex size-full flex-col items-center gap-4 rounded-2xl p-4'>
          <div className='relative flex items-center gap-2'>
            <Avatar name={token.address} size={20} variant='pixel' />
            <span className='typography-subtitle1 text-textPrimary'>
              {token.symbol} Balance
            </span>
          </div>

          <div className='flex items-center'>
            {isRegistered ? (
              <>
                <div className='flex items-end gap-1'>
                  <div className='typography-h2 text-textPrimary'>
                    {availableAmount &&
                      pendingAmount &&
                      formatBalance(amountsSumBN, token.decimals)}
                  </div>
                  <span className='typography-subtitle2 -translate-y-[7px] text-textSecondary'>
                    {token.symbol}
                  </span>
                </div>
              </>
            ) : (
              <div className='flex flex-col items-center gap-2'>
                <UiButton
                  className='min-w-[300px]'
                  onClick={tryRegister}
                  disabled={isSubmitting}
                >
                  Start
                </UiButton>

                <UiTooltipProvider delayDuration={0}>
                  <UiTooltip>
                    <div className='flex items-center gap-2'>
                      <span className='typography-caption1 text-textPrimary'>
                        Let's register this token as your private balance
                      </span>
                      <UiTooltipTrigger>
                        <UiIcon name='InfoIcon' className='size-4 text-textPrimary' />
                      </UiTooltipTrigger>
                    </div>

                    <UiTooltipContent className='overflow-hidden text-ellipsis'>
                      <span className='typography-caption1 text-textSecondary'>
                        make sure you have enough {token.symbol} to send transactions.
                        If not, mint some.
                      </span>
                    </UiTooltipContent>
                  </UiTooltip>
                </UiTooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
