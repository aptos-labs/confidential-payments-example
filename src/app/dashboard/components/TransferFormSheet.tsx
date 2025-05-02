/* eslint-disable unused-imports/no-unused-vars */
'use client';

import { AccountAddress } from '@aptos-labs/ts-sdk';
import { formatUnits, isHexString, parseUnits } from 'ethers';
import {
  ComponentProps,
  forwardRef,
  HTMLAttributes,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Control, useFieldArray } from 'react-hook-form';

import { getEkByAddr, sendAndWaitTx } from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, isMobile, tryCatch } from '@/helpers';
import { useForm } from '@/hooks';
import { useGasStationArgs } from '@/store/gas-station';
import { TokenBaseInfo } from '@/store/wallet';
import { cn } from '@/theme/utils';
import { UiIcon } from '@/ui';
import { UiButton } from '@/ui/UiButton';
import { ControlledUiInput } from '@/ui/UiInput';
import { UiSeparator } from '@/ui/UiSeparator';
import { UiSheet, UiSheetContent, UiSheetHeader, UiSheetTitle } from '@/ui/UiSheet';

type TransferFormSheetRef = {
  open: (prefillAddr?: string) => void;
  close: () => void;
};

export const useTransferFormSheet = () => {
  const ref = useRef<TransferFormSheetRef>(null);

  const open = (prefillAddr?: string) => {
    ref.current?.open(prefillAddr);
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
      loadSelectedDecryptionKeyState,
      reloadPrimaryTokenBalance,
      perTokenStatuses,
      ensureConfidentialBalanceReadyBeforeOp,
    } = useConfidentialCoinContext();
    const gasStationArgs = useGasStationArgs();

    const currTokenStatus = perTokenStatuses[token.address];

    const publicBalanceBN = BigInt(currTokenStatus.fungibleAssetBalance || 0);

    const pendingAmountBN = BigInt(currTokenStatus.pendingAmount || 0);

    const actualAmountBN = BigInt(currTokenStatus?.actualAmount || 0);

    const totalBalanceBN = useMemo(() => {
      return publicBalanceBN + pendingAmountBN + actualAmountBN;
    }, [actualAmountBN, pendingAmountBN, publicBalanceBN]);

    const [isTransferSheetOpen, setIsTransferSheetOpen] = useState(false);

    const { isFormDisabled, handleSubmit, disableForm, enableForm, control, setValue } =
      useForm(
        {
          receiverAddressHex: '',
          amount: '',
          auditorsAddresses: [] as string[],
        },
        yup =>
          yup.object().shape({
            receiverAddressHex: yup
              .string()
              .test('aptAddr', 'Invalid address', v => {
                if (!v) return false;

                return AccountAddress.isValid({
                  input: v,
                }).valid;
              })
              .test('DRYAptAddr', 'You cannot send to yourself', v => {
                if (!v) return false;

                return (
                  v.toLowerCase() !==
                  selectedAccount.accountAddress.toString().toLowerCase()
                );
              })
              .test('NoReceiverAddr', 'Receiver not found', async v => {
                if (!v) return false;

                const [ek, ekError] = await tryCatch(getEkByAddr(v, token.address));
                if (ekError) return false;
                return Boolean(ek);
              })
              .required('Enter receiver'),
            amount: yup
              .number()
              .min(+formatUnits('1', token.decimals))
              .max(totalBalanceBN ? +formatUnits(totalBalanceBN, token.decimals) : 0)
              .required('Enter amount'),
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

    const clearForm = useCallback(() => {
      setValue('receiverAddressHex', '');
      setValue('amount', '');
    }, [setValue]);

    const submit = useCallback(
      () =>
        handleSubmit(async formData => {
          disableForm();

          const auditorsEncryptionKeyHexList = await Promise.all(
            formData.auditorsAddresses.map(async addr => {
              return getEkByAddr(addr, token.address);
            }),
          );

          const [transferTx, buildTransferTxError] = await tryCatch(
            buildTransferTx(
              formData.receiverAddressHex,
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
            return;
          }

          const err = await ensureConfidentialBalanceReadyBeforeOp({
            amountToEnsure: String(formData.amount),
            token: token,
            currentTokenStatus: currTokenStatus,
            opTx: transferTx,
          });
          if (err) {
            enableForm();
            return;
          }

          await sendAndWaitTx(transferTx, selectedAccount, gasStationArgs);

          const [, reloadError] = await tryCatch(
            Promise.all([
              loadSelectedDecryptionKeyState(),
              reloadPrimaryTokenBalance(),
            ]),
          );
          if (reloadError) {
            ErrorHandler.process(reloadError);
            enableForm();
            return;
          }

          onSubmit();
          clearForm();
          enableForm();
        })(),
      [
        buildTransferTx,
        clearForm,
        currTokenStatus,
        disableForm,
        enableForm,
        ensureConfidentialBalanceReadyBeforeOp,
        handleSubmit,
        loadSelectedDecryptionKeyState,
        onSubmit,
        reloadPrimaryTokenBalance,
        selectedAccount,
        token,
        gasStationArgs,
      ],
    );

    useImperativeHandle(ref, () => ({
      open: prefillAddr => {
        setIsTransferSheetOpen(true);

        if (prefillAddr) {
          setValue('receiverAddressHex', prefillAddr);
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
              <ControlledUiInput
                control={control}
                name='receiverAddressHex'
                label='Recipient'
                placeholder='Enter recipient address'
                disabled={isFormDisabled}
              />

              <ControlledUiInput
                control={control}
                name='amount'
                label='Amount'
                placeholder='Enter amount'
                type='number'
                disabled={isFormDisabled}
              />
            </div>

            {/* <AuditorsList className='mt-3 flex-1' control={control} /> */}

            <div className='mt-auto pt-4'>
              <UiSeparator className='mb-4' />
              <UiButton className='w-full' onClick={submit} disabled={isFormDisabled}>
                Send confidentially
              </UiButton>
            </div>
          </div>
        </UiSheetContent>
      </UiSheet>
    );
  },
);

TransferFormSheet.displayName = 'TransferFormSheet';

const AuditorsList = ({
  control,
  ...rest
}: {
  control: Control<{
    receiverAddressHex: string;
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
