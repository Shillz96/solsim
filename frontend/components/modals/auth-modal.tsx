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
import { Mail, Lock, User, TrendingUp, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/api-hooks"
import authService from "@/lib/auth-service"
import { ApiError } from "@/lib/api-client"

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
  const { login, register } = useAuth()

  const clearMessages = () => {
    setError(null)
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
      await login({ email, password })
      onOpenChange(false) // Close modal on success
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Login failed')
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
    const username = formData.get('username') as string

    // Client-side validation
    if (!email || !password || !username) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long')
      setIsLoading(false)
      return
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      setError('Password must be 8+ characters with uppercase, lowercase, and number')
      setIsLoading(false)
      return
    }

    try {
      await register({ email, password, username: username.trim() })
      onOpenChange(false) // Close modal on success
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Registration failed')
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
      await authService.forgotPassword({ email })
      setCurrentView('reset-success')
      setSuccess('Password reset instructions have been sent to your email')
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="font-space-grotesk text-2xl gradient-text">Sol Sim</DialogTitle>
          </div>
          <DialogDescription className="text-center">
            {currentView === 'forgot-password' && 'Reset your password'}
            {currentView === 'reset-success' && 'Check your email'}
            {(currentView === 'login' || currentView === 'register') && 'Start your paper trading journey on Solana'}
          </DialogDescription>
        </DialogHeader>

        {/* Message Display */}
        {error && (
          <Alert className="border-destructive/50 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{String(error)}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/50 text-green-700 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Forgot Password View */}
        {currentView === 'forgot-password' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView('login')}
                  className="p-1 h-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Reset Password
              </CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset Success View */}
        {currentView === 'reset-success' && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We've sent password reset instructions to your email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setCurrentView('login')} 
                className="w-full"
                variant="outline"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Login/Register Tabs */}
        {(currentView === 'login' || currentView === 'register') && (
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as AuthView)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{String(error)}</span>
            </div>
          )}

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="login-email" 
                    name="email"
                    type="email" 
                    placeholder="you@example.com" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="login-password" 
                    name="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm"
                  onClick={() => setCurrentView('forgot-password')}
                  disabled={isLoading}
                >
                  Forgot your password?
                </Button>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 glow-primary" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="register-username" 
                    name="username"
                    type="text" 
                    placeholder="trader123" 
                    className="pl-10"
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="register-email" 
                    name="email"
                    type="email" 
                    placeholder="you@example.com" 
                    className="pl-10" 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="register-password" 
                    name="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10" 
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be 8+ characters with uppercase, lowercase, and number
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    id="register-confirm-password" 
                    name="confirmPassword"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10" 
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 glow-primary"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </TabsContent>
        </Tabs>
        )}

      </DialogContent>
    </Dialog>
  )
}
