import { motion, MotionProps } from 'motion/react'
import { HTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'

import { RoutePaths } from '@/enums'
import { UiButton } from '@/ui/UiButton'
import UiThreads from '@/ui/UiThreads'

type Props = HTMLAttributes<HTMLDivElement> & MotionProps

export default function Homepage({ ...rest }: Props) {
  const navigate = useNavigate()

  return (
    <motion.div {...rest} className='isolate size-full bg-backgroundPrimary'>
      <div className='absolute inset-0 z-10 size-full'>
        <UiThreads amplitude={1} distance={0} enableMouseInteraction={true} />
      </div>

      <div className='absolute inset-0 z-20 flex size-full flex-col items-center justify-center gap-4 text-center'>
        <span className='tex-textPrimary typography-h1'>
          Confidential Assets
        </span>

        <span className='tex-textPrimary typography-subtitle1'>
          Bringing innovative solutions to secure your digital world.
        </span>

        <UiButton
          className='mt-3 min-w-[200px] bg-textPrimary px-6 py-3 text-backgroundPrimary hover:cursor-pointer'
          onClick={() => navigate(RoutePaths.Login)}
        >
          Begin
        </UiButton>
      </div>
    </motion.div>
  )
}
