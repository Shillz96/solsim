"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { Onborda, useOnborda } from "onborda"
import { onboardingSteps } from "./onboarding-config"
import { WelcomeModal } from "@/components/onboarding/welcome-modal"

interface OnboardingContextType {
  startOnboarding: () => void
  isOnboardingActive: boolean
  hasCompletedOnboarding: boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

const ONBOARDING_COMPLETED_KEY = "onboarding_completed"
const ONBOARDING_NEEDED_KEY = "onboarding_needed"

interface OnboardingProviderProps {
  children: ReactNode
}

/**
 * Onboarding Provider Component
 *
 * Manages the onboarding tour state and provides functions to control the tour.
 * Wraps the app with Onborda provider for interactive product tours.
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [isOnboardingActive, setIsOnboardingActive] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  // Check if user has completed onboarding on mount
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true"
    setHasCompletedOnboarding(completed)

    // Check if onboarding is needed (set after signup)
    const needed = localStorage.getItem(ONBOARDING_NEEDED_KEY) === "true"
    if (needed && !completed) {
      // Small delay to allow page to settle after auth modal closes
      const timer = setTimeout(() => {
        setShowWelcomeModal(true)
        localStorage.removeItem(ONBOARDING_NEEDED_KEY)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  /**
   * Start the onboarding tour manually
   * Used for replay from help menu
   */
  const startOnboarding = useCallback(() => {
    setShowWelcomeModal(true)
  }, [])

  /**
   * Handle starting the tour from welcome modal
   */
  const handleStartTour = useCallback(() => {
    setIsOnboardingActive(true)
    setShowWelcomeModal(false)
  }, [])

  /**
   * Handle closing welcome modal without starting tour
   */
  const handleCloseWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false)
    // Mark as completed even if skipped, so it doesn't show again
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true")
    setHasCompletedOnboarding(true)
  }, [])

  /**
   * Handle tour completion
   */
  const handleTourComplete = useCallback(() => {
    setIsOnboardingActive(false)
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true")
    setHasCompletedOnboarding(true)
  }, [])

  return (
    <OnboardingContext.Provider
      value={{
        startOnboarding,
        isOnboardingActive,
        hasCompletedOnboarding,
      }}
    >
      <Onborda
        steps={onboardingSteps}
        showOnborda={isOnboardingActive}
        onComplete={handleTourComplete}
        // Custom card styling with Mario theme
        cardComponent={(props) => (
          <div
            style={{
              backgroundColor: "white",
              border: "4px solid var(--outline-black)",
              borderRadius: "12px",
              boxShadow: "6px 6px 0 var(--outline-black)",
              padding: "1.5rem",
              maxWidth: "400px",
              zIndex: 9999,
            }}
          >
            {/* Icon */}
            {props.step.icon && (
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)]"
              >
                {props.step.icon}
              </div>
            )}

            {/* Title */}
            {props.step.title && (
              <h3
                className="mb-2 text-lg font-mario text-[var(--outline-black)]"
              >
                {props.step.title}
              </h3>
            )}

            {/* Content */}
            {props.step.content && (
              <p
                className="mb-4 text-sm leading-relaxed text-[var(--pipe-600)] font-semibold"
              >
                {props.step.content}
              </p>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Skip button */}
              {props.step.showSkip && (
                <button
                  onClick={props.onClose}
                  className="text-sm font-semibold text-[var(--pipe-500)] hover:text-[var(--outline-black)] underline transition-colors"
                >
                  Skip Tour
                </button>
              )}

              {/* Progress indicator */}
              <div className="flex-1 text-center">
                <span className="text-xs font-bold text-[var(--pipe-500)]">
                  {props.currentStep + 1} / {props.totalSteps}
                </span>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-2">
                {props.currentStep > 0 && (
                  <button
                    onClick={props.onPrev}
                    className="px-4 py-2 text-sm font-bold text-[var(--outline-black)] bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={props.currentStep === props.totalSteps - 1 ? props.onClose : props.onNext}
                  className="px-4 py-2 text-sm font-mario text-white bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] rounded-lg shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all"
                >
                  {props.currentStep === props.totalSteps - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        )}
      >
        {children}
      </Onborda>

      {/* Welcome Modal */}
      <WelcomeModal
        open={showWelcomeModal}
        onClose={handleCloseWelcomeModal}
        onStartTour={handleStartTour}
      />
    </OnboardingContext.Provider>
  )
}

/**
 * Hook to access onboarding context
 */
export function useOnboardingContext() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider")
  }
  return context
}

/**
 * Hook to mark onboarding as needed (called after signup)
 */
export function useMarkOnboardingNeeded() {
  return useCallback(() => {
    localStorage.setItem(ONBOARDING_NEEDED_KEY, "true")
  }, [])
}
