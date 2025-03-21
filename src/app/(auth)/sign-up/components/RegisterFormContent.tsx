'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

import { ErrorHandler } from '@/helpers'
import { useForm } from '@/hooks'
import { authStore } from '@/store/auth'
import { cn } from '@/theme/utils'
import { UiButton } from '@/ui/UiButton'
import { ControlledUiInput } from '@/ui/UiInput'

export default function RegisterFormContent() {
  const router = useRouter()

  const register = authStore.useRegister()

  const { control, handleSubmit, disableForm, enableForm, isFormDisabled } =
    useForm(
      {
        name: '',
        email: '',
        password: '',
        repeatPassword: '',
      },
      yup =>
        yup.object().shape({
          name: yup.string().required(),
          email: yup.string().email().required(),
          password: yup.string().required(),
          repeatPassword: yup
            .string()
            .required()
            .oneOf([yup.ref('password')], 'Passwords must match'),
        }),
    )

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          await register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
          })

          router.push('/dashboard')
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [disableForm, enableForm, handleSubmit, register, router],
  )

  return (
    <form className='p-6 md:p-8' onSubmit={handleSubmit(submit)}>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col items-center text-center'>
          <h1 className='text-2xl font-bold'>Welcome back</h1>
          <p className='text-balance text-muted-foreground'>
            Login to your Acme Inc account
          </p>
        </div>
        <ControlledUiInput
          control={control}
          name='name'
          label='Name'
          placeholder='name'
          disabled={isFormDisabled}
        />

        <ControlledUiInput
          control={control}
          name='email'
          label='Email'
          placeholder='m@example.com'
          type='email'
          disabled={isFormDisabled}
        />

        <ControlledUiInput
          control={control}
          name='password'
          label='Password'
          placeholder='password'
          type='password'
          disabled={isFormDisabled}
        />

        <ControlledUiInput
          control={control}
          name='repeatPassword'
          label='Repeat Password'
          placeholder='password'
          type='password'
          disabled={isFormDisabled}
        />

        <UiButton type='submit' className='w-full' disabled={isFormDisabled}>
          Register
        </UiButton>

        <div className='text-center text-sm'>
          Already have an account?{' '}
          <Link
            href='/sign-in'
            className={cn(
              'underline underline-offset-4',
              isFormDisabled && 'pointer-events-none text-muted-foreground',
            )}
          >
            Sign in
          </Link>
        </div>
      </div>
    </form>
  )
}
