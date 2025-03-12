import { time } from '@distributedlab/tools'
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  HandCoinsIcon,
  IdCardIcon,
  KeyIcon,
  LockIcon,
  PlusCircleIcon,
  Snowflake,
  TriangleAlertIcon,
  UnlockIcon,
} from 'lucide-react'
import {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  ReactElement,
  useCallback,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTimeoutFn } from 'react-use'

import { ErrorHandler, formatDateDMYT } from '@/helpers'
import { useCopyToClipboard } from '@/hooks'
import AddTokenForm from '@/pages/Dashboard/components/AddTokenForm'
import ConfidentialAssetCard from '@/pages/Dashboard/components/ConfidentialAssetCard'
import DashboardHeader from '@/pages/Dashboard/components/DashboardHeader'
import { DashboardSidebar } from '@/pages/Dashboard/components/DashboardSidebar'
import TokenInfo from '@/pages/Dashboard/components/TokenInfo'
import WithdrawForm from '@/pages/Dashboard/components/WithdrawForm'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { TxHistoryItem } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import UiCarousel from '@/ui/UiCarousel'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSheet,
  UiSheetContent,
  UiSheetHeader,
  UiSheetTitle,
} from '@/ui/UiSheet'
import {
  UiSidebarInset,
  UiSidebarProvider,
  UiSidebarTrigger,
} from '@/ui/UiSidebar'

import Deposit from './components/Deposit'
import {
  TransferFormSheet,
  useTransferFormSheet,
} from './components/TransferFormSheet'

export default function Dashboard() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false)
  const [isTokenInfoSheetOpen, setIsTokenInfoSheetOpen] = useState(false)
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false)
  const [isAddTokenSheetOpen, setIsAddTokenSheetOpen] = useState(false)

  const transferFormSheet = useTransferFormSheet()

  const {
    selectedToken,
    setSelectedTokenAddress,

    // selectedAccountDecryptionKey,
    selectedAccountDecryptionKeyStatus,

    registerAccountEncryptionKey,
    unfreezeAccount,
    normalizeAccount,

    loadSelectedDecryptionKeyState,
    // decryptionKeyStatusLoadingState,

    txHistory,
    addTxHistoryItem,

    testMintTokens,

    reloadAptBalance,

    perTokenStatuses,
    selectedAccountDecryptionKey,
    tokens,
  } = useConfidentialCoinContext()

  const isActionsDisabled =
    !selectedAccountDecryptionKeyStatus.isRegistered || isSubmitting

  const [, setIsRefreshing] = useState(false)

  const tryRefresh = useCallback(async () => {
    setIsSubmitting(true)
    setIsRefreshing(true)
    try {
      await Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()])
    } catch (error) {
      ErrorHandler.processWithoutFeedback(error)
    }
    setIsRefreshing(false)
    setIsSubmitting(false)
  }, [loadSelectedDecryptionKeyState, reloadAptBalance])

  const tryUnfreeze = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const txReceipt = await unfreezeAccount()
      addTxHistoryItem({
        txHash: txReceipt.hash,
        txType: 'unfreeze',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, tryRefresh, unfreezeAccount])

  const tryRegister = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const txReceipt = await registerAccountEncryptionKey(
        selectedToken.address,
      )
      addTxHistoryItem({
        txHash: txReceipt.hash,
        txType: 'register',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [
    addTxHistoryItem,
    registerAccountEncryptionKey,
    selectedToken.address,
    tryRefresh,
  ])

  const tryNormalize = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const txReceipt = await normalizeAccount()
      addTxHistoryItem({
        txHash: txReceipt.hash,
        txType: 'normalize',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, normalizeAccount, tryRefresh])

  const tryTestMint = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const [mintTxReceipt, depositTxReceipt] = await testMintTokens()
      addTxHistoryItem({
        txHash: mintTxReceipt.hash,
        txType: 'mint',
        createdAt: time().timestamp,
      })
      addTxHistoryItem({
        txHash: depositTxReceipt.hash,
        txType: 'deposit',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, testMintTokens, tryRefresh])

  const carouselWrpRef = useRef<HTMLDivElement>(null)

  const [searchParams] = useSearchParams()

  // TODO: enchance to more fabric orchestration
  useTimeoutFn(async () => {
    const action = searchParams.get('action')

    if (!action) return

    if (action === 'send') {
      const asset = searchParams.get('asset')
      const to = searchParams.get('to')

      if (!asset || !to) return

      if (selectedToken.address.toLowerCase() !== asset.toLowerCase()) {
        setSelectedTokenAddress(asset)
      }

      transferFormSheet.open(to)
    }
  }, 500)

  return (
    <UiSidebarProvider>
      <DashboardSidebar />
      <UiSidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
          <UiSidebarTrigger className='-ml-1' />

          <DashboardHeader className='ml-auto' />
        </header>
        <UiSeparator />
        <div className='flex size-full flex-1 flex-col'>
          <div ref={carouselWrpRef} className='w-full self-center'>
            {carouselWrpRef.current && (
              <UiCarousel
                baseWidth={carouselWrpRef.current?.clientWidth}
                items={[
                  ...tokens.map((token, idx) => {
                    const currTokenStatuses = perTokenStatuses[token.address]

                    return (
                      <ConfidentialAssetCard
                        key={idx}
                        className='w-full'
                        token={token}
                        encryptionKey={selectedAccountDecryptionKey
                          .publicKey()
                          .toString()}
                        pendingAmount={currTokenStatuses.pendingAmount}
                        actualAmount={currTokenStatuses.actualAmount}
                        isNormalized={currTokenStatuses.isNormalized}
                        isFrozen={currTokenStatuses.isFrozen}
                        isRegistered={currTokenStatuses.isRegistered}
                        onRollover={() => {}}
                      />
                    )
                  }),
                  <div className='flex w-2/3 flex-col items-center justify-center self-center rounded-2xl bg-componentPrimary py-10'>
                    <button
                      className='flex flex-col items-center gap-2 uppercase'
                      onClick={() => {
                        setIsAddTokenSheetOpen(true)
                      }}
                    >
                      <PlusCircleIcon
                        size={64}
                        className='text-textPrimary typography-caption1'
                      />
                      Add Token
                    </button>
                  </div>,
                ]}
              />
            )}
          </div>

          <div className='flex w-full flex-row items-center justify-center gap-8'>
            <CircleButton
              caption={'Deposit'}
              iconProps={{
                name: 'ArrowDownIcon',
              }}
              onClick={() => {
                setIsDepositSheetOpen(true)
              }}
            />

            <CircleButton
              caption={'Token Info'}
              iconProps={{
                name: 'InfoIcon',
              }}
              onClick={() => {
                setIsTokenInfoSheetOpen(true)
              }}
            />

            <CircleButton
              caption={'Withdraw'}
              iconProps={{
                name: 'ArrowUpIcon',
              }}
              onClick={() => {
                setIsWithdrawSheetOpen(true)
              }}
              disabled={isActionsDisabled}
            />

            <CircleButton
              caption={'Send'}
              iconProps={{
                name: 'ArrowRightIcon',
              }}
              onClick={() => {
                transferFormSheet.open()
              }}
              // disabled={isActionsDisabled}
            />
          </div>

          <div className='flex flex-col gap-4 p-4'>
            {!selectedAccountDecryptionKeyStatus.isRegistered ? (
              <ActionCard
                title='Register Balance'
                desc='Lorem ipsum dolor sit amet concestetur! Lorem ipsum dolor sit amet!'
                leadingContent={
                  <UiIcon
                    name={'IdCardIcon'}
                    className='size-8 text-textPrimary'
                  />
                }
                onClick={tryRegister}
                disabled={isSubmitting}
              />
            ) : (
              <>
                {selectedAccountDecryptionKeyStatus.isFrozen && (
                  <ActionCard
                    title='Unfreeze Balance'
                    desc='Lorem ipsum dolor sit amet concestetur! Lorem ipsum dolor sit amet!'
                    leadingContent={
                      <Snowflake
                        size={32}
                        className='self-center text-textPrimary'
                      />
                    }
                    onClick={tryUnfreeze}
                    disabled={isSubmitting}
                  />
                )}

                {!selectedAccountDecryptionKeyStatus.isNormalized && (
                  <ActionCard
                    title='Normalize Balance'
                    desc='Lorem ipsum dolor sit amet concestetur! Lorem ipsum dolor sit amet!'
                    leadingContent={
                      <TriangleAlertIcon
                        size={32}
                        className='self-center text-textPrimary'
                      />
                    }
                    onClick={tryNormalize}
                    disabled={isSubmitting}
                  />
                )}

                <ActionCard
                  title='Test Mint'
                  desc='Mint 10 test tokens'
                  leadingContent={
                    <HandCoinsIcon
                      size={32}
                      className='self-center text-textPrimary'
                    />
                  }
                  onClick={tryTestMint}
                  disabled={isSubmitting}
                />
              </>
            )}
          </div>

          <div className='flex w-full flex-1 flex-col overflow-hidden rounded-t-[24px] bg-componentPrimary'>
            <div className='flex w-full flex-1 flex-col'>
              {txHistory.length ? (
                <div className='flex flex-col gap-6'>
                  {txHistory.reverse().map((el, idx) => (
                    <TxItem key={idx} {...el} />
                  ))}
                </div>
              ) : (
                <div className='my-auto flex flex-col items-center gap-4 self-center'>
                  <FolderOpenIcon
                    size={128}
                    className='text-componentDisabled'
                  />

                  <span className='text-textSecondary typography-subtitle2'>
                    No transactions yet.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <UiSheet open={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen}>
          <UiSheetContent>
            <UiSheetHeader>
              <UiSheetTitle>Deposit</UiSheetTitle>
            </UiSheetHeader>
            <UiSeparator className='mb-4 mt-2' />
            <Deposit />
          </UiSheetContent>
        </UiSheet>
        <UiSheet
          open={isTokenInfoSheetOpen}
          onOpenChange={setIsTokenInfoSheetOpen}
        >
          <UiSheetContent>
            <UiSheetHeader>
              <UiSheetTitle>Token Info</UiSheetTitle>
            </UiSheetHeader>

            <UiSeparator className='mb-4 mt-2' />

            <TokenInfo token={selectedToken} />
          </UiSheetContent>
        </UiSheet>
        <UiSheet
          open={isWithdrawSheetOpen}
          onOpenChange={setIsWithdrawSheetOpen}
        >
          <UiSheetContent>
            <UiSheetHeader>
              <UiSheetTitle>Withdraw</UiSheetTitle>
            </UiSheetHeader>
            <UiSeparator className='mb-4 mt-2' />
            <WithdrawForm
              token={selectedToken}
              onSubmit={() => {
                setIsWithdrawSheetOpen(false)
              }}
            />
          </UiSheetContent>
        </UiSheet>

        <TransferFormSheet
          ref={transferFormSheet.ref}
          token={selectedToken}
          onSubmit={() => {
            transferFormSheet.close()
          }}
        />

        <UiSheet
          open={isAddTokenSheetOpen}
          onOpenChange={setIsAddTokenSheetOpen}
        >
          <UiSheetContent>
            <UiSheetHeader>
              <UiSheetTitle>Add Token</UiSheetTitle>
            </UiSheetHeader>
            <UiSeparator className='mb-4 mt-2' />
            <AddTokenForm
              onSubmit={() => {
                setIsAddTokenSheetOpen(false)
              }}
            />
          </UiSheetContent>
        </UiSheet>
      </UiSidebarInset>
    </UiSidebarProvider>
  )
}

function TxItem({
  createdAt,
  txType,
  txHash,
  ...rest
}: HTMLAttributes<HTMLDivElement> & TxHistoryItem) {
  const message = {
    transfer: 'Transfer',
    ['transfer-native']: 'Send APT',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    rollover: 'Rollover',
    'key-rotation': 'Key rotation',
    freeze: 'Freeze',
    unfreeze: 'Unfreeze',
    register: 'Register',
    normalize: 'Normalize',
    mint: 'Mint',
  }[txType]

  const icon = {
    transfer: <ArrowRightIcon size={24} className={cn('text-textPrimary')} />,
    ['transfer-native']: (
      <ArrowRightIcon size={24} className={cn('text-textPrimary')} />
    ),
    deposit: <ArrowDownIcon size={24} className={cn('text-textPrimary')} />,
    withdraw: <ArrowUpIcon size={24} className={cn('text-textPrimary')} />,
    rollover: <FolderSyncIcon size={24} className={cn('text-textPrimary')} />,
    'key-rotation': <KeyIcon size={24} className={cn('text-textPrimary')} />,
    freeze: <LockIcon size={24} className={cn('text-textPrimary')} />,
    unfreeze: <UnlockIcon size={24} className={cn('text-textPrimary')} />,
    register: <IdCardIcon size={24} className={cn('text-textPrimary')} />,
    normalize: <EditIcon size={24} className={cn('text-textPrimary')} />,
    mint: <HandCoinsIcon size={24} className={cn('text-textPrimary')} />,
  }[txType]

  const { isCopied, copy } = useCopyToClipboard()

  return (
    <div
      {...rest}
      className={cn('flex flex-row items-center gap-4', rest.className)}
    >
      <div className='flex size-[48] flex-col items-center justify-center rounded-full bg-componentSelected'>
        {icon}
      </div>
      <div className='flex flex-col gap-2'>
        {createdAt && (
          <span className='text-textPrimary'>{formatDateDMYT(createdAt)}</span>
        )}
        <span className='text-textPrimary'>{message}</span>
      </div>

      <button className='ml-auto p-4' onClick={() => copy(txHash)}>
        {isCopied ? (
          <CheckIcon size={18} className={'text-textSecondary'} />
        ) : (
          <CopyIcon size={18} className={'text-textSecondary'} />
        )}
      </button>
    </div>
  )
}

function ActionCard({
  title,
  desc,
  leadingContent,
  disabled,
  ...rest
}: {
  title: string
  desc?: string
  leadingContent?: ReactElement
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'flex flex-row gap-4 rounded-2xl bg-componentPrimary p-4',
        disabled && 'opacity-50',
        rest.className,
      )}
      disabled={disabled}
    >
      {leadingContent}
      <div className='flex flex-1 flex-col items-start text-left'>
        <span className='text-textPrimary typography-subtitle2'>{title}</span>
        {desc && (
          <span className='text-textSecondary typography-body3'>{desc}</span>
        )}
      </div>
      <div className='flex size-9 flex-col items-center justify-center self-center rounded-full bg-componentSelected'>
        <UiIcon name={'ChevronRightIcon'} className='size-6 text-textPrimary' />
      </div>
    </button>
  )
}

function CircleButton({
  caption,
  iconProps,
  className,
  ...rest
}: {
  caption?: string
  iconProps: ComponentProps<typeof UiIcon>
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn('flex flex-col items-center gap-2 text-center', className)}
    >
      <span className='flex size-10 items-center justify-center rounded-[50%] bg-componentPrimary'>
        <UiIcon
          {...iconProps}
          className={cn('size-4 text-textPrimary', iconProps.className)}
        />
      </span>
      <span className='uppercase text-textSecondary typography-caption3'>
        {caption}
      </span>
    </button>
  )
}
