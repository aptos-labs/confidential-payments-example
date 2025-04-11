import { createMiddleware, type MiddlewareFunctionProps } from '@rescale/nemo'
import { NextResponse } from 'next/server'

import { config as appConfig } from './config'

// eslint-disable-next-line unused-imports/no-unused-vars
const appGuard = async ({ request }: MiddlewareFunctionProps) => {
  // const sessionCookie = getSessionCookie(request, {
  //   // Optionally pass config if cookie name, prefix or useSecureCookies option is customized in auth config.
  //   cookieName: 'session_token',
  //   cookiePrefix: 'better-auth',
  // })

  // Manual cookie parsing as temporary workaround
  const cookieHeader = request.headers.get('cookie')
  const cookies = cookieHeader?.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=')
    acc.set(key, value)
    return acc
  }, new Map())

  const sessionCookie =
    cookies?.get('better-auth.session_token') ||
    cookies?.get('__Secure-better-auth.session_token')

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

// eslint-disable-next-line unused-imports/no-unused-vars
const authGuard = async ({ request }: MiddlewareFunctionProps) => {
  // const sessionCookie = getSessionCookie(request, {
  //   // Optionally pass config if cookie name, prefix or useSecureCookies option is customized in auth config.
  //   cookieName: 'session_token',
  //   cookiePrefix: 'better-auth',
  // })

  // Manual cookie parsing as temporary workaround
  const cookieHeader = request.headers.get('cookie')
  const cookies = cookieHeader?.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=')
    acc.set(key, value)
    return acc
  }, new Map())

  const sessionCookie =
    cookies?.get('better-auth.session_token') ||
    cookies?.get('__Secure-better-auth.session_token')

  if (sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

const moduleValidGuard = async ({ request }: MiddlewareFunctionProps) => {
  const response = await fetch(
    `https://api.devnet.aptoslabs.com/v1/accounts/${appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR}/module/confidential_asset`,
  )

  if (!response.ok) {
    console.error('Error fetching module:', response.statusText)
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}

const maintenanceGuard = async ({ request }: MiddlewareFunctionProps) => {
  const response = await fetch(
    `https://api.devnet.aptoslabs.com/v1/accounts/${appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR}/module/confidential_asset`,
  )

  if (response.ok) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }
  return NextResponse.next()
}

const middlewares = {
  '/dashboard': [moduleValidGuard],
  '/': [moduleValidGuard],
  '/maintenance': [maintenanceGuard],
}

export const middleware = createMiddleware(middlewares)

export const config = {
  matcher: ['/((?!_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
}
