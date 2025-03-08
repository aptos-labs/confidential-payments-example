import log from 'loglevel'

import { bus, BusEvents } from '@/helpers'
import i18n from '@/localization'

export class ErrorHandler {
  static process(error: Error | unknown, errorMessage = ''): void {
    const { msgTranslation, msgType } = ErrorHandler._getErrorMessage(error)
    if (msgTranslation) {
      bus.emit(msgType as BusEvents, msgTranslation || errorMessage)
    }

    ErrorHandler.processWithoutFeedback(error)
  }

  static processWithoutFeedback(error: Error | unknown): void {
    log.error(error)
  }

  static _getErrorMessage(error: Error | unknown): {
    msgTranslation: string
    msgType: 'error' | 'warning'
  } {
    let errorMessage = ''
    let msgType: 'error' | 'warning' = 'error'

    if (error instanceof Error) {
      switch (error.constructor) {
        default: {
          errorMessage = i18n.t('errors.default')
          msgType = 'error'
        }
      }
    }

    return {
      msgTranslation: errorMessage,
      msgType: msgType || 'error',
    }
  }
}
