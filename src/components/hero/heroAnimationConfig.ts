import type { Variants, Transition } from 'framer-motion'

// ── Props interface shared by all slide components ──
export interface HeroSlideProps {
  title: string
  subtitle: string
  onSearchClick: () => void
}

// ── Timing constants ──
export const SLIDE_INTERVAL = 6000 // ms per full cycle
export const BG_FADE_DURATION = 1.2 // seconds

// ── Reduced-motion fallback variant ──
export const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

// ── Slide 1: Left Panel ──
export const leftPanelVariants: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: 0,
    transition: { type: 'spring', stiffness: 80, damping: 18 },
  },
  exit: {
    x: '-120%',
    rotate: -3,
    transition: { duration: 0.6, ease: 'easeIn' },
  },
}

export const leftPanelChildVariants: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
}

export const leftPanelStagger: Transition = {
  staggerChildren: 0.15,
  delayChildren: 0.2,
}

// ── Slide 2: Top-Left Round ──
export const topLeftRoundVariants: Variants = {
  initial: { scale: 0.2, x: '-50%', y: '-50%', opacity: 0 },
  animate: {
    scale: 1,
    x: 0,
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 70, damping: 15 },
  },
  exit: {
    scale: 0.1,
    x: '-60%',
    y: '-60%',
    rotate: -15,
    opacity: 0,
    transition: { duration: 0.6, ease: 'easeIn' },
  },
}

export const topLeftRoundChildVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
}

export const topLeftRoundStagger: Transition = {
  staggerChildren: 0.12,
  delayChildren: 0.3,
}

// ── Slide 3: Top-Right Panel ──
export const topRightPanelVariants: Variants = {
  initial: { x: '100%', skewX: 5 },
  animate: {
    x: 0,
    skewX: 0,
    transition: { type: 'spring', stiffness: 80, damping: 18 },
  },
  exit: {
    x: '120%',
    skewX: -8,
    scale: 0.95,
    transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] }, // easeInQuint
  },
}

export const topRightChildVariants: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20, transition: { duration: 0.3 } },
}

export const topRightStagger: Transition = {
  staggerChildren: 0.15,
  delayChildren: 0.2,
}

// ── Slide 4: Bottom-Right Quarter Circle ──
export const bottomSweepVariants: Variants = {
  initial: { scale: 0.2, x: '50%', y: '50%', opacity: 0 },
  animate: {
    scale: 1,
    x: 0,
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 70, damping: 15 },
  },
  exit: {
    scale: 0.1,
    x: '60%',
    y: '60%',
    rotate: 15,
    opacity: 0,
    transition: { duration: 0.6, ease: 'easeIn' },
  },
}

export const bottomSweepChildVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10, transition: { duration: 0.3 } },
}

export const bottomSweepStagger: Transition = {
  staggerChildren: 0.12,
  delayChildren: 0.2,
}
