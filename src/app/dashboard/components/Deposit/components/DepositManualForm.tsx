'use client'

import { time } from '@distributedlab/tools'
import { FixedNumber, parseUnits } from 'ethers'
import { useCallback, useState } from 'react'

import { getFABalance } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatBalance } from '@/helpers'
import { useForm } from '@/hooks'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import { ControlledUiInput } from '@/ui/UiInput'
import { UiLabel } from '@/ui/UiLabel'
import { UiSwitch } from '@/ui/UiSwitch'
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
    selectedAccount,
    selectedToken,
    deposit,
    depositCoin,
    rolloverAccount,
    normalizeAccount,
    addTxHistoryItem,
    perTokenStatuses,
  } = useConfidentialCoinContext()

  const [isOtherRecipient, setIsOtherRecipient] = useState(false)

  const formattedTotalBalance = formatBalance(
    perTokenStatuses[selectedToken.address].fungibleAssetBalance,
    selectedToken.decimals,
  )

  const { control, disableForm, enableForm, isFormDisabled, handleSubmit } =
    useForm({ recipient: '', amount: '' }, yup =>
      yup.object().shape({
        amount: yup.number().max(+formattedTotalBalance).required(),
        ...(isOtherRecipient && {
          recipient: yup.string().required(),
        }),
      }),
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

          const [faOnlyBalance] = await getFABalance(
            selectedAccount,
            selectedToken.address,
          )

          const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
            faOnlyBalance?.amount || '0',
          ).lt(FixedNumber.fromValue(amountToDeposit))

          const depositTxReceipt = isInsufficientFAOnlyBalance
            ? await depositCoin(amountToDeposit)
            : await deposit(amountToDeposit)

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
      depositCoin,
      disableForm,
      enableForm,
      handleSubmit,
      normalizeAccount,
      onSubmit,
      rolloverAccount,
      selectedAccount,
      selectedToken.address,
      selectedToken.decimals,
    ],
  )

  return (
    <form className='flex flex-col gap-3' onSubmit={handleSubmit(submit)}>
      {isOtherRecipient && (
        <ControlledUiInput
          control={control}
          name='recipient'
          label='Recipient'
          placeholder='recipient'
        />
      )}
      <ControlledUiInput
        control={control}
        name='amount'
        placeholder='amount'
        type='number'
        inputMode='decimal'
        label={
          isOtherRecipient ? (
            'Amount'
          ) : (
            <UiTooltipProvider delayDuration={0}>
              <UiTooltip>
                <UiTooltipTrigger>
                  <div className='flex items-center gap-2 text-textPrimary typography-caption2'>
                    Amount
                    <UiIcon
                      name='InfoIcon'
                      className='size-4 text-textPrimary'
                    />
                  </div>
                </UiTooltipTrigger>
                <UiTooltipContent className='max-w-[75vw]'>
                  Manual deposit from you Fungible Asset balance to Confidential
                  balance
                </UiTooltipContent>
              </UiTooltip>
            </UiTooltipProvider>
          )
        }
      />
      <div className='flex w-full justify-end'>
        <span className='text-textPrimary typography-caption3'>
          Current FA balance:
          <span className='ml-2 text-textPrimary typography-caption1'>
            {formattedTotalBalance}
          </span>
          <span className='ml-2 uppercase text-textPrimary typography-caption1'>
            {selectedToken.symbol}
          </span>
        </span>
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center justify-end gap-3'>
          <UiLabel htmlFor='deposit-check'>Other recipient</UiLabel>
          <UiSwitch
            checked={isOtherRecipient}
            onCheckedChange={v => setIsOtherRecipient(v)}
          />
        </div>
      </div>

      <UiButton
        className='mt-4 w-full'
        onClick={submit}
        disabled={isFormDisabled}
      >
        Deposit
      </UiButton>
    </form>
  )
}
