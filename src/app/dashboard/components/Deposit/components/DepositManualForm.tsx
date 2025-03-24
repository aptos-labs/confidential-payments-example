'use client'

import { time } from '@distributedlab/tools'
import { parseUnits } from 'ethers'
import { useCallback } from 'react'

import { getFABalance } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatBalance } from '@/helpers'
import { useForm, useLoading } from '@/hooks'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import { ControlledUiInput } from '@/ui/UiInput'
import { UiSkeleton } from '@/ui/UiSkeleton'
import {
  UiTooltip,
  UiTooltipContent,
  UiTooltipProvider,
  UiTooltipTrigger,
} from '@/ui/UiTooltip'

export default function DepositManualForm({
  onSubmit,
}: {
  onSubmit?: () => void
}) {
  const {
    selectedToken,
    deposit,
    rolloverAccount,
    normalizeAccount,
    addTxHistoryItem,
  } = useConfidentialCoinContext()

  const { data: assetBalance, isLoading } = useLoading(
    0,
    async () => {
      const resp = await getFABalance(selectedToken.address)

      return resp[0].amount
    },
    {
      loadArgs: [selectedToken.address],
    },
  )

  const { control, disableForm, enableForm, isFormDisabled, handleSubmit } =
    useForm({ amount: '' }, yup =>
      yup.object().shape({ amount: yup.number().required() }),
    )

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          const amountToDeposit = parseUnits(
            String(formData.amount),
            selectedToken.decimals,
          )

          const depositTxReceipt = await deposit(amountToDeposit)
          addTxHistoryItem({
            txHash: depositTxReceipt.hash,
            txType: 'deposit',
            createdAt: Date.now(),
          })

          const rolloverTxReceipt = await rolloverAccount()
          rolloverTxReceipt.forEach(el => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (el.payload.function.includes('rollover')) {
              addTxHistoryItem({
                txHash: el.hash,
                txType: 'rollover',
                createdAt: time().timestamp,
              })

              return
            }
          })

          const normalizeTxReceipt = await normalizeAccount()
          addTxHistoryItem({
            txHash: normalizeTxReceipt.hash,
            txType: 'normalize',
            createdAt: time().timestamp,
          })

          onSubmit?.()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [
      addTxHistoryItem,
      deposit,
      disableForm,
      enableForm,
      handleSubmit,
      normalizeAccount,
      onSubmit,
      rolloverAccount,
      selectedToken.decimals,
    ],
  )

  return (
    <form className='flex flex-col gap-3' onSubmit={handleSubmit(submit)}>
      <ControlledUiInput
        control={control}
        name='amount'
        placeholder='amount'
        label={
          <UiTooltipProvider delayDuration={0}>
            <UiTooltip>
              <UiTooltipTrigger>
                <div className='flex items-center gap-2 text-textPrimary typography-caption2'>
                  Amount
                  <UiIcon name='InfoIcon' className='size-4 text-textPrimary' />
                </div>
              </UiTooltipTrigger>
              <UiTooltipContent className='max-w-[75vw]'>
                Manual deposit from you Fungible Asset balance to Confidential
                balance
              </UiTooltipContent>
            </UiTooltip>
          </UiTooltipProvider>
        }
      />
      <div className='flex w-full justify-end'>
        {isLoading ? (
          <UiSkeleton className='h-3 w-1/3' />
        ) : (
          <span className='text-textPrimary typography-caption3'>
            Current balance:
            <span className='ml-2 text-textPrimary typography-caption1'>
              {formatBalance(assetBalance, selectedToken.decimals)}
            </span>
            <span className='ml-2 uppercase text-textPrimary typography-caption1'>
              {selectedToken.symbol}
            </span>
          </span>
        )}
      </div>

      <UiButton className='w-full' onClick={submit} disabled={isFormDisabled}>
        Deposit
      </UiButton>
    </form>
  )
}
