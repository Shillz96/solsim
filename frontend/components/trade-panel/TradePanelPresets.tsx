/**
 * Trade Panel Presets Component
 * Reusable preset button grid with editable buy presets
 */

import { cn, marioStyles } from '@/lib/utils'
import { EditablePresetButton } from '@/components/trading/editable-preset-button'

interface TradePanelPresetsProps {
  presets: number[]
  selected: number | null
  onSelect: (value: number) => void
  onUpdate?: (index: number, value: number) => void
  disabled?: (value: number) => boolean
  maxValue?: number
  editable?: boolean
  label?: string
}

export function TradePanelPresets({
  presets,
  selected,
  onSelect,
  onUpdate,
  disabled,
  maxValue,
  editable = false,
  label
}: TradePanelPresetsProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {presets.map((value, index) => {
        const isDisabled = disabled?.(value) || false
        const isSelected = selected === value
        
        if (editable && onUpdate && maxValue !== undefined) {
          return (
            <EditablePresetButton
              key={index}
              value={value}
              index={index}
              selected={isSelected}
              disabled={isDisabled}
              maxValue={maxValue}
              onSelect={onSelect}
              onUpdate={onUpdate}
              className="h-9"
            />
          )
        }
        
        return (
          <button
            key={index}
            onClick={() => onSelect(value)}
            disabled={isDisabled}
            className={cn(
              "mario-btn h-9 text-xs transition-all flex items-center justify-center whitespace-nowrap px-2",
              isSelected
                ? "scale-105"
                : "bg-[var(--coin-gold)]",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label === 'percentage' && value === 100 ? 'ALL' : 
             label === 'percentage' ? `${value}%` : 
             `${value} SOL`}
          </button>
        )
      })}
    </div>
  )
}
