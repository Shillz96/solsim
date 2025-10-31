"use client"

import { useEffect, useState } from 'react'
import { useLowBalanceDetection } from '@/hooks/use-sol-rewards'
import { NeedMoreSolDialog } from '@/components/modals/need-more-sol-dialog'
import { useRouter } from 'next/navigation'

/**
 * Low Balance Alert - Auto-popup when user balance drops below threshold
 * Add this component to your main layout to trigger the rewards dialog
 */
export function LowBalanceAlert() {
  const { shouldShowAlert, markAsShown } = useLowBalanceDetection(100)
  const [showDialog, setShowDialog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (shouldShowAlert && !showDialog) {
      // Show dialog after a short delay to avoid jarring popup on page load
      const timer = setTimeout(() => {
        setShowDialog(true)
        markAsShown()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [shouldShowAlert, showDialog, markAsShown])

  const handleShareClick = () => {
    setShowDialog(false)
    // Navigate to portfolio where user can share PnL cards
    router.push('/portfolio')
  }

  return (
    <NeedMoreSolDialog
      open={showDialog}
      onOpenChange={setShowDialog}
      onShareClick={handleShareClick}
    />
  )
}
