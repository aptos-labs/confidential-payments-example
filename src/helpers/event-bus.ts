import { EventEmitter } from '@distributedlab/tools'

export enum BusEvents {
  Error = 'error',
  Warning = 'warning',
  Success = 'success',
  Info = 'Info',
}

export type DefaultBusEventMap = {
  [BusEvents.Success]: string
  [BusEvents.Error]: string
  [BusEvents.Warning]: string
  [BusEvents.Info]: string
}

export const bus = new EventEmitter<DefaultBusEventMap>()
