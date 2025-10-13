"use client"

import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StickyNote, TrendingUp, Coins, BarChart3, Loader2, AlertCircle, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useUserNotes, useCreateNote, useUpdateNote } from "@/hooks/use-react-query-hooks"
import { toast } from "@/hooks/use-toast"
import type { UserNote } from "@/lib/types/notes"

import { safePercent } from "@/lib/format"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"

interface PositionNotesProps {
  tokenAddress?: string
  tokenSymbol?: string
  tokenName?: string
  currentMarketCap?: string
}

// Inline NoteModal component (previously separate file)
interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  existingNote?: UserNote
}

function NoteModal({
  isOpen,
  onClose,
  userId,
  tokenAddress,
  tokenSymbol,
  tokenName,
  existingNote
}: NoteModalProps) {
  const isEditing = !!existingNote
  
  // Form state
  const [notes, setNotes] = useState(existingNote?.notes || "")
  const [entryPrice, setEntryPrice] = useState(existingNote?.entryPrice || "")
  const [entryMarketCap, setEntryMarketCap] = useState(existingNote?.entryMarketCap || "")
  const [solAmount, setSolAmount] = useState(existingNote?.solAmount || "")
  const [targetPrice, setTargetPrice] = useState(existingNote?.targetPrice || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // React Query mutations
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const noteData = {
        userId,
        tokenAddress,
        tokenSymbol: tokenSymbol || '',
        tokenName: tokenName || '',
        notes,
        entryPrice: entryPrice || undefined,
        entryMarketCap: entryMarketCap || undefined,
        solAmount: solAmount || undefined,
        targetPrice: targetPrice || undefined,
      }
      
      if (isEditing && existingNote) {
        await updateNote.mutateAsync({
          noteId: existingNote.id,
          request: noteData
        })
        toast({ title: "Note updated successfully" })
      } else {
        await createNote.mutateAsync(noteData)
        toast({ title: "Note created successfully" })
      }
      
      onClose()
    } catch (error) {
      toast({
        title: "Error saving note",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-dialog-sm">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Note" : "Add Note"} 
            {tokenSymbol && ` - ${tokenSymbol}`}
          </DialogTitle>
          <DialogDescription>
            Track your thoughts, entry points, and targets for this position.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry-price">Entry Price ($)</Label>
              <Input
                id="entry-price"
                type="text"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-price">Target Price ($)</Label>
              <Input
                id="target-price"
                type="text"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entry-market-cap">Entry Market Cap</Label>
              <Input
                id="entry-market-cap"
                type="text"
                placeholder="e.g., 1.5M"
                value={entryMarketCap}
                onChange={(e) => setEntryMarketCap(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sol-amount">SOL Amount</Label>
              <Input
                id="sol-amount"
                type="text"
                placeholder="0.0"
                value={solAmount}
                onChange={(e) => setSolAmount(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Why you're interested in this token..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PositionNotes({ 
  tokenAddress,
  tokenSymbol,
  tokenName,
  currentMarketCap
}: PositionNotesProps) {
  const { user, isAuthenticated } = useAuth()
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  const { prices: livePrices } = usePriceStreamContext()
  
  // Get SOL price for equivalents
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  
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
      <EnhancedCard className="p-6 border border-border rounded-none shadow-none min-h-[150px] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading notes...</span>
      </EnhancedCard>
    )
  }
  
  if (error) {
    return (
      <EnhancedCard className="p-6 border border-border rounded-none shadow-none">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {(error as Error).message || 'An error occurred'}
            <Button variant="outline" size="sm" className="ml-2 h-6" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </EnhancedCard>
    )
  }

  return (
    <EnhancedCard className="p-6 border border-border rounded-none shadow-none">
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
                      {mcChange >= 0 ? '+' : ''}{mcChange.toFixed(2)}%
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {note.entryPrice && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Entry Price:</span>
                      <div className="flex flex-col">
                        <span className="font-mono text-foreground">${note.entryPrice}</span>
                        {solPrice > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatSolEquivalent(parseFloat(note.entryPrice), solPrice)}
                          </span>
                        )}
                      </div>
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
                      <div className="flex flex-col">
                        <span className="font-mono text-foreground">${note.targetPrice}</span>
                        {solPrice > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatSolEquivalent(parseFloat(note.targetPrice), solPrice)}
                          </span>
                        )}
                      </div>
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
    </EnhancedCard>
  )
}
