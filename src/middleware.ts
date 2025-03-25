import { createMiddleware, type MiddlewareFunctionProps } from '@rescale/nemo'
import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse } from 'next/server'

const appGuard = async ({ request }: MiddlewareFunctionProps) => {
  /* eslint-disable no-console */
  console.log(JSON.stringify(request))
  console.log(request.cookies.get('better-auth.session_token'))

  const sessionCookie = getSessionCookie(request, {
    // Optionally pass config if cookie name, prefix or useSecureCookies option is customized in auth config.
    cookieName: 'session_token',
    cookiePrefix: 'better-auth',
  })

  // eslint-disable-next-line no-console
  console.log(sessionCookie)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}

const authGuard = async ({ request }: MiddlewareFunctionProps) => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(request))
  const sessionCookie = getSessionCookie(request, {
    // Optionally pass config if cookie name, prefix or useSecureCookies option is customized in auth config.
    cookieName: 'session_token',
    cookiePrefix: 'better-auth',
    useSecureCookies: false,
  })

  // eslint-disable-next-line no-console
  console.log(sessionCookie)

  if (sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

const middlewares = {
  '/dashboard': [appGuard],
  '/sign-in': [authGuard],
  '/sign-up': [authGuard],
}

export const middleware = createMiddleware(middlewares)

export const config = {
  matcher: ['/((?!_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
}
