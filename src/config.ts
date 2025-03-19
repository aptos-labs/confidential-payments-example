import type { PoolConfig } from 'pg'

type Config = {
  pgPoolCfg: PoolConfig
  AUTH_BASE_URL: string
  CONFIDENTIAL_ASSET_MODULE_ADDR: string
  DEFAULT_TOKEN: {
    address: string
    name: string
    symbol: string
    decimals: number
    iconUri: string
  }
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
  AUTH_BASE_URL: process.env.AUTH_BASE_URL!,
  CONFIDENTIAL_ASSET_MODULE_ADDR: process.env.CONFIDENTIAL_ASSET_MODULE_ADDR!,
  DEFAULT_TOKEN: {
    address:
      '0x8b4dd7ebf8150f349675dde8bd2e9daa66461107b181a67e764de85d82bbac21',
    name: 'Mocked token',
    symbol: 'MTK',
    decimals: 0,
    iconUri: '',
  },
}
