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

import { getEkByAddr, sendAndWaitTx } from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, getYupAmountField, isMobile, tryCatch } from '@/helpers';
import { useForm } from '@/hooks';
import { useGetAnsSubdomainAddress } from '@/hooks/ans';
import { useGasStationArgs } from '@/store/gas-station';
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
      buildTransferTx,
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
              '',
              () => Boolean(resolvedAddress) || debouncedUsername === '',
            ),
          amount: getYupAmountField(yup, token.decimals, totalBalanceBN),
          auditorsAddresses: yup.array().of(
            yup
              .string()
              .test('aptAddr', 'Invalid address', v => {
                if (!v) return false;

                return isHexString(v);
              })
              .test('audAddr', "Auditor's address not exist", async v => {
                if (!v) return false;

                const [ek, ekError] = await tryCatch(getEkByAddr(v, token.address));
                if (ekError) return false;
                return Boolean(ek);
              }),
          ),
        }),
    );

    const {
      isFormDisabled,
      handleSubmit,
      disableForm,
      enableForm,
      control,
      setValue,
      formState,
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

    const clearForm = useCallback(() => {
      setValue('receiverUsername', '');
      setValue('amount', '');
    }, [setValue]);

    const isReceiverSelf = useMemo(() => {
      if (!resolvedAddress) return false;
      return (
        resolvedAddress.toString().toLowerCase() ===
        selectedAccount.accountAddress.toString().toLowerCase()
      );
    }, [resolvedAddress, selectedAccount.accountAddress]);

    const submit = useCallback(
      () =>
        handleSubmit(async formData => {
          if (!resolvedAddress) {
            ErrorHandler.process(new Error('Username not found'));
            return;
          }

          if (isReceiverSelf) {
            ErrorHandler.process(new Error('You cannot send to yourself'));
            return;
          }

          disableForm();
          setIsSubmitting(true);

          // Check if receiver has an encryption key
          const addressStr = resolvedAddress.toString();
          const [ek, ekError] = await tryCatch(getEkByAddr(addressStr, token.address));
          if (ekError || !ek) {
            ErrorHandler.process(
              new Error('Receiver not found or does not have an encryption key'),
            );
            enableForm();
            setIsSubmitting(false);
            return;
          }

          const auditorsEncryptionKeyHexList = await Promise.all(
            formData.auditorsAddresses.map(async addr => {
              return getEkByAddr(addr, token.address);
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

          const [transferTx, buildTransferTxError] = await tryCatch(
            buildTransferTx(
              addressStr,
              parseUnits(String(formData.amount), token.decimals).toString(),
              {
                isSyncFirst: true,
                auditorsEncryptionKeyHexList,
              },
            ),
          );
          if (buildTransferTxError) {
            ErrorHandler.process(buildTransferTxError);
            enableForm();
            setIsSubmitting(false);
            return;
          }

          const res = await sendAndWaitTx(transferTx, selectedAccount, gasStationArgs);

          const [, reloadError] = await tryCatch(
            Promise.all([reloadBalances(BigInt(res.version))]),
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
        buildTransferTx,
        clearForm,
        currentTokenStatus,
        disableForm,
        enableForm,
        ensureConfidentialBalanceReadyBeforeOp,
        handleSubmit,
        onSubmit,
        reloadBalances,
        resolvedAddress,
        isReceiverSelf,
        selectedAccount,
        token,
        gasStationArgs,
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

    // Show warning if the username doesn't resolve to an address
    const showUsernameWarning =
      debouncedUsername !== '' && !resolvedAddress && !isResolvingAddress;

    // Show warning if the resolved address is the sender's address
    const showSelfWarning = Boolean(resolvedAddress) && isReceiverSelf;

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
                  disabled={isFormDisabled}
                />
                <div className='pb-2' />
                {showUsernameWarning && (
                  <div className='text-sm text-yellow-500'>
                    Username not found. Please check and try again.
                  </div>
                )}
                {showSelfWarning && (
                  <div className='text-sm text-red-500'>
                    You cannot send to yourself.
                  </div>
                )}
                {resolvedAddress && !isReceiverSelf && (
                  <div className='text-sm text-green-500'>Recipient found.</div>
                )}
              </div>

              <ControlledUiInput
                control={control}
                name='amount'
                label={`Amount (${token.symbol})`}
                placeholder='Enter amount'
                type='number'
                disabled={isFormDisabled}
              />
            </div>

            {/* <AuditorsList className='mt-3 flex-1' control={control} /> */}

            <div className='mt-auto pt-4'>
              <UiSeparator className='mb-6 mt-2' />
              <UiButton
                className='w-full'
                onClick={submit}
                disabled={
                  isFormDisabled ||
                  showUsernameWarning ||
                  showSelfWarning ||
                  !resolvedAddress
                }
              >
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
