'use client'

import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  EditIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  FolderSyncIcon,
  HandCoinsIcon,
  IdCardIcon,
  KeyIcon,
  LockIcon,
  UnlockIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useMeasure } from 'react-use'

import { getTxExplorerUrl } from '@/api/modules/aptos'
import AddTokenForm from '@/app/dashboard/components/AddTokenForm'
import ConfidentialAssetCard from '@/app/dashboard/components/ConfidentialAssetCard'
import DashboardHeader from '@/app/dashboard/components/DashboardHeader'
import TokenInfo from '@/app/dashboard/components/TokenInfo'
import WithdrawForm from '@/app/dashboard/components/WithdrawForm'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatDateDMYT, isMobile } from '@/helpers'
import { TxHistoryItem } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSheet,
  UiSheetContent,
  UiSheetHeader,
  UiSheetTitle,
} from '@/ui/UiSheet'

import ConfidentialAssetCardLoader from './components/ConfidentialAssetCardLoader'
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

    tokensLoadingState,

    selectedToken,
    setSelectedTokenAddress,

    selectedAccountDecryptionKeyStatus,

    loadSelectedDecryptionKeyState,
    decryptionKeyStatusLoadingState,

    reloadAptBalance,

    perTokenStatuses,
    tokens,
  } = useConfidentialCoinContext()

  const isLoading = [
    decryptionKeyStatusLoadingState,
    accountsLoadingState,
    tokensLoadingState,
  ].includes('loading')

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

  // const tryUnfreeze = useCallback(async () => {
  //   setIsSubmitting(true)
  //   try {
  //     const txReceipt = await unfreezeAccount()
  //     addTxHistoryItem({
  //       txHash: txReceipt.hash,
  //       txType: 'unfreeze',
  //       createdAt: time().timestamp,
  //     })
  //     await tryRefresh()
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  //   setIsSubmitting(false)
  // }, [addTxHistoryItem, tryRefresh, unfreezeAccount])

  const [carouselWrpRef] = useMeasure()

  const clearAllParams = useCallback(() => {
    router.replace(`${pathname}?`)
  }, [pathname, router])

  // TODO: enchance to more fabric orchestration
  useEffect(() => {
    if (
      [
        decryptionKeyStatusLoadingState,
        accountsLoadingState,
        tokensLoadingState,
      ].every(el => el === 'success')
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
    tokensLoadingState,
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
          {(() => {
            if (isLoading) {
              return <ConfidentialAssetCardLoader />
            }

            return tokens.map((token, idx) => {
              const currTokenStatuses = perTokenStatuses[token.address]

              return (
                <ConfidentialAssetCard
                  key={idx}
                  className='w-full'
                  token={token}
                  pendingAmount={currTokenStatuses.pendingAmount}
                  actualAmount={currTokenStatuses.actualAmount}
                  isNormalized={currTokenStatuses.isNormalized}
                  isFrozen={currTokenStatuses.isFrozen}
                  isRegistered={currTokenStatuses.isRegistered}
                />
              )
            })
          })()}

          {/* <UiCarousel
            baseWidth={carouselWidth}
            items={[
              ...tokens.map((token, idx) => {
                const currTokenStatuses = perTokenStatuses[token.address]

                return (
                  <ConfidentialAssetCard
                    key={idx}
                    className='w-full'
                    token={token}
                    isLoading={[
                      decryptionKeyStatusLoadingState,
                      accountsLoadingState,
                      tokensLoadingState,
                    ].includes('loading')}
                    pendingAmount={currTokenStatuses.pendingAmount}
                    actualAmount={currTokenStatuses.actualAmount}
                    isNormalized={currTokenStatuses.isNormalized}
                    isFrozen={currTokenStatuses.isFrozen}
                    isRegistered={currTokenStatuses.isRegistered}
                  />
                )
              }),
              // TODO: uncomment when want to add new tokens
              // <div
              //   key={tokens.length + 1}
              //   className='flex w-2/3 flex-col items-center justify-center self-center rounded-2xl bg-componentPrimary py-10'
              // >
              //   <button
              //     className='flex flex-col items-center gap-2 uppercase'
              //     onClick={() => {
              //       setIsAddTokenSheetOpen(true)
              //     }}
              //   >
              //     <PlusCircleIcon
              //       size={64}
              //       className='text-textPrimary typography-caption1'
              //     />
              //     Add Token
              //   </button>
              // </div>,
            ]}
            onIndexChange={index => {
              if (!tokens[index]?.address) return

              setSelectedTokenAddress(tokens[index].address)
            }}
            startIndex={
              tokens.findIndex(el => el.address === selectedToken.address) ?? 0
            }
          /> */}
        </div>

        <div className='flex w-full flex-row items-center justify-center gap-8 self-center md:max-w-[50%]'>
          <CircleButton
            className='flex-1'
            caption={'Deposit'}
            iconProps={{
              name: 'CircleDollarSignIcon',
            }}
            onClick={() => {
              setIsDepositSheetOpen(true)
            }}
          />

          {/* <CircleButton
            caption={'Token Info'}
            iconProps={{
              name: 'InfoIcon',
            }}
            onClick={() => {
              setIsTokenInfoSheetOpen(true)
            }}
          /> */}

          <CircleButton
            className='flex-1 text-errorMain'
            caption={'Publicly Withdraw'}
            iconProps={{
              name: 'EarthIcon',
            }}
            onClick={() => {
              setIsWithdrawSheetOpen(true)
            }}
            disabled={isActionsDisabled}
          />

          <CircleButton
            className='flex-1 text-successMain'
            caption={'Send Confidentially'}
            iconProps={{
              name: 'EarthLockIcon',
            }}
            onClick={() => {
              transferFormSheet.open()
            }}
            disabled={isActionsDisabled}
          />
        </div>

        {/* {[decryptionKeyStatusLoadingState, accountsLoadingState, tokensLoadingState].every(
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
            </>
          </div>
        )} */}

        {/* <div
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
            <div className='flex w-full flex-col items-center gap-4 self-center'>
              <TxEmptyComponent />
            </div>
          )}
        </div> */}
      </div>

      <UiSheet open={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen}>
        <UiSheetContent
          side={isMobileDevice ? 'bottom' : 'right'}
          className={'max-h-[80dvh] overflow-y-scroll md:max-h-none'}
        >
          <UiSheetHeader>
            <UiSheetTitle className='flex items-center gap-2'>
              <UiIcon
                name='CircleDollarSignIcon'
                size={18}
                className='text-textPrimary'
              />
              Deposit {selectedToken.name}
            </UiSheetTitle>
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
            <UiSheetTitle>Publicly Withdraw</UiSheetTitle>
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

// eslint-disable-next-line unused-imports/no-unused-vars
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

      <Link
        href={getTxExplorerUrl(txHash)}
        target='_blank'
        className='ml-auto p-4'
      >
        <ExternalLinkIcon size={18} className='text-textSecondary' />
      </Link>
    </div>
  )
}

// eslint-disable-next-line unused-imports/no-unused-vars
function TxEmptyComponent({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('relative isolate flex w-full flex-col gap-4', className)}
    >
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex flex-row items-center gap-4 py-3 opacity-20',
              className,
            )}
          >
            <div className='size-[48px] rounded-full bg-muted' />
            <div className='flex flex-1 flex-col gap-2'>
              <div className='h-4 w-[120px] bg-muted' />
              <div className='h-4 w-[80px] bg-muted' />
            </div>
            <div className='size-6 rounded-full bg-muted' />
          </div>
        ))}

      <div className='absolute-center flex flex-col items-center'>
        <FolderOpenIcon size={128} className='text-componentDisabled' />

        <span className='typography-subtitle2 text-textSecondary'>
          No transactions yet.
        </span>
      </div>
    </div>
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
        'flex flex-col items-center gap-2 text-center text-textSecondary disabled:opacity-50',
        className,
      )}
    >
      <span className='flex size-10 items-center justify-center rounded-[50%] bg-componentPrimary'>
        <UiIcon
          {...iconProps}
          className={cn('size-4 text-textPrimary', iconProps.className)}
        />
      </span>
      <span className='typography-caption3 uppercase'>{caption}</span>
    </button>
  )
}
