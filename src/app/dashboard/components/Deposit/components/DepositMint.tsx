import { FixedNumber, parseUnits } from 'ethers';
import { Check, ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getCoinByFaAddress,
  getFABalance,
  getExternalFaucetUrl,
  getUnifiedBalance,
  mintUsdt,
} from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ASSET_CONFIG, PRIMARY_ASSET } from '@/config';
import { bus, BusEvents, ErrorHandler, sleep, tryCatch } from '@/helpers';
import { useGasStationArgs } from '@/store/gas-station';
import { UiButton } from '@/ui/UiButton';
import { UiSkeleton } from '@/ui/UiSkeleton';

const MINT_AMOUNT = 5;

type FaucetState = 'idle' | 'waiting' | 'veiling' | 'veiled';

export default function DepositMint({ onSubmit }: { onSubmit?: () => void }) {
  const {
    selectedAccount,
    selectedToken,
    depositTo,
    depositCoinTo,
    reloadBalances,
    perTokenStatuses,
  } = useConfidentialCoinContext();
  const gasStationArgs = useGasStationArgs();

  const [didSubmit, setDidSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faucetState, setFaucetState] = useState<FaucetState>('idle');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialBalanceRef = useRef<bigint | null>(null);

  const currTokenStatus = perTokenStatuses[selectedToken?.address];
  const assetConfig = ASSET_CONFIG[PRIMARY_ASSET];

  // Clean up polling on unmount.
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Auto-veil function for when funds arrive.
  const doVeil = useCallback(
    async (amountToDeposit: bigint) => {
      if (!selectedToken || !selectedAccount) return;

      setFaucetState('veiling');

      // Check if this is a coin-based asset (like APT) for choosing the deposit function.
      const [coin] = await tryCatch(getCoinByFaAddress(selectedToken.address));

      let depositAttempts = 0;
      do {
        const [depositTxReceipt, depositError] = await tryCatch(
          coin
            ? depositCoinTo(amountToDeposit, selectedAccount.accountAddress.toString())
            : depositTo(amountToDeposit, selectedAccount.accountAddress.toString()),
        );
        if (depositError) {
          if (depositAttempts >= 5) {
            ErrorHandler.process(depositError);
            setFaucetState('idle');
            return;
          }
          depositAttempts += 1;
          await sleep(200);
          continue;
        }

        const minimumLedgerVersion = BigInt(depositTxReceipt.version);
        const [, reloadError] = await tryCatch(reloadBalances(minimumLedgerVersion));
        if (reloadError) {
          ErrorHandler.process(reloadError);
          setFaucetState('idle');
          return;
        }

        const formattedAmount = (
          Number(amountToDeposit) / Math.pow(10, selectedToken.decimals)
        ).toFixed(2);
        bus.emit(
          BusEvents.Success,
          `Successfully veiled full public balance of ${formattedAmount} ${selectedToken.symbol}`,
        );
        setFaucetState('veiled');
        setDidSubmit(true);
        // Don't call onSubmit here - let the user see "Veiled!" before drawer closes.
        break;
      } while (depositAttempts < 5);
    },
    [depositCoinTo, depositTo, reloadBalances, selectedAccount, selectedToken],
  );

  // Start polling for balance changes after opening faucet.
  const startPollingForFunds = useCallback(async () => {
    if (!selectedToken || !selectedAccount) return;

    // Get the initial balance before the user gets funds.
    const [initialBalance] = await tryCatch(
      getUnifiedBalance(
        selectedAccount.accountAddress.toString(),
        selectedToken.address,
      ),
    );
    initialBalanceRef.current = initialBalance ?? 0n;
    setFaucetState('waiting');

    // Start polling.
    pollingRef.current = setInterval(async () => {
      const [currentBalance, err] = await tryCatch(
        getUnifiedBalance(
          selectedAccount.accountAddress.toString(),
          selectedToken.address,
        ),
      );

      if (err || currentBalance === undefined) return;

      const initialBal = initialBalanceRef.current ?? 0n;
      if (currentBalance > initialBal) {
        // Funds arrived! Stop polling and veil.
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        await doVeil(currentBalance);
      }
    }, 400);
  }, [doVeil, selectedAccount, selectedToken]);

  // If we're in an active faucet state, skip the currTokenStatus checks and render the faucet UI.
  // This prevents flickering to other states during balance reloads.
  const isInActiveFaucetState = faucetState !== 'idle';

  if (!isInActiveFaucetState) {
    if (!currTokenStatus) {
      // Loading...
      return <UiSkeleton className='min-h-[36px] w-full' />;
    }

    // This is a bandaid for the fact that `currTokenStatus` enters some weird partially
    // undefined state after the user mints, where everything is false or undefined.
    if (didSubmit && !currTokenStatus.isRegistered) {
      return <UiSkeleton className='min-h-[36px] w-full' />;
    }

    if (!currTokenStatus.isRegistered) {
      // The user needs to hit the start button first.
      return (
        <div>
          <p>
            You need to register the asset for your account first, hit the start button.
          </p>
        </div>
      );
    }
  }

  // For assets with external faucets (e.g. APT), show faucet link with auto-veil.
  if (assetConfig.faucetUrl) {
    const faucetUrl = getExternalFaucetUrl(selectedAccount.accountAddress.toString());

    const handleOpenFaucet = () => {
      window.open(faucetUrl!, '_blank');
      if (faucetState === 'idle') {
        startPollingForFunds();
      }
    };

    const getStatusText = () => {
      switch (faucetState) {
        case 'waiting':
          return 'Waiting for funds to arrive...';
        case 'veiling':
          return 'Veiling...';
        case 'veiled':
          return 'Veiled!';
        default:
          return null;
      }
    };

    const statusText = getStatusText();

    return (
      <div className='flex w-full flex-col gap-3'>
        <UiButton className='w-full' onClick={handleOpenFaucet} disabled={faucetState !== 'idle'}>
          <ExternalLink size={16} className='mr-2' />
          Open Faucet
        </UiButton>
        {statusText && (
          <div className='flex items-center justify-center gap-2 text-sm text-gray-500'>
            {faucetState === 'waiting' || faucetState === 'veiling' ? (
              <RefreshCw size={14} className='animate-spin' />
            ) : faucetState === 'veiled' ? (
              <Check size={14} className='text-green-500' />
            ) : null}
            <span className={faucetState === 'veiled' ? 'text-green-500' : ''}>
              {statusText}
            </span>
          </div>
        )}
      </div>
    );
  }

  // For assets with on-chain minting (e.g. USDT), show the mint button.
  const tryMint = async () => {
    setIsSubmitting(true);
    setDidSubmit(true);
    const amountToDeposit = parseUnits(`${MINT_AMOUNT}`, selectedToken.decimals);

    let mintAttempts = 0;

    let firstMinimumLedgerVersion = undefined;
    do {
      const [res, mintError] = await tryCatch(
        mintUsdt(selectedAccount, amountToDeposit, gasStationArgs),
      );
      if (mintError) {
        if (mintAttempts >= 5) {
          ErrorHandler.process(mintError);
          setIsSubmitting(false);
          return;
        }

        mintAttempts += 1;
        await sleep(200);
        continue;
      }

      firstMinimumLedgerVersion = BigInt(res.version);
      break;
    } while (mintAttempts < 5);

    // Now we try to veil the funds.
    let depositAttempts = 0;

    do {
      const [faOnlyBalanceResponse, getFAError] = await tryCatch(
        getFABalance(selectedAccount, selectedToken.address, firstMinimumLedgerVersion),
      );
      if (getFAError) {
        if (depositAttempts >= 5) {
          ErrorHandler.process(getFAError);
          setIsSubmitting(false);
          return;
        }

        depositAttempts += 1;
        await sleep(200);
        continue;
      }

      const [faOnlyBalance] = faOnlyBalanceResponse;

      const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
        faOnlyBalance?.amount || '0',
      ).lt(FixedNumber.fromValue(amountToDeposit));

      const [depositTxReceipt, depositError] = await tryCatch(
        isInsufficientFAOnlyBalance
          ? depositCoinTo(amountToDeposit, selectedAccount.accountAddress.toString())
          : depositTo(amountToDeposit, selectedAccount.accountAddress.toString()),
      );
      if (depositError) {
        if (depositAttempts >= 5) {
          ErrorHandler.process(depositError);
          setIsSubmitting(false);
          return;
        }

        depositAttempts += 1;
        await sleep(200);
        continue;
      }

      const minimumLedgerVersion = BigInt(depositTxReceipt.version);
      const [, reloadError] = await tryCatch(reloadBalances(minimumLedgerVersion));
      if (reloadError) {
        ErrorHandler.process(reloadError);
        setIsSubmitting(false);
        return;
      }
      bus.emit(
        BusEvents.Success,
        `Successfully funded your balance with ${MINT_AMOUNT} ${selectedToken.symbol} and veiled it`,
      );
      setIsSubmitting(false);
      onSubmit?.();
      break;
    } while (depositAttempts < 5);
  };

  return (
    <div className='flex w-full flex-col gap-3 rounded-2xl border-2 border-solid border-textPrimary p-4'>
      {(() => {
        return (
          <>
            <UiButton className='w-full' onClick={tryMint} disabled={isSubmitting}>
              {isSubmitting ? (
                <RefreshCw size={12} className='animate-spin' />
              ) : (
                `Get ${MINT_AMOUNT} free ${selectedToken?.symbol} tokens!`
              )}
            </UiButton>
          </>
        );
      })()}
    </div>
  );
}
