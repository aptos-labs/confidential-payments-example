'use client'

import dynamic from 'next/dynamic'

const LoginFormContent = dynamic(
  () => import('@/app/(auth)/sign-in/components/LoginFormContent'),
  { ssr: false },
)

export default function LoginForm() {
  return <LoginFormContent />
}
