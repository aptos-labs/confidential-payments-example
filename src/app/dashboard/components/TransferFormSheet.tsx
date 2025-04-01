'use client'

import { time } from '@distributedlab/tools'
import { AccountAddress } from '@lukachi/aptos-labs-ts-sdk'
import { formatUnits, parseUnits } from 'ethers'
import {
  ComponentProps,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Control, Controller, useFieldArray } from 'react-hook-form'

import { validateEncryptionKeyHex } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, isMobile, tryCatch } from '@/helpers'
import { useForm } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import { ControlledUiInput, UiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSheet,
  UiSheetContent,
  UiSheetHeader,
  UiSheetTitle,
} from '@/ui/UiSheet'

type TransferFormSheetRef = {
  open: (prefillAddr?: string) => void
  close: () => void
}

export const useTransferFormSheet = () => {
  const ref = useRef<TransferFormSheetRef>(null)

  const open = (prefillAddr?: string) => {
    ref.current?.open(prefillAddr)
  }

  const close = () => {
    ref.current?.close()
  }

  return {
    ref,
    open,
    close,
  }
}

type Props = {
  token: TokenBaseInfo
  onSubmit: () => void
} & ComponentProps<typeof UiSheet>

export const TransferFormSheet = forwardRef<TransferFormSheetRef, Props>(
  ({ token, onSubmit }, ref) => {
    const isMobileDevice = isMobile()

    const {
      transfer,
      loadSelectedDecryptionKeyState,
      addTxHistoryItem,
      reloadAptBalance,
      perTokenStatuses,
      rolloverAccount,
    } = useConfidentialCoinContext()

    const currTokenStatus = perTokenStatuses[token.address]

    const pendingAmountBN = BigInt(currTokenStatus.pendingAmount || 0)

    const actualAmountBN = BigInt(currTokenStatus?.actualAmount || 0)

    const amountsSumBN = useMemo(() => {
      return pendingAmountBN + actualAmountBN
    }, [actualAmountBN, pendingAmountBN])

    const [isTransferSheetOpen, setIsTransferSheetOpen] = useState(false)

    const {
      isFormDisabled,
      handleSubmit,
      disableForm,
      enableForm,
      control,
      setValue,
    } = useForm(
      {
        receiverAddressHex: '',
        amount: '',
        auditorsEncryptionKeysHex: [] as string[],
      },
      yup =>
        yup.object().shape({
          receiverAddressHex: yup
            .string()
            .test('Invalid address', v => {
              if (!v) return false

              return AccountAddress.isValid({
                input: v,
              }).valid
            })
            .required('Enter receiver'),
          amount: yup
            .number()
            .min(+formatUnits('1', token.decimals))
            .max(amountsSumBN ? +formatUnits(amountsSumBN, token.decimals) : 0)
            .required('Enter amount'),
          auditorsEncryptionKeysHex: yup.array().of(
            yup.string().test('Invalid encryption key', v => {
              if (!v) return false

              return validateEncryptionKeyHex(v)
            }),
          ),
        }),
    )

    const clearForm = useCallback(() => {
      setValue('receiverAddressHex', '')
      setValue('amount', '')
    }, [setValue])

    const submit = useCallback(
      () =>
        handleSubmit(async formData => {
          disableForm()

          const formAmountBN = parseUnits(
            String(formData.amount),
            token.decimals,
          )
          if (actualAmountBN < formAmountBN) {
            const [rolloverTxs, rolloverError] =
              await tryCatch(rolloverAccount())
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

          const [transferTx, transferError] = await tryCatch(
            transfer(
              formData.receiverAddressHex,
              parseUnits(String(formData.amount), token.decimals).toString(),
              {
                isSyncFirst: true,
                auditorsEncryptionKeyHexList:
                  formData.auditorsEncryptionKeysHex,
              },
            ),
          )
          if (transferError) {
            ErrorHandler.process(transferError)
            enableForm()
            return
          }

          addTxHistoryItem({
            txHash: transferTx.hash,
            txType: 'transfer',
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
        disableForm,
        enableForm,
        handleSubmit,
        loadSelectedDecryptionKeyState,
        onSubmit,
        reloadAptBalance,
        rolloverAccount,
        token.decimals,
        transfer,
      ],
    )

    useImperativeHandle(ref, () => ({
      open: prefillAddr => {
        setIsTransferSheetOpen(true)

        if (prefillAddr) {
          setValue('receiverAddressHex', prefillAddr)
        }
      },
      close: () => {
        setIsTransferSheetOpen(false)
        clearForm()
      },
    }))

    return (
      <UiSheet open={isTransferSheetOpen} onOpenChange={setIsTransferSheetOpen}>
        <UiSheetContent
          side={isMobileDevice ? 'bottom' : 'right'}
          className='max-h-[70dvh] overflow-y-scroll md:max-h-none'
        >
          <UiSheetHeader>
            <UiSheetTitle>Transfer</UiSheetTitle>
          </UiSheetHeader>
          <UiSeparator className='mb-4 mt-2' />
          <div className='flex flex-col'>
            <div className='flex flex-col gap-4'>
              <ControlledUiInput
                control={control}
                name='receiverAddressHex'
                label='Recipient'
                placeholder='Enter recipient address'
                disabled={isFormDisabled}
              />

              <ControlledUiInput
                control={control}
                name='amount'
                label='Amount'
                placeholder='Enter amount'
                type='number'
                disabled={isFormDisabled}
              />
            </div>

            <AuditorsList className='mt-3 flex-1' control={control} />

            <div className='mt-auto pt-4'>
              <UiSeparator className='mb-4' />
              <UiButton
                className='w-full'
                onClick={submit}
                disabled={isFormDisabled}
              >
                Send
              </UiButton>
            </div>
          </div>
        </UiSheetContent>
      </UiSheet>
    )
  },
)

TransferFormSheet.displayName = 'TransferFormSheet'

const AuditorsList = ({
  control,
  ...rest
}: {
  control: Control<{
    receiverAddressHex: string
    amount: string
    auditorsEncryptionKeysHex: string[]
  }>
} & HTMLAttributes<HTMLDivElement>) => {
  const { fields, append, remove } = useFieldArray({
    control: control!,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    name: 'auditorsEncryptionKeysHex',
  })

  const addAuditor = () => {
    append('')
  }

  const removeAuditor = (index: number) => {
    remove(index)
  }

  return (
    <div {...rest} className={cn('flex flex-col gap-2', rest.className)}>
      <div className='flex items-center gap-2'>
        <span className='typography-caption2 uppercase text-textPrimary'>
          Add auditors
        </span>
        <button
          className='flex size-7 items-center justify-center rounded-[50%] bg-componentPrimary'
          onClick={addAuditor}
        >
          <UiIcon name={'UserPlusIcon'} className={'size-4 text-textPrimary'} />
        </button>
      </div>

      <div className='flex flex-col gap-3'>
        {fields.map((field, index) => (
          <div key={field.id} className='flex items-center gap-2'>
            <div className='flex-1'>
              <Controller
                control={control}
                name={`auditorsEncryptionKeysHex.${index}`}
                render={({ field }) => (
                  <UiInput {...field} placeholder={`Auditor ${index + 1}`} />
                )}
              />
            </div>
            <button
              className='text-textPrimary'
              onClick={() => removeAuditor(index)}
            >
              <UiIcon name={'Trash2Icon'} className={'size-5 text-errorMain'} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
