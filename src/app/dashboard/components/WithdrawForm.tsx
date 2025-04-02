'use client'

import { time } from '@distributedlab/tools'
import { AccountAddress } from '@lukachi/aptos-labs-ts-sdk'
import { FixedNumber, formatUnits, parseUnits } from 'ethers'
import { useCallback, useMemo } from 'react'

import { getFABalance } from '@/api/modules/aptos'
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
    selectedAccount,
    depositTo,
    depositCoinTo,
    withdrawTo,
    loadSelectedDecryptionKeyState,
    addTxHistoryItem,
    reloadAptBalance,
    perTokenStatuses,
    rolloverAccount,
  } = useConfidentialCoinContext()

  const currentTokenStatus = perTokenStatuses[token.address]

  const publicBalanceBN = BigInt(
    perTokenStatuses[token.address].fungibleAssetBalance || 0,
  )

  const pendingAmountBN = BigInt(currentTokenStatus.pendingAmount || 0)

  const actualAmountBN = BigInt(currentTokenStatus?.actualAmount || 0)

  const confidentialAmountsSumBN = useMemo(() => {
    return pendingAmountBN + actualAmountBN
  }, [actualAmountBN, pendingAmountBN])

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

        const formAmountBN = parseUnits(String(formData.amount), token.decimals)

        const isConfidentialBalanceEnough =
          confidentialAmountsSumBN - formAmountBN >= 0

        if (!isConfidentialBalanceEnough) {
          // const amountToDeposit = formAmountBN - confidentialAmountsSumBN
          const amountToDeposit = publicBalanceBN

          const [faOnlyBalance] = await getFABalance(
            selectedAccount,
            token.address,
          )

          const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
            faOnlyBalance?.amount || '0',
          ).lt(FixedNumber.fromValue(amountToDeposit))

          const depositTxReceipt = isInsufficientFAOnlyBalance
            ? await depositCoinTo(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              )
            : await depositTo(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              )

          addTxHistoryItem({
            txHash: depositTxReceipt.hash,
            txType: 'deposit',
            createdAt: time().timestamp,
          })
        }

        if (actualAmountBN < formAmountBN) {
          const [rolloverTxs, rolloverError] = await tryCatch(rolloverAccount())
          if (rolloverError) {
            ErrorHandler.process(rolloverError)
            enableForm()
            return
          }

          rolloverTxs.forEach(el => {
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

            addTxHistoryItem({
              txHash: el.hash,
              txType: 'normalize',
              createdAt: time().timestamp,
            })
          })
        }

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
      actualAmountBN,
      addTxHistoryItem,
      clearForm,
      confidentialAmountsSumBN,
      depositCoinTo,
      depositTo,
      disableForm,
      enableForm,
      handleSubmit,
      loadSelectedDecryptionKeyState,
      onSubmit,
      publicBalanceBN,
      reloadAptBalance,
      rolloverAccount,
      selectedAccount,
      token.address,
      token.decimals,
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
          Withdraw to public balance
        </h4>
        <p className='text-sm text-textSecondary'>
          After withdrawal from your confidential balance, the funds will appear
          in your public balance.
        </p>
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
