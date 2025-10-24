"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditablePresetButtonProps {
  value: number
  index: number
  selected: boolean
  disabled: boolean
  maxValue: number
  onSelect: (value: number) => void
  onUpdate: (index: number, newValue: number) => void
  className?: string
}

export function EditablePresetButton({
  value,
  index,
  selected,
  disabled,
  maxValue,
  onSelect,
  onUpdate,
  className
}: EditablePresetButtonProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const [doubleClickTimer, setDoubleClickTimer] = useState<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    console.log('[EditablePresetButton] Click detected, isEditing:', isEditing, 'doubleClickTimer:', !!doubleClickTimer)
    
    if (isEditing) return

    // Handle double-click for edit mode
    if (doubleClickTimer) {
      console.log('[EditablePresetButton] Double-click detected! Entering edit mode')
      clearTimeout(doubleClickTimer)
      setDoubleClickTimer(null)
      enterEditMode()
    } else {
      // Single click - select preset
      console.log('[EditablePresetButton] Single click - selecting preset value:', value)
      onSelect(value)
      // Set timer for double-click detection
      const timer = setTimeout(() => {
        setDoubleClickTimer(null)
      }, 300)
      setDoubleClickTimer(timer)
    }
  }

  const enterEditMode = () => {
    console.log('[EditablePresetButton] Entering edit mode for value:', value)
    setIsEditing(true)
    setEditValue(value.toString())
  }

  const saveEdit = () => {
    const newValue = parseFloat(editValue)
    if (!isNaN(newValue) && newValue > 0 && newValue <= maxValue) {
      onUpdate(index, newValue)
      setIsEditing(false)
    } else {
      // Invalid value, revert
      setEditValue(value.toString())
      setIsEditing(false)
    }
  }

  const cancelEdit = () => {
    setEditValue(value.toString())
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  if (isEditing) {
    return (
      <div className={cn(
        "relative h-14 sm:h-12",
        "border-4 border-[var(--star-yellow)]",
        "shadow-[4px_4px_0_var(--outline-black)]",
        "rounded-[12px]",
        "bg-white p-1",
        className
      )}>
        <div className="flex items-center gap-1 h-full">
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-full text-center font-mono text-sm border-0 focus-visible:ring-0 p-0"
            step="0.1"
            min="0.1"
            max={maxValue}
          />
          <Button
            size="sm"
            onClick={saveEdit}
            className="h-full aspect-square p-0 bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={cancelEdit}
            className="h-full aspect-square p-0 bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      size="lg"
      variant={selected ? "default" : "outline"}
      className={cn(
        "relative h-14 sm:h-12 font-mono text-lg sm:text-base transition-all active:scale-95 group",
        selected
          ? "bg-accent text-accent-foreground hover:bg-accent/90 ring-2 ring-accent ring-offset-2"
          : "bg-card hover:bg-muted",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      title="Double-click to edit"
    >
      {value} SOL

      {/* Edit indicator on hover */}
      <Edit2 className={cn(
        "absolute top-1 right-1 h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity",
        selected && "text-accent-foreground",
        !selected && "text-muted-foreground"
      )} />

      {/* Insufficient balance indicator */}
      {disabled && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" aria-hidden="true" />
      )}
    </Button>
  )
}
