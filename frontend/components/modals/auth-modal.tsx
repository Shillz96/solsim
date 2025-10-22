"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Lock, User, TrendingUp, AlertCircle, CheckCircle, ArrowLeft, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button"
import { PasswordStrengthIndicator, validatePassword } from "@/components/auth/password-strength-indicator"
// Wallet integration handled by WalletConnectButton component

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-success'

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<AuthView>('login')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { login, signup } = useAuth()
  const [walletConnected, setWalletConnected] = useState<string | null>(null)
  // Use services directly instead of hooks
  // Wallet integration handled by WalletConnectButton component

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Handle wallet connection during registration
  const handleWalletConnect = async (walletAddress: string) => {
    setWalletConnected(walletAddress)
    setSuccess(`Wallet connected: ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`)
  }

  const handleWalletDisconnect = () => {
    setWalletConnected(null)
    setSuccess(null)
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    clearMessages()

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // Client-side validation
    if (!email || !password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      await login(email, password)
      // Close modal - auth state will update automatically via auth context
      onOpenChange(false)
      setSuccess('Login successful! Welcome back.')

      // Clear form
      const form = e.currentTarget
      form.reset()

      // Optional: Navigate to a specific page or just let the UI update naturally
      // The useAuth hook should handle state updates automatically
    } catch (err) {
      const error = err as Error
      const errorMessage = error.message || 'Login failed'

      // Handle specific error cases with helpful messages
      if (errorMessage.includes('locked') || errorMessage.includes('too many')) {
        setError('Your account has been temporarily locked due to multiple failed login attempts. Please try again in 15 minutes or reset your password.')
      } else if (errorMessage.includes('credentials') || errorMessage.includes('password')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    clearMessages()

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const handle = formData.get('handle') as string

    // Client-side validation
    if (!email || !password || !handle) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (handle.trim().length < 3) {
      setError('Handle must be at least 3 characters long')
      setIsLoading(false)
      return
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      setError('Password must be 8+ characters with uppercase, lowercase, number, and special character')
      setIsLoading(false)
      return
    }

    // Validate password with utility function
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0])
      setIsLoading(false)
      return
    }

    try {
      await signup(email, password, handle.trim())
      // Close modal - auth state will update automatically via auth context
      onOpenChange(false)
      setSuccess('Account created successfully! Please check your email to verify your account.')

      // Clear form
      const form = e.currentTarget
      form.reset()
      setPassword('')
      setConfirmPassword('')

      // Optional: Navigate to a specific page or show verification reminder
      // The useAuth hook should handle state updates automatically
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    clearMessages()

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      setError('Please enter your email address')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok || data.success) {
        setSuccess('Password reset instructions have been sent to your email address')
        setCurrentView('reset-success')
      } else {
        // Even on error, show success message to prevent email enumeration
        setSuccess('If an account exists with this email, you will receive password reset instructions')
        setCurrentView('reset-success')
      }
    } catch (err) {
      // Show generic success message even on error to prevent email enumeration
      setSuccess('If an account exists with this email, you will receive password reset instructions')
      setCurrentView('reset-success')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-md mx-auto border-2 border-border shadow-none rounded-md max-h-[85vh] overflow-y-auto p-4 sm:p-6" style={{ backgroundColor: 'var(--background)', opacity: 1 }}>
        <div className="relative z-10">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-foreground shadow-none">
              <TrendingUp className="h-7 w-7 text-background" />
            </div>
            <DialogTitle className="text-2xl md:text-3xl font-bold">VirtualSol</DialogTitle>
          </div>
          <DialogDescription className="text-center text-sm md:text-base text-muted-foreground">
            {currentView === 'forgot-password' && 'Reset your password'}
            {currentView === 'reset-success' && 'Check your email'}
            {(currentView === 'login' || currentView === 'register') && 'Start your paper trading journey on Solana'}
          </DialogDescription>
        </DialogHeader>

        {/* Message Display */}
        {error && (
          <Alert className="border-destructive bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{String(error)}</AlertDescription>
          </Alert>
        )}

                {success && (
          <Alert className="border-green-500 bg-green-500/10 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Forgot Password View */}
        {currentView === 'forgot-password' && (
          <Card className="border-border" style={{ backgroundColor: 'var(--background)', opacity: 1 }}>
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView('login')}
                  className="p-2 h-auto hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Reset Password
              </CardTitle>
              <CardDescription className="text-foreground/70">
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10 bg-background border-border h-11"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}        {/* Reset Success View */}
        {currentView === 'reset-success' && (
          <Card className="border-border" style={{ backgroundColor: 'var(--background)', opacity: 1 }}>
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-semibold text-foreground">Check your email</CardTitle>
              <CardDescription className="text-foreground/70">
                We've sent password reset instructions to your email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setCurrentView('login')} 
                className="w-full"
                variant="outline"
                size="lg"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Login/Register Tabs */}
        {(currentView === 'login' || currentView === 'register') && (
          <div className="space-y-6">
            <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as AuthView)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="login" className="font-medium">Login</TabsTrigger>
                <TabsTrigger value="register" className="font-medium">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        id="login-email" 
                        name="email"
                        type="email" 
                        placeholder="you@example.com" 
                        className="pl-10 bg-background border-border h-11" 
                        required 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        id="login-password" 
                        name="password"
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 bg-background border-border h-11" 
                        required 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm text-primary hover:text-primary/80"
                      onClick={() => setCurrentView('forgot-password')}
                      disabled={isLoading}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium" 
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-6">
                <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-handle" className="text-foreground font-medium">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-handle"
                        name="handle"
                        type="text"
                        placeholder="trader123"
                        className="pl-10 bg-background border-border h-11"
                        required
                        minLength={3}
                        maxLength={20}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-foreground font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        id="register-email" 
                        name="email"
                        type="email" 
                        placeholder="you@example.com" 
                        className="pl-10 bg-background border-border h-11" 
                        required 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-foreground font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-background border-border h-11"
                        required
                        minLength={8}
                        disabled={isLoading}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-foreground font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-confirm-password"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-background border-border h-11"
                        required
                        disabled={isLoading}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                      <PasswordStrengthIndicator password={password} confirmPassword={confirmPassword} />
                    </div>
                  )}

                  {/* Wallet Connection Section */}
                  <div className="space-y-3 py-3 sm:py-4 border-t border-border mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm sm:text-base text-foreground font-medium">Wallet Connection (Optional)</Label>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Connect your Solana wallet to unlock premium features and higher starting balance.
                      </p>
                      <WalletConnectButton
                        onWalletConnected={handleWalletConnect}
                        onWalletDisconnected={handleWalletDisconnect}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      />
                      {walletConnected && (
                        <div className="mt-2 p-2 sm:p-3 bg-green-50 rounded border border-green-200">
                          <p className="text-xs sm:text-sm text-green-700">
                            ✓ Wallet connected - You'll receive enhanced tier benefits!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium mt-2"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                  <p className="text-xs sm:text-sm text-center text-muted-foreground px-2">
                    By registering, you agree to our Terms of Service and Privacy Policy
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
