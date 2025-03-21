'use client'

import dynamic from 'next/dynamic'

const RegisterFormContent = dynamic(() => import('./RegisterFormContent'), {
  ssr: false,
})

export default function RegisterForm() {
  return <RegisterFormContent />
}
