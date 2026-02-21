'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { HeroSlideProps } from '../heroAnimationConfig'
import {
  leftPanelVariants,
  leftPanelChildVariants,
  leftPanelStagger,
  reducedMotionVariants,
} from '../heroAnimationConfig'

export default function SlideLeftPanel({ badge, title, subtitle, onSearchClick }: HeroSlideProps) {
  const shouldReduce = useReducedMotion()
  const variants = shouldReduce ? reducedMotionVariants : leftPanelVariants

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="absolute inset-y-0 left-0 flex items-center w-[85vw] sm:w-[60vw] md:w-[45vw] lg:w-[35vw]"
    >
      <div
        className="relative h-full w-full flex items-center"
        style={{
          background:
            'linear-gradient(to right, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)',
          backdropFilter: shouldReduce ? 'blur(8px)' : 'blur(12px)',
          WebkitBackdropFilter: shouldReduce ? 'blur(8px)' : 'blur(12px)',
        }}
      >
        <motion.div
          className="px-6 sm:px-8 md:px-10 lg:px-12 py-8 text-left max-w-full"
          variants={shouldReduce ? undefined : { animate: { transition: leftPanelStagger } }}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Badge */}
          <motion.div variants={shouldReduce ? undefined : leftPanelChildVariants}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6 border border-white/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500" />
              </span>
              <span className="text-sm font-medium text-white/90">{badge}</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={shouldReduce ? undefined : leftPanelChildVariants}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 leading-[1.2] tracking-tight"
          >
            <span
              className="block bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent drop-shadow-2xl"
              style={{ WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}
            >
              {title}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={shouldReduce ? undefined : leftPanelChildVariants}
            className="text-base sm:text-lg md:text-xl text-gray-200 drop-shadow-md max-w-md leading-relaxed font-light"
          >
            {subtitle}
          </motion.p>

          {/* Search trigger */}
          <motion.div variants={shouldReduce ? undefined : leftPanelChildVariants} className="mt-4 sm:mt-6">
            <button
              onClick={onSearchClick}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white/70 cursor-pointer transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm">Search products...</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
