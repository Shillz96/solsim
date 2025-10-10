"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StickyNote, TrendingUp, Coins, BarChart3, Loader2, AlertCircle, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useUserNotes } from "@/hooks/use-react-query-hooks"
import { NoteModal } from "./note-modal"

interface PositionNotesProps {
  tokenAddress?: string
  tokenSymbol?: string
  tokenName?: string
  currentMarketCap?: string
}

export function PositionNotes({ 
  tokenAddress,
  tokenSymbol,
  tokenName,
  currentMarketCap
}: PositionNotesProps) {
  const { user, isAuthenticated } = useAuth()
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  
  // Use the React Query hook to fetch notes
  const { 
    data: notes = [], 
    isLoading, 
    error, 
    refetch 
  } = useUserNotes(
    user?.id,
    tokenAddress
  )
  
  // For now, if there are no notes, display a placeholder
  if (isLoading) {
    return (
      <Card className="p-6 border border-border rounded-none shadow-none min-h-[150px] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading notes...</span>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="p-6 border border-border rounded-none shadow-none">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {(error as Error).message || 'An error occurred'}
            <Button variant="outline" size="sm" className="ml-2 h-6" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <Card className="p-6 border border-border rounded-none shadow-none">
      <div className="flex items-center gap-2 mb-6">
        <StickyNote className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-lg">Position Notes</h3>
        {notes.length > 0 && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {notes.length} Active
          </Badge>
        )}
        {isAuthenticated && tokenAddress && (
          <Button 
            variant="outline" 
            size="icon" 
            className="ml-auto h-7 w-7" 
            onClick={() => setIsAddNoteOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-none text-center text-muted-foreground">
          {isAuthenticated ? (
            <>
              <p>No notes for this token yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setIsAddNoteOpen(true)}
              >
                Add Note
              </Button>
            </>
          ) : (
            <p>Sign in to add token notes</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            // Convert market cap strings to numbers for comparison
            const entryMC = note.entryMarketCap 
              ? Number.parseFloat(note.entryMarketCap.replace(/[$B]/g, ""))
              : 0
            
            // Use provided current market cap if available
            const currentMC = currentMarketCap 
              ? Number.parseFloat(currentMarketCap.replace(/[$B]/g, "")) 
              : 0
            
            const mcChange = entryMC && currentMC ? ((currentMC - entryMC) / entryMC) * 100 : 0
            const isProfit = mcChange > 0

            return (
              <div
                key={note.id}
                className="rounded-none border border-border bg-card p-4 space-y-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{note.tokenSymbol || tokenSymbol || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {note.entryMarketCap && currentMarketCap && (
                    <Badge variant={isProfit ? "default" : "destructive"} className="text-xs">
                      {isProfit ? "+" : ""}
                      {mcChange.toFixed(2)}%
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {note.entryPrice && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Entry Price:</span>
                      <span className="font-mono text-foreground">${note.entryPrice}</span>
                    </div>
                  )}
                  
                  {note.entryMarketCap && (
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Entry MC:</span>
                      <span className="font-mono text-foreground">{note.entryMarketCap}</span>
                    </div>
                  )}
                  
                  {note.solAmount && (
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">SOL Amount:</span>
                      <span className="font-mono text-foreground">{note.solAmount}</span>
                    </div>
                  )}
                  
                  {note.targetPrice && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Target Price:</span>
                      <span className="font-mono text-foreground">${note.targetPrice}</span>
                    </div>
                  )}
                  
                  {note.notes && (
                    <div className="col-span-2 text-muted-foreground mt-1 border-t border-border pt-2">
                      {note.notes}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {isAddNoteOpen && tokenAddress && (
        <NoteModal
          isOpen={isAddNoteOpen}
          onClose={() => setIsAddNoteOpen(false)}
          userId={user?.id || ''}
          tokenAddress={tokenAddress}
          tokenSymbol={tokenSymbol}
          tokenName={tokenName}
        />
      )}
    </Card>
  )
}
