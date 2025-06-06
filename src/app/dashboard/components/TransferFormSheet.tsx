'use client';

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
import { ErrorHandler, getYupAmountField, isMobile, tryCatch } from '@/helpers';
import { useForm } from '@/hooks';
import { useGetAnsSubdomainAddress } from '@/hooks/ans';
import { TokenBaseInfo } from '@/store/wallet';
import { UiButton } from '@/ui/UiButton';
import { ControlledUiInput } from '@/ui/UiInput';
import { UiSeparator } from '@/ui/UiSeparator';
import { UiSheet, UiSheetContent, UiSheetHeader, UiSheetTitle } from '@/ui/UiSheet';

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
    const [debouncedUsername, setDebouncedUsername] = useState('');
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [username, setUsername] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

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
            .required('Enter receiver username')
            .test(
              'usernameExists',
              'Username not found. Please check and try again.',
              () => {
                // Only validate if we have a debounced username and it's not currently loading
                if (debouncedUsername === '' || isResolvingAddress) return true;
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
              'Receiver does not have an encryption key.',
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

    // Get the current username from form state
    useEffect(() => {
      const currentUsername = formState.receiverUsername || '';
      setUsername(currentUsername);
    }, [formState]);

    // Debounce the username input
    useEffect(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setDebouncedUsername(username);
      }, 250);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, [username]);

    // Query ANS to resolve username to address
    const { data: resolvedAddress, isLoading: isResolvingAddress } =
      useGetAnsSubdomainAddress({
        subdomain: debouncedUsername.replace('@', ''),
        enabled: debouncedUsername !== '',
      });

    // Trigger validation when external dependencies change
    useEffect(() => {
      if (debouncedUsername !== '') {
        trigger('receiverUsername');
      }
    }, [resolvedAddress, isResolvingAddress, debouncedUsername, trigger]);

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
                  label='Recipient Username'
                  placeholder='Enter recipient username'
                />
                <div className='pb-2' />
                {resolvedAddress &&
                  debouncedUsername !== '' &&
                  !isResolvingAddress &&
                  !formErrors.receiverUsername && (
                    <div className='text-sm text-green-500'>Recipient found.</div>
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
