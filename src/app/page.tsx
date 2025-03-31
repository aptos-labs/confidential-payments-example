import HomepageLink from './_components/HomepageLink'

export default async function RootPage() {
  return (
    <div className='isolate size-full max-w-[100vw] overflow-hidden bg-backgroundPrimary'>
      {/* <div className='absolute inset-0 z-10 size-full'>
        <UiThreads amplitude={1} distance={0} enableMouseInteraction={true} />
      </div> */}

      <div className='absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4 text-center'>
        <span className='typography-h3 text-textPrimary sm:typography-h2 md:typography-h1'>
          Confidential Assets
        </span>

        <span className='tex-textPrimary typography-subtitle3 md:typography-subtitle1'>
          Bringing innovative solutions to secure your digital world.
        </span>

        <HomepageLink />
      </div>
    </div>
  )
}
