'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';

import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { appConfig } from '@/config';
import { abbrCenter } from '@/helpers';
import { useCopyToClipboard } from '@/hooks';
import { useGetAnsSubdomains } from '@/hooks/ans';
import { UiSeparator } from '@/ui/UiSeparator';

export default function DepositAddress() {
  const { selectedAccount } = useConfidentialCoinContext();
  const addressHex = selectedAccount.accountAddress.toString();

  const { data: ansNameData } = useGetAnsSubdomains({
    accountAddress: selectedAccount.accountAddress,
    enabled: true,
  });

  const subdomain = ansNameData?.subdomain;
  const ansFullName = subdomain ? `${subdomain}.${appConfig.ANS_DOMAIN}.apt` : null;

  const addressCopy = useCopyToClipboard();
  const ansCopy = useCopyToClipboard();

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-sm text-textSecondary'>
        Send funds to either your ANS name or public address below. Funds will be
        automatically veiled once received.
      </p>

      {ansFullName && (
        <div className='rounded-xl bg-componentPrimary p-4'>
          <div className='mb-1 text-xs uppercase text-textSecondary'>ANS Name</div>
          <button
            className='flex w-full items-center justify-between gap-2'
            onClick={() => ansCopy.copy(ansFullName)}
          >
            <span className='typography-subtitle4 break-all text-textPrimary'>
              {ansFullName}
            </span>
            {ansCopy.isCopied ? (
              <CheckIcon className='size-4 shrink-0 text-successMain' />
            ) : (
              <CopyIcon className='size-4 shrink-0 text-textSecondary' />
            )}
          </button>
        </div>
      )}

      <UiSeparator />

      <div className='rounded-xl bg-componentPrimary p-4'>
        <div className='mb-1 text-xs uppercase text-textSecondary'>Public Address</div>
        <button
          className='flex w-full items-center justify-between gap-2'
          onClick={() => addressCopy.copy(addressHex)}
        >
          <span className='typography-caption1 break-all text-textPrimary'>
            {abbrCenter(addressHex, 16)}
          </span>
          {addressCopy.isCopied ? (
            <CheckIcon className='size-4 shrink-0 text-successMain' />
          ) : (
            <CopyIcon className='size-4 shrink-0 text-textSecondary' />
          )}
        </button>
      </div>
    </div>
  );
}
