"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Lock, 
  Upload, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Camera,
  Settings,
  Shield,
  Bell,
  DollarSign
} from 'lucide-react'
// Use modern auth hook
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import * as api from '@/lib/api'

// Types for settings page
type UserType = {
  id: string
  email: string
  username: string | null
  virtualSolBalance: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  website?: string
  twitter?: string
  discord?: string
  telegram?: string
}

type UserSettings = {
  notifications: {
    email: boolean
    browser: boolean
    trading: boolean
    portfolio: boolean
  }
  privacy: {
    publicProfile: boolean
    showBalance: boolean
    showTrades: boolean
  }
  trading: {
    confirmTrades: boolean
    defaultSlippage: number
    autoRefresh: boolean
  }
}

type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function UserSettingsPage() {
  const { user, isAuthenticated } = useAuth()
  // TODO: Implement useUserSettings hook
  const settings = null
  const settingsLoading = false
  const refreshSettings = () => {}
  
  // States
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [profileData, setProfileData] = useState<Partial<UserType>>({})
  const [passwordData, setPasswordData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: ''
  })
  const [settingsData, setSettingsData] = useState<Partial<UserSettings>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form data when user/settings load
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: (user as any).handle || '', // Handle might be available from initial auth
        bio: '', // Bio not available in auth user object
        // website: user.website || '',
        // twitter: user.twitter || '',
        // discord: user.discord || '',
        // telegram: user.telegram || ''
      })
    }
    if (settings) {
      setSettingsData(settings)
    }
  }, [user, settings])

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  // Avatar upload handling
  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file) return

    // Validate file
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB')
      return
    }

    try {
      setIsLoading(true)
      clearMessages()

      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');

      // For now, use a data URL for the avatar (in production, upload to cloud storage)
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const avatarUrl = reader.result as string
          await api.updateAvatar({ userId, avatarUrl })
          setSuccess('Avatar updated successfully')
          
          // Note: In production, you should upload to cloud storage (S3, Cloudinary, etc.)
          // and pass the URL to the backend instead of using data URLs
        } catch (err: any) {
          setError(err.message || 'Failed to upload avatar')
        } finally {
          setIsLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar')
      setIsLoading(false)
    }
  }, [clearMessages])

  const handleAvatarDelete = useCallback(async () => {
    try {
      setIsLoading(true)
      clearMessages()

      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      await api.removeAvatar(userId);
      setSuccess('Avatar removed successfully')
    } catch (err: any) {
      setError(err.message || 'Failed to remove avatar')
    } finally {
      setIsLoading(false)
    }
  }, [clearMessages])

  // Profile update handling
  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      clearMessages()

      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      
      await api.updateProfile({
        userId,
        handle: profileData.displayName,
        bio: profileData.bio
        // profileImage will be handled separately via avatar upload functionality
      });
      setSuccess('Profile updated successfully')
      
      // TODO: Refresh user data
      // await refreshAuth()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }, [profileData, clearMessages])

  // Password change handling
  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Please fill in all password fields')
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(passwordData.newPassword)) {
      setError('Password must contain uppercase, lowercase, and number')
      return
    }

    try {
      setIsLoading(true)
      clearMessages()

      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');

      await api.changePassword({
        userId,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess('Password changed successfully');
      // Clear password fields
      setPasswordData({ currentPassword: '', newPassword: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }, [passwordData, clearMessages])

  // Settings update handling
  const handleSettingsUpdate = useCallback(async () => {
    try {
      setIsLoading(true)
      clearMessages()

      // TODO: Implement settings storage in backend or use localStorage
      // For now, just store settings locally
      localStorage.setItem('userSettings', JSON.stringify(settingsData));
      setSuccess('Settings saved locally (backend implementation pending)')
      
      // Refresh settings
      await refreshSettings()
    } catch (err: any) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }, [settingsData, clearMessages, refreshSettings])

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Please log in to access settings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Messages */}
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

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>Update your avatar image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={(user as any).profileImage} alt={(user as any).handle || 'User'} />
              <AvatarFallback className="text-lg">
                {(user as any).handle?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New
                </Button>
                {(user as any).profileImage && (
                  <Button
                    onClick={handleAvatarDelete}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                JPEG, PNG, or WebP. Max 5MB.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_FILE_TYPES.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleAvatarUpload(file)
            }}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information and social links</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={(user as any).handle || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profileData.displayName || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your display name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profileData.bio || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {(profileData.bio || '').length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={profileData.website || ''}
                onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={profileData.twitter || ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, twitter: e.target.value }))}
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord">Discord</Label>
                <Input
                  id="discord"
                  value={profileData.discord || ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, discord: e.target.value }))}
                  placeholder="username#1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram</Label>
                <Input
                  id="telegram"
                  value={profileData.telegram || ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, telegram: e.target.value }))}
                  placeholder="@username"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Change your password and manage security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be 8+ characters with uppercase, lowercase, and number
              </p>
            </div>

            <Button type="submit" disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword}>
              <Lock className="h-4 w-4 mr-2" />
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* App Settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </h4>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settingsData.notifications?.email ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        notifications: { 
                          email: checked,
                          browser: prev.notifications?.browser ?? false,
                          trading: prev.notifications?.trading ?? false,
                          portfolio: prev.notifications?.portfolio ?? false
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="browser-notifications">Browser Notifications</Label>
                    <p className="text-xs text-muted-foreground">Show notifications in browser</p>
                  </div>
                  <Switch
                    id="browser-notifications"
                    checked={settingsData.notifications?.browser ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        notifications: { 
                          email: prev.notifications?.email ?? false,
                          browser: checked,
                          trading: prev.notifications?.trading ?? false,
                          portfolio: prev.notifications?.portfolio ?? false
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="trading-notifications">Trading Alerts</Label>
                    <p className="text-xs text-muted-foreground">Alerts for trades and price changes</p>
                  </div>
                  <Switch
                    id="trading-notifications"
                    checked={settingsData.notifications?.trading ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        notifications: { 
                          email: prev.notifications?.email ?? false,
                          browser: prev.notifications?.browser ?? false,
                          trading: checked,
                          portfolio: prev.notifications?.portfolio ?? false
                        }
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Privacy */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Privacy
              </h4>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public-profile">Public Profile</Label>
                    <p className="text-xs text-muted-foreground">Allow others to view your profile</p>
                  </div>
                  <Switch
                    id="public-profile"
                    checked={settingsData.privacy?.publicProfile ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        privacy: { 
                          publicProfile: checked,
                          showBalance: prev.privacy?.showBalance ?? false,
                          showTrades: prev.privacy?.showTrades ?? false
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-balance">Show Balance</Label>
                    <p className="text-xs text-muted-foreground">Display your balance on public profile</p>
                  </div>
                  <Switch
                    id="show-balance"
                    checked={settingsData.privacy?.showBalance ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        privacy: { 
                          publicProfile: prev.privacy?.publicProfile ?? false,
                          showBalance: checked,
                          showTrades: prev.privacy?.showTrades ?? false
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-trades">Show Trading Activity</Label>
                    <p className="text-xs text-muted-foreground">Display recent trades on profile</p>
                  </div>
                  <Switch
                    id="show-trades"
                    checked={settingsData.privacy?.showTrades ?? false}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        privacy: { 
                          publicProfile: prev.privacy?.publicProfile ?? false,
                          showBalance: prev.privacy?.showBalance ?? false,
                          showTrades: checked
                        }
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Trading Preferences */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Trading
              </h4>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="confirm-trades">Confirm Trades</Label>
                    <p className="text-xs text-muted-foreground">Show confirmation dialog before executing trades</p>
                  </div>
                  <Switch
                    id="confirm-trades"
                    checked={settingsData.trading?.confirmTrades ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        trading: { 
                          confirmTrades: checked,
                          defaultSlippage: prev.trading?.defaultSlippage ?? 1.0,
                          autoRefresh: prev.trading?.autoRefresh ?? true
                        }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-refresh">Auto Refresh</Label>
                    <p className="text-xs text-muted-foreground">Automatically refresh portfolio and prices</p>
                  </div>
                  <Switch
                    id="auto-refresh"
                    checked={settingsData.trading?.autoRefresh ?? true}
                    onCheckedChange={(checked) => 
                      setSettingsData(prev => ({
                        ...prev,
                        trading: { 
                          confirmTrades: prev.trading?.confirmTrades ?? true,
                          defaultSlippage: prev.trading?.defaultSlippage ?? 1.0,
                          autoRefresh: checked
                        }
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSettingsUpdate} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-lg font-semibold">-- SOL</p>
              <p className="text-xs text-muted-foreground">Check portfolio for current balance</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-lg font-semibold">--</p>
              <p className="text-xs text-muted-foreground">Account info not available</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Verification</p>
              <Badge variant="outline">Email Verified</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default UserSettingsPage