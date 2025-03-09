import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  LoaderFunctionArgs,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
} from 'react-router-dom'

import { RoutePaths } from '@/enums'
import { MainLayout } from '@/layouts'
import { ConfidentialCoinContextProvider } from '@/pages/Dashboard/context'
import { authStore } from '@/store/auth'

export const AppRoutes = () => {
  const Homepage = lazy(() => import('@/pages/Homepage'))
  const Login = lazy(() => import('@/pages/Login'))
  const Dashboard = lazy(() => import('@/pages/Dashboard'))

  const isAuthorized = authStore.useIsAuthorized()

  // eslint-disable-next-line unused-imports/no-unused-vars
  const authProtectedGuard = ({ request }: LoaderFunctionArgs) => {
    if (!isAuthorized) {
      return redirect(RoutePaths.Login)
    }

    return null
  }

  const router = createBrowserRouter([
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

  return <RouterProvider router={router} />
}
