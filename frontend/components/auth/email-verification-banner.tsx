"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface EmailVerificationBannerProps {
  email: string
}

export function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { user } = useAuth()

  // Don't show if email is already verified
  if (user?.emailVerified) {
    return null
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' })
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to resend verification email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to resend verification email. Please try again.' })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Alert className="border-yellow-500 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-yellow-800">
              Please verify your email address
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              We sent a verification link to <strong>{email}</strong>. Check your inbox and click the link to verify your account.
            </p>
          </div>
          <Button
            onClick={handleResendVerification}
            disabled={isResending}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Email
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
