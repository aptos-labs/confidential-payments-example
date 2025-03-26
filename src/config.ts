import type { PoolConfig } from 'pg'

type Config = {
  pgPoolCfg: PoolConfig
  AUTH_BASE_URL: string
  CONFIDENTIAL_ASSET_MODULE_ADDR: string
  DEFAULT_TOKEN_ADRESSES: string[]
  PG_URL: string

  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string

  APPLE_CLIENT_ID: string
  APPLE_CLIENT_SECRET: string
}

export const config: Config = {
  pgPoolCfg: {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT!),
    max: 20, // maximum number of clients
    min: 2, // minimum number of clients
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  },
  PG_URL: process.env.PG_URL!,
  AUTH_BASE_URL: process.env.AUTH_BASE_URL!,
  CONFIDENTIAL_ASSET_MODULE_ADDR:
    process.env.NEXT_PUBLIC_CONFIDENTIAL_ASSET_MODULE_ADDR!,
  DEFAULT_TOKEN_ADRESSES: [
    '0x000000000000000000000000000000000000000000000000000000000000000a',
  ],

  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,

  APPLE_CLIENT_ID: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID!,
  APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET!,
}
