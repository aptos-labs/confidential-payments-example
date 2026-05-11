'use client';

import { AccountAddress } from '@aptos-labs/ts-sdk';
import { isHexString, parseUnits } from 'ethers';
import { RefreshCw } from 'lucide-react';
import {
  ComponentProps,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getEncryptionKey } from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { appConfig } from '@/config';
import {
  ErrorHandler,
  getYupAmountField,
  isMobile,
  trimAddress,
  tryCatch,
} from '@/helpers';
import { useForm } from '@/hooks';
import { useGetTargetAddress } from '@/hooks/ans';
import { TokenBaseInfo } from '@/store/wallet';
import { UiButton } from '@/ui/UiButton';
import { ControlledUiInput } from '@/ui/UiInput';
import { UiSeparator } from '@/ui/UiSeparator';
import { UiSheet, UiSheetContent, UiSheetHeader, UiSheetTitle } from '@/ui/UiSheet';

type RecipientKind = 'address' | 'ans' | 'username' | 'invalid';

type ParsedRecipient = {
  /** What we treat the input as. */
  kind: RecipientKind;
  /** ANS name to look up (only set when kind is 'ans' or 'username'). */
  ansName: string | null;
  /** Resolved hex address (only set when kind is 'address'). */
  hexAddress: string | null;
};

/**
 * Parse the recipient input. The user can enter:
 *   - a hex account address (starts with 0x and is a valid AccountAddress),
 *   - a fully-qualified ANS name ending in `.apt` (e.g. `alice.apt` or
 *     `pay.alice.apt`),
 *   - or a bare username, which we treat as the ANS subdomain under the
 *     configured ANS_DOMAIN, i.e. `<input>.<ANS_DOMAIN>.apt`.
 */
function parseRecipient(input: string): ParsedRecipient {
  const trimmed = input.trim();

  if (trimmed === '') {
    return { kind: 'invalid', ansName: null, hexAddress: null };
  }

  if (trimmed.startsWith('0x')) {
    return AccountAddress.isValid({ input: trimmed }).valid
      ? { kind: 'address', ansName: null, hexAddress: trimmed }
      : { kind: 'invalid', ansName: null, hexAddress: null };
  }

  if (trimmed.toLowerCase().endsWith('.apt')) {
    return { kind: 'ans', ansName: trimmed.toLowerCase(), hexAddress: null };
  }

  // Treat as a bare username under the configured ANS domain.
  const subdomain = trimmed.replace(/^@/, '').toLowerCase();
  return {
    kind: 'username',
    ansName: `${subdomain}.${appConfig.ANS_DOMAIN}.apt`,
    hexAddress: null,
  };
}

type TransferFormSheetRef = {
  open: (prefillUsername?: string) => void;
  close: () => void;
};

export const useTransferFormSheet = () => {
  const ref = useRef<TransferFormSheetRef>(null);

  const open = (prefillUsername?: string) => {
    ref.current?.open(prefillUsername);
  };

  const close = () => {
    ref.current?.close();
  };

  return {
    ref,
    open,
    close,
  };
};

type Props = {
  token: TokenBaseInfo;
  onSubmit: () => void;
} & ComponentProps<typeof UiSheet>;

export const TransferFormSheet = forwardRef<TransferFormSheetRef, Props>(
  ({ token, onSubmit }, ref) => {
    const isMobileDevice = isMobile();

    const {
      selectedAccount,
      transfer,
      reloadBalances,
      perTokenStatuses,
      ensureConfidentialBalanceReadyBeforeOp,
    } = useConfidentialCoinContext();

    const currentTokenStatus = perTokenStatuses[token.address];

    const publicBalanceBN = BigInt(currentTokenStatus.fungibleAssetBalance || 0);

    const pendingAmountBN = BigInt(currentTokenStatus.pendingAmount || 0);

    const availableAmountBN = BigInt(currentTokenStatus?.availableAmount || 0);

    const totalBalanceBN = useMemo(() => {
      return publicBalanceBN + pendingAmountBN + availableAmountBN;
    }, [availableAmountBN, pendingAmountBN, publicBalanceBN]);

    const [isTransferSheetOpen, setIsTransferSheetOpen] = useState(false);
    const [debouncedRecipient, setDebouncedRecipient] = useState('');
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [recipientInput, setRecipientInput] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const parsedRecipient = useMemo(
      () => parseRecipient(debouncedRecipient),
      [debouncedRecipient],
    );

    const formSchema = useForm(
      {
        receiverUsername: '',
        amount: '',
        auditorsAddresses: [] as string[],
      },
      yup =>
        yup.object().shape({
          receiverUsername: yup
            .string()
            .required('Enter recipient username, ANS name or address')
            .test(
              'recipientFormat',
              'Enter a valid username, ANS name (e.g. alice.apt) or 0x address.',
              () => {
                if (debouncedRecipient === '') return true;
                return parsedRecipient.kind !== 'invalid';
              },
            )
            .test(
              'recipientResolves',
              'Recipient not found. Please check and try again.',
              () => {
                if (debouncedRecipient === '' || isResolvingAddress) return true;
                if (parsedRecipient.kind === 'invalid') return true;
                return Boolean(resolvedAddress);
              },
            )
            .test('selfTransfer', 'You cannot send to yourself.', () => {
              if (!resolvedAddress) return true;
              return (
                resolvedAddress.toString().toLowerCase() !==
                selectedAccount.accountAddress.toString().toLowerCase()
              );
            })
            .test(
              'hasEncryptionKey',
              "Recipient can't receive confidential transfers until they veil some APT at least once.",
              async () => {
                if (!resolvedAddress) return true;

                const addressStr = resolvedAddress.toString();
                const [ek, ekError] = await tryCatch(
                  getEncryptionKey(addressStr, token.address),
                );
                if (ekError || !ek) return false;
                return true;
              },
            ),
          amount: getYupAmountField(yup, token.decimals, totalBalanceBN, token.symbol),
          auditorsAddresses: yup.array().of(
            yup
              .string()
              .test('aptAddr', 'Invalid address', v => {
                if (!v) return false;

                return isHexString(v);
              })
              .test('audAddr', "Auditor's address not exist", async v => {
                if (!v) return false;

                const [ek, ekError] = await tryCatch(
                  getEncryptionKey(v, token.address),
                );
                if (ekError) return false;
                return Boolean(ek);
              }),
          ),
        }),
    );

    const {
      canSubmitForm,
      handleSubmit,
      disableForm,
      enableForm,
      control,
      setValue,
      formState,
      formErrors,
      trigger,
    } = formSchema;

    // Get the current recipient input from form state
    useEffect(() => {
      const current = formState.receiverUsername || '';
      setRecipientInput(current);
    }, [formState]);

    // Debounce the recipient input
    useEffect(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setDebouncedRecipient(recipientInput);
      }, 250);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [recipientInput]);

    // Resolve via ANS only when the input is a username or a fully qualified ANS name.
    const { data: ansResolvedAddress, isLoading: isResolvingAns } = useGetTargetAddress(
      {
        name: parsedRecipient.ansName ?? '',
        enabled: parsedRecipient.ansName !== null,
      },
    );

    // The final resolved address is either the literal hex address the user pasted, or
    // the ANS-resolved address.
    const resolvedAddress =
      parsedRecipient.kind === 'address' && parsedRecipient.hexAddress
        ? AccountAddress.from(parsedRecipient.hexAddress)
        : (ansResolvedAddress ?? null);

    const isResolvingAddress = parsedRecipient.ansName !== null && isResolvingAns;

    // Trigger validation when external dependencies change
    useEffect(() => {
      if (debouncedRecipient !== '') {
        trigger('receiverUsername');
      }
    }, [resolvedAddress, isResolvingAddress, debouncedRecipient, trigger]);

    const clearForm = useCallback(() => {
      setValue('receiverUsername', '');
      setValue('amount', '');
    }, [setValue]);

    const submit = useCallback(
      () =>
        handleSubmit(async formData => {
          if (!resolvedAddress) {
            return;
          }

          disableForm();
          setIsSubmitting(true);

          const auditorsEncryptionKeyHexList = await Promise.all(
            formData.auditorsAddresses.map(async addr => {
              return getEncryptionKey(addr, token.address);
            }),
          );

          const err = await ensureConfidentialBalanceReadyBeforeOp({
            amountToEnsure: String(formData.amount),
            token,
            currentTokenStatus,
          });
          if (err) {
            enableForm();
            setIsSubmitting(false);
            return;
          }

          const addressStr = resolvedAddress.toString();

          const [responses, transferError] = await tryCatch(
            transfer(
              addressStr,
              parseUnits(String(formData.amount), token.decimals).toString(),
              {
                isSyncFirst: true,
                auditorsEncryptionKeyHexList: auditorsEncryptionKeyHexList.map(ek =>
                  ek.toString(),
                ),
              },
            ),
          );
          if (transferError) {
            ErrorHandler.process(transferError);
            enableForm();
            setIsSubmitting(false);
            return;
          }
          if (responses.length === 0) {
            ErrorHandler.process(new Error('No responses were returned'));
            enableForm();
            setIsSubmitting(false);
            return;
          }

          const [, reloadError] = await tryCatch(
            Promise.all([
              reloadBalances(BigInt(responses[responses.length - 1].version)),
            ]),
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
        transfer,
        clearForm,
        currentTokenStatus,
        disableForm,
        enableForm,
        ensureConfidentialBalanceReadyBeforeOp,
        handleSubmit,
        onSubmit,
        reloadBalances,
        resolvedAddress,
        token,
      ],
    );

    useImperativeHandle(ref, () => ({
      open: prefillUsername => {
        setIsTransferSheetOpen(true);

        if (prefillUsername) {
          setValue('receiverUsername', prefillUsername);
        }
      },
      close: () => {
        setIsTransferSheetOpen(false);
        clearForm();
      },
    }));

    return (
      <UiSheet open={isTransferSheetOpen} onOpenChange={setIsTransferSheetOpen}>
        <UiSheetContent
          side={isMobileDevice ? 'bottom' : 'right'}
          className='max-h-[70dvh] overflow-y-scroll md:max-h-none'
        >
          <UiSheetHeader>
            <UiSheetTitle>Send Confidentially</UiSheetTitle>
          </UiSheetHeader>
          <UiSeparator className='mb-4 mt-2' />
          <div className='flex flex-col'>
            <div className='flex flex-col gap-4'>
              <div className='space-y-1'>
                <ControlledUiInput
                  control={control}
                  name='receiverUsername'
                  label='Recipient'
                  placeholder={`Username, ANS name (e.g. alice.apt) or 0x address`}
                />
                <div className='pb-2' />
                {resolvedAddress &&
                  debouncedRecipient !== '' &&
                  !isResolvingAddress &&
                  !formErrors.receiverUsername && (
                    <div className='text-sm text-green-500'>
                      {parsedRecipient.kind === 'address'
                        ? 'Address looks valid.'
                        : `Resolved to ${trimAddress(resolvedAddress.toString())}.`}
                    </div>
                  )}
              </div>

              <ControlledUiInput
                control={control}
                name='amount'
                label={`Amount (${token.symbol})`}
                placeholder='Enter amount'
                type='number'
              />
            </div>

            {/* <AuditorsList className='mt-3 flex-1' control={control} /> */}

            <div className='mt-auto pt-4'>
              <UiSeparator className='mb-6 mt-2' />
              <UiButton className='w-full' onClick={submit} disabled={!canSubmitForm}>
                {isSubmitting ? (
                  <RefreshCw size={12} className='animate-spin' />
                ) : (
                  'Send confidentially'
                )}
              </UiButton>
            </div>
          </div>
        </UiSheetContent>
      </UiSheet>
    );
  },
);

TransferFormSheet.displayName = 'TransferFormSheet';

/*
const AuditorsList = ({
  control,
  ...rest
}: {
  control: Control<{
    receiverUsername: string;
    amount: string;
    auditorsAddresses: string[];
  }>;
} & HTMLAttributes<HTMLDivElement>) => {
  const { fields, append, remove } = useFieldArray({
    control: control!,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    name: 'auditorsAddresses',
  });

  const addAuditor = () => {
    append('');
  };

  const removeAuditor = (index: number) => {
    remove(index);
  };

  return (
    <div {...rest} className={cn('flex flex-col gap-2', rest.className)}>
      <div className='flex items-center gap-2'>
        <span className='typography-caption2 uppercase text-textPrimary'>
          Add auditors
        </span>
        <button
          className='flex size-7 items-center justify-center rounded-[50%] bg-componentPrimary'
          onClick={addAuditor}
        >
          <UiIcon name={'UserPlusIcon'} className={'size-4 text-textPrimary'} />
        </button>
      </div>

      <div className='flex flex-col gap-3'>
        {fields.map((field, index) => (
          <div key={field.id} className='flex items-center gap-2'>
            <div className='flex-1'>
              <ControlledUiInput
                control={control}
                name={`auditorsAddresses.${index}`}
                placeholder={`Auditor ${index + 1}`}
              />
            </div>
            <button className='text-textPrimary' onClick={() => removeAuditor(index)}>
              <UiIcon name={'Trash2Icon'} className={'size-5 text-errorMain'} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
*/
