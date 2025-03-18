import type { PoolConfig } from 'pg'

type Config = {
  pgPoolCfg: PoolConfig
  AUTH_BASE_URL: string
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
  DEFAULT_TOKEN: {
    address:
      '0x2a0c0d0d3d213a120a0bac6aecf2bf4a59c4d5e5be0721ca2b3566f0013e7e3d',
    name: 'Mocked token',
    symbol: 'MTK',
    decimals: 0,
    iconUri: '',
  },
}

/**
 * Enable if u want to use env.js to pass env variables in runtime
 */
// Object.assign(config, _mapEnvCfg(window.document.ENV))

// function _mapEnvCfg(env: ImportMetaEnv | typeof window.document.ENV): {
//   [k: string]: string | boolean | undefined
// } {
//   return mapKeys(
//     pickBy(env, (v, k) => k.startsWith('VITE_APP_')),
//     (v, k) => k.replace(/^VITE_APP_/, ''),
//   )
// }
