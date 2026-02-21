'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import SearchAutocomplete from '@/components/SearchAutocomplete'
import { SLIDE_INTERVAL, BG_FADE_DURATION } from './heroAnimationConfig'
import type { HeroSlide } from '@/lib/types'
import SlideLeftPanel from './slides/SlideLeftPanel'
import SlideTopLeftRound from './slides/SlideTopLeftRound'
import SlideTopRightPanel from './slides/SlideTopRightPanel'
import SlideBottomSweep from './slides/SlideBottomSweep'

const SLIDE_MAP: Record<string, typeof SlideLeftPanel> = {
  'left-panel': SlideLeftPanel,
  'top-left-round': SlideTopLeftRound,
  'top-right-panel': SlideTopRightPanel,
  'bottom-right-quarter': SlideBottomSweep,
}

interface HeroSliderProps {
  slides: HeroSlide[]
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  // Close overlay on Escape key
  useEffect(() => {
    if (!searchOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  // Auto-focus search input when overlay opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [searchOpen])

  // Auto-rotate
  useEffect(() => {
    if (slides.length === 0) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, SLIDE_INTERVAL)

    return () => clearInterval(interval)
  }, [currentSlide, slides.length]) // reset on manual navigation

  if (slides.length === 0) return null

  const currentSlideData = slides[currentSlide]
  const SlideComponent = SLIDE_MAP[currentSlideData.animationType] || SlideLeftPanel
  const slideProps = {
    title: currentSlideData.title,
    subtitle: currentSlideData.subtitle,
    onSearchClick: () => setSearchOpen(true),
  }

  return (
    <div className="relative overflow-hidden bg-navy-900 text-white">
      {/* Background images - all mounted, opacity controlled */}
      <div className="absolute inset-0">
        {slides.map((slide, i) => (
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            animate={{ opacity: i === currentSlide ? 1 : 0 }}
            transition={{ duration: BG_FADE_DURATION, ease: 'easeInOut' }}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title || `Fashion background ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
              quality={90}
              unoptimized={slide.imageUrl.startsWith('http')}
            />
          </motion.div>
        ))}
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/70" />
      </div>

      {/* Animated panels - one at a time */}
      <div className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[700px]">
        <AnimatePresence mode="wait">
          <SlideComponent key={currentSlide} {...slideProps} />
        </AnimatePresence>
      </div>

      {/* Full-screen search overlay — portaled to body to escape overflow-hidden */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}
            >
              {/* Backdrop blur */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSearchOpen(false)}
              />

              {/* Search container */}
              <motion.div
                className="relative z-10 w-full max-w-xl mx-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors text-2xl leading-none"
                  aria-label="Close search"
                >
                  &#x2715;
                </button>

                {/* The actual SearchAutocomplete */}
                <div ref={(el) => {
                  if (el) {
                    const input = el.querySelector('input')
                    if (input) (searchInputRef as React.MutableRefObject<HTMLInputElement | null>).current = input
                  }
                }}>
                  <SearchAutocomplete
                    placeholder="Search products..."
                    large={true}
                    className="!bg-white/20 !backdrop-blur-md !shadow-2xl !border-white/30 [&_input]:!text-white [&_input]:!placeholder-white/70"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentSlide
                ? 'w-8 h-2 bg-white'
                : 'w-2 h-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Bottom Wave Separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-12 sm:h-16 text-gray-50"
          preserveAspectRatio="none"
          viewBox="0 0 1440 48"
          fill="currentColor"
        >
          <path d="M0,32L80,37.3C160,43,320,53,480,48C640,43,800,21,960,16C1120,11,1280,21,1360,26.7L1440,32L1440,48L1360,48C1280,48,1120,48,960,48C800,48,640,48,480,48C320,48,160,48,80,48L0,48Z" />
        </svg>
      </div>
    </div>
  )
}
