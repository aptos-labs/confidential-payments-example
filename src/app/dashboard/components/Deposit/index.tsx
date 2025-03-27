'use client'

import { formatUnits } from 'ethers'
import QRCode from 'react-qr-code'

import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { RoutePaths } from '@/enums'
import { useCopyToClipboard } from '@/hooks'
import { UiIcon } from '@/ui'
import {
  UiAccordion,
  UiAccordionContent,
  UiAccordionItem,
  UiAccordionTrigger,
} from '@/ui/UiAccordion'
import { UiTabs, UiTabsContent, UiTabsList, UiTabsTrigger } from '@/ui/UiTabs'

import DepositManualForm from './components/DepositManualForm'
import DepositMint from './components/DepositMint'

export default function Deposit({ onSubmit }: { onSubmit?: () => void }) {
  const { selectedAccount, selectedToken, perTokenStatuses } =
    useConfidentialCoinContext()

  const value = `${window.location.origin}${RoutePaths.Dashboard}?action=send&asset=${selectedToken.address}&to=${selectedAccount.accountAddress.toString()}`

  const { copy, isCopied } = useCopyToClipboard()

  const currentStatus = perTokenStatuses[selectedToken.address]

  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='aspect-square w-full rounded-xl border-2 border-textPrimary p-4'>
        <QRCode
          size={256}
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          value={value}
          viewBox={`0 0 256 256`}
        />
      </div>

      <div className='flex w-full flex-col gap-2'>
        <span className='self-start uppercase text-textPrimary typography-caption3'>
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

      {currentStatus.isRegistered ? (
        <UiAccordion type={'single'} collapsible className='w-full'>
          <UiAccordionItem value='item-1'>
            <UiAccordionTrigger>
              <div className='flex items-center gap-2'>
                <span className='text-textPrimary typography-caption3'>
                  Advanced
                </span>
              </div>
            </UiAccordionTrigger>
            <UiAccordionContent>
              <UiTabs defaultValue='faucet' className='w-full'>
                <UiTabsList>
                  <UiTabsTrigger value='faucet'>
                    Buy {selectedToken.symbol}
                  </UiTabsTrigger>
                  <UiTabsTrigger value='manual'>Manual</UiTabsTrigger>
                </UiTabsList>
                <UiTabsContent value='faucet'>
                  <DepositMint onSubmit={onSubmit} />
                </UiTabsContent>
                <UiTabsContent value='manual'>
                  <DepositManualForm onSubmit={onSubmit} />
                </UiTabsContent>
              </UiTabs>
            </UiAccordionContent>
          </UiAccordionItem>
        </UiAccordion>
      ) : (
        <>
          {currentStatus.fungibleAssetBalance && (
            <span className='text-textSecondary typography-caption2'>
              Public balance:{' '}
              <span className='text-textPrimary'>
                {formatUnits(
                  currentStatus.fungibleAssetBalance,
                  selectedToken.decimals,
                )}{' '}
                {selectedToken.symbol}
              </span>
            </span>
          )}
        </>
      )}
    </div>
  )
}
