'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ButtonHTMLAttributes,
  ComponentProps,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useMeasure } from 'react-use';

import AddTokenForm from '@/app/dashboard/components/AddTokenForm';
import ConfidentialAssetCard from '@/app/dashboard/components/ConfidentialAssetCard';
import DashboardHeader from '@/app/dashboard/components/DashboardHeader';
import TokenInfo from '@/app/dashboard/components/TokenInfo';
import WithdrawForm from '@/app/dashboard/components/WithdrawForm';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, isMobile } from '@/helpers';
import { cn } from '@/theme/utils';
import { UiIcon } from '@/ui';
import { UiSeparator } from '@/ui/UiSeparator';
import { UiSheet, UiSheetContent, UiSheetHeader, UiSheetTitle } from '@/ui/UiSheet';

import ActivitiesFeed from './components/ActivitiesFeed';
import ConfidentialAssetCardLoader from './components/ConfidentialAssetCardLoader';
import Deposit from './components/Deposit';
import {
  TransferFormSheet,
  useTransferFormSheet,
} from './components/TransferFormSheet';

export default function DashboardClient() {
  const isMobileDevice = isMobile();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const [isTokenInfoSheetOpen, setIsTokenInfoSheetOpen] = useState(false);
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
  const [isAddTokenSheetOpen, setIsAddTokenSheetOpen] = useState(false);

  const transferFormSheet = useTransferFormSheet();

  const {
    accountsLoadingState,

    tokensLoadingState,

    selectedToken,
    setSelectedTokenAddress,

    selectedAccountDecryptionKeyStatus,

    loadSelectedDecryptionKeyState,
    decryptionKeyStatusLoadingState,

    reloadPrimaryTokenBalance,

    perTokenStatuses,
    tokens,
  } = useConfidentialCoinContext();

  const isLoading = [
    decryptionKeyStatusLoadingState,
    accountsLoadingState,
    tokensLoadingState,
  ].includes('loading');

  const isActionsDisabled =
    !selectedAccountDecryptionKeyStatus.isRegistered || isSubmitting;

  const [, setIsRefreshing] = useState(false);

  const tryRefresh = useCallback(async () => {
    setIsSubmitting(true);
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadSelectedDecryptionKeyState(),
        reloadPrimaryTokenBalance(),
      ]);
    } catch (error) {
      ErrorHandler.processWithoutFeedback(error);
    }
    setIsRefreshing(false);
    setIsSubmitting(false);
  }, [loadSelectedDecryptionKeyState, reloadPrimaryTokenBalance]);

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

  const [carouselWrpRef] = useMeasure();

  const clearAllParams = useCallback(() => {
    router.replace(`${pathname}?`);
  }, [pathname, router]);

  // TODO: enchance to more fabric orchestration
  useEffect(() => {
    if (
      [decryptionKeyStatusLoadingState, accountsLoadingState, tokensLoadingState].every(
        el => el === 'success',
      )
    )
      return;

    const action = searchParams.get('action');

    if (!action) return;

    if (action === 'send') {
      const asset = searchParams.get('asset');
      const to = searchParams.get('to');

      if (!asset || !to) return;

      if (!perTokenStatuses[asset].isRegistered) return;

      if (selectedToken.address.toLowerCase() !== asset.toLowerCase()) {
        setSelectedTokenAddress(asset);
      }

      transferFormSheet.open(to);
    }

    clearAllParams();
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
  ]);

  return (
    <div className='flex size-full flex-col'>
      <header className='order-2 flex h-16 shrink-0 items-center justify-end gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 md:order-1'>
        <DashboardHeader />
      </header>
      <div className='order-1 flex flex-1 flex-col overflow-y-auto md:order-2'>
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
                return <ConfidentialAssetCardLoader />;
              }

              return tokens.map((token, idx) => {
                const currTokenStatus = perTokenStatuses[token.address];
                return (
                  <ConfidentialAssetCard
                    key={idx}
                    className='w-full'
                    token={token}
                    pendingAmount={currTokenStatus.pendingAmount}
                    actualAmount={currTokenStatus.actualAmount}
                    isNormalized={currTokenStatus.isNormalized}
                    isFrozen={currTokenStatus.isFrozen}
                    isRegistered={currTokenStatus.isRegistered}
                  />
                );
              });
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

          <div className='flex w-full flex-row items-center justify-center gap-8 self-center px-4 md:max-w-[50%]'>
            <CircleButton
              className='flex-1'
              caption={'Faucet'}
              iconProps={{
                name: 'CircleDollarSignIcon',
              }}
              onClick={() => {
                setIsDepositSheetOpen(true);
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
                setIsWithdrawSheetOpen(true);
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
                transferFormSheet.open();
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

          <ActivitiesFeed />
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
                setIsDepositSheetOpen(false);
                tryRefresh();
              }}
            />
          </UiSheetContent>
        </UiSheet>
        <UiSheet open={isTokenInfoSheetOpen} onOpenChange={setIsTokenInfoSheetOpen}>
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
                setIsWithdrawSheetOpen(false);
              }}
            />
          </UiSheetContent>
        </UiSheet>

        <TransferFormSheet
          ref={transferFormSheet.ref}
          token={selectedToken}
          onSubmit={() => {
            transferFormSheet.close();
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
                setIsAddTokenSheetOpen(false);
              }}
            />
          </UiSheetContent>
        </UiSheet>
      </div>
    </div>
  );
}

function CircleButton({
  caption,
  iconProps,
  className,
  ...rest
}: {
  caption?: string;
  iconProps: ComponentProps<typeof UiIcon>;
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
  );
}
