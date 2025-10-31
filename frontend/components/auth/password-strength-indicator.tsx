"use client"

import { Check, X, ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PasswordStrengthIndicatorProps {
  password: string
  confirmPassword?: string
}

export interface PasswordRequirement {
  label: string
  met: boolean
}

export function PasswordStrengthIndicator({ password, confirmPassword }: PasswordStrengthIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const requirements: PasswordRequirement[] = useMemo(() => {
    return [
      {
        label: "At least 12 characters",
        met: password.length >= 12
      }
    ]
  }, [password])

  const passwordsMatch = useMemo(() => {
    if (confirmPassword === undefined) return null
    if (confirmPassword === "") return null
    return password === confirmPassword
  }, [password, confirmPassword])

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length
    const total = requirements.length
    const percentage = (metCount / total) * 100

    if (percentage === 0) return { label: "", color: "bg-muted" }
    if (percentage < 50) return { label: "Weak", color: "bg-mario" }
    if (percentage < 75) return { label: "Fair", color: "bg-star" }
    if (percentage < 100) return { label: "Good", color: "bg-star" }
    return { label: "Strong", color: "bg-luigi" }
  }, [requirements])

  const strengthPercentage = useMemo(() => {
    return (requirements.filter(r => r.met).length / requirements.length) * 100
  }, [requirements])

  // Check if all requirements are met
  const allRequirementsMet = useMemo(() => {
    const allPasswordReqsMet = requirements.every(r => r.met)
    const passwordMatchCheck = confirmPassword === undefined || confirmPassword === "" || password === confirmPassword
    return allPasswordReqsMet && passwordMatchCheck
  }, [requirements, password, confirmPassword])

  if (!password) return null

  // Collapsed success state
  if (allRequirementsMet && !isExpanded) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex items-center justify-between gap-2 p-3 bg-luigi/10 rounded-lg border-2 border-luigi hover:bg-luigi/20 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-luigi flex-shrink-0" />
          <span className="text-sm font-bold text-luigi">All requirements met ✓</span>
        </div>
        <ChevronDown className="h-4 w-4 text-luigi" />
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Header with collapse button when all met */}
      {allRequirementsMet && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="w-full flex items-center justify-between gap-2 p-2 bg-luigi/10 rounded-lg border-2 border-luigi hover:bg-luigi/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-luigi flex-shrink-0" />
            <span className="text-sm font-bold text-luigi">All requirements met ✓</span>
          </div>
          <ChevronUp className="h-4 w-4 text-luigi" />
        </button>
      )}

      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="h-2.5 bg-muted rounded-full overflow-hidden border-2 border-outline">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strengthPercentage}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`h-full transition-colors duration-300 ${strength.color}`}
          />
        </div>
        {strength.label && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground font-bold"
          >
            Password strength: <span className={`font-bold ${
              strength.color === 'bg-luigi' ? 'text-luigi' :
              strength.color === 'bg-star' ? 'text-star' :
              strength.color === 'bg-mario' ? 'text-mario' :
              'text-muted-foreground'
            }`}>{strength.label}</span>
          </motion.p>
        )}
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {requirements.map((req, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2.5 text-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: req.met ? [0, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {req.met ? (
                  <div className="h-5 w-5 rounded-full bg-luigi border-2 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                    <Check className="h-3 w-3 text-white flex-shrink-0" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted border-2 border-outline flex items-center justify-center">
                    <X className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                  </div>
                )}
              </motion.div>
              <span className={`font-bold transition-colors ${req.met ? "text-luigi" : "text-muted-foreground"}`}>
                {req.label}
              </span>
            </motion.div>
          ))}

          {/* Password Match Indicator */}
          {passwordsMatch !== null && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: requirements.length * 0.1 }}
              className="flex items-center gap-2.5 text-sm pt-2 border-t-2 border-outline/30"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: passwordsMatch ? [0, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {passwordsMatch ? (
                  <div className="h-5 w-5 rounded-full bg-luigi border-2 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                    <Check className="h-3 w-3 text-white flex-shrink-0" />
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full bg-mario border-2 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                    <X className="h-3 w-3 text-white flex-shrink-0" />
                  </div>
                )}
              </motion.div>
              <span className={`font-bold ${passwordsMatch ? "text-luigi" : "text-mario"}`}>
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/**
 * Utility function to check if password meets all requirements
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
