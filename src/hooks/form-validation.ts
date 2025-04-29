import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import isObject from 'lodash/isObject'
import set from 'lodash/set'
import { useCallback, useEffect, useMemo, useState } from 'react'

type FormSchema = Record<string, unknown>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator = (...params: any[]) => {
  isValid: boolean
  message: string
}

interface ValidatorOptions {
  [key: string]: Validator | ValidatorOptions
}

type ValidationErrors = Record<
  string,
  {
    message: string
  }
>

type ValidationFieldState = {
  isInvalid: boolean
  isDirty: boolean
  isError: boolean
  errors: ValidationErrors
}

type ValidationState = Record<keyof FormSchema, ValidationFieldState>

type ValidationRules = Record<keyof FormSchema, ValidatorOptions>

function _generateDefaultFieldState(
  fieldKey: string | number,
  field: unknown,
  defaultFlags = {
    isInvalid: false,
    isDirty: false,
    isError: false,
    errors: {},
  } as ValidationFieldState,
): ValidationState {
  if (!isObject(field)) {
    return {
      [fieldKey]: defaultFlags,
    }
  } else if (Array.isArray(field)) {
    return {
      [fieldKey]: {
        ...defaultFlags,
        ...field.reduce((acc, el, index) => {
          return {
            ...acc,
            ..._generateDefaultFieldState(index, el, defaultFlags),
          }
        }, {}),
      },
    }
  } else {
    return {
      [fieldKey]: {
        ...defaultFlags,
        ...Object.keys(field).reduce((acc, el) => {
          return {
            ...acc,
            ..._generateDefaultFieldState(el, get(field, el), defaultFlags),
          }
        }, {}),
      },
    }
  }
}

export const useFormValidation = (
  formSchema: FormSchema,
  validationRules: ValidationRules,
) => {
  const [fieldsToTouchStack, setFieldsToTouchStack] = useState<string[]>([])

  const [isFieldsValid, setIsFieldsValid] = useState(false)
  const _getValidationDefaultState = useCallback(
    (
      defaultFlags = {
        isInvalid: false,
        isDirty: false,
        isError: false,
        errors: {},
      } as ValidationFieldState,
    ) => {
      return Object.keys(validationRules).reduce((acc, fieldName) => {
        const _validationState = _generateDefaultFieldState(
          fieldName,
          formSchema[fieldName],
          defaultFlags,
        )

        return {
          ...acc,
          ..._validationState,
        }
      }, {})
    },
    [formSchema, validationRules],
  )

  const validationDefaultState = useMemo(
    () => _getValidationDefaultState(),
    [_getValidationDefaultState],
  )

  const [validationState, setValidationState] = useState<ValidationState>(
    validationDefaultState,
  )

  const _validateField = useCallback(
    (
      validatorKey: string | number,
      validator: Validator | ValidatorOptions,
      fieldKey: string | number,
      fieldValue: unknown,
      accumulator: ValidationFieldState,
      cachedResult: ValidationFieldState,
    ):
      | ValidationFieldState
      | { [x: string | number]: ValidationFieldState } => {
      if (typeof validator == 'function') {
        const { isValid, message } = validator(fieldValue)

        const errors = {
          ...cloneDeep({
            ...accumulator?.errors,
            ...(isValid
              ? {}
              : {
                  [validatorKey]: {
                    message,
                  },
                }),
          }),
        }

        if (Object.keys(errors).length) {
          setIsFieldsValid(false)
        }

        if (isValid && errors[validatorKey]) {
          delete errors[validatorKey]
        }

        const isInvalid = !isEmpty(errors) || false
        const isDirty = cachedResult?.isDirty || false
        const isError = (isInvalid && isDirty) || false

        return {
          ...cachedResult,
          isInvalid,
          isDirty,
          isError,
          errors,
        }
      } else if (validatorKey === '$every') {
        if (!Array.isArray(fieldValue))
          throw new Error(`${fieldKey}: is not an array`)

        return fieldValue.reduce((acc, el, index) => {
          return {
            ...acc,
            ..._validateField(
              index,
              validator,
              index,
              el,
              get(acc, index),
              get(cachedResult, index),
            ),
          }
        }, accumulator)
      } else if (isObject(validator)) {
        return {
          [validatorKey]: Object.entries(validator).reduce(
            (acc, [_validatorKey, _validatorValue]) => {
              const isValidatorValueFunction =
                typeof _validatorValue === 'function'
              const isValidatorValueEvery = _validatorKey === '$every'

              const _cachedResult =
                isValidatorValueFunction || isValidatorValueEvery
                  ? cachedResult
                  : get(cachedResult, _validatorKey)

              const _fieldKey =
                isValidatorValueFunction || isValidatorValueEvery
                  ? fieldKey
                  : _validatorKey

              const _fieldValue =
                isValidatorValueFunction || isValidatorValueEvery
                  ? fieldValue
                  : get(fieldValue, _validatorKey)

              const _accumulator =
                isValidatorValueFunction || isValidatorValueEvery
                  ? acc
                  : get(acc, _fieldKey)

              const validatedNestedField = _validateField(
                _validatorKey,
                _validatorValue,
                _fieldKey,
                _fieldValue,
                _accumulator,
                _cachedResult as ValidationFieldState,
              )

              return {
                ...acc,
                ...(isValidatorValueFunction ||
                isValidatorValueEvery ||
                _fieldKey === _validatorKey
                  ? { ...validatedNestedField }
                  : { [_fieldKey]: validatedNestedField }),
              }
            },
            accumulator,
          ),
        }
      }
      return {} as ValidationFieldState
    },
    [],
  )

  const getValidationState = useCallback((): ValidationState => {
    setIsFieldsValid(true)
    return Object.keys(validationRules).reduce((acc, fieldName) => {
      const fieldValidators = validationRules[fieldName]

      if (!fieldValidators || isEmpty(fieldValidators)) {
        console.error(`Field ${fieldName} has no validators`)
        return {}
      }

      const validatedField = Object.entries(fieldValidators).reduce(
        (acc, [validatorKey, validator]) => {
          const isValidatorFunction = typeof validator === 'function'
          const isValidatorEvery = validatorKey === '$every'

          const cachedResult =
            isValidatorFunction || isValidatorEvery
              ? {
                  ...cloneDeep(validationState[fieldName]),
                }
              : {
                  ...cloneDeep(
                    get(
                      validationState[fieldName],
                      validatorKey,
                      {} as ValidationFieldState,
                    ),
                  ),
                }

          const fieldKey =
            isValidatorFunction || isValidatorEvery ? fieldName : validatorKey

          const fieldValue =
            isValidatorFunction || isValidatorEvery
              ? formSchema[fieldName]
              : get(formSchema[fieldName], validatorKey)

          const accumulator =
            isValidatorFunction || isValidatorEvery ? acc : get(acc, fieldKey)

          const validatedField = _validateField(
            validatorKey,
            validator,
            fieldKey,
            fieldValue,
            accumulator as ValidationFieldState,
            cachedResult as ValidationFieldState,
          )

          return {
            ...acc,
            ...validatedField,
          }
        },
        {} as ValidationFieldState,
      )

      return {
        ...acc,
        [fieldName]: validatedField,
      }
    }, {})
  }, [_validateField, formSchema, validationRules, validationState])

  useEffect(() => {
    setValidationState(validationState => {
      const newState = getValidationState()

      return isEqual(validationState, newState) ? validationState : newState
    })
  }, [getValidationState, formSchema, validationState])

  const touchField = useCallback(
    (fieldPath: string): void => {
      if (!get(validationState, fieldPath)) {
        console.error(`Field ${fieldPath} not found`)
        setFieldsToTouchStack(prevState => [...prevState, fieldPath])
        return
      }

      if (fieldsToTouchStack.includes(fieldPath)) {
        setFieldsToTouchStack(prevState => [
          ...prevState.filter(el => el !== fieldPath),
        ])
      }

      setValidationState(prevState => {
        const nextState = {
          ...cloneDeep(prevState),
        }

        set(nextState, fieldPath, {
          ...get(nextState, fieldPath),
          isDirty: true,
        })

        return isEqual(prevState, nextState) ? prevState : nextState
      })
    },
    [fieldsToTouchStack, validationState],
  )

  useEffect(() => {
    fieldsToTouchStack.forEach(el => touchField(el))
  }, [fieldsToTouchStack, touchField, validationState])

  const touchForm = useCallback(() => {
    const _defaultState = _getValidationDefaultState({
      isInvalid: false,
      isDirty: true,
      isError: false,
      errors: {},
    })

    setValidationState(_defaultState)
  }, [_getValidationDefaultState])

  const getFieldErrorMessage = useCallback(
    (fieldPath: string) => {
      const validationField = get(validationState, fieldPath)

      if (!validationField && !Object.keys(formSchema).includes(fieldPath)) {
        return ''
      } else if (
        validationField?.errors &&
        !Object.entries(validationField.errors)[0]
      ) {
        return ''
      }

      return (
        (validationField?.isError &&
          Object.entries(validationField?.errors)[0][1]?.message) ||
        ''
      )
    },
    [formSchema, validationState],
  )

  const isFieldValid = useCallback(
    (fieldPath: string) => {
      const validationField = get(validationState, fieldPath)

      if (!validationField) return false

      return !validationField.isInvalid || false
    },
    [validationState],
  )

  return {
    isFieldsValid,

    touchForm,
    getFieldErrorMessage,
    touchField,
    isFieldValid,
  }
}
