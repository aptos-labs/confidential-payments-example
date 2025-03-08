import react from '@vitejs/plugin-react'
/**
 * @description Enable import if you need polyfills
 *
 * import { nodePolyfills } from 'vite-plugin-node-polyfills'
 * import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
 * import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
 */
import * as fs from 'fs'
import * as path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
import { checker } from 'vite-plugin-checker'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import tsconfigPaths from 'vite-tsconfig-paths'

const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = (relative: string) => path.resolve(appDirectory, relative)
const root = path.resolve(__dirname, resolveApp('src'))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // const isProduction = mode === 'production'
  // const isDevelopment = mode === 'development'
  const isAnalyze = mode === 'analyze'

  // const buildVersion = env.VITE_APP_BUILD_VERSION

  return {
    ...(env.VITE_PORT
      ? {
          server: {
            port: Number(env.VITE_PORT),
          },
        }
      : {}),
    plugins: [
      react(),
      // Custom plugin to load markdown files
      {
        name: 'markdown-loader',
        transform(code, id) {
          if (id.slice(-3) === '.md') {
            // For .md files, get the raw content
            return `export default ${JSON.stringify(code)};`
          }
        },
      },

      tsconfigPaths(),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
        symbolId: '[name]',
      }),
      checker({
        overlay: {
          initialIsOpen: false,
        },
        typescript: true,
        eslint: {
          useFlatConfig: true,
          lintCommand: 'eslint "{src,config}/**/*.{js,ts,jsx,tsx}"',
        },
      }),
      ...(isAnalyze
        ? [
            visualizer({
              open: true,
            }),
          ]
        : []),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      dedupe: ['react', 'lodash'],
      alias: {
        '@': `${root}/`,
        '@config': `${root}/config.ts`,
        '@static': `${root}/../static`,
      },
    },
    /**
     * @description Enable configuration for polyfills
     *
     * optimizeDeps: {
     *       esbuildOptions: {
     *         define: {
     *           global: 'globalThis',
     *         },
     *       },
     *       // Enable esbuild polyfill plugins
     *       plugins: [
     *         NodeGlobalsPolyfillPlugin({
     *           process: true,
     *           buffer: true,
     *         }),
     *         NodeModulesPolyfillPlugin(),
     *       ],
     *     },
     *     build: {
     *       target: 'esnext',
     *       rollupOptions: {
     *         plugins: [
     *           // Enable rollup polyfills plugin
     *           // used during production bundling
     *           nodePolyfills(),
     *         ],
     *       },
     *     },
     */
  }
})
