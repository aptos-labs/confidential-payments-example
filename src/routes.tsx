import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom'

import { RoutePaths } from '@/enums'
import { MainLayout } from '@/layouts'
import { ConfidentialCoinContextProvider } from '@/pages/Dashboard/context'

export const AppRoutes = () => {
  const Homepage = lazy(() => import('@/pages/Homepage'))
  const Login = lazy(() => import('@/pages/Login'))
  const Dashboard = lazy(() => import('@/pages/Dashboard'))

  const pageAnimationOpts = {
    initial: 'hide',
    animate: 'show',
    exit: 'hide',
    variants: {
      hide: {
        opacity: 0,
      },
      show: {
        opacity: 1,
      },
    },
    transition: { duration: 0.5 },
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
              element: <Homepage {...pageAnimationOpts} />,
            },
            {
              path: RoutePaths.Login,
              element: <Login />,
            },
            {
              path: RoutePaths.Dashboard,
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
