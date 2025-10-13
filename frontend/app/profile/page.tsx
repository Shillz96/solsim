"use client"

import React, { useState } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { User, Bell, Shield, Palette, Trash2 } from "lucide-react"

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(true)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <EnhancedCard>
            <CardSection title="Profile Information">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-primary" />
              </div>

              <div className="flex items-center gap-6 mb-6">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">TR</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" defaultValue="trader123" className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="trader@example.com"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="bg-background border-border resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </CardSection>
          </EnhancedCard>

          {/* Notifications */}
          <EnhancedCard>
            <CardSection title="Notifications">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="h-5 w-5 text-primary" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Trade Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when your trades execute</p>
                  </div>
                  <Switch checked={notifications} onCheckedChange={setNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Price Alerts</p>
                    <p className="text-sm text-muted-foreground">Receive alerts for price movements</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Leaderboard Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified about rank changes</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardSection>
          </EnhancedCard>

          {/* Appearance */}
          <EnhancedCard>
            <CardSection title="Appearance">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="h-5 w-5 text-primary" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme (recommended)</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardSection>
          </EnhancedCard>

          {/* Security */}
          <EnhancedCard>
            <CardSection title="Security">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-5 w-5 text-primary" />
              </div>

              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Two-Factor Authentication
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Active Sessions
                </Button>
              </div>
            </CardSection>
          </EnhancedCard>

          {/* Danger Zone */}
          <EnhancedCard variant="bordered" className="border-destructive">
            <CardSection title="Danger Zone">
              <div className="flex items-center gap-2 mb-6">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                >
                  Reset Portfolio
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                >
                  Delete Account
                </Button>
              </div>
            </CardSection>
          </EnhancedCard>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90">Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  )
}
