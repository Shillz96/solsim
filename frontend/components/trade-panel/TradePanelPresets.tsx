/**
 * Trade Panel Presets Component
 * Reusable preset button grid with editable buy presets
 * Updated to match Mario-themed card aesthetic
 */

import { cn } from '@/lib/utils'
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
    <div className="grid grid-cols-2 gap-2">
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
              className="h-8 border-[2px] border-[var(--outline-black)] rounded-lg text-xs"
            />
          )
        }

        return (
          <button
            key={index}
            onClick={() => onSelect(value)}
            disabled={isDisabled}
            className={cn(
              "h-8 transition-all flex items-center justify-center whitespace-nowrap px-2.5 relative",
              "border-[2px] border-[var(--outline-black)] rounded-lg font-bold text-xs uppercase",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              isSelected ? [
                "bg-[var(--coin-gold)]",
                "text-[var(--outline-black)]",
                "shadow-[2px_2px_0_var(--outline-black)]",
                "translate-y-[1px]"
              ] : [
                "bg-white",
                "text-[var(--outline-black)]",
                "hover:bg-white/80",
                "active:translate-y-[1px]"
              ]
            )}
          >
            <span className="relative z-10">
              {label === 'percentage' && value === 100 ? 'ALL' :
               label === 'percentage' ? `${value}%` :
               `${value} SOL`}
            </span>
          </button>
        )
      })}
    </div>
  )
}
