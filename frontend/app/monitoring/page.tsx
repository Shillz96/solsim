"use client"

import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function MonitoringPage() {
  return (
    <div className="container max-w-page-md mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">System Monitoring</h1>
      
      <Alert className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Coming Soon</AlertTitle>
        <AlertDescription>
          The monitoring dashboard is currently under development and will be available soon.
        </AlertDescription>
      </Alert>
      
      <EnhancedCard>
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-4">System Status: Operational</h2>
          <p className="text-muted-foreground mb-6">
            All systems are currently running normally. Check back later for detailed monitoring information.
          </p>
          
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/">
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </EnhancedCard>
    </div>
  )
}