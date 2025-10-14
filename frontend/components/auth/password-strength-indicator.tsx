"use client"

import { Check, X } from "lucide-react"
import { useMemo } from "react"

interface PasswordStrengthIndicatorProps {
  password: string
  confirmPassword?: string
}

export interface PasswordRequirement {
  label: string
  met: boolean
}

export function PasswordStrengthIndicator({ password, confirmPassword }: PasswordStrengthIndicatorProps) {
  const requirements: PasswordRequirement[] = useMemo(() => {
    return [
      {
        label: "At least 8 characters",
        met: password.length >= 8
      },
      {
        label: "One uppercase letter",
        met: /[A-Z]/.test(password)
      },
      {
        label: "One lowercase letter",
        met: /[a-z]/.test(password)
      },
      {
        label: "One number",
        met: /\d/.test(password)
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

    if (percentage === 0) return { label: "", color: "bg-gray-200" }
    if (percentage < 50) return { label: "Weak", color: "bg-red-500" }
    if (percentage < 75) return { label: "Fair", color: "bg-orange-500" }
    if (percentage < 100) return { label: "Good", color: "bg-yellow-500" }
    return { label: "Strong", color: "bg-green-500" }
  }, [requirements])

  const strengthPercentage = useMemo(() => {
    return (requirements.filter(r => r.met).length / requirements.length) * 100
  }, [requirements])

  if (!password) return null

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
        {strength.label && (
          <p className="text-xs text-muted-foreground">
            Password strength: <span className="font-medium">{strength.label}</span>
          </p>
        )}
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1.5">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            )}
            <span className={req.met ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}

        {/* Password Match Indicator */}
        {passwordsMatch !== null && (
          <div className="flex items-center gap-2 text-sm pt-1 border-t border-border/50">
            {passwordsMatch ? (
              <>
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-green-700 dark:text-green-400">Passwords match</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-400">Passwords do not match</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Utility function to check if password meets all requirements
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
