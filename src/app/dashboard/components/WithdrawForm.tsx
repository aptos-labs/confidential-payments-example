'use client';

import { AccountAddress } from '@aptos-labs/ts-sdk';
import { parseUnits } from 'ethers';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { sendAndWaitTx } from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, getYupAmountField, trimAddress, tryCatch } from '@/helpers';
import { useForm } from '@/hooks';
import { useGetTargetAddress } from '@/hooks/ans';
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

  const [debouncedRecipient, setDebouncedRecipient] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recipient, setRecipient] = useState('');

  const {
    isFormDisabled,
    canSubmitForm,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
    formState,
    trigger,
  } = useForm(
    {
      recipient: '',
      amount: '',
    },
    yup =>
      yup.object().shape({
        recipient: yup
          .string()
          .required('Enter recipient address')
          .test('ValidAnsName', 'ANS name does not resolve to an address.', v => {
            if (!v) return false;
            if (!v.endsWith('.apt')) return true;

            // If it's an ANS name (.apt), check if it resolves. Only validate if we
            // have a debounced recipient and it's not currently loading.
            if (debouncedRecipient === '' || isResolvingAddress) return true;
            return Boolean(resolvedAddress);
          })
          .test('ValidAddress', 'Invalid address.', v => {
            if (!v) return false;
            if (v.endsWith('.apt')) return true;
            return AccountAddress.isValid({
              input: v,
            }).valid;
          })
          .test('SelfWithdraw', 'You cannot withdraw to yourself.', v => {
            if (!v) return false;

            let addressToCheck = v;

            // If it's an ANS name, use the resolved address
            if (v.endsWith('.apt') && resolvedAddress) {
              addressToCheck = resolvedAddress.toString();
            }

            return (
              addressToCheck.toLowerCase() !==
              selectedAccount.accountAddress.toString().toLowerCase()
            );
          }),
        amount: getYupAmountField(yup, token.decimals, totalBalanceBN, token.symbol),
      }),
  );

  // Get the current recipient from form state.
  useEffect(() => {
    const currentRecipient = formState.recipient || '';
    setRecipient(currentRecipient);
  }, [formState]);

  // Debounce the recipient input.
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedRecipient(recipient);
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [recipient]);

  // Query ANS to resolve recipient to address (only if it ends with .apt).
  const { data: resolvedAddress, isLoading: isResolvingAddress } = useGetTargetAddress({
    name: debouncedRecipient.endsWith('.apt') ? debouncedRecipient : '',
    enabled: debouncedRecipient.endsWith('.apt'),
  });

  // Trigger validation when external dependencies change.
  useEffect(() => {
    if (debouncedRecipient !== '') {
      trigger('recipient');
    }
  }, [resolvedAddress, isResolvingAddress, debouncedRecipient, trigger]);

  const clearForm = useCallback(() => {
    setValue('amount', '');
  }, [setValue]);

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        setIsSubmitting(true);
        disableForm();

        // Determine the actual recipient address.
        let recipientAddress = formData.recipient;
        if (formData.recipient.endsWith('.apt')) {
          if (!resolvedAddress) {
            ErrorHandler.process(new Error('ANS name could not be resolved'));
            enableForm();
            setIsSubmitting(false);
            return;
          }
          recipientAddress = resolvedAddress.toString();
        }

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
            recipientAddress,
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
      resolvedAddress,
      selectedAccount,
      token,
      gasStationArgs,
    ],
  );

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col justify-between gap-4'>
        <div className='space-y-1'>
          <ControlledUiInput
            control={control}
            name='recipient'
            label='Recipient Address / ANS Name'
            placeholder='Enter recipient address / ANS name'
            disabled={isFormDisabled}
          />
          <div className='pb-2' />
          {debouncedRecipient.endsWith('.apt') &&
            resolvedAddress &&
            !isResolvingAddress && (
              <div className='text-sm text-green-500'>
                ANS name resolved to {trimAddress(resolvedAddress.toString())}.
              </div>
            )}
        </div>
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
          By sending to an address or ANS name. ANS names must have the{' '}
          <code>.apt</code> suffix.
        </p>
      </div>

      <div className='pt-4'>
        <UiSeparator className='mb-4' />
        <UiButton className='w-full' onClick={submit} disabled={!canSubmitForm}>
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
