'use client';

import Avatar from 'boring-avatars';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { Controller, SubmitHandler } from 'react-hook-form';
import { useDebounce } from 'react-use';

import {
  getFABalance,
  getFAByCoinType,
  getFungibleAssetMetadata,
} from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { ErrorHandler, formatBalance } from '@/helpers';
import { useForm } from '@/hooks';
import { TokenBaseInfo } from '@/store/wallet';
import { cn } from '@/theme/utils';
import { UiIcon } from '@/ui';
import { UiButton } from '@/ui/UiButton';
import {
  UiDialog,
  UiDialogContent,
  UiDialogFooter,
  UiDialogHeader,
  UiDialogTitle,
} from '@/ui/UiDialog';
import { UiInput } from '@/ui/UiInput';
import { UiSeparator } from '@/ui/UiSeparator';
import {
  UiTooltip,
  UiTooltipContent,
  UiTooltipProvider,
  UiTooltipTrigger,
} from '@/ui/UiTooltip';

export default function AddTokenForm({ onSubmit }: { onSubmit: () => void }) {
  const {
    selectedAccount,
    addToken,
    registerAccountEncryptionKey,
    setSelectedTokenAddress,
  } = useConfidentialCoinContext();

  const {
    formState,
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
  } = useForm(
    {
      tokenAddressOrNameOrSymbol: '',
      tokenInfo: undefined as TokenBaseInfo | undefined,
    },
    yup =>
      yup.object().shape({
        tokenAddressOrNameOrSymbol: yup.string().required(),
        tokenInfo: yup.object().shape({
          address: yup.string().required(),
        }),
      }),
  );

  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundedTokens, setFoundedTokens] = useState<
    (TokenBaseInfo & { balanceAmount: string })[]
  >([]);
  const [selectedToken, setSelectedToken] = useState<TokenBaseInfo>();

  const isDisabled = isSearching || isFormDisabled;

  const ensureV2Token = useCallback(async () => {
    if (!selectedToken) return;

    try {
      const tokenAddress = await getFAByCoinType(selectedToken?.address);

      const [token] = await getFungibleAssetMetadata(tokenAddress);

      return token;
    } catch (error) {
      /* empty */
    }

    return selectedToken;
  }, [selectedToken]);

  const clearForm = useCallback(() => {
    setValue('tokenAddressOrNameOrSymbol', '');
    setValue('tokenInfo', undefined);
    setFoundedTokens([]);
  }, [setValue]);

  const submit = useCallback<SubmitHandler<typeof formState>>(
    async formData => {
      disableForm();
      try {
        try {
          await registerAccountEncryptionKey(formData.tokenAddressOrNameOrSymbol);
        } catch (error) {
          /* empty */
        }
        addToken(formData.tokenInfo!);
        setSelectedTokenAddress(formData.tokenInfo!.address);
        onSubmit();
        clearForm();
      } catch (error) {
        ErrorHandler.process(error);
      }
      enableForm();
    },
    [
      addToken,
      clearForm,
      disableForm,
      enableForm,
      onSubmit,
      registerAccountEncryptionKey,
      setSelectedTokenAddress,
    ],
  );

  const searchToken = useCallback(
    async (tokenAddress: string) => {
      setIsSearching(true);

      try {
        const tokens = await getFungibleAssetMetadata(tokenAddress);

        const tokensBalances = await Promise.all(
          tokens.map(async el => {
            const balances = await getFABalance(selectedAccount, el.address);

            return balances[0];
          }),
        );

        setFoundedTokens(
          tokens.map((el, idx) => ({
            ...el,
            balanceAmount: tokensBalances[idx]?.amount,
          })),
        );
      } catch (error) {
        return undefined;
      }
      setIsSearching(false);
    },
    [selectedAccount],
  );

  useDebounce(
    async () => {
      if (!formState.tokenAddressOrNameOrSymbol) return;

      await searchToken(formState.tokenAddressOrNameOrSymbol);
    },
    500,
    [formState.tokenAddressOrNameOrSymbol],
  );

  const renderTokenImage = useCallback((tokenInfo: (typeof foundedTokens)[0]) => {
    try {
      const iconUrl = new URL(tokenInfo.iconUri);

      return (
        <Image
          src={iconUrl.href}
          alt={tokenInfo.name}
          className='size-[48px] rounded-full'
          width={48}
          height={48}
        />
      );
    } catch (_) {
      /* empty */
    }

    return <Avatar name={tokenInfo.address} className={'size-[48px] rounded-[50%]'} />;
  }, []);

  return (
    <div className='flex-1'>
      <Controller
        control={control}
        name={'tokenAddressOrNameOrSymbol'}
        render={({ field }) => <UiInput {...field} placeholder='Enter token address' />}
      />

      <div className='mt-4 flex flex-col gap-4'>
        {foundedTokens.map((el, idx) => (
          <div
            key={idx}
            className={cn(
              'relative isolate mt-3 flex gap-3 md:flex-wrap',
              'hover:brightness-150',
            )}
          >
            {renderTokenImage(el)}
            <div className='flex flex-1 flex-col gap-2 overflow-hidden md:overflow-auto'>
              <UiTooltipProvider delayDuration={0}>
                <UiTooltip>
                  <UiTooltipTrigger className='hidden items-center gap-2 md:flex'>
                    <span className='typography-caption1 text-textPrimary'>
                      {el.name}
                    </span>
                    <UiIcon name='InfoIcon' className='size-4 text-textPrimary' />
                  </UiTooltipTrigger>
                  <UiTooltipContent className='overflow-hidden text-ellipsis'>
                    <span className='typography-caption1 text-textSecondary'>
                      {el.address}
                    </span>
                  </UiTooltipContent>
                </UiTooltip>
              </UiTooltipProvider>
              <span className='typography-caption1 inline text-textPrimary md:hidden'>
                {el.name}
              </span>

              <span className='typography-caption2 text-textSecondary'>
                {el.symbol}
              </span>
              <div className='w-full overflow-hidden text-ellipsis md:hidden'>
                <span className='typography-caption3 text-textSecondary'>
                  {el.address}
                </span>
              </div>

              {el.balanceAmount && (
                <span className='typography-caption1 text-textPrimary'>
                  {formatBalance(el.balanceAmount, el.decimals)} {el.symbol}
                </span>
              )}
            </div>

            <UiButton
              className='ml-auto hidden w-full md:flex'
              type='button'
              disabled={isDisabled}
              onClick={() => {
                setSelectedToken(el);
                setIsConfirmationDialogOpen(true);
              }}
            >
              Add
            </UiButton>

            <button
              className='absolute inset-0 z-20 md:hidden'
              type='button'
              onClick={() => {
                setSelectedToken(el);
                setIsConfirmationDialogOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      <UiDialog
        open={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <UiDialogContent>
          <UiDialogHeader>
            <UiDialogTitle className='pb-2'>
              Add {selectedToken?.symbol} token?
            </UiDialogTitle>
            <UiSeparator />
            {/*<UiDialogDescription>*/}
            <div className='flex w-full gap-2 overflow-hidden pt-2 text-left'>
              {selectedToken &&
                renderTokenImage({
                  ...selectedToken,
                  balanceAmount: '',
                })}

              <div className='flex flex-1 flex-col'>
                <span className='typography-caption1 text-textPrimary'>
                  {selectedToken?.name}
                </span>
                <span className='typography-caption2 text-textSecondary'>
                  {selectedToken?.symbol}
                </span>
                <div className='relative isolate h-5 w-full'>
                  <div className='absolute inset-0 overflow-hidden text-ellipsis'>
                    <span className='typography-caption3 w-full text-textSecondary'>
                      {selectedToken?.address}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/*</UiDialogDescription>*/}
          </UiDialogHeader>
          <UiDialogFooter>
            <form
              onSubmit={handleSubmit(submit)}
              className='flex w-full items-center gap-2'
            >
              <UiButton
                className='flex-1'
                variant={'outline'}
                onClick={() => {
                  setValue('tokenInfo', undefined);
                  setIsConfirmationDialogOpen(false);
                }}
                type='button'
              >
                Cancel
              </UiButton>
              <UiButton
                className='flex-1'
                type={'button'}
                onClick={async () => {
                  const token = await ensureV2Token();

                  setValue('tokenInfo', token);
                  handleSubmit(submit)();
                }}
              >
                Add
              </UiButton>
            </form>
          </UiDialogFooter>
        </UiDialogContent>
      </UiDialog>
    </div>
  );
}
