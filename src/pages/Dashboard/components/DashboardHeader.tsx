import { BN, time } from '@distributedlab/tools'
import {
  ArrowDownIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  TrashIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import {
  type ComponentProps,
  HTMLAttributes,
  useCallback,
  useState,
} from 'react'
import { Controller } from 'react-hook-form'

import {
  generatePrivateKeyHex,
  sendApt,
  validatePrivateKeyHex,
} from '@/api/modules/aptos'
import { ErrorHandler, formatBalance } from '@/helpers'
import { useCopyToClipboard, useForm } from '@/hooks'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { cn } from '@/theme/utils'
import { UiLogo } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import { UiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSheet,
  UiSheetContent,
  UiSheetHeader,
  UiSheetTitle,
} from '@/ui/UiSheet'

export default function DashboardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const {
    accountsList,
    selectedAccount,
    setSelectedAccount,
    addNewAccount,
    removeAccount,
    aptBalance,
  } = useConfidentialCoinContext()

  const [isAccountsBottomSheet, setIsAccountsBottomSheet] = useState(false)
  const [isAddAccountBottomSheet, setIsAddAccountBottomSheet] = useState(false)
  const [isTransferNativeBottomSheet, setIsTransferNativeBottomSheet] =
    useState(false)

  const handleAddNewAccount = useCallback(
    (privateKeyHex: string) => {
      addNewAccount(privateKeyHex)
      setIsAddAccountBottomSheet(false)
      setIsAccountsBottomSheet(false)
    },
    [addNewAccount],
  )

  const handleTransferNative = useCallback(async () => {
    setIsTransferNativeBottomSheet(false)
  }, [])

  return (
    <div {...rest} className={cn('flex flex-row items-center', className)}>
      <UiLogo />

      <button
        className='mx-auto'
        onClick={() => setIsAccountsBottomSheet(true)}
      >
        <div className='flex flex-row items-center gap-2'>
          <span className='line-clamp-1 max-w-[150] text-center uppercase text-textPrimary'>
            {selectedAccount.accountAddress.toString()}
          </span>

          <ArrowDownIcon size={24} className='text-textPrimary' />
        </div>
      </button>

      <button
        className='p-4 pr-0'
        onClick={() => {
          setIsTransferNativeBottomSheet(true)
        }}
      >
        <div className='flex flex-row items-center gap-2'>
          <span className='uppercase text-textPrimary typography-caption1'>
            {formatBalance(aptBalance, 8)}
          </span>
          <span className='uppercase text-textPrimary typography-caption1'>
            APT
          </span>
        </div>
      </button>

      <UiSheet
        open={isAccountsBottomSheet}
        onOpenChange={setIsAccountsBottomSheet}
      >
        <UiSheetContent className={'bg-backgroundContainer'}>
          <UiSheetHeader>
            <UiSheetTitle>Accounts</UiSheetTitle>
          </UiSheetHeader>
          <div className='flex flex-1 flex-col'>
            <UiSeparator className='my-4' />

            <div className='flex flex-1 flex-col gap-3'>
              {accountsList.map(el => (
                <AccountListItem
                  key={el.accountAddress.toString()}
                  privateKeyHex={el.privateKey.toString()}
                  accountAddress={el.accountAddress.toString()}
                  isActive={
                    selectedAccount.accountAddress.toString().toLowerCase() ===
                    el.accountAddress.toString().toLowerCase()
                  }
                  isRemovable={accountsList.length > 1}
                  onRemove={() => removeAccount(el.accountAddress.toString())}
                  onSelect={() => {
                    setSelectedAccount(el.accountAddress.toString())
                    setIsAccountsBottomSheet(false)
                  }}
                />
              ))}
            </div>

            <UiSeparator className='my-4' />

            <UiButton
              onClick={() => {
                setIsAccountsBottomSheet(false)
                setIsAddAccountBottomSheet(true)
              }}
            >
              Add Account
            </UiButton>
          </div>
        </UiSheetContent>
      </UiSheet>

      <AddNewAccountBottomSheet
        open={isAddAccountBottomSheet}
        onOpenChange={setIsAddAccountBottomSheet}
        onSubmit={handleAddNewAccount}
      />

      <TransferNativeBottomSheet
        open={isTransferNativeBottomSheet}
        onOpenChange={setIsTransferNativeBottomSheet}
        onSubmit={handleTransferNative}
      />
    </div>
  )
}

type AccountListItemProps = {
  privateKeyHex: string
  accountAddress: string
  isActive: boolean
  isRemovable: boolean
  onRemove: () => void
  onSelect: () => void
} & HTMLAttributes<HTMLDivElement>

function AccountListItem({
  privateKeyHex,
  accountAddress,
  className,
  isActive,
  onRemove,
  onSelect,
  isRemovable,
  ...rest
}: AccountListItemProps) {
  const addrCopyManager = useCopyToClipboard()
  const pkCopyManager = useCopyToClipboard()

  return (
    <div
      {...rest}
      className={cn(
        'flex h-[60] flex-row items-center bg-backgroundPure py-2',
        // isActive && 'rounded-md bg-backgroundPrimary',
        className,
      )}
    >
      {isActive && <CheckCircleIcon size={20} className='text-textPrimary' />}

      <button
        onClick={onSelect}
        className='flex h-full flex-1 flex-col justify-center px-4'
      >
        <span className='line-clamp-1 text-center uppercase text-textPrimary'>
          {accountAddress}
        </span>
      </button>

      <motion.div>
        <div className='flex h-full flex-row items-center'>
          {isRemovable && (
            <button
              className='flex min-w-[60] flex-col items-center justify-center self-stretch bg-errorMain'
              onClick={onRemove}
            >
              <TrashIcon size={24} className={'text-baseWhite'} />
            </button>
          )}
          <button
            className='flex min-w-[60] flex-col items-center justify-center self-stretch bg-textSecondary'
            onClick={() => addrCopyManager.copy(accountAddress)}
          >
            {addrCopyManager.isCopied ? (
              <CheckIcon size={18} className={'text-baseWhite'} />
            ) : (
              <CopyIcon size={18} className={'text-baseWhite'} />
            )}
          </button>
          <button
            className='flex min-w-[60] flex-col items-center justify-center self-stretch bg-warningMain'
            onClick={() => pkCopyManager.copy(privateKeyHex)}
          >
            {pkCopyManager.isCopied ? (
              <CheckIcon size={18} className={'text-baseWhite'} />
            ) : (
              <CopyIcon size={18} className={'text-baseWhite'} />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

type AddNewAccountBottomSheetProps = {
  onSubmit: (privateKeyHex: string) => void
} & Omit<ComponentProps<typeof UiSheet>, 'children'>

function AddNewAccountBottomSheet({
  onSubmit,
  ...rest
}: AddNewAccountBottomSheetProps) {
  const { isFormDisabled, handleSubmit, disableForm, enableForm, control } =
    useForm(
      {
        privateKeyHex: '',
      },
      yup =>
        yup.object().shape({
          privateKeyHex: yup
            .string()
            .required('Enter private key')
            .test('The key is not valid', value => {
              return validatePrivateKeyHex(value)
            }),
        }),
    )

  const submit = useCallback(
    () =>
      handleSubmit(formData => {
        disableForm()
        try {
          onSubmit(formData.privateKeyHex)
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [disableForm, enableForm, handleSubmit, onSubmit],
  )

  return (
    <UiSheet {...rest}>
      <UiSheetContent className={'bg-backgroundContainer'}>
        <UiSheetHeader>
          <UiSheetTitle>Add Account</UiSheetTitle>
        </UiSheetHeader>

        <UiSeparator className='my-4' />

        <Controller
          control={control}
          name='privateKeyHex'
          render={({ field }) => {
            return (
              <UiInput
                {...field}
                placeholder='Enter private key'
                disabled={isFormDisabled}
              />
            )
          }}
        />

        <div className='mt-[50] pt-4'>
          <UiSeparator className='mb-4' />
          <div className='flex flex-col gap-3'>
            <UiButton onClick={submit} disabled={isFormDisabled}>
              Import
            </UiButton>
            <UiButton
              onClick={() => onSubmit(generatePrivateKeyHex())}
              disabled={isFormDisabled}
            >
              Create new
            </UiButton>
          </div>
        </div>
      </UiSheetContent>
    </UiSheet>
  )
}

type TransferNativeBottomSheetProps = {
  onSubmit: () => void
} & Omit<ComponentProps<typeof UiSheet>, 'children'>

function TransferNativeBottomSheet({
  onSubmit,
  ...rest
}: TransferNativeBottomSheetProps) {
  const { selectedAccount, aptBalance, addTxHistoryItem, reloadAptBalance } =
    useConfidentialCoinContext()

  const {
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
  } = useForm(
    {
      receiverAccountAddress: '',
      amount: '',
    },
    yup =>
      yup.object().shape({
        receiverAccountAddress: yup.string().required('Enter receiver address'),
        amount: yup
          .number()
          .required('Enter amount')
          .max(Number(BN.fromBigInt(aptBalance, 8).toString())),
      }),
  )

  const clearForm = useCallback(() => {
    setValue('receiverAccountAddress', '')
    setValue('amount', '')
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          const txReceipt = await sendApt(
            selectedAccount.privateKey.toString(),
            formData.receiverAccountAddress,
            formData.amount,
          )
          addTxHistoryItem({
            txHash: txReceipt.hash,
            txType: 'transfer-native',
            createdAt: time().timestamp,
          })
          await reloadAptBalance()
          onSubmit()
          clearForm()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [
      addTxHistoryItem,
      clearForm,
      disableForm,
      enableForm,
      handleSubmit,
      onSubmit,
      reloadAptBalance,
      selectedAccount.privateKey,
    ],
  )

  return (
    <UiSheet {...rest}>
      <UiSheetContent className={'bg-backgroundContainer'}>
        <UiSheetHeader>
          <UiSheetTitle>Send APT</UiSheetTitle>
        </UiSheetHeader>
        <UiSeparator className='my-4' />

        <Controller
          control={control}
          name='receiverAccountAddress'
          render={({ field }) => (
            <UiInput
              {...field}
              placeholder='Enter account address'
              disabled={isFormDisabled}
            />
          )}
        />

        <Controller
          control={control}
          name='amount'
          render={({ field }) => (
            <UiInput
              {...field}
              placeholder='Enter amount'
              type='decimal'
              disabled={isFormDisabled}
            />
          )}
        />

        <div className='mt-[50] pt-4'>
          <UiSeparator className='mb-4' />
          <div className='flex flex-col gap-3'>
            <UiButton onClick={submit} disabled={isFormDisabled}>
              Send
            </UiButton>
          </div>
        </div>
      </UiSheetContent>
    </UiSheet>
  )
}
