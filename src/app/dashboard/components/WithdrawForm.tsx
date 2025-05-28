'use client';

import { AccountAddress } from '@aptos-labs/ts-sdk';
import { parseUnits } from 'ethers';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { sendAndWaitTx } from '@/api/modules/aptos';
import { aptos } from '@/api/modules/aptos/client';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, getYupAmountField, tryCatch } from '@/helpers';
import { useForm } from '@/hooks';
import { useGasStationArgs } from '@/store/gas-station';
import { TokenBaseInfo } from '@/store/wallet';
import { UiButton } from '@/ui/UiButton';
import { ControlledUiInput } from '@/ui/UiInput';
import { UiSeparator } from '@/ui/UiSeparator';

export default function WithdrawForm({
  token,
  onSubmit,
}: {
  token: TokenBaseInfo;
  onSubmit: () => void;
}) {
  const {
    selectedToken,
    selectedAccount,
    buildWithdrawToTx,
    reloadBalances,
    perTokenStatuses,
    ensureConfidentialBalanceReadyBeforeOp,
  } = useConfidentialCoinContext();
  const gasStationArgs = useGasStationArgs();

  const currentTokenStatus = perTokenStatuses[token.address];

  const publicBalanceBN = BigInt(currentTokenStatus.fungibleAssetBalance || 0);

  const pendingAmountBN = BigInt(currentTokenStatus.pendingAmount || 0);

  const actualAmountBN = BigInt(currentTokenStatus?.actualAmount || 0);

  const totalBalanceBN = useMemo(() => {
    return publicBalanceBN + pendingAmountBN + actualAmountBN;
  }, [actualAmountBN, pendingAmountBN, publicBalanceBN]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isFormDisabled, handleSubmit, disableForm, enableForm, control, setValue } =
    useForm(
      {
        recipient: '',
        amount: '',
      },
      yup =>
        yup.object().shape({
          recipient: yup
            .string()
            .required('Enter recipient address')
            .test('aptAddr', 'Invalid address', v => {
              if (!v) return false;
              return AccountAddress.isValid({
                input: v,
              }).valid;
            })
            .test('NoReceiverAddr', 'Receiver not found', async v => {
              if (!v) return false;

              const [accountInfo, accountInfoError] = await tryCatch(
                aptos.account.getAccountInfo({
                  accountAddress: AccountAddress.from(v),
                }),
              );
              if (accountInfoError) return false;
              return accountInfo !== null;
            })
            .test('DRYAptAddr', 'You cannot withdraw to yourself', v => {
              if (!v) return false;

              return (
                v.toLowerCase() !==
                selectedAccount.accountAddress.toString().toLowerCase()
              );
            }),
          amount: getYupAmountField(yup, token.decimals, totalBalanceBN),
        }),
    );

  const clearForm = useCallback(() => {
    setValue('amount', '');
  }, [setValue]);

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        setIsSubmitting(true);
        disableForm();

        const err = await ensureConfidentialBalanceReadyBeforeOp({
          amountToEnsure: String(formData.amount),
          token: token,
          currentTokenStatus,
        });
        if (err) {
          ErrorHandler.process(err);
          enableForm();
          setIsSubmitting(false);
          return;
        }

        const [withdrawTx, buildWithdrawError] = await tryCatch(
          buildWithdrawToTx(
            parseUnits(String(formData.amount), token.decimals).toString(),
            formData.recipient,
            {
              isSyncFirst: true,
            },
          ),
        );
        if (buildWithdrawError) {
          ErrorHandler.process(buildWithdrawError);
          enableForm();
          return;
        }

        const [txReceipt, withdrawError] = await tryCatch(
          sendAndWaitTx(withdrawTx, selectedAccount, gasStationArgs),
        );
        if (withdrawError) {
          ErrorHandler.process(withdrawError);
          enableForm();
          setIsSubmitting(false);
          return;
        }

        const [, reloadError] = await tryCatch(
          reloadBalances(BigInt(txReceipt.version)),
        );
        if (reloadError) {
          ErrorHandler.process(reloadError);
          enableForm();
          setIsSubmitting(false);
          return;
        }

        onSubmit();
        clearForm();
        enableForm();
        setIsSubmitting(false);
      })(),
    [
      buildWithdrawToTx,
      clearForm,
      currentTokenStatus,
      disableForm,
      enableForm,
      ensureConfidentialBalanceReadyBeforeOp,
      handleSubmit,
      onSubmit,
      reloadBalances,
      selectedAccount,
      token,
      gasStationArgs,
    ],
  );

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col justify-between gap-4'>
        <ControlledUiInput
          control={control}
          name='recipient'
          label='Recipient Address / ANS Name'
          placeholder='Enter recipient address / ANS name'
          disabled={isFormDisabled}
        />
        <ControlledUiInput
          control={control}
          name='amount'
          label={`Amount (${token.symbol})`}
          placeholder='Enter amount'
          disabled={isFormDisabled}
        />
      </div>

      <div className='mt-4 rounded-md bg-componentPrimary p-4'>
        <h4 className='font-semibold text-textPrimary'>
          Withdraw {selectedToken?.symbol} to public account
        </h4>
        <p className='text-sm text-textSecondary'>
          By sending to an address or ANS name.
        </p>
      </div>

      <div className='pt-4'>
        <UiSeparator className='mb-4' />
        <UiButton className='w-full' onClick={submit} disabled={isFormDisabled}>
          {isSubmitting ? (
            <RefreshCw size={12} className='animate-spin' />
          ) : (
            'Withdraw publicly'
          )}
        </UiButton>
      </div>
    </div>
  );
}
