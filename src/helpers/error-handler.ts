import log from 'loglevel';

import { bus, BusEvents } from '@/helpers';

export class ErrorHandler {
  static process(error: Error | unknown, errorMessage = ''): void {
    const { msgTranslation, msgType } = ErrorHandler._getErrorMessage(error);
    if (msgTranslation) {
      bus.emit(msgType, errorMessage || msgTranslation);
    }

    ErrorHandler.processWithoutFeedback(error);
  }

  static processWithoutFeedback(error: Error | unknown): void {
    log.error(error);
  }

  static _getErrorMessage(error: Error | unknown): {
    msgTranslation: string;
    msgType: BusEvents;
  } {
    let errorMessage = '';
    let msgType: BusEvents.Error | BusEvents.Warning = BusEvents.Error;

    if (error instanceof Error) {
      switch (error.constructor) {
        default: {
          errorMessage = 'Oops... Something went wrong';
          msgType = BusEvents.Error;
        }
      }
    }

    return {
      msgTranslation: errorMessage,
      msgType: msgType || BusEvents.Error,
    };
  }
}
