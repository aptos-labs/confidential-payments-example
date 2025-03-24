'use client'

import { time } from '@distributedlab/tools'
import Avatar from 'boring-avatars'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useDebounce } from 'react-use'

import {
  getFungibleAssetMetadata,
  validateEncryptionKeyHex,
} from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler } from '@/helpers'
import { useForm } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import {
  UiDialog,
  UiDialogContent,
  UiDialogFooter,
  UiDialogHeader,
  UiDialogTitle,
} from '@/ui/UiDialog'
import { UiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiTooltip,
  UiTooltipContent,
  UiTooltipProvider,
  UiTooltipTrigger,
} from '@/ui/UiTooltip'

export default function AddTokenForm({ onSubmit }: { onSubmit: () => void }) {
  const {
    addToken,
    registerAccountEncryptionKey,
    addTxHistoryItem,
    setSelectedTokenAddress,
  } = useConfidentialCoinContext()

  const {
    formState,
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
  } = useForm(
    {
      tokenAddress: '',
      tokenInfo: undefined as TokenBaseInfo | undefined,
    },
    yup =>
      yup.object().shape({
        tokenAddress: yup.string().test('Invalid token address', v => {
          if (!v) return false

          return validateEncryptionKeyHex(v)
        }),
        tokenInfo: yup.object().shape({
          address: yup.string().required(),
        }),
      }),
  )

  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [foundedTokens, setFoundedTokens] = useState<TokenBaseInfo[]>([])

  const isDisabled = isSearching || isFormDisabled

  const clearForm = useCallback(() => {
    setValue('tokenAddress', '')
    setValue('tokenInfo', undefined)
    setFoundedTokens([])
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          try {
            const txReceipt = await registerAccountEncryptionKey(
              formData.tokenAddress,
            )
            addTxHistoryItem({
              txHash: txReceipt.hash,
              txType: 'register',
              createdAt: time().timestamp,
            })
          } catch (error) {
            /* empty */
          }
          addToken(formData.tokenInfo!)
          setSelectedTokenAddress(formData.tokenInfo!.address)
          onSubmit()
          clearForm()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [
      addToken,
      addTxHistoryItem,
      clearForm,
      disableForm,
      enableForm,
      handleSubmit,
      onSubmit,
      registerAccountEncryptionKey,
      setSelectedTokenAddress,
    ],
  )

  const searchToken = useCallback(async (tokenAddress: string) => {
    setIsSearching(true)

    try {
      const tokens = await getFungibleAssetMetadata(tokenAddress)

      setFoundedTokens(tokens)
    } catch (error) {
      return undefined
    }
    setIsSearching(false)
  }, [])

  useDebounce(
    async () => {
      if (!formState.tokenAddress) return

      await searchToken(formState.tokenAddress)
    },
    500,
    [formState.tokenAddress],
  )

  return (
    <div className='flex-1'>
      <Controller
        control={control}
        name={'tokenAddress'}
        render={({ field }) => (
          <UiInput {...field} placeholder='Enter token address' />
        )}
      />

      <div className='mt-4 flex flex-col gap-4'>
        {foundedTokens.map((el, idx) => (
          <div
            key={idx}
            className={cn(
              'relative isolate mt-3 flex gap-3',
              'hover:brightness-150',
            )}
          >
            {el.iconUri ? (
              <Image
                src={el.iconUri}
                alt={el.name}
                className='size-[48px] rounded-full'
                width={48}
                height={48}
              />
            ) : (
              <Avatar
                name={el.address}
                className={'size-[48px] rounded-[50%]'}
              />
            )}
            <div className='flex flex-1 flex-col gap-2 overflow-hidden md:overflow-auto'>
              <UiTooltipProvider delayDuration={0}>
                <UiTooltip>
                  <UiTooltipTrigger className='hidden items-center gap-2 md:flex'>
                    <span className='text-textPrimary typography-caption1'>
                      {el.name}
                    </span>
                    <UiIcon
                      name='InfoIcon'
                      className='size-4 text-textPrimary'
                    />
                  </UiTooltipTrigger>
                  <UiTooltipContent className='max-w-[75vw] overflow-hidden text-ellipsis'>
                    <span className='text-textSecondary typography-caption1'>
                      {el.address}
                    </span>
                  </UiTooltipContent>
                </UiTooltip>
              </UiTooltipProvider>
              <span className='inline text-textPrimary typography-caption1 md:hidden'>
                {el.name}
              </span>

              <span className='text-textSecondary typography-caption2'>
                {el.symbol}
              </span>
              <div className='w-full overflow-hidden text-ellipsis md:hidden'>
                <span className='text-textSecondary typography-caption3'>
                  {el.address}
                </span>
              </div>
            </div>

            <UiButton
              className='ml-auto hidden min-w-[200px] md:flex'
              disabled={isDisabled}
              onClick={() => {
                setValue('tokenInfo', el)
                setIsConfirmationDialogOpen(true)
              }}
            >
              Add
            </UiButton>

            <button
              className='absolute inset-0 z-20'
              onClick={() => {
                setValue('tokenInfo', el)
                setIsConfirmationDialogOpen(true)
              }}
            />
          </div>
        ))}
      </div>

      <UiDialog
        open={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <UiDialogContent>
          <UiDialogHeader>
            <UiDialogTitle className='pb-2'>
              Add {formState.tokenInfo?.symbol} token?
            </UiDialogTitle>
            <UiSeparator />
            {/*<UiDialogDescription>*/}
            <div className='flex w-full gap-2 overflow-hidden pt-2 text-left'>
              {formState.tokenInfo?.iconUri ? (
                <Image
                  src={formState.tokenInfo?.iconUri}
                  alt={formState.tokenInfo?.name}
                  className='size-[48px] rounded-full'
                  width={48}
                  height={48}
                />
              ) : (
                <Avatar
                  name={formState.tokenInfo?.address}
                  className={'size-[48px] rounded-[50%]'}
                />
              )}

              <div className='flex flex-1 flex-col'>
                <span className='text-textPrimary typography-caption1'>
                  {formState.tokenInfo?.name}
                </span>
                <span className='text-textSecondary typography-caption2'>
                  {formState.tokenInfo?.symbol}
                </span>
                <div className='relative isolate h-5 w-full'>
                  <div className='absolute inset-0 overflow-hidden text-ellipsis'>
                    <span className='w-full text-textSecondary typography-caption3'>
                      {formState.tokenInfo?.address}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/*</UiDialogDescription>*/}
          </UiDialogHeader>
          <UiDialogFooter>
            <div className='flex w-full items-center gap-2'>
              <UiButton
                className='flex-1'
                variant={'outline'}
                onClick={() => {
                  setValue('tokenInfo', undefined)
                  setIsConfirmationDialogOpen(false)
                }}
              >
                Cancel
              </UiButton>
              <UiButton
                className='flex-1'
                onClick={() => {
                  handleSubmit(submit)
                  setIsConfirmationDialogOpen(false)
                }}
              >
                Add
              </UiButton>
            </div>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>
    </div>
  )
}
