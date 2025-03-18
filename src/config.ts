type Config = {
  DEFAULT_TOKEN: {
    address: string
    name: string
    symbol: string
    decimals: number
    iconUri: string
  }
}

export const config: Config = {
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
