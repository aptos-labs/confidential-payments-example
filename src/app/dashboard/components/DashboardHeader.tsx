'use client'

import { Account } from '@aptos-labs/ts-sdk'
import { BN, time } from '@distributedlab/tools'
import Avatar from 'boring-avatars'
import { jwtDecode } from 'jwt-decode'
import { CheckIcon, CopyIcon, EllipsisIcon, TrashIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type ComponentProps,
  HTMLAttributes,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { Controller } from 'react-hook-form'

import {
  generatePrivateKeyHex,
  getAccountExplorerUrl,
  sendApt,
  validatePrivateKeyHex,
} from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { abbrCenter, ErrorHandler, isMobile } from '@/helpers'
import { useCopyToClipboard, useForm } from '@/hooks'
import { authStore } from '@/store/auth'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import {
  UiDropdownMenu,
  UiDropdownMenuContent,
  UiDropdownMenuItem,
  UiDropdownMenuTrigger,
} from '@/ui/UiDropdownMenu'
import { UiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSheet,
  UiSheetContent,
  UiSheetHeader,
  UiSheetTitle,
} from '@/ui/UiSheet'
import UiThemeSwitcher from '@/ui/UiThemeSwitcher'

export default function DashboardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const isMobileDevice = isMobile()
  const router = useRouter()

  const logout = authStore.useLogout({
    onSuccess: () => {
      router.push('/')
    },
  })

  const {
    accountsList,
    selectedAccount,
    setSelectedAccount,
    addNewAccount,
    removeAccount,
  } = useConfidentialCoinContext()

  const [isAccountsBottomSheet, setIsAccountsBottomSheet] = useState(false)
  const [isAddAccountBottomSheet, setIsAddAccountBottomSheet] = useState(false)
  const [isTransferNativeBottomSheet, setIsTransferNativeBottomSheet] =
    useState(false)

  const keylessPubAcc = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!selectedAccount.jwt) return

    const decodedJwt = jwtDecode<{
      name: string
      picture: string

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
    }>(selectedAccount.jwt)

    return {
      name: decodedJwt.name,
      avatarUrl: decodedJwt.picture,
    }
  }, [selectedAccount])

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

  const { copy, isCopied } = useCopyToClipboard()

  return (
    <div {...rest} className={cn('flex items-center', className)}>
      <UiDropdownMenu>
        <UiDropdownMenuTrigger asChild>
          <button className='flex flex-row items-center gap-2'>
            {keylessPubAcc ? (
              <Image
                src={keylessPubAcc.avatarUrl}
                alt={keylessPubAcc.name}
                width={24}
                height={24}
                className='rounded-full'
              />
            ) : (
              <Avatar
                name={selectedAccount.accountAddress.toString()}
                size={24}
              />
            )}

            <div className='max-w-[200px] overflow-hidden text-ellipsis'>
              <span
                className={cn(
                  'typography-subtitle4 w-full whitespace-nowrap text-textPrimary',
                  !keylessPubAcc && 'uppercase',
                )}
              >
                {keylessPubAcc
                  ? keylessPubAcc.name
                  : abbrCenter(selectedAccount.accountAddress.toString())}
              </span>
            </div>

            <UiIcon
              name='ChevronDownIcon'
              className='hidden size-4 text-textPrimary md:block'
            />
            <UiIcon
              name='ChevronUpIcon'
              className='block size-4 text-textPrimary md:hidden'
            />
          </button>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent>
          <UiDropdownMenuItem>
            <Link
              className='flex w-full items-center gap-2'
              href={getAccountExplorerUrl(
                selectedAccount.accountAddress.toString(),
              )}
              target='_blank'
            >
              <UiIcon name='ExternalLinkIcon' className='size-4' />
              <span className='typography-caption1 text-textPrimary'>
                Account
              </span>
            </Link>
          </UiDropdownMenuItem>
          <UiDropdownMenuItem>
            <button
              className='flex w-full items-center justify-between gap-2'
              onClick={() => copy(selectedAccount.accountAddress.toString())}
            >
              <span className='typography-caption1 text-textPrimary'>
                {abbrCenter(selectedAccount.accountAddress.toString())}
              </span>

              {isCopied ? (
                <UiIcon name='CheckIcon' className='size-4' />
              ) : (
                <UiIcon name='CopyIcon' className='size-4' />
              )}
            </button>
          </UiDropdownMenuItem>
          <UiDropdownMenuItem>
            <div className='mx-auto'>
              <UiThemeSwitcher />
            </div>
          </UiDropdownMenuItem>
          <UiDropdownMenuItem onClick={logout}>
            Logout
            <UiIcon
              name='LogOutIcon'
              className='ml-auto size-4 -scale-x-100 text-errorMain'
            />
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>

      <UiSheet
        open={isAccountsBottomSheet}
        onOpenChange={setIsAccountsBottomSheet}
      >
        <UiSheetContent
          side={isMobileDevice ? 'top' : 'left'}
          className='flex flex-col'
        >
          <UiSheetHeader>
            {isMobileDevice && (
              <button onClick={logout} className='md:hidden'>
                <UiIcon
                  name='LogOutIcon'
                  className='size-4 -scale-x-100 text-errorMain'
                />
              </button>
            )}
            <UiSheetTitle>Accounts</UiSheetTitle>
          </UiSheetHeader>
          <div className='flex flex-1 flex-col'>
            <UiSeparator className='my-4' />

            <div className='flex flex-1 flex-col gap-3'>
              {accountsList.map(el => {
                const isAptAccount = el instanceof Account

                const nameOrAddr = isAptAccount
                  ? el.accountAddress.toString()
                  : el.name

                return (
                  <AccountListItem
                    key={nameOrAddr}
                    // privateKeyHex={el.privateKey.toString()}
                    avatarUrl={!isAptAccount ? el.avatarUrl : undefined}
                    accountAddress={nameOrAddr}
                    isActive={
                      isAptAccount
                        ? selectedAccount.accountAddress
                            .toString()
                            .toLowerCase() ===
                          el.accountAddress.toString().toLowerCase()
                        : true
                    }
                    isRemovable={accountsList.length > 1}
                    onRemove={() => removeAccount(nameOrAddr)}
                    onSelect={async () => {
                      if (
                        isAptAccount
                          ? selectedAccount.accountAddress
                              .toString()
                              .toLowerCase() ===
                            el.accountAddress.toString().toLowerCase()
                          : true
                      ) {
                        setIsAccountsBottomSheet(false)
                        return
                      }

                      await setSelectedAccount(
                        isAptAccount
                          ? { accountAddressHex: el.accountAddress.toString() }
                          : { pubKeylessAcc: el },
                      )
                      setIsAccountsBottomSheet(false)
                    }}
                  />
                )
              })}
            </div>

            <UiSeparator className='my-4' />

            <div className='flex flex-col gap-3'>
              {/* <UiButton
                onClick={() => {
                  setIsAccountsBottomSheet(false)
                  setIsAddAccountBottomSheet(true)
                }}
              >
                Add Account
              </UiButton> */}

              {!isMobileDevice && (
                <UiButton
                  onClick={logout}
                  className='mt-auto'
                  variant='outline'
                >
                  Logout
                  <UiIcon
                    name='LogOutIcon'
                    className='size-4 -scale-x-100 text-errorMain'
                  />
                </UiButton>
              )}
            </div>
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
  avatarUrl?: string
  accountAddress: string
  isActive: boolean
  isRemovable: boolean
  onRemove: () => void
  onSelect: () => void
} & HTMLAttributes<HTMLDivElement>

function AccountListItem({
  avatarUrl,
  accountAddress,
  className,
  isActive,
  onRemove,
  onSelect,
  isRemovable,
  ...rest
}: AccountListItemProps) {
  const addrCopyManager = useCopyToClipboard()
  // const pkCopyManager = useCopyToClipboard()

  return (
    <div
      {...rest}
      className={cn(
        'flex items-center gap-2',
        isActive && 'rounded-xl bg-componentPrimary px-2',
        className,
      )}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={accountAddress}
          width={40}
          height={40}
          className={'rounded-full'}
        />
      ) : (
        <Avatar name={accountAddress} size={40} />
      )}

      <button
        type='button'
        onClick={onSelect}
        className='overflow-hidden text-ellipsis'
      >
        <span className='typography-caption2 text-center uppercase text-textPrimary'>
          {accountAddress}
        </span>
      </button>

      <div className='ml-auto text-textPrimary'>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger asChild>
            <EllipsisIcon className='size-5' />
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent>
            <UiDropdownMenuItem
              onClick={() => addrCopyManager.copy(accountAddress)}
            >
              {addrCopyManager.isCopied ? (
                <CheckIcon className={'size-4'} />
              ) : (
                <CopyIcon className={'size-4'} />
              )}
              Copy public
            </UiDropdownMenuItem>
            {/* <UiDropdownMenuItem
            // onClick={() => pkCopyManager.copy(privateKeyHex)}
            >
              {pkCopyManager.isCopied ? (
                <CheckIcon className={'size-4'} />
              ) : (
                <CopyIcon className={'size-4'} />
              )}
              Copy private
            </UiDropdownMenuItem> */}

            {isRemovable && (
              <UiDropdownMenuItem
                className='flex items-center gap-2'
                onClick={onRemove}
              >
                <TrashIcon className={'size-4 text-errorMain'} />
                Delete
              </UiDropdownMenuItem>
            )}
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>
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
  const isMobileDevice = isMobile()

  const {
    formState,
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
  } = useForm(
    {
      privateKeyHex: '',
    },
    yup =>
      yup.object().shape({
        privateKeyHex: yup
          .string()
          .required('Enter private key')
          .test('twistedEd25519Key', 'The key is not valid', value => {
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
      <UiSheetContent side={isMobileDevice ? 'bottom' : 'right'}>
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
            <UiButton
              onClick={submit}
              disabled={isFormDisabled || !formState.privateKeyHex}
            >
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
    formState,
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
            selectedAccount,
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
      selectedAccount,
    ],
  )

  return (
    <UiSheet {...rest}>
      <UiSheetContent side='bottom'>
        <UiSheetHeader>
          <UiSheetTitle>Send APT</UiSheetTitle>
        </UiSheetHeader>
        <UiSeparator className='my-4' />

        <div className='flex flex-col gap-4'>
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
                type='number'
                disabled={isFormDisabled}
              />
            )}
          />
        </div>

        <div className='mt-[50] pt-4'>
          <UiSeparator className='mb-4' />
          <div className='flex flex-col gap-3'>
            <UiButton
              onClick={submit}
              disabled={
                isFormDisabled ||
                !formState.amount ||
                !formState.receiverAccountAddress
              }
            >
              Send
            </UiButton>
          </div>
        </div>
      </UiSheetContent>
    </UiSheet>
  )
}
