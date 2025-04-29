import './styles.scss'

import { AnimatePresence, motion, MotionProps } from 'motion/react'
import { HTMLAttributes, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useClickAway } from 'react-use'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  isShown: boolean
  updateIsShown: (isShown: boolean) => void

  isCloseByClickOutside?: boolean
} & HTMLAttributes<HTMLDivElement> &
  MotionProps

export default function UiDrawer({
  isShown,
  updateIsShown,
  className,

  isCloseByClickOutside = true,

  children,
  ...rest
}: Props) {
  const location = useLocation()

  const uid = useMemo(() => uuidv4(), [])

  const drawerPaneRef = useRef(null)
  const drawerBackdropRef = useRef(null)

  useClickAway(drawerPaneRef, () => {
    if (isCloseByClickOutside) {
      updateIsShown(false)
    }
  })

  useEffect(() => {
    updateIsShown(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return (
    <AnimatePresence initial={false} mode='wait'>
      {isShown && (
        <>
          <motion.div
            ref={drawerBackdropRef}
            className='ui-drawer__backdrop'
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1 },
            }}
            initial='hidden'
            animate='visible'
            exit='hidden'
            transition={{ duration: 0.2 }}
            onClick={() => updateIsShown(false)}
          />
          <motion.div
            ref={drawerPaneRef}
            key={`drawer-${uid}`}
            className={['ui-drawer__pane', className].join(' ')}
            variants={{
              hidden: {
                opacity: 0,
                right: '-100%',
              },
              visible: {
                opacity: 1,
                right: '0%',
              },
            }}
            initial='hidden'
            animate='visible'
            exit='hidden'
            transition={{ duration: 0.2, ease: 'backInOut' }}
            {...rest}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
