'use client'

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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useMeasure } from 'react-use'

import AddTokenForm from '@/app/dashboard/components/AddTokenForm'
import ConfidentialAssetCard from '@/app/dashboard/components/ConfidentialAssetCard'
import DashboardHeader from '@/app/dashboard/components/DashboardHeader'
import TokenInfo from '@/app/dashboard/components/TokenInfo'
import WithdrawForm from '@/app/dashboard/components/WithdrawForm'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatDateDMYT, isMobile } from '@/helpers'
import { useCopyToClipboard } from '@/hooks'
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

import Deposit from './components/Deposit'
import {
  TransferFormSheet,
  useTransferFormSheet,
} from './components/TransferFormSheet'

export default function DashboardClient() {
  const isMobileDevice = isMobile()

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false)
  const [isTokenInfoSheetOpen, setIsTokenInfoSheetOpen] = useState(false)
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false)
  const [isAddTokenSheetOpen, setIsAddTokenSheetOpen] = useState(false)

  const transferFormSheet = useTransferFormSheet()

  const {
    accountsLoadingState,

    selectedToken,
    setSelectedTokenAddress,

    // selectedAccountDecryptionKey,
    selectedAccountDecryptionKeyStatus,

    unfreezeAccount,
    normalizeAccount,
    rolloverAccount,

    loadSelectedDecryptionKeyState,
    decryptionKeyStatusLoadingState,

    txHistory,
    addTxHistoryItem,

    testMintTokens,

    reloadAptBalance,

    perTokenStatuses,
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

  const tryRollover = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const rolloverAccountTxReceipts = await rolloverAccount()

      rolloverAccountTxReceipts.forEach(el => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (el.payload.function.includes('rollover')) {
          addTxHistoryItem({
            txHash: el.hash,
            txType: 'rollover',
            createdAt: time().timestamp,
          })

          tryRefresh()
          return
        }

        addTxHistoryItem({
          txHash: el.hash,
          txType: 'normalize',
          createdAt: time().timestamp,
        })

        tryRefresh()
      })
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, rolloverAccount, tryRefresh])

  const [carouselWrpRef, { width: carouselWidth }] = useMeasure()

  const clearAllParams = useCallback(() => {
    router.replace(`${pathname}?`)
  }, [pathname, router])

  // TODO: enchance to more fabric orchestration
  useEffect(() => {
    if (
      [decryptionKeyStatusLoadingState, accountsLoadingState].every(
        el => el === 'success',
      )
    )
      return

    const action = searchParams.get('action')

    if (!action) return

    if (action === 'send') {
      const asset = searchParams.get('asset')
      const to = searchParams.get('to')

      if (!asset || !to) return

      if (!perTokenStatuses[asset].isRegistered) return

      if (selectedToken.address.toLowerCase() !== asset.toLowerCase()) {
        setSelectedTokenAddress(asset)
      }

      transferFormSheet.open(to)
    }

    clearAllParams()
  }, [
    accountsLoadingState,
    clearAllParams,
    decryptionKeyStatusLoadingState,
    loadSelectedDecryptionKeyState,
    perTokenStatuses,
    searchParams,
    selectedToken.address,
    setSelectedTokenAddress,
    transferFormSheet,
  ])

  return (
    <div className='size-full'>
      <header className='flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
        <DashboardHeader className='' />
      </header>
      <UiSeparator />
      <div className='flex size-full flex-1 flex-col'>
        <div
          key={tokens.length}
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          ref={carouselWrpRef}
          className='w-full self-center py-6'
        >
          <UiCarousel
            baseWidth={carouselWidth}
            items={[
              ...tokens.map((token, idx) => {
                const currTokenStatuses = perTokenStatuses[token.address]

                return (
                  <ConfidentialAssetCard
                    key={idx}
                    className='w-full'
                    token={token}
                    isLoading={
                      decryptionKeyStatusLoadingState === 'loading' ||
                      accountsLoadingState === 'loading'
                    }
                    actualAmount={currTokenStatuses.actualAmount}
                    isNormalized={currTokenStatuses.isNormalized}
                    isFrozen={currTokenStatuses.isFrozen}
                    isRegistered={currTokenStatuses.isRegistered}
                  />
                )
              }),
              <div
                key={tokens.length + 1}
                className='flex w-2/3 flex-col items-center justify-center self-center rounded-2xl bg-componentPrimary py-10'
              >
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
            onIndexChange={index => {
              if (!tokens[index]?.address) return

              setSelectedTokenAddress(tokens[index].address)
            }}
            startIndex={
              tokens.findIndex(el => el.address === selectedToken.address) ?? 0
            }
          />
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
            disabled={isActionsDisabled}
          />

          {Boolean(+perTokenStatuses[selectedToken.address].pendingAmount) && (
            <CircleButton
              caption={'Rollover'}
              iconProps={{
                name: 'RefreshCwIcon',
              }}
              onClick={tryRollover}
              disabled={isActionsDisabled}
            />
          )}

          {!perTokenStatuses[selectedToken.address].isNormalized && (
            <CircleButton
              caption={'Normalize'}
              iconProps={{
                name: 'RefreshCwIcon',
              }}
              onClick={tryNormalize}
              disabled={isActionsDisabled}
            />
          )}
        </div>

        {[decryptionKeyStatusLoadingState, accountsLoadingState].every(
          el => el === 'success',
        ) && (
          <div className='flex flex-col gap-4 p-4'>
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
          </div>
        )}

        <div
          className={cn(
            'mt-12 flex w-full flex-1 flex-col p-4',
            'md:mx-auto md:max-w-[500px]',
          )}
        >
          {txHistory.length ? (
            <div className='flex flex-col gap-6'>
              {txHistory.reverse().map((el, idx) => (
                <TxItem key={idx} {...el} />
              ))}
            </div>
          ) : (
            <div className='my-auto flex flex-col items-center gap-4 self-center'>
              <FolderOpenIcon size={128} className='text-componentDisabled' />

              <span className='text-textSecondary typography-subtitle2'>
                No transactions yet.
              </span>
            </div>
          )}
        </div>
      </div>

      <UiSheet open={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen}>
        <UiSheetContent
          side={isMobileDevice ? 'bottom' : 'right'}
          className={'max-h-[80dvh] overflow-y-scroll md:max-h-none'}
        >
          <UiSheetHeader>
            <UiSheetTitle>Deposit {selectedToken.name}</UiSheetTitle>
          </UiSheetHeader>
          <UiSeparator className='mb-4 mt-2' />
          <Deposit
            onSubmit={() => {
              setIsDepositSheetOpen(false)
              tryRefresh()
            }}
          />
        </UiSheetContent>
      </UiSheet>
      <UiSheet
        open={isTokenInfoSheetOpen}
        onOpenChange={setIsTokenInfoSheetOpen}
      >
        <UiSheetContent side={isMobileDevice ? 'bottom' : 'right'}>
          <UiSheetHeader>
            <UiSheetTitle>Token Info</UiSheetTitle>
          </UiSheetHeader>

          <UiSeparator className='mb-4 mt-2' />

          <TokenInfo token={selectedToken} />
        </UiSheetContent>
      </UiSheet>
      <UiSheet open={isWithdrawSheetOpen} onOpenChange={setIsWithdrawSheetOpen}>
        <UiSheetContent side={isMobileDevice ? 'bottom' : 'right'}>
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

      <UiSheet open={isAddTokenSheetOpen} onOpenChange={setIsAddTokenSheetOpen}>
        <UiSheetContent
          side={isMobileDevice ? 'bottom' : 'right'}
          className='max-h-[70dvh] overflow-y-scroll md:max-h-none'
        >
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
    </div>
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
      className={cn(
        'flex flex-col items-center gap-2 text-center disabled:opacity-50',
        className,
      )}
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
