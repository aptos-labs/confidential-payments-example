import { useState } from 'react'

export const useForm = () => {
  const [isFormDisabled, setIsFormDisabled] = useState(false)
  const [isFormPending, setIsFormPending] = useState(false)
  const [isConfirmationShown, setIsConfirmationShown] = useState(false)

  const disableForm = () => {
    setIsFormDisabled(true)
  }

  const enableForm = () => {
    setIsFormDisabled(false)
  }

  const showConfirmation = () => {
    disableForm()
    setIsConfirmationShown(true)
  }

  const hideConfirmation = () => {
    enableForm()
    setIsConfirmationShown(false)
  }

  const hideConfirmationAfterSubmit = async (submitFn: () => void) => {
    setIsFormPending(true)
    await submitFn()
    hideConfirmation()
    setIsFormPending(false)
  }

  return {
    isFormDisabled,
    isFormPending,
    isConfirmationShown,
    disableForm,
    enableForm,
    showConfirmation,
    hideConfirmation,
    hideConfirmationAfterSubmit,
  }
}
