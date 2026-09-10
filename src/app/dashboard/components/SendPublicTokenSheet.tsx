'use client';

import { AccountAddress } from '@aptos-labs/ts-sdk';
import Avatar from 'boring-avatars';
import { formatUnits, parseUnits } from 'ethers';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ComponentProps, useCallback, useEffect, useRef, useState } from 'react';

import { getAccountPublicTokenBalances, PublicTokenBalance } from '@/api/modules/aptos';
import {
  SendPublicTokenStatus,
  useConfidentialCoinContext,
} from '@/app/dashboard/context';
import {
  ErrorHandler,
  formatBalanceFullPrecision,
  getSendPublicTokenErrorMessage,
  getSendPublicTokenGasReadiness,
  getYupAmountField,
  type SendPublicTokenGasReadiness,
  trimAddress,
  tryCatch,
} from '@/helpers';
import { useForm } from '@/hooks';
import { useGetTargetAddress } from '@/hooks/ans';
import { cn } from '@/theme/utils';
import { UiButton } from '@/ui/UiButton';
import { ControlledUiInput } from '@/ui/UiInput';
import { UiLabel } from '@/ui/UiLabel';
import { UiSeparator } from '@/ui/UiSeparator';
import {
  UiSheet,
  UiSheetContent,
  UiSheetDescription,
  UiSheetHeader,
  UiSheetTitle,
} from '@/ui/UiSheet';

type SendPublicTokenSheetProps = {
  onSubmit: () => void;
} & Omit<ComponentProps<typeof UiSheet>, 'children'>;

export default function SendPublicTokenSheet({
  onSubmit,
  open,
  ...rest
}: SendPublicTokenSheetProps) {
  const { selectedAccount, reloadBalances, pauseAutoConvert, resumeAutoConvert } =
    useConfidentialCoinContext();

  const [tokens, setTokens] = useState<PublicTokenBalance[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [selectedToken, setSelectedToken] = useState<PublicTokenBalance | null>(null);

  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    const [balances, error] = await tryCatch(
      getAccountPublicTokenBalances(selectedAccount),
    );
    if (error) {
      ErrorHandler.process(error);
      setTokens([]);
    } else {
      setTokens(balances);
    }
    setIsLoadingTokens(false);
  }, [selectedAccount]);

  useEffect(() => {
    if (!open) {
      setSelectedToken(null);
      return;
    }

    void loadTokens();
  }, [loadTokens, open]);

  useEffect(() => {
    if (!open || !selectedToken) return;

    pauseAutoConvert();
    return () => {
      resumeAutoConvert();
    };
  }, [open, pauseAutoConvert, resumeAutoConvert, selectedToken]);

  const handleSuccess = useCallback(async () => {
    await reloadBalances();
    await loadTokens();
    setSelectedToken(null);
    onSubmit();
  }, [loadTokens, onSubmit, reloadBalances]);

  return (
    <UiSheet open={open} {...rest}>
      <UiSheetContent side='bottom' className='max-h-[85dvh] overflow-y-auto'>
        <UiSheetHeader>
          <UiSheetTitle>Send Public Token</UiSheetTitle>
          <UiSheetDescription className='typography-caption1 text-textSecondary'>
            Transfer publicly held tokens from this account. This does not affect
            confidential balances. Legacy coin-only balances may not appear here.
          </UiSheetDescription>
        </UiSheetHeader>
        <UiSeparator className='my-4' />

        {selectedToken ? (
          <SendPublicTokenForm
            key={selectedToken.address}
            token={selectedToken}
            onBack={() => setSelectedToken(null)}
            onSuccess={handleSuccess}
          />
        ) : (
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <span className='typography-subtitle4 text-textPrimary'>
                Select token
              </span>
              <button
                type='button'
                onClick={() => void loadTokens()}
                disabled={isLoadingTokens}
                className='text-textSecondary'
              >
                <RefreshCw
                  size={16}
                  className={cn(isLoadingTokens && 'animate-spin')}
                />
              </button>
            </div>

            {isLoadingTokens ? (
              <div className='flex justify-center py-8'>
                <RefreshCw size={20} className='animate-spin text-textSecondary' />
              </div>
            ) : tokens.length === 0 ? (
              <div className='rounded-md bg-componentPrimary p-4 text-center'>
                <p className='typography-caption1 text-textSecondary'>
                  No public token balances found for this account.
                </p>
              </div>
            ) : (
              tokens.map(token => (
                <button
                  key={token.address}
                  type='button'
                  onClick={() => setSelectedToken(token)}
                  className='flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-solid border-textPrimary px-4 py-3'
                >
                  <div className='flex min-w-0 items-center gap-3'>
                    <Avatar name={token.address} size={24} variant='pixel' />
                    <div className='flex min-w-0 flex-col items-start'>
                      <span className='typography-subtitle4 text-textPrimary'>
                        {token.symbol || 'Unknown'}
                      </span>
                      {token.name ? (
                        <span className='typography-caption2 text-textSecondary'>
                          {token.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className='typography-subtitle4 shrink-0 text-textPrimary'>
                    {formatBalanceFullPrecision(token.balance, token.decimals)}{' '}
                    {token.symbol}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </UiSheetContent>
    </UiSheet>
  );
}

function SendPublicTokenForm({
  token,
  onBack,
  onSuccess,
}: {
  token: PublicTokenBalance;
  onBack: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const { sendPublicTokenWithGas, selectedAccount, selectedAccountDecryptionKey } =
    useConfidentialCoinContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SendPublicTokenStatus | null>(null);
  const [gasReadiness, setGasReadiness] = useState<SendPublicTokenGasReadiness | null>(
    null,
  );
  const [isLoadingGasReadiness, setIsLoadingGasReadiness] = useState(true);
  const [debouncedRecipient, setDebouncedRecipient] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recipient, setRecipient] = useState('');

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

  const { data: resolvedAddress, isLoading: isResolvingAddress } = useGetTargetAddress({
    name: debouncedRecipient.endsWith('.apt') ? debouncedRecipient : '',
    enabled: debouncedRecipient.endsWith('.apt'),
  });

  const {
    isFormDisabled,
    canSubmitForm,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
    formState,
    formErrors,
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
            if (debouncedRecipient === '' || isResolvingAddress) return true;
            return Boolean(resolvedAddress);
          })
          .test('ValidAddress', 'Invalid address.', v => {
            if (!v) return false;
            if (v.endsWith('.apt')) return true;
            return AccountAddress.isValid({ input: v }).valid;
          }),
        amount: getYupAmountField(yup, token.decimals, token.balance, token.symbol),
      }),
  );

  useEffect(() => {
    setRecipient(formState.recipient || '');
  }, [formState.recipient]);

  useEffect(() => {
    if (debouncedRecipient !== '') {
      void trigger('recipient');
    }
  }, [debouncedRecipient, isResolvingAddress, resolvedAddress, trigger]);

  useEffect(() => {
    let cancelled = false;

    const loadGasReadiness = async () => {
      setIsLoadingGasReadiness(true);
      const [readiness, error] = await tryCatch(
        getSendPublicTokenGasReadiness(
          selectedAccount,
          selectedAccountDecryptionKey.toString(),
        ),
      );

      if (cancelled) return;

      if (error) {
        setGasReadiness(null);
      } else {
        setGasReadiness(readiness);
      }
      setIsLoadingGasReadiness(false);
    };

    void loadGasReadiness();

    return () => {
      cancelled = true;
    };
  }, [selectedAccount, selectedAccountDecryptionKey]);

  const fillMaxAmount = useCallback(() => {
    const maxAmount = formatUnits(token.balance, token.decimals);
    setValue('amount', maxAmount, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [setValue, token.balance, token.decimals]);

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        setIsSubmitting(true);
        disableForm();

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

        const [, error] = await tryCatch(
          sendPublicTokenWithGas({
            tokenAddress: token.address,
            recipient: recipientAddress,
            amount: parseUnits(String(formData.amount), token.decimals),
            tokenSymbol: token.symbol,
            tokenDecimals: token.decimals,
            onStatusChange: setSubmitStatus,
          }),
        );

        if (error) {
          ErrorHandler.process(error, getSendPublicTokenErrorMessage(error));
          enableForm();
          setIsSubmitting(false);
          setSubmitStatus(null);
          return;
        }

        await onSuccess();
        enableForm();
        setIsSubmitting(false);
        setSubmitStatus(null);
      })(),
    [
      disableForm,
      enableForm,
      handleSubmit,
      onSuccess,
      resolvedAddress,
      sendPublicTokenWithGas,
      token.address,
      token.decimals,
      token.symbol,
    ],
  );

  const submitLabel = (() => {
    switch (submitStatus) {
      case 'preparing':
        return 'Preparing...';
      case 'withdrawing-gas':
        return 'Withdrawing gas APT...';
      case 'waiting-gas':
        return 'Waiting for gas APT...';
      case 'sending':
        return `Sending ${token.symbol}...`;
      case 'securing-apt':
        return 'Securing remaining APT...';
      case 'done':
        return 'Done';
      default:
        return `Send ${token.symbol}`;
    }
  })();

  return (
    <div className='flex flex-col gap-4'>
      <button
        type='button'
        onClick={onBack}
        className='flex items-center gap-2 text-textSecondary'
      >
        <ArrowLeft size={16} />
        <span className='typography-caption1'>Back to token list</span>
      </button>

      <div className='flex items-center gap-3 rounded-2xl bg-componentPrimary p-4'>
        <Avatar name={token.address} size={32} variant='pixel' />
        <div className='flex flex-col'>
          <span className='typography-subtitle4 text-textPrimary'>{token.symbol}</span>
          <span className='typography-caption2 text-textSecondary'>
            Available: {formatBalanceFullPrecision(token.balance, token.decimals)}{' '}
            {token.symbol}
          </span>
        </div>
      </div>

      {isLoadingGasReadiness ? (
        <p className='typography-caption2 text-textSecondary'>
          Checking APT for gas...
        </p>
      ) : gasReadiness?.warning ? (
        <div className='bg-warningMain/10 rounded-md border border-warningMain p-3'>
          <p className='typography-caption1 text-textPrimary'>{gasReadiness.warning}</p>
        </div>
      ) : gasReadiness?.info ? (
        <p className='typography-caption2 text-textSecondary'>{gasReadiness.info}</p>
      ) : null}

      <ControlledUiInput
        control={control}
        name='recipient'
        label='Recipient Address / ANS Name'
        placeholder='Enter recipient address / ANS name'
        disabled={isFormDisabled}
      />

      {debouncedRecipient.endsWith('.apt') && resolvedAddress && !isResolvingAddress ? (
        <div className='text-sm text-green-500'>
          ANS name resolved to {trimAddress(resolvedAddress.toString())}.
        </div>
      ) : null}

      <div className='grid gap-2'>
        <UiLabel htmlFor='send-public-token-amount'>Amount ({token.symbol})</UiLabel>
        <div className='flex gap-2'>
          <div className='min-w-0 flex-1'>
            <ControlledUiInput
              control={control}
              name='amount'
              id='send-public-token-amount'
              placeholder='Enter amount'
              disabled={isFormDisabled}
              hideErrorMessage
            />
          </div>
          <UiButton
            type='button'
            variant='outline'
            onClick={fillMaxAmount}
            disabled={isFormDisabled}
            className='h-10 shrink-0'
          >
            Max
          </UiButton>
        </div>
        <div className='min-h-8 text-sm leading-5 text-warningMain'>
          {formErrors.amount?.message ?? '\u00A0'}
        </div>
      </div>

      <UiButton
        className='w-full'
        onClick={submit}
        disabled={
          !canSubmitForm ||
          isSubmitting ||
          isLoadingGasReadiness ||
          gasReadiness?.canSend === false
        }
      >
        {isSubmitting ? (
          <>
            <RefreshCw size={12} className='animate-spin' />
            <span className='ml-2'>{submitLabel}</span>
          </>
        ) : (
          submitLabel
        )}
      </UiButton>
    </div>
  );
}
