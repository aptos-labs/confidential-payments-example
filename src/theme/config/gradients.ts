import type { CSSRuleObject } from 'tailwindcss/types/config'

export const gradients: CSSRuleObject = {
  '.additional-gradient1': {
    background: 'linear-gradient(87.63deg, #45C45C -1.41%, #39CDA0 113.73%);',
  },
  '.additional-gradient2': {
    background: 'linear-gradient(87.63deg, #82ED95 -1.41%, #82EDC0 113.73%);',
  },
  '.additional-gradient3': {
    background: 'linear-gradient(87.63deg, #AC95DC -1.41%, #CD90F3 113.73%);',
  },
  '.additional-gradient4': {
    background: 'linear-gradient(87.63deg, #383838 -1.41%, #282828 113.73%);',
  },
  '.background-gradient': {
    background:
      'linear-gradient(259.67deg, #A5E87D 7.71%, #95F1CD 42.6%, var(--gradient-end) 91.86%)',
  },
  '.background-mask-gradient': {
    background: 'var(--background-mask-gradient)',
    opacity: 'var(--background-mask-opacity)',
  },
}
