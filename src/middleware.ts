import { createMiddleware, type MiddlewareFunctionProps } from '@rescale/nemo';
import { NextRequest, NextResponse } from 'next/server';

import { appConfig } from './config';

function getNetworkConfig(request: NextRequest) {
  const network = request.cookies.get('aptos_network')?.value ?? 'mainnet';
  if (network === 'testnet') {
    return {
      endpoint: 'https://api.testnet.aptoslabs.com/v1',
      moduleAddr: process.env.NEXT_PUBLIC_TESTNET_CONFIDENTIAL_ASSET_MODULE_ADDR,
      apiKey: process.env.NEXT_PUBLIC_TESTNET_APTOS_BUILD_API_KEY,
    };
  }
  return {
    endpoint: 'https://api.mainnet.aptoslabs.com/v1',
    moduleAddr: process.env.NEXT_PUBLIC_MAINNET_CONFIDENTIAL_ASSET_MODULE_ADDR,
    apiKey: process.env.NEXT_PUBLIC_MAINNET_APTOS_BUILD_API_KEY,
  };
}

async function shouldShowMaintenancePage(request: NextRequest) {
  if (appConfig.FORCE_MAINTENANCE_PAGE) {
    return true;
  }

  const { endpoint, moduleAddr, apiKey } = getNetworkConfig(request);
  // If the module address is not configured for this network, bypass the check.
  // The client-side config validation will surface missing env vars to the developer.
  if (!moduleAddr) {
    return false;
  }

  try {
    const response = await fetch(
      `${endpoint}/accounts/${moduleAddr}/module/confidential_asset`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
  const showMaintenancePage = await shouldShowMaintenancePage(request);
  if (showMaintenancePage) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  return NextResponse.next();
};

const maintenanceGuard = async ({ request }: MiddlewareFunctionProps) => {
  const showMaintenancePage = await shouldShowMaintenancePage(request);
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
