'use client'

import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  LoaderFunctionArgs,
  Navigate,
  Outlet,
  redirect,
} from 'react-router-dom'

import { ConfidentialCoinContextProvider } from '@/app/Dashboard/context'
import { RoutePaths } from '@/enums'
import { MainLayout } from '@/layouts'
import { authStore } from '@/store/auth'

export const createRouter = () => {
  const Homepage = lazy(() => import('@/app/Homepage'))
  const Login = lazy(() => import('@/app/Login'))
  const Dashboard = lazy(() => import('@/app/Dashboard'))

  // eslint-disable-next-line no-empty-pattern
  const authProtectedGuard = ({}: LoaderFunctionArgs) => {
    if (!authStore.useAuthStore.getState().accessToken) {
      return redirect(RoutePaths.Login)
    }

    return null
  }

  return createBrowserRouter([
    {
      path: RoutePaths.Root,
      element: (
        <Suspense fallback={<></>}>
          <Outlet />
        </Suspense>
      ),
      children: [
        {
          element: <MainLayout />,
          children: [
            {
              path: RoutePaths.Root,
              element: <Homepage />,
            },
            {
              path: RoutePaths.Login,
              element: <Login />,
            },
            {
              path: RoutePaths.Dashboard,
              loader: authProtectedGuard,
              element: (
                <ConfidentialCoinContextProvider>
                  <Dashboard />
                </ConfidentialCoinContextProvider>
              ),
            },
            {
              path: '*',
              element: <Navigate replace to={RoutePaths.Root} />,
            },
          ],
        },
      ],
    },
  ])
}
