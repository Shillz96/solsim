'use client'

import { Variants } from 'framer-motion'

/**
 * Mario-themed animation variants for consistent animations across the app
 * Uses framer-motion for smooth, Mario-style transitions
 */

// Page-level animations
export const marioPageVariants: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
}

// Card animations
export const marioCardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
}

// Stagger animations for lists
export const marioStaggerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

// Button hover animations
export const marioButtonVariants: Variants = {
  hover: { 
    scale: 1.05,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
}

// Loading spinner animation
export const marioSpinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

// Bounce animation for notifications
export const marioBounceVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

// Slide animations for modals/drawers
export const marioSlideVariants: Variants = {
  initial: { x: "100%" },
  animate: { 
    x: 0,
    transition: { duration: 0.3, ease: "easeInOut" }
  },
  exit: { 
    x: "100%",
    transition: { duration: 0.3, ease: "easeInOut" }
  }
}

// Fade animations
export const marioFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.3 }
  }
}
