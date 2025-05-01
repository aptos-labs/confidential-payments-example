import { createMiddleware, type MiddlewareFunctionProps } from '@rescale/nemo';
import { NextResponse } from 'next/server';

import { config as appConfig } from './config';

async function shouldShowMaintenancePage() {
  if (appConfig.FORCE_MAINTENANCE_PAGE) {
    return true;
  }

  const response = await fetch(
    `https://api.testnet.aptoslabs.com/v1/accounts/${appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR}/module/confidential_asset`,
    {
      headers: {
        Authorization: `Bearer ${appConfig.APTOS_BUILD_API_KEY}`,
      },
    },
  );
  if (!response.ok) {
    console.error('Error fetching module:', response.statusText);
  }

  return !response.ok;
}

const moduleValidGuard = async ({ request }: MiddlewareFunctionProps) => {
  const showMaintenancePage = await shouldShowMaintenancePage();
  if (showMaintenancePage) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  return NextResponse.next();
};

const maintenanceGuard = async ({ request }: MiddlewareFunctionProps) => {
  const showMaintenancePage = await shouldShowMaintenancePage();
  if (!showMaintenancePage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
};

const middlewares = {
  '/dashboard': [moduleValidGuard],
  '/': [moduleValidGuard],
  '/maintenance': [maintenanceGuard],
};

export const middleware = createMiddleware(middlewares);

export const config = {
  matcher: ['/((?!_next/|_static|_vercel|[\\w-]+\\.\\w+).*)'],
};
