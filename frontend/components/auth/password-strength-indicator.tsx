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

  // Collapse the indicator when all requirements are met
  if (allRequirementsMet) {
    return (
      <div className="flex items-center gap-2 p-2 bg-luigi/10 rounded-lg border-2 border-luigi">
        <Check className="h-4 w-4 text-luigi flex-shrink-0" />
        <span className="text-sm font-medium text-luigi">Password meets all requirements ✓</span>
      </div>
    )
  }

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
              <Check className="h-4 w-4 text-luigi flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            )}
            <span className={req.met ? "text-luigi" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}

        {/* Password Match Indicator */}
        {passwordsMatch !== null && (
          <div className="flex items-center gap-2 text-sm pt-1 border-t border-border/50">
            {passwordsMatch ? (
              <>
                <Check className="h-4 w-4 text-luigi flex-shrink-0" />
                <span className="text-luigi">Passwords match</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-mario flex-shrink-0" />
                <span className="text-mario">Passwords do not match</span>
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

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
