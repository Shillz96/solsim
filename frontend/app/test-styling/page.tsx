import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestStyling() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-4xl font-bold text-foreground">Styling Test Page</h1>
      
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This card tests basic styling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="default">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          
          <div className="space-y-2">
            <div className="h-4 bg-primary rounded"></div>
            <div className="h-4 bg-secondary rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
          
          <div className="text-sm space-y-1">
            <p className="text-foreground">Foreground text</p>
            <p className="text-muted-foreground">Muted foreground text</p>
            <p className="text-primary">Primary text</p>
            <p className="text-destructive">Destructive text</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold">Background</h3>
          <p className="text-sm text-muted-foreground">Default background</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold">Card</h3>
          <p className="text-sm text-muted-foreground">Card background</p>
        </div>
        <div className="p-4 bg-muted border border-border rounded-lg">
          <h3 className="font-semibold">Muted</h3>
          <p className="text-sm text-muted-foreground">Muted background</p>
        </div>
      </div>
    </div>
  )
}