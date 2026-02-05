import { FixedNumber, parseUnits } from 'ethers';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { getFABalance, getExternalFaucetUrl, mintUsdt } from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ASSET_CONFIG, PRIMARY_ASSET } from '@/config';
import { bus, BusEvents, ErrorHandler, sleep, tryCatch } from '@/helpers';
import { useGasStationArgs } from '@/store/gas-station';
import { UiButton } from '@/ui/UiButton';
import { UiSkeleton } from '@/ui/UiSkeleton';

const MINT_AMOUNT = 5;

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

  const currTokenStatus = perTokenStatuses[selectedToken?.address];
  const assetConfig = ASSET_CONFIG[PRIMARY_ASSET];

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

  // For assets with external faucets (e.g. APT), show a link to the faucet.
  if (assetConfig.faucetUrl) {
    const faucetUrl = getExternalFaucetUrl(selectedAccount.accountAddress.toString());

    return (
      <div className='flex w-full flex-col gap-3 rounded-2xl border-2 border-solid border-textPrimary p-4'>
        <p className='text-sm'>
          Get free {selectedToken?.symbol} from the testnet faucet. Your wallet address
          has been pre-filled.
        </p>
        <UiButton
          className='w-full'
          onClick={() => window.open(faucetUrl!, '_blank')}
        >
          <ExternalLink size={16} className='mr-2' />
          Open Faucet
        </UiButton>
        <p className='text-xs text-gray-500'>
          After receiving tokens, return here and use the &quot;Send to yourself&quot;
          option to deposit them into your confidential balance.
        </p>
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
