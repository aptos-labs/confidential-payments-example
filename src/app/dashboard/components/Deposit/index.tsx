'use client';

import QRCode from 'react-qr-code';

import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { RoutePaths } from '@/enums';
import { useCopyToClipboard } from '@/hooks';
import { UiIcon } from '@/ui';
import { UiTabs, UiTabsContent, UiTabsList, UiTabsTrigger } from '@/ui/UiTabs';

import DepositMint from './components/DepositMint';

export default function Deposit({ onSubmit }: { onSubmit?: () => void }) {
  const { selectedAccount, selectedToken } = useConfidentialCoinContext();

  const value = `${window.location.origin}${RoutePaths.Dashboard}?action=send&asset=${selectedToken.address}&to=${selectedAccount.accountAddress.toString()}`;

  const { copy, isCopied } = useCopyToClipboard();

  return (
    <div className='flex flex-col items-center gap-4'>
      <UiTabs defaultValue='faucet' className='w-full'>
        <UiTabsList>
          <UiTabsTrigger value='faucet'>Faucet {selectedToken.symbol}</UiTabsTrigger>
          <UiTabsTrigger value='manual'>Receive from others</UiTabsTrigger>
        </UiTabsList>
        <UiTabsContent value='faucet'>
          <DepositMint onSubmit={onSubmit} />
        </UiTabsContent>
        <UiTabsContent value='manual' className='flex flex-col items-center gap-4'>
          <div className='aspect-square w-full rounded-xl border-2 border-textPrimary p-4'>
            <QRCode
              size={256}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              value={value}
              viewBox={`0 0 256 256`}
            />
          </div>

          <div className='flex w-full flex-col gap-2'>
            <span className='typography-caption3 self-start uppercase text-textPrimary'>
              Address
            </span>
            <div className='flex w-full items-center gap-2 rounded-xl bg-componentPrimary p-4'>
              <div className='flex-1 overflow-hidden text-ellipsis'>
                {selectedAccount.accountAddress.toString()}
              </div>
              <button
                className='flex'
                onClick={() => copy(selectedAccount.accountAddress.toString())}
              >
                <UiIcon
                  name={isCopied ? 'CheckIcon' : 'CopyIcon'}
                  size={20}
                  className={'text-textPrimary'}
                />
              </button>
            </div>
          </div>

          <div className='mt-4 rounded-md bg-componentPrimary p-4'>
            <h4 className='font-semibold text-textPrimary'>
              Send {selectedToken?.symbol} to yourself
            </h4>
            <p className='text-sm text-textSecondary'>
              By sending to either the QR code or the address displayed below.
            </p>
          </div>
          <div className='mt-4 rounded-md bg-componentPrimary p-4'>
            <p className='text-sm text-textSecondary'>
              Note: This is the blockchain address associated with your Google account
              in this dapp.
            </p>
          </div>
        </UiTabsContent>
      </UiTabs>
    </div>
  );
}
