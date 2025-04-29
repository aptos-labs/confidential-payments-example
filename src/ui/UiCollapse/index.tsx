import { AnimatePresence, motion, type MotionProps } from 'motion/react'
import { HTMLAttributes, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  isOpen: boolean
  duration?: number
} & HTMLAttributes<HTMLDivElement> &
  MotionProps

export default function UiCollapse({
  isOpen,
  duration = 0.25,
  children,
  ...rest
}: Props) {
  const uid = useMemo(() => uuidv4(), [])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`collapse-${uid}`}
          initial='collapsed'
          animate='open'
          exit='collapsed'
          variants={{
            open: { opacity: 1, height: 'auto', overflowY: 'hidden' },
            collapsed: { opacity: 0, height: 0, overflowY: 'hidden' },
          }}
          transition={{ duration: duration }}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
