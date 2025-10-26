"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link')
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email/${token}`)
        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage('Your email has been verified successfully!')

          // Update localStorage with verified status so UI updates immediately
          const savedUser = localStorage.getItem('user')
          if (savedUser) {
            try {
              const user = JSON.parse(savedUser)
              user.emailVerified = true
              localStorage.setItem('user', JSON.stringify(user))
              console.log('✅ Updated localStorage with emailVerified: true')
            } catch (e) {
              console.warn('Failed to update user in localStorage:', e)
            }
          }

          // Redirect to home after 3 seconds with full page reload to refresh auth state
          setTimeout(() => {
            window.location.href = '/'
          }, 3000)
        } else {
          setStatus('error')
          setMessage(data.message || 'Email verification failed')
        }
      } catch (error) {
        setStatus('error')
        setMessage('Failed to verify email. Please try again.')
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Mario-themed Header */}
        <div className="bg-gradient-to-r from-[var(--luigi-green)]/20 to-[var(--sky-blue)]/20 border-4 border-outline rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden mb-6">
          <div className="absolute top-2 right-2 flex gap-2">
            <img src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
            <img src="/icons/mario/mushroom.png" alt="Mushroom" width={24} height={24} />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex justify-center mb-4">
              {status === 'loading' && (
                <div className="relative">
                  <div className="h-16 w-16 border-4 border-luigi/30 border-t-[var(--luigi-green)] rounded-full animate-spin"></div>
                  <div className="absolute inset-0 h-16 w-16 flex items-center justify-center">
                    <img src="/icons/mario/star.png" alt="Loading" width={32} height={32} className="animate-pulse" />
                  </div>
                </div>
              )}
              {status === 'success' && (
                <div className="h-16 w-16 rounded-full bg-luigi border-4 border-outline flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)]">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              )}
              {status === 'error' && (
                <div className="h-16 w-16 rounded-full bg-mario border-4 border-outline flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)]">
                  <AlertCircle className="h-10 w-10 text-white" />
                </div>
              )}
            </div>

            <h1 className="font-mario text-2xl text-outline">
              {status === 'loading' && 'Verifying your email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </h1>

            <p className="text-outline font-bold text-center">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {status === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-outline font-bold">
                Redirecting you to the homepage...
              </p>
              <Button
                className="w-full mario-btn bg-luigi text-white border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario"
                onClick={() => window.location.href = '/'}
              >
                Go to Homepage
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full mario-btn bg-mario text-white border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario">
                  Return to Homepage
                </Button>
              </Link>
              <p className="text-xs text-center text-outline font-bold">
                Need help? Contact support or try signing up again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
