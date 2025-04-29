'use client'

import { useTheme } from 'next-themes'
import { ReactNode, useCallback, useEffect } from 'react'
import { toast, Toaster as Sonner } from 'sonner'

import { bus, BusEvents } from '@/helpers'

type ToasterProps = React.ComponentProps<typeof Sonner>

const UiToaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  const showSuccessToast = useCallback(
    (payload: ReactNode) => toast(payload ?? 'Success'),
    [],
  )
  const showWarningToast = useCallback(
    (payload: ReactNode) => toast(payload ?? 'Warning'),
    [],
  )
  const showErrorToast = useCallback(
    (payload: ReactNode) => toast(payload ?? 'Error'),
    [],
  )
  const showInfoToast = useCallback(
    (payload: ReactNode) => toast(payload ?? 'Info'),
    [],
  )

  useEffect(() => {
    bus.on(BusEvents.Success, showSuccessToast)
    bus.on(BusEvents.Warning, showWarningToast)
    bus.on(BusEvents.Error, showErrorToast)
    bus.on(BusEvents.Info, showInfoToast)

    return () => {
      bus.off(BusEvents.Success, showSuccessToast)
      bus.off(BusEvents.Warning, showWarningToast)
      bus.off(BusEvents.Error, showErrorToast)
      bus.off(BusEvents.Info, showInfoToast)
    }

    /* eslint-disable-next-line */
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { UiToaster }
