import debounce from 'lodash/debounce'
import { useEffect } from 'react'

export const useViewportSizes = () => {
  const assignVhCssVariable = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }

  const assignVhCssVariableDebounced = debounce(assignVhCssVariable, 300)

  useEffect(() => {
    assignVhCssVariable()
    window.addEventListener('resize', assignVhCssVariableDebounced)

    return () =>
      window.removeEventListener('resize', assignVhCssVariableDebounced)
  })
}
