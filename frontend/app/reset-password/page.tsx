"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Lock, Loader2 } from "lucide-react"
import { PasswordStrengthIndicator, validatePassword } from "@/components/auth/password-strength-indicator"
import Link from "next/link"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Validate password strength
    const validation = validatePassword(password)
    if (!validation.valid) {
      setMessage(validation.errors[0])
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('Your password has been reset successfully!')
        // Redirect to home after 3 seconds
        setTimeout(() => router.push('/'), 3000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to reset password')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Mario-themed Header */}
          <div className="bg-gradient-to-r from-[var(--mario-red)]/20 to-[var(--star-yellow)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden mb-6">
            <div className="absolute top-2 right-2 flex gap-2">
              <img src="/icons/mario/fire.png" alt="Fire" width={24} height={24} />
              <img src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[var(--mario-red)] border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)]">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="font-mario text-2xl text-[var(--outline-black)]">Invalid Reset Link</h1>
              <p className="text-[var(--outline-black)] font-bold text-center">
                This password reset link is invalid or has expired.
              </p>
            </div>
          </div>

          <Link href="/">
            <Button className="w-full mario-btn bg-[var(--mario-red)] text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Mario-themed Header */}
          <div className="bg-gradient-to-r from-[var(--luigi-green)]/20 to-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden mb-6">
            <div className="absolute top-2 right-2 flex gap-2">
              <img src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <img src="/icons/mario/mushroom.png" alt="Mushroom" width={24} height={24} />
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[var(--luigi-green)] border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)]">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="font-mario text-2xl text-[var(--outline-black)]">Password Reset!</h1>
              <p className="text-[var(--outline-black)] font-bold text-center">{message}</p>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-sm text-[var(--outline-black)] font-bold">
              Redirecting you to the homepage...
            </p>
            <Link href="/">
              <Button className="w-full mario-btn bg-[var(--luigi-green)] text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario">
                Go to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Mario-themed Header */}
        <div className="bg-gradient-to-r from-[var(--star-yellow)]/20 to-[var(--coin-yellow)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden mb-6">
          <div className="absolute top-2 right-2 flex gap-2">
            <img src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
            <img src="/icons/mario/coin.png" alt="Coin" width={24} height={24} />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--star-yellow)] border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)]">
              <Lock className="h-10 w-10 text-[var(--outline-black)]" />
            </div>
            <h1 className="font-mario text-2xl text-[var(--outline-black)]">Reset Your Password</h1>
            <p className="text-[var(--outline-black)] font-bold text-center">
              Enter your new password below
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && status === 'error' && (
              <div className="bg-[var(--mario-red)]/10 border-3 border-[var(--mario-red)] rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-[var(--mario-red)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--mario-red)] font-bold">{message}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--outline-black)] font-bold">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--outline-black)]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] rounded-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[var(--outline-black)] font-bold">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--outline-black)]" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] rounded-lg"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {password && (
              <div className="bg-[var(--sky-blue)]/20 border-3 border-[var(--outline-black)] rounded-lg p-4 shadow-[2px_2px_0_var(--outline-black)]">
                <PasswordStrengthIndicator password={password} confirmPassword={confirmPassword} />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full mario-btn bg-[var(--star-yellow)] text-[var(--outline-black)] border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <div className="text-center">
              <Link href="/" className="text-sm text-[var(--outline-black)] font-bold hover:text-[var(--mario-red)] transition-colors">
                Return to Homepage
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
