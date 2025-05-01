'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ErrorHandler, tryCatch } from '@/helpers';
import { useForm } from '@/hooks';
import { authStore } from '@/store/auth';
import { cn } from '@/theme/utils';
import { UiIcon } from '@/ui';
import { UiButton } from '@/ui/UiButton';
import { ControlledUiInput } from '@/ui/UiInput';

export default function LoginFormContent() {
  const router = useRouter();

  const isInitialing = useRef(false);

  const {
    getGoogleRequestLoginUrl,
    loginWithGoogle,
    loginWithEmailPassword,
    getAppleRequestLoginUrl,
    loginWithApple,
  } = authStore.useLogin({
    onSuccess: () => {
      router.push('/dashboard');
    },
  });

  const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
  const googleIdToken = fragmentParams.get('id_token');
  const appleIdToken = fragmentParams.get('token');

  useEffect(() => {
    if (isInitialing.current) return;
    isInitialing.current = true;

    if (!googleIdToken && !appleIdToken) return;

    const loginWithSocial = async () => {
      const [, error] = await tryCatch(
        (async () => {
          if (googleIdToken) {
            loginWithGoogle(googleIdToken);
          } else if (appleIdToken) {
            loginWithApple(appleIdToken);
          }
        })(),
      );
      if (error) {
        ErrorHandler.process(error);
        router.push('/sign-in');
      }
    };

    loginWithSocial();
  }, [appleIdToken, googleIdToken, loginWithApple, loginWithGoogle, router]);

  const [authError, setAuthError] = useState<Error>();

  const { control, handleSubmit, disableForm, enableForm, isFormDisabled } = useForm(
    {
      email: '',
      password: '',
    },
    yup =>
      yup.object().shape({
        email: yup.string().email().required(),
        password: yup.string().required(),
      }),
  );

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm();
        try {
          await loginWithEmailPassword({
            email: formData.email,
            password: formData.password,
          });
        } catch (error) {
          setAuthError(error as Error);
          ErrorHandler.process(error);
        }
        enableForm();
      })(),
    [disableForm, enableForm, handleSubmit, loginWithEmailPassword],
  );

  return (
    <form className='p-6 md:p-8' onSubmit={handleSubmit(submit)}>
      {(() => {
        if (googleIdToken) {
          return (
            <div className='flex min-h-[50vh] items-center justify-center p-4 shadow-sm'>
              <div className='flex items-center gap-4 self-center'>
                <UiIcon
                  name={'WandSparklesIcon'}
                  className={'size-12 text-textPrimary'}
                />
                <div>
                  <p className='text-lg font-bold text-primary'>Authorizing...</p>
                  <p className='text-sm text-muted-foreground'>
                    You are being logged in with Google.
                  </p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className='flex flex-col gap-6'>
            <div className='flex flex-col items-center text-center'>
              <h1 className='text-2xl font-bold'>Welcome back</h1>
              <p className='text-balance text-muted-foreground'>
                Login to your Acme Inc account
              </p>
            </div>

            <ControlledUiInput
              control={control}
              label='Email'
              name='email'
              placeholder='m@example.com'
              type='email'
              onChange={() => {
                setAuthError(undefined);
              }}
              disabled={isFormDisabled}
            />

            <ControlledUiInput
              control={control}
              label='Password'
              name='password'
              placeholder='password'
              type='password'
              onChange={() => {
                setAuthError(undefined);
              }}
              disabled={isFormDisabled}
              autoComplete='on'
            />

            {authError && (
              <p className='typography-caption3 self-center text-balance text-errorMain'>
                {authError?.message}
              </p>
            )}

            <UiButton type='submit' className='w-full' disabled={isFormDisabled}>
              Login
            </UiButton>

            <div className='relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border'>
              <span className='relative z-10 bg-background px-2 text-muted-foreground'>
                Or continue with
              </span>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <Link className='w-full' href={getAppleRequestLoginUrl}>
                <UiButton
                  type='button'
                  variant='outline'
                  className='w-full'
                  disabled={isFormDisabled}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
                    <path
                      d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'
                      fill='currentColor'
                    />
                  </svg>
                  <span className='sr-only'>Login with Apple</span>
                </UiButton>
              </Link>

              <Link className='w-full' href={getGoogleRequestLoginUrl}>
                <UiButton
                  type='button'
                  variant='outline'
                  className='w-full'
                  disabled={isFormDisabled}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
                    <path
                      d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
                      fill='currentColor'
                    />
                  </svg>
                  <span className='sr-only'>Login with Google</span>
                </UiButton>
              </Link>
            </div>
            <div className='text-center text-sm'>
              Don&apos;t have an account?{' '}
              <Link
                href='/sign-up'
                className={cn(
                  'underline underline-offset-4',
                  isFormDisabled && 'pointer-events-none text-muted-foreground',
                )}
              >
                Sign up
              </Link>
            </div>
          </div>
        );
      })()}
    </form>
  );
}
