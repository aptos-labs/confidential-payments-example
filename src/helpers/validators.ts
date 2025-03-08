import isBoolean from 'lodash/isBoolean'
import isDate from 'lodash/isDate'
import isEmpty from 'lodash/isEmpty'
import isNumber from 'lodash/isNumber'

import { Validator } from '@/hooks'
import i18n from '@/localization'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatorFunc = (...params: any[]) => Validator

export const required: Validator = value => ({
  isValid:
    !isEmpty(value) ||
    isNumber(value) ||
    isDate(value) ||
    isBoolean(value) ||
    value instanceof File,
  message: i18n.t('validations.field-error_required'),
})

export const minLength: ValidatorFunc = (length: number) => value => ({
  isValid: String(value).length >= length,
  message: i18n.t('validations.field-error_minLength', {
    minLength: length,
  }),
})

export const maxLength: ValidatorFunc = (length: number) => value => ({
  isValid: String(value).length <= length,
  message: i18n.t('validations.field-error_maxLength', {
    maxLength: length,
  }),
})
