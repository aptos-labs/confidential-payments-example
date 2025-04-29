import { Inter } from 'next/font/google'

import { PRIMARY_FONT_VARIABLE } from './config'

const primaryFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  // HACK: "Font loader values must be explicitly written literals"
  // https://miroslavpetrik.medium.com/how-to-share-the-next-font-variable-with-typescript-b3073e6c3e86
  variable: '--font-primary' as const satisfies typeof PRIMARY_FONT_VARIABLE,
})

export const appFontClassName = primaryFont.variable
