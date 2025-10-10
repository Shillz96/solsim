import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function ConfigTest() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL
  const env = process.env.NEXT_PUBLIC_ENV
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Configuration Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Current environment configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">API URL</Label>
              <Badge variant={apiUrl ? "default" : "destructive"}>
                {apiUrl || "Not set"}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">WebSocket URL</Label>
              <Badge variant={wsUrl ? "default" : "destructive"}>
                {wsUrl || "Not set"}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Environment</Label>
              <Badge variant={env ? "default" : "secondary"}>
                {env || "development"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>
}