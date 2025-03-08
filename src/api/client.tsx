import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import type { PropsWithChildren } from 'react'

export const apiClient = axios.create({
  baseURL: '', // TODO: implement me
  headers: {
    'Content-Type': 'application/json',
  },
})

export const queryClient = new QueryClient()

export function APIProvider({ children }: PropsWithChildren) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
