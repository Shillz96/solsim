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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>

          <CardDescription className="text-base">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting you to the homepage...
              </p>
              <Button
                className="w-full"
                onClick={() => window.location.href = '/'}
              >
                Go to Homepage
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Return to Homepage
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground">
                Need help? Contact support or try signing up again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
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
