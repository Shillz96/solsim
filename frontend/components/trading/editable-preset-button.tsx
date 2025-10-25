"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2 } from "lucide-react"
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
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleButtonClick = () => {
    // Only select if not disabled
    if (!disabled && !isEditing) {
      onSelect(value)
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue("")  // Start with empty field
    setIsEditing(true)
  }

  const saveEdit = () => {
    const newValue = parseFloat(editValue)
    if (!isNaN(newValue) && newValue > 0 && newValue <= maxValue) {
      onUpdate(index, newValue)
    }
    // Always exit edit mode on blur
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className={cn(
        "relative h-14 sm:h-12",
        "border-4 border-[var(--star-yellow)]",
        "shadow-[4px_4px_0_var(--outline-black)]",
        "rounded-[12px]",
        "bg-[var(--card)] p-1",
        className
      )}>
        <Input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
          placeholder={`Max ${maxValue}`}
          className="h-full text-center font-mono text-sm border-0 focus-visible:ring-0 p-0"
          step="0.1"
          min="0.1"
          max={maxValue}
        />
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
        disabled && "opacity-50",
        className
      )}
      onClick={handleButtonClick}
      disabled={false}
      title="Click pencil to edit"
    >
      {value} SOL

      {/* Edit button - click to edit */}
      <button
        onClick={handleEditClick}
        className={cn(
          "absolute top-1 right-1 h-4 w-4 flex items-center justify-center",
          "hover:scale-110 transition-transform"
        )}
      >
        <Edit2 className="h-3 w-3 text-[var(--outline-black)] hover:text-[var(--mario-red)]" />
      </button>

      {/* Insufficient balance indicator */}
      {disabled && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" aria-hidden="true" />
      )}
    </Button>
  )
}
