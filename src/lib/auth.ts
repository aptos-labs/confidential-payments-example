import { config } from '@config'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool(config.pgPoolCfg),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {},
  plugins: [nextCookies()],
})
