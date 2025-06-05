import { createMiddleware, type MiddlewareFunctionProps } from '@rescale/nemo';
import { NextResponse } from 'next/server';

import { AppConfig, appConfig } from './config';

// Iterate through the config and ensure nothing is undefined.
for (const key in appConfig) {
  if (appConfig[key as keyof AppConfig] === undefined) {
    throw new Error(`Required environment variable ${key} is not set.`);
  }
}

async function shouldShowMaintenancePage() {
  if (appConfig.FORCE_MAINTENANCE_PAGE) {
    return true;
  }

  try {
    const response = await fetch(
      `https://api.testnet.aptoslabs.com/v1/accounts/${appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR}/module/confidential_asset`,
      {
        headers: {
          Authorization: `Bearer ${appConfig.APTOS_BUILD_API_KEY}`,
        },
      },
    );
    if (response.ok) {
      return false;
    }
    console.error('Non 200 response when fetching module:', response.statusText);
    return true;
  } catch (error) {
    console.error('Error fetching module:', error);
    return true;
  }
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
