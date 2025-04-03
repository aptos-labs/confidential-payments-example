'use client'

import { time } from '@distributedlab/tools'
import { AccountAddress } from '@lukachi/aptos-labs-ts-sdk'
import { formatUnits, parseUnits } from 'ethers'
import { useCallback, useMemo } from 'react'

import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, tryCatch } from '@/helpers'
import { useForm } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { UiButton } from '@/ui/UiButton'
import { ControlledUiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'

export default function WithdrawForm({
  token,
  onSubmit,
}: {
  token: TokenBaseInfo
  onSubmit: () => void
}) {
  const {
    selectedToken,
    selectedAccount,
    withdrawTo,
    loadSelectedDecryptionKeyState,
    addTxHistoryItem,
    reloadAptBalance,
    perTokenStatuses,
    ensureConfidentialBalanceReadyBeforeOp,
  } = useConfidentialCoinContext()

  const currentTokenStatus = perTokenStatuses[token.address]

  const publicBalanceBN = BigInt(currentTokenStatus.fungibleAssetBalance || 0)

  const pendingAmountBN = BigInt(currentTokenStatus.pendingAmount || 0)

  const actualAmountBN = BigInt(currentTokenStatus?.actualAmount || 0)

  const totalBalanceBN = useMemo(() => {
    return publicBalanceBN + pendingAmountBN + actualAmountBN
  }, [actualAmountBN, pendingAmountBN, publicBalanceBN])

  const {
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
  } = useForm(
    {
      recipient: '',
      amount: '',
    },
    yup =>
      yup.object().shape({
        recipient: yup
          .string()
          .required('Enter recipient address')
          .test('aptAddr', 'Invalid address', v => {
            if (!v) return false

            return AccountAddress.isValid({
              input: v,
            }).valid
          })
          .test('DRYAptAddr', 'You cannot withdraw to yourself', v => {
            if (!v) return false

            return (
              v.toLowerCase() !==
              selectedAccount.accountAddress.toString().toLowerCase()
            )
          }),
        amount: yup
          .number()
          .min(+formatUnits('1', token.decimals))
          .max(
            totalBalanceBN ? +formatUnits(totalBalanceBN, token.decimals) : 0,
          )
          .required('Enter amount'),
      }),
  )

  const clearForm = useCallback(() => {
    setValue('amount', '')
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()

        await ensureConfidentialBalanceReadyBeforeOp({
          amountToEnsure: String(formData.amount),
          token: token,
          currentTokenStatus,
          onError: error => {
            ErrorHandler.process(error)
            enableForm()
          },
        })

        const [withdrawTx, withdrawError] = await tryCatch(
          withdrawTo(
            parseUnits(String(formData.amount), token.decimals).toString(),
            formData.recipient,
            {
              isSyncFirst: true,
            },
          ),
        )
        if (withdrawError) {
          ErrorHandler.process(withdrawError)
          enableForm()
          return
        }

        addTxHistoryItem({
          txHash: withdrawTx.hash,
          txType: 'withdraw',
          createdAt: time().timestamp,
        })

        const [, reloadError] = await tryCatch(
          Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()]),
        )
        if (reloadError) {
          ErrorHandler.process(reloadError)
          enableForm()
          return
        }

        onSubmit()
        clearForm()
        enableForm()
      })(),
    [
      addTxHistoryItem,
      clearForm,
      currentTokenStatus,
      disableForm,
      enableForm,
      ensureConfidentialBalanceReadyBeforeOp,
      handleSubmit,
      loadSelectedDecryptionKeyState,
      onSubmit,
      reloadAptBalance,
      token,
      withdrawTo,
    ],
  )

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col justify-between gap-4'>
        <ControlledUiInput
          control={control}
          name='recipient'
          placeholder='Enter recipient address'
          disabled={isFormDisabled}
        />
        <ControlledUiInput
          control={control}
          name='amount'
          placeholder='Enter amount'
          disabled={isFormDisabled}
        />
      </div>

      <div className='mt-4 rounded-md bg-componentPrimary p-4'>
        <h4 className='font-semibold text-textPrimary'>
          Withdraw {selectedToken?.symbol} to public account
        </h4>
        <p className='text-sm text-textSecondary'>By sending to the address.</p>
      </div>

      <div className='pt-4'>
        <UiSeparator className='mb-4' />
        <UiButton className='w-full' onClick={submit} disabled={isFormDisabled}>
          Withdraw publicly
        </UiButton>
      </div>
    </div>
  )
}
