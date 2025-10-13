"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Book, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function DocumentationPage() {
  return (
    <div className="container max-w-page-md mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentation</h1>
      
      <Alert className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Coming Soon</AlertTitle>
        <AlertDescription>
          The documentation section is currently under development and will be available soon.
        </AlertDescription>
      </Alert>
      
      <Card className="p-6">
        <div className="text-center">
          <Book className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-4">Documentation</h2>
          <p className="text-muted-foreground mb-6">
            Our comprehensive documentation will include guides on trading, portfolio management, 
            and all features of SolSim. Check back later for updates.
          </p>
          
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/">
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}