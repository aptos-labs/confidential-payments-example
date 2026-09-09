'use client';

import * as React from 'react';
import { ReactNode, useMemo } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';
import { v4 } from 'uuid';

import { cn } from '@/theme/utils';
import { UiLabel } from '@/ui/UiLabel';

type Props = React.ComponentProps<'input'>;

const UiInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
UiInput.displayName = 'UiInput';

export type ControlledInputProps<T extends FieldValues> = Props & {
  label?: ReactNode;
  hideErrorMessage?: boolean;
} & UseControllerProps<T>;

function ControlledUiInput<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  hideErrorMessage = false,
  id: idProp,
  ...rest
}: ControlledInputProps<T>) {
  const generatedId = useMemo(() => v4(), []);
  const inputId = idProp ?? generatedId;
  const { field, fieldState } = useController({ control, name, rules: rules });

  return (
    <div className='grid gap-2'>
      {label &&
        (() => {
          return <UiLabel htmlFor={inputId}>{label}</UiLabel>;
        })()}
      <UiInput
        {...rest}
        id={inputId}
        ref={field.ref}
        autoCapitalize='none'
        onChange={e => {
          rest.onChange?.(e);
          field.onChange(e);
        }}
        onBlur={e => {
          rest.onBlur?.(e);
          field.onBlur();
        }}
        value={field.value}
      />
      {!hideErrorMessage && fieldState.error?.message ? (
        <div className='pt-2 text-sm text-warningMain'>{fieldState.error.message}</div>
      ) : null}
    </div>
  );
}

export { ControlledUiInput, UiInput };
