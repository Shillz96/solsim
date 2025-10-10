"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreateNote, useUpdateNote } from "@/hooks/use-react-query-hooks"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { UserNote } from "@/lib/types/notes"

interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  existingNote?: UserNote
}

export function NoteModal({
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
  
  // React Query mutations
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditing && existingNote) {
        await updateNote.mutateAsync({
          noteId: existingNote.id,
          request: {
            userId,
            notes: notes || undefined,
            entryPrice: entryPrice || undefined,
            entryMarketCap: entryMarketCap || undefined,
            solAmount: solAmount || undefined,
            targetPrice: targetPrice || undefined
          }
        })
        toast({
          title: "Note updated",
          description: `Your note for ${tokenSymbol || 'this token'} has been updated`
        })
      } else {
        await createNote.mutateAsync({
          userId,
          tokenAddress,
          notes: notes || undefined,
          entryPrice: entryPrice || undefined,
          entryMarketCap: entryMarketCap || undefined,
          solAmount: solAmount || undefined,
          targetPrice: targetPrice || undefined
        })
        toast({
          title: "Note created",
          description: `Your note for ${tokenSymbol || 'this token'} has been saved`
        })
      }
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to save note",
        variant: "destructive"
      })
    }
  }
  
  const isSubmitting = createNote.isPending || updateNote.isPending
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Note" : "Add Note"} - {tokenSymbol || "Token"}
          </DialogTitle>
          <DialogDescription>
            {tokenName || "Record your thoughts and key metrics for this token"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price (USD)</Label>
              <Input
                id="entryPrice"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="targetPrice">Target Price (USD)</Label>
              <Input
                id="targetPrice"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entryMarketCap">Entry Market Cap</Label>
              <Input
                id="entryMarketCap"
                placeholder="$100M"
                value={entryMarketCap}
                onChange={(e) => setEntryMarketCap(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="solAmount">SOL Amount</Label>
              <Input
                id="solAmount"
                placeholder="10"
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