import { LogLevelDesc } from 'loglevel'

import packageJson from '../package.json'

type Config = {
  API_URL: string
  APP_NAME: string
  LOG_LEVEL: LogLevelDesc
  BUILD_VERSION: string

  erc20Token: `0x${string}`
}

export const config: Config = {
  API_URL: import.meta.env.VITE_API_URL,
  APP_NAME: import.meta.env.VITE_APP_NAME,
  LOG_LEVEL: 'trace' as LogLevelDesc,
  BUILD_VERSION: packageJson.version || import.meta.env.VITE_APP_BUILD_VERSION,

  erc20Token: '0x08BE00b659713E615795954B778dbacD1F14efEb',
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
